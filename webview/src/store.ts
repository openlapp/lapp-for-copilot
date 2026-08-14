import { reactive } from "vue";
import type { HostToWebview, ManagerSection, ManagerUiSnapshot, UtilitySettingsView } from "@shared/protocol";
import { isCurrentPreview } from "@shared/preview";
import {
  emptyProviderDraft,
  hydrateProviderDraft,
  promoteSavedProviderDraft,
  resolvedProviderId,
  type ProviderDraft,
} from "@shared/provider-update";
import { t, type Locale } from "./i18n";

export type { ProviderDraft };

export interface ModelDraft {
  providerId: string;
  id: string;
  name: string;
  enabled: boolean;
  protocols: string;
  inputModalities: string;
  outputModalities: string;
  capabilities: string;
  contextWindow: string;
  maxOutputTokens: string;
  existing: boolean;
  originalId: string;
  originalProviderId: string;
}

export const state = reactive({
  locale: "en" as Locale,
  section: "overview" as ManagerSection,
  phase: "loading",
  announcement: "",
  politeness: "polite" as "polite" | "assertive",
  error: "",
  dirty: false,
  manager: undefined as Record<string, unknown> | undefined,
  ui: undefined as ManagerUiSnapshot | undefined,
  filter: "",
  providerDraft: emptyProviderDraft(),
  modelDraft: emptyModel(),
  preview: undefined as unknown,
  previewOperationId: "",
  previewInFlight: false,
  settingsPreview: undefined as unknown,
  utilityDraft: emptyUtilityDraft(),
  utilityDirty: false,
  pendingSave: undefined as PendingSave | undefined,
});

export type PendingSave =
  | { kind: "provider"; id: string }
  | { kind: "model"; providerId: string; id: string };

export function clearPendingSave(): void {
  state.pendingSave = undefined;
}

export function resetProviderDraft(): void {
  state.providerDraft = emptyProviderDraft();
  state.dirty = false;
  clearPendingSave();
}

export function emptyProvider(): ProviderDraft {
  return emptyProviderDraft();
}

export function emptyModel(): ModelDraft {
  return {
    providerId: "",
    id: "",
    name: "",
    enabled: true,
    protocols: "",
    inputModalities: "text",
    outputModalities: "text",
    capabilities: "chat,stream,tool-call",
    contextWindow: "",
    maxOutputTokens: "",
    existing: false,
    originalId: "",
    originalProviderId: "",
  };
}

export function resolvedModelIdentity(draft: ModelDraft): { providerId: string; id: string } {
  if (draft.existing) {
    return {
      providerId: draft.originalProviderId || draft.providerId,
      id: draft.originalId || draft.id,
    };
  }
  return { providerId: draft.providerId, id: draft.id };
}

export function hydrateModelDraft(row: Record<string, unknown>): ModelDraft {
  const providerId = String(row.providerId ?? "");
  const id = String(row.id ?? "");
  return {
    ...emptyModel(),
    providerId,
    id,
    name: String(row.name ?? ""),
    enabled: row.enabled !== false,
    protocols: Array.isArray(row.protocols) ? row.protocols.map(String).join(",") : "",
    inputModalities: Array.isArray(row.inputModalities) ? row.inputModalities.map(String).join(",") : "text",
    outputModalities: Array.isArray(row.outputModalities) ? row.outputModalities.map(String).join(",") : "text",
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.map(String).join(",") : "",
    contextWindow: row.contextWindow != null ? String(row.contextWindow) : "",
    maxOutputTokens: row.maxOutputTokens != null ? String(row.maxOutputTokens) : "",
    existing: true,
    originalId: id,
    originalProviderId: providerId,
  };
}

export function promoteSavedModelDraft(draft: ModelDraft): ModelDraft {
  const identity = resolvedModelIdentity(draft);
  if (!identity.id || !identity.providerId) return { ...draft };
  return {
    ...draft,
    providerId: identity.providerId,
    id: identity.id,
    existing: true,
    originalId: identity.id,
    originalProviderId: identity.providerId,
  };
}

export function parseOptionalTokenLimit(raw: string): { ok: true; value?: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true };
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 1) {
    return { ok: false, error: "Token limits must be safe positive integers." };
  }
  return { ok: true, value };
}

export function emptyUtilityDraft(): UtilitySettingsView {
  return {
    utilityModel: "",
    utilitySmallModel: "",
    byokUtilityModelDefault: "none",
  };
}

