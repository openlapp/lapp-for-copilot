export interface DefaultTarget {
  providerId: string;
  model: string;
}

export function defaultOptionValue(target: DefaultTarget): string {
  return `${target.providerId}\u0000${target.model}`;
}

export function parseDefaultOptionValue(value: string): DefaultTarget | undefined {
  const split = value.indexOf("\u0000");
  if (split <= 0 || split === value.length - 1) return undefined;
  return { providerId: value.slice(0, split), model: value.slice(split + 1) };
}

export function extractProfileDefaults(manager: unknown): {
  chat?: DefaultTarget;
  subagent?: DefaultTarget;
} {
  const profile = isRecord(manager) && isRecord(manager.profile) ? manager.profile : undefined;
  const defaults = isRecord(profile?.global) && isRecord(profile.global.defaults) ? profile.global.defaults : undefined;
  if (!defaults) return {};
  return {
    ...(toTarget(defaults.chat) ? { chat: toTarget(defaults.chat) } : {}),
    ...(toTarget(defaults.subagent) ? { subagent: toTarget(defaults.subagent) } : {}),
  };
}

function toTarget(value: unknown): DefaultTarget | undefined {
  if (!isRecord(value)) return undefined;
  const providerId = typeof value.providerId === "string" ? value.providerId : undefined;
  const model = typeof value.model === "string" ? value.model : typeof value.modelId === "string" ? value.modelId : undefined;
  if (!providerId || !model) return undefined;
  return { providerId, model };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
