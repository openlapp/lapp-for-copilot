import type { LappProfile, ModelDescriptor } from "@openlapp/lapp";
import { listModels } from "@openlapp/lapp";
import { SUPPORTED_CHAT_PROTOCOLS } from "./constants.js";
import { buildIdentityMaps, modelSelector, publicModelId, type IdentityMaps } from "./model-id.js";
import { resolveTokenLimits } from "./tokens.js";
import { diagnostic, type AppDiagnostic } from "./shared/diagnostics.js";

export interface EligibleModel {
  providerId: string;
  modelId: string;
  publicId: string;
  selector: string;
  name: string;
  providerLabel: string;
  family: string;
  version: string;
  tooltip: string;
  detail: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  toolCalling: boolean;
  imageInput: boolean;
  streaming: boolean;
  protocol: string;
  protocols: string[];
}

export function supportedProtocol(protocols: readonly string[]): string | undefined {
  return protocols.find((protocol) => (SUPPORTED_CHAT_PROTOCOLS as readonly string[]).includes(protocol));
}

export function hasExplicitCapability(capabilities: readonly string[] | undefined, name: string): boolean {
  return Array.isArray(capabilities) && capabilities.includes(name);
}

export function allowsTextOutput(outputModalities: readonly string[] | undefined): boolean {
  if (outputModalities === undefined) return true;
  return outputModalities.includes("text");
}

export function evaluateModel(
  model: ModelDescriptor,
): { ok: true; eligible: Omit<EligibleModel, "publicId" | "selector"> } | { ok: false; diagnostic: AppDiagnostic } {
  if (!model.providerEnabled) {
    return { ok: false, diagnostic: diagnostic("INFO", "PROVIDER_DISABLED", "Provider is disabled.", model.providerId) };
  }
  if (!model.modelEnabled) {
    return { ok: false, diagnostic: diagnostic("INFO", "MODEL_DISABLED", "Model is disabled.", `${model.providerId}/${model.modelId}`) };
  }
  const protocol = supportedProtocol(model.protocols);
  if (!protocol) {
    return {
      ok: false,
      diagnostic: diagnostic(
        "INFO",
        "PROTOCOL_UNSUPPORTED",
        "Model protocol is not supported by the bundled OpenLAPP chat client.",
        `${model.providerId}/${model.modelId}`,
      ),
    };
  }
  if (!allowsTextOutput(model.outputModalities)) {
    return {
      ok: false,
      diagnostic: diagnostic(
        "INFO",
        "OUTPUT_MODALITY_EXCLUDED",
        "outputModalities is present and does not include text.",
        `${model.providerId}/${model.modelId}`,
      ),
    };
  }
  const limits = resolveTokenLimits(model.contextWindow, model.maxOutputTokens);
  if (!limits.ok) {
    return { ok: false, diagnostic: { ...limits.diagnostic, location: `${model.providerId}/${model.modelId}` } };
  }

  const toolCalling = hasExplicitCapability(model.capabilities, "tool-call");
  const streaming = hasExplicitCapability(model.capabilities, "stream");
  const imageInput = Array.isArray(model.inputModalities) && model.inputModalities.includes("image");
  const name = model.modelName ?? "OpenLAPP model";
  const providerLabel = model.providerName ?? "OpenLAPP provider";

  return {
    ok: true,
    eligible: {
      providerId: model.providerId,
      modelId: model.modelId,
      name,
      providerLabel,
      family: "openlapp",
      version: "1.0",
      tooltip: `${name} via OpenLAPP`,
      detail: providerLabel,
      maxInputTokens: limits.limits.input,
      maxOutputTokens: limits.limits.output,
      toolCalling,
      imageInput,
      streaming,
      protocol,
      protocols: [...model.protocols],
    },
  };
}

export interface Catalog {
  models: EligibleModel[];
  identities: IdentityMaps;
  diagnostics: AppDiagnostic[];
}

export function buildCatalog(profile: LappProfile): Catalog {
  const listed = listModels(profile, { includeDisabled: true });
  const identities = buildIdentityMaps(listed.map((model) => ({ providerId: model.providerId, modelId: model.modelId })));
  const diagnostics: AppDiagnostic[] = [...identities.diagnostics];
  const models: EligibleModel[] = [];

  for (const model of listed) {
    const publicId = publicModelId({ providerId: model.providerId, modelId: model.modelId });
    if (!identities.fromPublic.has(publicId)) {
      continue;
    }
    const evaluated = evaluateModel(model);
    if (!evaluated.ok) {
      if (
        evaluated.diagnostic.level === "ERROR"
        || evaluated.diagnostic.code === "INVALID_TOKEN_LIMIT"
        || evaluated.diagnostic.code === "CONTRADICTORY_TOKEN_LIMIT"
      ) {
        diagnostics.push(evaluated.diagnostic);
      }
      continue;
    }
    models.push({
      ...evaluated.eligible,
      publicId,
      selector: modelSelector(publicId),
    });
  }

  return { models, identities, diagnostics: dedupeDiagnostics(diagnostics) };
}

function dedupeDiagnostics(items: AppDiagnostic[]): AppDiagnostic[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.level}\0${item.code}\0${item.location ?? ""}\0${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
