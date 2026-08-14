import { DEFAULT_INPUT_TOKENS, DEFAULT_OUTPUT_TOKENS, OUTPUT_ONLY_INPUT_TOKENS } from "./constants.js";
import { diagnostic, type AppDiagnostic } from "./shared/diagnostics.js";

export const MAX_SAFE = Number.MAX_SAFE_INTEGER;

export function saturate(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value >= MAX_SAFE ? MAX_SAFE : Math.trunc(value);
}

export function saturateAdd(left: number, right: number): number {
  const a = saturate(left);
  const b = saturate(right);
  if (a >= MAX_SAFE - b) return MAX_SAFE;
  return a + b;
}

export function utf8TokenEstimate(text: string): number {
  const bytes = Buffer.byteLength(text, "utf8");
  return saturate(Math.ceil(bytes / 3));
}

export function jsonTokenEstimate(value: unknown): number {
  return utf8TokenEstimate(JSON.stringify(value ?? {}));
}

export function imageTokenEstimate(width: number, height: number): number {
  const cells = Math.ceil((width * height) / 600);
  return saturate(Math.max(1024, cells));
}

export interface TokenCountInput {
  messages: Array<{
    text?: string;
    toolName?: string;
    toolId?: string;
    toolJson?: unknown;
    image?: { width: number; height: number };
    extraToolItems?: number;
  }>;
  tools?: Array<{ name: string; description?: string; parameters?: unknown }>;
}

export function countTokens(input: TokenCountInput): number {
  let total = 0;
  for (const message of input.messages) {
    total = saturateAdd(total, 8);
    if (message.text) total = saturateAdd(total, utf8TokenEstimate(message.text));
    if (message.toolName) total = saturateAdd(total, utf8TokenEstimate(message.toolName));
    if (message.toolId) total = saturateAdd(total, utf8TokenEstimate(message.toolId));
    if (message.toolJson !== undefined) total = saturateAdd(total, jsonTokenEstimate(message.toolJson));
    if (message.image) total = saturateAdd(total, imageTokenEstimate(message.image.width, message.image.height));
    if (message.extraToolItems) {
      for (let i = 0; i < message.extraToolItems; i += 1) {
        total = saturateAdd(total, 16);
      }
    }
    if (message.toolName || message.toolId || message.toolJson !== undefined) {
      total = saturateAdd(total, 16);
    }
  }
  for (const tool of input.tools ?? []) {
    total = saturateAdd(total, 16);
    total = saturateAdd(total, utf8TokenEstimate(tool.name));
    if (tool.description) total = saturateAdd(total, utf8TokenEstimate(tool.description));
    if (tool.parameters !== undefined) total = saturateAdd(total, jsonTokenEstimate(tool.parameters));
  }
  return total;
}

export function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

export interface TokenLimits {
  input: number;
  output: number;
}

export function resolveTokenLimits(
  contextWindow: number | undefined,
  maxOutputTokens: number | undefined,
): { ok: true; limits: TokenLimits } | { ok: false; diagnostic: AppDiagnostic } {
  const hasContext = contextWindow !== undefined;
  const hasOutput = maxOutputTokens !== undefined;
  if (hasContext && !isSafePositiveInteger(contextWindow)) {
    return { ok: false, diagnostic: diagnostic("ERROR", "INVALID_TOKEN_LIMIT", "contextWindow is not a safe positive integer.") };
  }
  if (hasOutput && !isSafePositiveInteger(maxOutputTokens)) {
    return { ok: false, diagnostic: diagnostic("ERROR", "INVALID_TOKEN_LIMIT", "maxOutputTokens is not a safe positive integer.") };
  }

  if (!hasContext && !hasOutput) {
    return { ok: true, limits: { input: DEFAULT_INPUT_TOKENS, output: DEFAULT_OUTPUT_TOKENS } };
  }
  if (!hasContext && hasOutput) {
    return { ok: true, limits: { input: OUTPUT_ONLY_INPUT_TOKENS, output: maxOutputTokens } };
  }
  if (hasContext && !hasOutput && contextWindow !== undefined) {
    const output = Math.min(4096, Math.max(1, Math.floor(contextWindow / 4)));
    const input = contextWindow - output;
    if (!isSafePositiveInteger(input)) {
      return { ok: false, diagnostic: diagnostic("ERROR", "CONTRADICTORY_TOKEN_LIMIT", "Derived input tokens are not a safe positive integer.") };
    }
    return { ok: true, limits: { input, output } };
  }

  if (contextWindow === undefined || maxOutputTokens === undefined) {
    return { ok: false, diagnostic: diagnostic("ERROR", "INVALID_TOKEN_LIMIT", "Token limits are incomplete.") };
  }
  const input = contextWindow - maxOutputTokens;
  if (!isSafePositiveInteger(input)) {
    return { ok: false, diagnostic: diagnostic("ERROR", "CONTRADICTORY_TOKEN_LIMIT", "contextWindow must be greater than maxOutputTokens.") };
  }
  return { ok: true, limits: { input, output: maxOutputTokens } };
}
