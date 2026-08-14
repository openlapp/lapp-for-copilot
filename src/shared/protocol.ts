import type { AppDiagnostic } from "./diagnostics.js";

export const WEBVIEW_PROTOCOL_VERSION = 1 as const;

export type ManagerSection =
  | "overview"
  | "providers"
  | "vault"
  | "models"
  | "defaults"
  | "copilot"
  | "agentHost"
  | "diagnostics";

export interface UtilitySettingsView {
  utilityModel?: string;
  utilitySmallModel?: string;
  byokUtilityModelDefault?: string;
}

export interface UtilitySettingsPreview {
  current: UtilitySettingsView;
  next: UtilitySettingsView;
  backup?: UtilitySettingsView;
}

export interface AgentHostView {
  enabled: boolean | undefined;
  inspected: boolean;
  preview: true;
}

export interface PlatformView {
  ok: boolean;
  platform: string;
  arch: string;
  extensionKind: "ui" | "workspace" | "unknown";
  remoteName?: string;
  vscodeVersion: string;
  vscodeQuality: string;
  registered: boolean;
  rejection?: string;
}

export interface ProfileDefaultView {
  providerId: string;
  model: string;
}

export interface ManagerUiSnapshot {
  revision: string;
  profileInitialized: boolean;
  profileRootLabel: string;
  platform: PlatformView;
  diagnostics: AppDiagnostic[];
  utility: UtilitySettingsView;
  defaults: {
    chat?: ProfileDefaultView;
    subagent?: ProfileDefaultView;
  };
  agentHost: AgentHostView;
  locale: "en" | "zh-cn";
  sharedProfileConsent: boolean;
  providerRegistered: boolean;
  eligibleModelCount: number;
  hashedModels: Array<{
    publicId: string;
    selector: string;
    name: string;
    providerLabel: string;
    enabled: boolean;
    toolCalling: boolean;
    imageInput: boolean;
    streaming: boolean;
    maxInputTokens: number;
    maxOutputTokens: number;
  }>;
}

export type HostToWebview =
  | { type: "ready"; protocolVersion: typeof WEBVIEW_PROTOCOL_VERSION; locale: "en" | "zh-cn"; nonceHint: string }
  | { type: "snapshot"; manager: unknown; ui: ManagerUiSnapshot }
  | { type: "phase"; phase: string; message?: string }
  | { type: "transactionResult"; ok: true; revision: string; warnings: Array<{ code: string; message: string }>; operation?: string }
  | { type: "transactionResult"; ok: false; error: { code: string; message: string; currentRevision?: string }; operation?: string }
  | { type: "previewResult"; ok: true; preview: unknown; operationId: string }
  | { type: "previewResult"; ok: false; error: { code: string; message: string; currentRevision?: string }; operationId?: string }
  | { type: "applyResult"; ok: true; revision: string }
  | { type: "applyResult"; ok: false; error: { code: string; message: string; currentRevision?: string } }
  | { type: "testResult"; ok: boolean; providerId?: string; modelId?: string; protocol?: string; code?: string; message?: string }
  | { type: "settingsPreview"; preview: UtilitySettingsPreview }
  | { type: "settingsApplied"; current: UtilitySettingsView }
  | { type: "settingsRestored"; current: UtilitySettingsView }
  | { type: "diagnosticsReport"; report: string }
  | { type: "announce"; politeness: "polite" | "assertive"; message: string }
  | { type: "error"; message: string };

export type WebviewToHost =
  | { type: "ready" }
  | { type: "getSnapshot" }
  | { type: "refresh" }
  | { type: "reloadWindow" }
  | { type: "transact"; expectedRevision: string; operation: unknown }
  | { type: "previewModels"; providerId: string; expectedRevision: string; operationId: string }
  | { type: "applyModels"; previewId: string; expectedRevision: string }
  | { type: "cancelPreview"; operationId: string }
  | { type: "testConnection"; providerId: string; model: string; expectedRevision: string }
  | { type: "previewUtilitySettings"; next: UtilitySettingsView }
  | { type: "applyUtilitySettings"; next: UtilitySettingsView; confirmed: true }
  | { type: "restoreUtilitySettings" }
  | { type: "openSettings"; query?: string }
  | { type: "copyDiagnostics" }
  | { type: "setLocale"; locale: "en" | "zh-cn" };
