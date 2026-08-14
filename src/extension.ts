import * as vscode from "vscode";
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
    );
    return;
  }

  let snapshot = loadProfileSnapshot();
  const host = {
    current: () => snapshot,
    refresh: async (reason: string) => {
      output.appendLine(`refresh:${reason}`);
      snapshot = loadProfileSnapshot();
      provider.notifyChanged(snapshot);
      return snapshot;
    },
    log: (message: string) => output.appendLine(sanitizeText(message)),
  };
  const provider = new OpenLappChatProvider(host);
  const registration = vscode.lm.registerLanguageModelChatProvider(VENDOR_ID, provider);
  context.subscriptions.push(registration);
  provider.notifyChanged(snapshot);

  const watcher = new ProfileWatcher({
    root: snapshot.root,
    onChange: (next) => {
      snapshot = next;
      provider.notifyChanged(next);
      void ManagerPanel.current?.notifyExternalChange();
    },
    onDiagnostic: (message) => output.appendLine(sanitizeText(message)),
  });
  watcher.start();
  context.subscriptions.push({ dispose: () => watcher.dispose() });

  const refresh = async (reason: string): Promise<ProfileSnapshot> => host.refresh(reason);

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) void refresh("focus");
    }),
    vscode.commands.registerCommand("openlapp.openManager", () => {
      ManagerPanel.show(context, refresh, provider, true, toPlatformView(runtime, true));
    }),
    vscode.commands.registerCommand("openlapp.refreshModels", async () => {
      const next = await refresh("command");
      provider.notifyChanged(next);
      await ManagerPanel.current?.notifyExternalChange();
      void vscode.window.showInformationMessage(`${EXTENSION_DISPLAY_NAME}: models refreshed.`);
    }),
    vscode.commands.registerCommand("openlapp.copyDiagnostics", async () => {
      const current = await refresh("diagnostics");
      const ui = buildManagerUiSnapshot({
        snapshot: current,
        manager: { revision: current.revision, profile: current.profile },
        platform: toPlatformView(runtime, true),
        locale: vscode.env.language.toLowerCase().startsWith("zh") ? "zh-cn" : "en",
        registered: true,
        config: vscode.workspace.getConfiguration(),
      });
      const report = buildDiagnosticsReport(current, ui);
      await vscode.env.clipboard.writeText(report);
      void vscode.window.showInformationMessage(`${EXTENSION_DISPLAY_NAME}: diagnostics copied.`);
    }),
  );
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
