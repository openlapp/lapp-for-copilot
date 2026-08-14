import { BYOK_UTILITY_DEFAULTS } from "../constants.js";
import { WEBVIEW_PROTOCOL_VERSION, type UtilitySettingsView, type WebviewToHost } from "../shared/protocol.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export class WebviewMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebviewMessageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new WebviewMessageError(`${field} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

export function parseUtilitySettings(value: unknown): UtilitySettingsView {
  if (!isRecord(value)) throw new WebviewMessageError("utility settings must be an object.");
  const next: UtilitySettingsView = {};
  if (value.utilityModel !== undefined) {
    const model = requireString(value.utilityModel, "utilityModel");
    if (!model.startsWith("openlapp/")) {
      throw new WebviewMessageError("utilityModel must use the openlapp/<hashed-id> selector.");
    }
    next.utilityModel = model;
  }
  if (value.utilitySmallModel !== undefined) {
    const model = requireString(value.utilitySmallModel, "utilitySmallModel");
    if (!model.startsWith("openlapp/")) {
      throw new WebviewMessageError("utilitySmallModel must use the openlapp/<hashed-id> selector.");
    }
    next.utilitySmallModel = model;
  }
  if (value.byokUtilityModelDefault !== undefined) {
    const choice = requireString(value.byokUtilityModelDefault, "byokUtilityModelDefault");
    if (!(BYOK_UTILITY_DEFAULTS as readonly string[]).includes(choice)) {
      throw new WebviewMessageError("byokUtilityModelDefault must be none, mainAgent, or copilot.");
    }
    next.byokUtilityModelDefault = choice;
  }
  return next;
}

const SIMPLE_TYPES = new Set([
  "ready",
  "getSnapshot",
  "refresh",
  "reloadWindow",
  "restoreUtilitySettings",
  "copyDiagnostics",
]);

export function transactionOperationType(operation: unknown): string | undefined {
  return isRecord(operation) && typeof operation.type === "string" ? operation.type : undefined;
}

export function parseWebviewMessage(value: unknown): WebviewToHost {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new WebviewMessageError("webview message is malformed.");
  }
  if ("protocolVersion" in value && value.protocolVersion !== WEBVIEW_PROTOCOL_VERSION) {
    throw new WebviewMessageError("webview protocol version is unsupported.");
  }
  const type = value.type;
  if (SIMPLE_TYPES.has(type)) return { type } as WebviewToHost;

  switch (type) {
    case "transact":
      if (!isRecord(value.operation)) throw new WebviewMessageError("transaction operation is required.");
      return {
        type,
        expectedRevision: requireString(value.expectedRevision, "expectedRevision"),
        operation: value.operation,
      };
    case "previewModels":
      return {
        type,
        providerId: requireProviderId(value.providerId),
        expectedRevision: requireString(value.expectedRevision, "expectedRevision"),
        operationId: requireUuid(value.operationId, "operationId"),
      };
    case "applyModels":
      return {
        type,
        previewId: requireUuid(value.previewId, "previewId"),
        expectedRevision: requireString(value.expectedRevision, "expectedRevision"),
      };
    case "cancelPreview":
      return { type, operationId: requireUuid(value.operationId, "operationId") };
    case "testConnection":
      return {
        type,
        providerId: requireProviderId(value.providerId),
        model: requireString(value.model, "model"),
        expectedRevision: requireString(value.expectedRevision, "expectedRevision"),
      };
    case "previewUtilitySettings":
      return { type, next: parseUtilitySettings(value.next) };
    case "applyUtilitySettings":
      if (value.confirmed !== true) throw new WebviewMessageError("utility settings require explicit confirmation.");
      return { type, next: parseUtilitySettings(value.next), confirmed: true };
    case "openSettings":
      return { type, query: optionalString(value.query, "query") };
    case "setLocale":
      if (value.locale !== "en" && value.locale !== "zh-cn") {
        throw new WebviewMessageError("locale must be en or zh-cn.");
      }
      return { type, locale: value.locale };
    default:
      throw new WebviewMessageError(`unsupported webview message: ${type}`);
  }
}

function requireProviderId(value: unknown): string {
  const id = requireString(value, "providerId");
  if (!PROVIDER_ID.test(id) || id.endsWith(".")) {
    throw new WebviewMessageError("providerId is invalid.");
  }
  return id;
}

function requireUuid(value: unknown, field: string): string {
  const id = requireString(value, field);
  if (!UUID.test(id)) throw new WebviewMessageError(`${field} must be a UUID.`);
  return id;
}
