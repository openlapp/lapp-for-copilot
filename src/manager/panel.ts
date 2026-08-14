import {
  createNodeLappManagerHostV2,
  resolveLappRoot,
  type LappManagerBridgeV2,
  type ManagerResult,
} from "@openlapp/lapp";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import {
  AGENT_HOST_SETTING_KEY,
  GLOBAL_STATE_LOCALE_KEY,
  MANAGER_VIEW_TYPE,
} from "../constants.js";
import type { OpenLappChatProvider } from "../provider.js";
import { loadProfileSnapshot, type ProfileSnapshot } from "../profile.js";
import { sanitizeError, sanitizeText } from "../sanitize.js";
import {
  type HostToWebview,
  type ManagerUiSnapshot,
  type WebviewToHost,
} from "../shared/protocol.js";
import { SETTINGS_BACKUP_KEY } from "../constants.js";
import { remainingPreviewOperationId } from "../shared/preview.js";
import { buildDiagnosticsReport } from "./report.js";
import {
  applyUtilityWrite,
  previewUtilityWrite,
  readUtilitySettings,
  restoreUtilityWrite,
  UtilitySettingsError,
  vscodeUtilityStore,
} from "./settings.js";
import { buildManagerUiSnapshot } from "./ui-snapshot.js";
import { parseWebviewMessage, transactionOperationType, WebviewMessageError } from "./validate.js";

function uuid(): string {
  return randomUUID();
}

export class ManagerPanel {
  static current: ManagerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly host: LappManagerBridgeV2;
  private operationId: string | undefined;

