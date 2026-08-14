import os from "node:os";
import path from "node:path";

const HOME_VARIANTS = unique([
  os.homedir(),
  process.env.USERPROFILE,
  process.env.HOME,
  process.env.HOMEDRIVE && process.env.HOMEPATH
    ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`
    : undefined,
].filter((value): value is string => Boolean(value)));

const EXTRA_SECRET_SHAPES = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._\-+=/]{8,}\b/gi,
  /\bvault:\/\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\b/g,
  /\benv:\/\/[A-Za-z_][A-Za-z0-9_]*\b/g,
  /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g,
];

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/[\\/]+$/, "")).filter(Boolean))];
}

export function redactHome(text: string): string {
  let next = text;
  for (const home of HOME_VARIANTS.sort((a, b) => b.length - a.length)) {
    const escaped = home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(escaped, "gi"), "<home>");
    next = next.replace(new RegExp(escaped.replaceAll(path.sep === "\\" ? "\\\\" : "/", "[\\\\/]"), "gi"), "<home>");
  }
  next = next.replace(/[A-Za-z]:\\Users\\[^\\/\s]+/gi, "<home>");
  next = next.replace(/\/Users\/[^/\s]+/g, "<home>");
  return next;
}

function redactSensitive(text: string, sensitive: readonly string[]): string {
  let next = text;
  for (const value of sensitive) {
    if (!value) continue;
    next = next.split(value).join("<redacted>");
  }
  return next;
}

export function sanitizeText(text: string, sensitive: readonly string[] = []): string {
  let next = redactSensitive(text, sensitive);
  for (const pattern of EXTRA_SECRET_SHAPES) {
    next = next.replace(pattern, "<redacted>");
  }
  next = redactHome(next);
  next = next.replace(/[A-Za-z0-9+/]{80,}={0,2}/g, "<redacted-bytes>");
  return next;
}

export function sanitizeError(error: unknown, sensitive: readonly string[] = []): string {
  if (error instanceof Error) {
    return sanitizeText(error.message, sensitive);
  }
  return sanitizeText(String(error), sensitive);
}

export function sanitizeUnknown(value: unknown, sensitive: readonly string[] = [], depth = 0): unknown {
  if (depth > 8) return "<truncated>";
  if (typeof value === "string") return sanitizeText(value, sensitive);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (value instanceof Uint8Array) return `<bytes:${value.byteLength}>`;
  if (Array.isArray(value)) return value.slice(0, 32).map((entry) => sanitizeUnknown(entry, sensitive, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const lowered = key.toLowerCase();
      if (/(secret|token|password|authorization|credential|image|raw|body)/.test(lowered)) {
        output[key] = "<redacted>";
        continue;
      }
      output[key] = sanitizeUnknown(entry, sensitive, depth + 1);
    }
    return output;
  }
  return String(value);
}
