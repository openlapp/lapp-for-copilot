export interface FingerprintedModel {
  id: string;
  name: string;
  family: string;
  version: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  tooltip?: string;
  detail?: string;
  capabilities: {
    toolCalling?: boolean | number;
    imageInput?: boolean;
    vision?: boolean;
    agentMode?: boolean;
  };
}

export function modelInformationFingerprint(model: FingerprintedModel): string {
  return JSON.stringify({
    id: model.id,
    name: model.name,
    family: model.family,
    version: model.version,
    maxInputTokens: model.maxInputTokens,
    maxOutputTokens: model.maxOutputTokens,
    tooltip: model.tooltip ?? "",
    detail: model.detail ?? "",
    capabilities: {
      toolCalling: model.capabilities.toolCalling ?? false,
      imageInput: model.capabilities.imageInput ?? false,
      vision: model.capabilities.vision ?? false,
      agentMode: model.capabilities.agentMode ?? false,
    },
  });
}

export function catalogFingerprint(models: readonly FingerprintedModel[]): string {
  return models.map(modelInformationFingerprint).sort().join("\n");
}