export function applyHostMessage(message: HostToWebview): void {
  switch (message.type) {
    case "ready":
      state.locale = message.locale;
      break;
    case "snapshot":
      state.phase = "ready";
      state.manager = message.manager as Record<string, unknown>;
      state.ui = message.ui;
      state.locale = message.ui.locale;
      state.error = "";
      if (!state.utilityDirty) {
        state.utilityDraft = {
          utilityModel: message.ui.utility.utilityModel ?? "",
          utilitySmallModel: message.ui.utility.utilitySmallModel ?? "",
          byokUtilityModelDefault: message.ui.utility.byokUtilityModelDefault ?? "none",
        };
      }
      if (!state.dirty) syncDraftsFromSnapshot();
      break;
    case "phase":
      state.phase = message.phase;
      if (message.message) announce("polite", message.message);
      break;
    case "error":
      state.error = message.message;
      announce("assertive", message.message);
      break;
    case "announce":
      announce(message.politeness, message.message);
      break;
    case "transactionResult":
      if (!message.ok) {
        state.error = message.error.message;
        if (isMatchingPendingSave(message.operation)) clearPendingSave();
        announce("assertive", message.error.message);
      } else if (isMatchingPendingSave(message.operation)) {
        state.dirty = false;
        applySuccessfulSet(message.operation);
        announce("polite", t(state.locale, "statusOk"));
      }
      break;
    case "previewResult":
      if (!state.previewInFlight || !isCurrentPreview(state.previewOperationId, message.operationId)) {
        return;
      }
      state.previewInFlight = false;
      state.preview = message.ok ? message.preview : undefined;
      if (!message.ok) {
        state.error = message.error.message;
        announce("assertive", message.error.message);
      }
      break;
    case "applyResult":
      if (message.ok) {
        state.preview = undefined;
        state.previewInFlight = false;
        state.previewOperationId = "";
        announce("polite", t(state.locale, "apply"));
      } else {
        state.error = message.error.message;
        announce("assertive", message.error.message);
      }
      break;
    case "testResult":
      announce(message.ok ? "polite" : "assertive", message.message ?? (message.ok ? t(state.locale, "statusOk") : t(state.locale, "statusError")));
      break;
    case "settingsPreview":
      state.settingsPreview = message.preview;
      break;
    case "settingsApplied":
    case "settingsRestored":
      state.settingsPreview = undefined;
      state.utilityDirty = false;
      if (state.ui) state.ui.utility = message.current;
      state.utilityDraft = {
        utilityModel: message.current.utilityModel ?? "",
        utilitySmallModel: message.current.utilitySmallModel ?? "",
        byokUtilityModelDefault: message.current.byokUtilityModelDefault ?? "none",
      };
      announce("polite", t(state.locale, "statusOk"));
      break;
    case "diagnosticsReport":
      state.phase = "ready";
      break;
  }
}

export function announce(politeness: "polite" | "assertive", message: string): void {
  state.politeness = politeness;
  state.announcement = message;
}

export function snapshotRevision(): string {
  const manager = state.manager;
  if (manager && typeof manager.revision === "string") return manager.revision;
  return state.ui?.revision ?? "";
}

export function isMatchingPendingSave(operation?: string): boolean {
  const pending = state.pendingSave;
  if (!pending || !operation) return false;
  if (pending.kind === "provider" && operation === "provider.set") {
    return resolvedProviderId(state.providerDraft) === pending.id;
  }
  if (pending.kind === "model" && operation === "model.set") {
    const identity = resolvedModelIdentity(state.modelDraft);
    return identity.providerId === pending.providerId && identity.id === pending.id;
  }
  return false;
}

function applySuccessfulSet(operation?: string): void {
  if (!isMatchingPendingSave(operation)) return;
  if (state.pendingSave?.kind === "provider") {
    state.providerDraft = promoteSavedProviderDraft(state.providerDraft);
  } else if (state.pendingSave?.kind === "model") {
    state.modelDraft = promoteSavedModelDraft(state.modelDraft);
  }
  clearPendingSave();
}

function syncDraftsFromSnapshot(): void {
  const providerId = state.providerDraft.id ? resolvedProviderId(state.providerDraft) : "";
  const provider = providerId ? providers().find((entry) => entry.id === providerId) : undefined;
  if (provider) state.providerDraft = hydrateProviderDraft(provider);

  const model = resolvedModelIdentity(state.modelDraft);
  if (!model.id || !model.providerId) return;
  const host = providers().find((entry) => entry.id === model.providerId);
  const models = Array.isArray(host?.models) ? host.models as Array<Record<string, unknown>> : [];
  const row = models.find((entry) => String(entry.id) === model.id);
  if (row) state.modelDraft = hydrateModelDraft({ ...row, providerId: model.providerId });
}

export function providers(): Array<Record<string, unknown>> {
  const profile = state.manager?.profile as { providers?: Array<Record<string, unknown>> } | undefined;
  return profile?.providers ?? [];
}

export function selectedProvider(): Record<string, unknown> | undefined {
  return providers().find((provider) => provider.id === state.modelDraft.providerId || provider.id === state.providerDraft.id);
}

export function chosenUtilitySettings(): UtilitySettingsView {
  const next: UtilitySettingsView = {
    byokUtilityModelDefault: state.utilityDraft.byokUtilityModelDefault || "none",
  };
  if (state.utilityDraft.utilityModel) next.utilityModel = state.utilityDraft.utilityModel;
  if (state.utilityDraft.utilitySmallModel) next.utilitySmallModel = state.utilityDraft.utilitySmallModel;
  return next;
}