  static show(
    context: vscode.ExtensionContext,
    refresh: (reason: string) => Promise<ProfileSnapshot>,
    provider: OpenLappChatProvider | undefined,
    registered: boolean,
    platform: ManagerUiSnapshot["platform"],
  ): ManagerPanel {
    if (ManagerPanel.current) {
      ManagerPanel.current.panel.reveal(vscode.ViewColumn.One);
      void ManagerPanel.current.pushSnapshot("reveal");
      return ManagerPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      MANAGER_VIEW_TYPE,
      "OpenLAPP Manager",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "webview")],
      },
    );
    ManagerPanel.current = new ManagerPanel(panel, context, refresh, provider, registered, platform);
    return ManagerPanel.current;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly refresh: (reason: string) => Promise<ProfileSnapshot>,
    private readonly provider: OpenLappChatProvider | undefined,
    private registered: boolean,
    private platform: ManagerUiSnapshot["platform"],
  ) {
    this.panel = panel;
    this.host = createNodeLappManagerHostV2();
    this.panel.webview.html = this.renderHtml();
    this.panel.onDidDispose(() => {
      ManagerPanel.current = undefined;
    });
    this.panel.webview.onDidReceiveMessage((raw) => {
      void this.onMessage(raw);
    });
  }

  setRegistration(registered: boolean, platform: ManagerUiSnapshot["platform"]): void {
    this.registered = registered;
    this.platform = platform;
  }

  async notifyExternalChange(): Promise<void> {
    await this.pushSnapshot("watch");
  }

  private locale(): "en" | "zh-cn" {
    const stored = this.context.globalState.get<string>(GLOBAL_STATE_LOCALE_KEY);
    if (stored === "en" || stored === "zh-cn") return stored;
    return vscode.env.language.toLowerCase().startsWith("zh") ? "zh-cn" : "en";
  }

  private async onMessage(raw: unknown): Promise<void> {
    let message: WebviewToHost;
    try {
      message = parseWebviewMessage(raw);
    } catch (error) {
      this.post({ type: "error", message: error instanceof WebviewMessageError ? error.message : sanitizeError(error) });
      return;
    }
    try {
      switch (message.type) {
        case "ready":
          this.post({
            type: "ready",
            protocolVersion: 1,
            locale: this.locale(),
            nonceHint: "host",
          });
          await this.pushSnapshot(message.type);
          return;
        case "getSnapshot":
        case "refresh":
          await this.pushSnapshot(message.type);
          return;
        case "reloadWindow":
          await vscode.commands.executeCommand("workbench.action.reloadWindow");
          return;
        case "transact": {
          const result = await this.host.transact({
            expectedRevision: message.expectedRevision,
            operation: message.operation as never,
          });
          this.postTransaction(result, transactionOperationType(message.operation));
          if (result.ok) await this.afterMutation();
          return;
        }
        case "previewModels": {
          if (this.operationId && this.operationId !== message.operationId) {
            await this.host.cancelPreview({ operationId: this.operationId });
          }
          this.operationId = message.operationId;
          const result = await this.host.previewModels({
            operationId: message.operationId,
            providerId: message.providerId,
            expectedRevision: message.expectedRevision,
          });
          if (this.operationId !== message.operationId) return;
          if (result.ok) this.post({ type: "previewResult", ok: true, preview: result.value, operationId: message.operationId });
          else this.post({ type: "previewResult", ok: false, error: sanitizeManagerError(result.error), operationId: message.operationId });
          return;
        }
        case "applyModels": {
          const result = await this.host.applyModels({
            previewId: message.previewId,
            expectedRevision: message.expectedRevision,
          });
          if (result.ok) {
            this.post({ type: "applyResult", ok: true, revision: result.value.revision });
            await this.afterMutation();
          } else {
            this.post({ type: "applyResult", ok: false, error: sanitizeManagerError(result.error) });
          }
          return;
        }
        case "cancelPreview": {
          await this.host.cancelPreview({ operationId: message.operationId });
          this.operationId = remainingPreviewOperationId(this.operationId, message.operationId);
          this.post({ type: "announce", politeness: "polite", message: "Discovery preview cancelled." });
          return;
        }
        case "testConnection": {
          const result = await this.host.testConnectionV2({
            expectedRevision: message.expectedRevision,
            selector: { providerId: message.providerId, model: message.model },
          });
          if (result.ok) {
            this.post({
              type: "testResult",
              ok: result.value.ok,
              providerId: result.value.providerId,
              modelId: result.value.modelId,
              protocol: result.value.protocol,
              code: result.value.code,
              message: result.value.message,
            });
          } else {
            this.post({ type: "testResult", ok: false, message: sanitizeText(result.error.message), code: result.error.code });
          }
          return;
        }
        case "previewUtilitySettings": {
          const config = vscode.workspace.getConfiguration();
          const backup = this.context.globalState.get<import("../shared/protocol.js").UtilitySettingsView>(SETTINGS_BACKUP_KEY);
          this.post({
            type: "settingsPreview",
            preview: previewUtilityWrite(readUtilitySettings(config), message.next, backup),
          });
          return;
        }
        case "applyUtilitySettings": {
          try {
            const current = await applyUtilityWrite(
              message.next,
              vscodeUtilityStore(vscode.workspace.getConfiguration(), this.context, vscode.ConfigurationTarget.Global),
            );
            this.post({ type: "settingsApplied", current });
            await this.afterMutation();
          } catch (error) {
            this.post({
              type: "error",
              message: error instanceof UtilitySettingsError ? error.message : sanitizeError(error),
            });
          }
          return;
        }
        case "restoreUtilitySettings": {
          try {
            const current = await restoreUtilityWrite(
              vscodeUtilityStore(vscode.workspace.getConfiguration(), this.context, vscode.ConfigurationTarget.Global),
            );
            this.post({ type: "settingsRestored", current: current ?? readUtilitySettings(vscode.workspace.getConfiguration()) });
          } catch (error) {
            this.post({
              type: "error",
              message: error instanceof UtilitySettingsError ? error.message : sanitizeError(error),
            });
          }
          return;
        }
        case "openSettings":
          await vscode.commands.executeCommand("workbench.action.openSettings", message.query ?? AGENT_HOST_SETTING_KEY);
          return;
        case "copyDiagnostics": {
          const snapshot = loadProfileSnapshot();
          const report = buildDiagnosticsReport(snapshot, this.uiSnapshot(snapshot));
          await vscode.env.clipboard.writeText(report);
          this.post({ type: "diagnosticsReport", report });
          this.post({ type: "announce", politeness: "polite", message: "Diagnostics copied." });
          return;
        }
        case "setLocale":
          await this.context.globalState.update(GLOBAL_STATE_LOCALE_KEY, message.locale);
          await this.pushSnapshot("locale");
          return;
      }
    } catch (error) {
      this.post({ type: "error", message: sanitizeError(error) });
    }
  }

  private postTransaction(result: ManagerResult<unknown>, operation?: string): void {
    if (result.ok && result.value && typeof result.value === "object" && result.value !== null && "revision" in result.value) {
      const value = result.value as { revision: string; warnings?: Array<{ code: string; message: string }> };
      this.post({
        type: "transactionResult",
        ok: true,
        revision: value.revision,
        warnings: (value.warnings ?? []).map((warning) => ({ code: warning.code, message: sanitizeText(warning.message) })),
        ...(operation ? { operation } : {}),
      });
      return;
    }
    if (!result.ok) {
      this.post({ type: "transactionResult", ok: false, error: sanitizeManagerError(result.error), ...(operation ? { operation } : {}) });
    }
  }

  private async afterMutation(): Promise<void> {
    const snapshot = await this.refresh("management-mutation");
    this.provider?.notifyChanged(snapshot);
    await this.pushSnapshot("mutation");
  }

  private async pushSnapshot(_reason: string): Promise<void> {
    this.post({ type: "phase", phase: "loading" });
    const snapshot = await this.refresh("manager");
    const manager = await this.host.getSnapshot();
    this.post({
      type: "snapshot",
      manager: manager.ok ? manager.value : { error: sanitizeManagerError(manager.error) },
      ui: this.uiSnapshot(snapshot),
    });
  }

  private uiSnapshot(snapshot: ProfileSnapshot): ManagerUiSnapshot {
    return buildManagerUiSnapshot({
      snapshot,
      manager: { revision: snapshot.revision, profile: snapshot.profile },
      platform: this.platform,
      locale: this.locale(),
      registered: this.registered,
      config: vscode.workspace.getConfiguration(),
    });
  }

  private post(message: HostToWebview): void {
    void this.panel.webview.postMessage(message);
  }

  private renderHtml(): string {
    const webview = this.panel.webview;
    const nonce = Buffer.from(uuid().replaceAll("-", ""), "hex").toString("base64");
    const root = vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview");
    const script = webview.asWebviewUri(vscode.Uri.joinPath(root, "assets", "index.js"));
    const cssCandidates = ["assets/index.css", "assets/style.css"];
    const cssRel = cssCandidates.find((rel) => fs.existsSync(path.join(this.context.extensionPath, "dist", "webview", rel))) ?? "assets/index.css";
    const css = webview.asWebviewUri(vscode.Uri.joinPath(root, cssRel));
    return `<!DOCTYPE html>
<html lang="${this.locale()}">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; connect-src 'none';" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${css}" />
    <title>OpenLAPP Manager</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" nonce="${nonce}" src="${script}"></script>
  </body>
</html>`;
  }
}

function sanitizeManagerError(error: { code: string; message: string; currentRevision?: string }): {
  code: string;
  message: string;
  currentRevision?: string;
} {
  return {
    code: error.code,
    message: sanitizeText(error.message),
    ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
  };
}

export function defaultLappRoot(): string {
  return resolveLappRoot();
}
