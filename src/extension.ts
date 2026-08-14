import * as vscode from "vscode";
import {
  CONSENT_STATE_KEY,
  consentCopy,
  grantConsent,
  isConsentCurrent,
  testConsentBypass,
} from "./consent.js";
import { EXTENSION_DISPLAY_NAME, OUTPUT_CHANNEL_NAME, VENDOR_ID } from "./constants.js";
import { buildDiagnosticsReport } from "./manager/report.js";
import { ManagerPanel } from "./manager/panel.js";
import { buildManagerUiSnapshot } from "./manager/ui-snapshot.js";
import { inspectRuntime } from "./platform.js";
import { loadProfileSnapshot, type ProfileSnapshot } from "./profile.js";
import { OpenLappChatProvider } from "./provider.js";
import { sanitizeError, sanitizeText } from "./sanitize.js";
import type { ManagerUiSnapshot } from "./shared/protocol.js";
import { ProfileWatcher } from "./watch.js";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(output);
  const runtime = inspectRuntime(context, {
    platform: process.platform,
    arch: process.arch,
    ...(vscode.env.remoteName ? { remoteName: vscode.env.remoteName } : {}),
  });

  const locale = (): "en" | "zh-cn" =>
    vscode.env.language.toLowerCase().startsWith("zh") ? "zh-cn" : "en";

  const copy = () => consentCopy(locale());

  const hasConsent = (): boolean =>
    testConsentBypass() || isConsentCurrent(context.globalState.get(CONSENT_STATE_KEY));

  const promptConsent = async (): Promise<boolean> => {
    if (hasConsent()) return true;
    const labels = copy();
    const choice = await vscode.window.showWarningMessage(
      labels.message,
      { modal: true, detail: labels.detail },
      labels.accept,
      labels.decline,
    );
    if (choice !== labels.accept) return false;
    await context.globalState.update(CONSENT_STATE_KEY, grantConsent());
    return true;
  };

  const openRejected = async () => {
    const message = runtime.message ?? "OpenLAPP is unavailable in this window.";
    output.appendLine(message);
    await vscode.window.showErrorMessage(message);
  };

  if (!runtime.ok) {
    output.appendLine(runtime.message ?? "OpenLAPP refused to activate.");
    void vscode.window.showErrorMessage(runtime.message ?? "OpenLAPP refused to activate.");
    context.subscriptions.push(
      vscode.commands.registerCommand("openlapp.openManager", openRejected),
      vscode.commands.registerCommand("openlapp.refreshModels", openRejected),
      vscode.commands.registerCommand("openlapp.copyDiagnostics", openRejected),
      vscode.commands.registerCommand("openlapp.reviewConsent", openRejected),
    );
    return;
  }

  let started = false;
  let snapshot = {
    root: "",
    revision: "consent-pending",
    profileRevision: "consent-pending",
    vaultRevision: "00000000-0000-0000-0000-000000000000",
    profile: undefined,
    initialized: false,
    catalog: { models: [], identities: { toPublic: new Map(), fromPublic: new Map(), diagnostics: [] }, diagnostics: [] },
    diagnostics: [],
  } as ProfileSnapshot;
  let provider: OpenLappChatProvider | undefined;
  let watcher: ProfileWatcher | undefined;

  const host = {
    current: () => snapshot,
    refresh: async (reason: string) => {
      output.appendLine(`refresh:${reason}`);
      snapshot = loadProfileSnapshot();
      provider?.notifyChanged(snapshot);
      return snapshot;
    },
    log: (message: string) => output.appendLine(sanitizeText(message)),
  };

  const startManaged = (): void => {
    if (started) return;
    started = true;
    snapshot = loadProfileSnapshot();
    provider = new OpenLappChatProvider(host);
    context.subscriptions.push(vscode.lm.registerLanguageModelChatProvider(VENDOR_ID, provider));
    provider.notifyChanged(snapshot);
    watcher = new ProfileWatcher({
      root: snapshot.root,
      onChange: (next) => {
        snapshot = next;
        provider?.notifyChanged(next);
        void ManagerPanel.current?.notifyExternalChange();
      },
      onDiagnostic: (message) => output.appendLine(sanitizeText(message)),
    });
    watcher.start();
    context.subscriptions.push({ dispose: () => watcher?.dispose() });
  };

  const ensureReady = async (): Promise<boolean> => {
    if (!await promptConsent()) {
      output.appendLine("consent:declined");
      void vscode.window.showWarningMessage(copy().later);
      return false;
    }
    startManaged();
    return true;
  };

  const refresh = async (reason: string): Promise<ProfileSnapshot> => host.refresh(reason);

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused && started) void refresh("focus");
    }),
    vscode.commands.registerCommand("openlapp.openManager", async () => {
      if (!await ensureReady()) return;
      ManagerPanel.show(context, refresh, provider, true, toPlatformView(runtime, true));
    }),
    vscode.commands.registerCommand("openlapp.refreshModels", async () => {
      if (!await ensureReady()) return;
      const next = await refresh("command");
      provider?.notifyChanged(next);
      await ManagerPanel.current?.notifyExternalChange();
      void vscode.window.showInformationMessage(`${EXTENSION_DISPLAY_NAME}: models refreshed.`);
    }),
    vscode.commands.registerCommand("openlapp.copyDiagnostics", async () => {
      if (!await ensureReady()) return;
      const current = await refresh("diagnostics");
      const ui = buildManagerUiSnapshot({
        snapshot: current,
        manager: { revision: current.revision, profile: current.profile },
        platform: toPlatformView(runtime, true),
        locale: locale(),
        registered: true,
        sharedProfileConsent: true,
        config: vscode.workspace.getConfiguration(),
      });
      const report = buildDiagnosticsReport(current, ui);
      await vscode.env.clipboard.writeText(report);
      void vscode.window.showInformationMessage(`${EXTENSION_DISPLAY_NAME}: diagnostics copied.`);
    }),
    vscode.commands.registerCommand("openlapp.reviewConsent", async () => {
      const labels = copy();
      if (!hasConsent()) {
        if (await promptConsent()) startManaged();
        return;
      }
      const choice = await vscode.window.showWarningMessage(
        labels.message,
        { modal: true, detail: labels.detail },
        labels.keep,
        labels.withdraw,
      );
      if (choice !== labels.withdraw) return;
      await context.globalState.update(CONSENT_STATE_KEY, undefined);
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }),
  );

  if (hasConsent()) startManaged();
  else {
    void promptConsent().then((ok) => {
      if (ok) startManaged();
    });
  }
}

export function deactivate(): void {
  ManagerPanel.current = undefined;
}

function toPlatformView(runtime: ReturnType<typeof inspectRuntime>, registered: boolean): ManagerUiSnapshot["platform"] {
  return {
    ok: runtime.ok,
    platform: process.platform,
    arch: process.arch,
    extensionKind: runtime.extensionKind,
    ...(vscode.env.remoteName ? { remoteName: vscode.env.remoteName } : {}),
    vscodeVersion: vscode.version,
    vscodeQuality: vscode.env.appName.toLowerCase().includes("insider") ? "insider" : "stable",
    registered,
    ...(runtime.message ? { rejection: runtime.message } : {}),
  };
}

export function logSafe(output: vscode.OutputChannel, error: unknown): void {
  output.appendLine(sanitizeError(error));
}
