import {
  NORMALIZED_TEXT_MEDIA_TYPES,
  parseToolArgumentsStrict,
  validateNormalizedMessage,
  type NormalizedChatInput,
  type NormalizedMessage,
  type NormalizedToolChoice,
  type NormalizedUserPart,
} from "@openlapp/lapp";
import { TEXT_MEDIA_TYPES } from "./constants.js";
import { validateImagePart, validateImageSet, type ValidatedImage } from "./image.js";
import { utf8TokenEstimate, jsonTokenEstimate, imageTokenEstimate, saturateAdd, countTokens } from "./tokens.js";

export class MessageMappingError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "MessageMappingError";
  }
}

export type ChatRole = "system" | "user" | "assistant";

export type IncomingPart =
  | { kind: "text"; text: string }
  | { kind: "data"; mimeType: string; data: Uint8Array }
  | { kind: "tool-call"; callId: string; name: string; input: unknown }
  | { kind: "tool-result"; callId: string; content: IncomingPart[] };

export interface IncomingMessage {
  role: ChatRole;
  content: IncomingPart[];
}

export interface IncomingTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export type IncomingToolChoice = "auto" | "required" | "none" | { type: "named"; name: string };

export type ProgressPart = {
  type: "text";
  text: string;
} | {
  type: "tool-call";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

function isTextMedia(value: string): boolean {
  return (TEXT_MEDIA_TYPES as readonly string[]).includes(value)
    || (NORMALIZED_TEXT_MEDIA_TYPES as readonly string[]).includes(value);
}

function decodeDataPart(part: Extract<IncomingPart, { kind: "data" }>): { mediaType: typeof TEXT_MEDIA_TYPES[number]; data: Uint8Array } {
  if (!isTextMedia(part.mimeType)) {
    throw new MessageMappingError("UNSUPPORTED_DATA_TYPE", "Text/data parts accept only text/plain, text/markdown, or application/json.");
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(part.data);
    if (part.mimeType === "application/json") JSON.parse(text);
  } catch {
    throw new MessageMappingError("INVALID_UTF8_DATA", `${part.mimeType} data must be valid UTF-8${part.mimeType === "application/json" ? " JSON" : ""}.`);
  }
  return { mediaType: part.mimeType as typeof TEXT_MEDIA_TYPES[number], data: part.data };
}

function mapUserParts(parts: IncomingPart[], images: ValidatedImage[], signal?: AbortSignal): NormalizedUserPart[] {
  const hasToolResult = parts.some((part) => part.kind === "tool-result");
  const hasImage = parts.some((part) => part.kind === "data" && part.mimeType.startsWith("image/"));
  const hasTextual = parts.some((part) => part.kind === "text" || (part.kind === "data" && isTextMedia(part.mimeType)));
  if (hasToolResult && (hasTextual || hasImage || parts.some((part) => part.kind === "tool-call"))) {
    throw new MessageMappingError("MIXED_USER_CONTENT", "A user message cannot mix normal parts with tool results.");
  }
  if (hasToolResult) {
    return parts.map((part) => {
      if (part.kind !== "tool-result") {
        throw new MessageMappingError("MIXED_USER_CONTENT", "A user message cannot mix normal parts with tool results.");
      }
      if (part.content.some((inner) => inner.kind === "data" && inner.mimeType.startsWith("image/"))) {
        throw new MessageMappingError("IMAGE_TOOL_RESULT", "Image tool results are not supported.");
      }
      const content: Array<{ type: "text"; text: string } | { type: "data"; mediaType: typeof TEXT_MEDIA_TYPES[number]; data: Uint8Array }> = [];
      for (const inner of part.content) {
        if (inner.kind === "text") {
          content.push({ type: "text", text: inner.text });
          continue;
        }
        if (inner.kind === "data") {
          if (!isTextMedia(inner.mimeType)) continue;
          const data = decodeDataPart(inner);
          content.push({ type: "data", mediaType: data.mediaType, data: data.data });
          continue;
        }
        throw new MessageMappingError("INVALID_TOOL_RESULT", "Tool results support text and UTF-8 data only.");
      }
      if (content.length === 0) {
        content.push({ type: "text", text: "" });
      }
      return { type: "tool-result" as const, toolCallId: part.callId, content };
    });
  }

  const mapped: NormalizedUserPart[] = [];
  for (const part of parts) {
    if (part.kind === "text") {
      mapped.push({ type: "text", text: part.text });
      continue;
    }
    if (part.kind === "data" && part.mimeType.startsWith("image/")) {
      const image = validateImagePart(part.mimeType, part.data, signal);
      images.push(image);
      mapped.push({ type: "image", mediaType: image.mediaType, data: image.data });
      continue;
    }
    if (part.kind === "data") {
      if (!isTextMedia(part.mimeType)) continue;
      const data = decodeDataPart(part);
      mapped.push({ type: "data", mediaType: data.mediaType, data: data.data });
      continue;
    }
    if (part.kind === "tool-call") {
      throw new MessageMappingError("INVALID_USER_PART", "User messages cannot include assistant tool calls.");
    }
    throw new MessageMappingError("MIXED_USER_CONTENT", "A user message cannot mix normal parts with tool results.");
  }
  return mapped;
}

function mapAssistantParts(parts: IncomingPart[]): NormalizedMessage {
  let sawToolCall = false;
  const content: Array<{ type: "text"; text: string } | { type: "tool-call"; id: string; name: string; arguments: Record<string, unknown> }> = [];
  for (const part of parts) {
    if (part.kind === "tool-result") {
      throw new MessageMappingError("INVALID_ASSISTANT_OUTPUT", "Assistant output cannot include data or tool-result parts.");
    }
    if (part.kind === "data") {
      if (part.mimeType.startsWith("image/")) {
        throw new MessageMappingError("INVALID_ASSISTANT_OUTPUT", "Assistant output cannot include image parts.");
      }
      continue;
    }
    if (part.kind === "text") {
      if (sawToolCall) {
        throw new MessageMappingError("TEXT_AFTER_TOOL_CALL", "Assistant text is not allowed after the first tool call.");
      }
      content.push({ type: "text", text: part.text });
      continue;
    }
    if (part.kind === "tool-call") {
      const args = normalizeToolInput(part.input);
      sawToolCall = true;
      content.push({ type: "tool-call", id: part.callId, name: part.name, arguments: args });
    }
  }
  if (content.length === 0) content.push({ type: "text", text: "" });
  return { role: "assistant", content };
}

export function normalizeToolInput(input: unknown): Record<string, unknown> {
  if (typeof input === "string") {
    return parseToolArgumentsStrict(input);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new MessageMappingError("INVALID_TOOL_ARGUMENTS", "Tool arguments must be a JSON object.");
  }
  return input as Record<string, unknown>;
}

export function mapIncomingMessages(messages: IncomingMessage[], signal?: AbortSignal): {
  messages: NormalizedMessage[];
  images: ValidatedImage[];
} {
  const images: ValidatedImage[] = [];
  const mapped = messages.flatMap((message) => {
    if (message.role === "system") {
      const content: Array<{ type: "text"; text: string } | { type: "data"; mediaType: typeof TEXT_MEDIA_TYPES[number]; data: Uint8Array }> = [];
      for (const part of message.content) {
        if (part.kind === "text") {
          content.push({ type: "text", text: part.text });
          continue;
        }
        if (part.kind === "data") {
          if (!isTextMedia(part.mimeType)) continue;
          const data = decodeDataPart(part);
          content.push({ type: "data", mediaType: data.mediaType, data: data.data });
          continue;
        }
        throw new MessageMappingError("INVALID_SYSTEM_PART", "System messages may only contain text or UTF-8 data parts.");
      }
      if (content.length === 0) return [];
      const normalized = { role: "system" as const, content };
      validateNormalizedMessage(normalized);
      return [normalized];
    }
    if (message.role === "user") {
      const content = mapUserParts(message.content, images, signal);
      if (content.length === 0) return [];
      const normalized = { role: "user" as const, content };
      validateNormalizedMessage(normalized);
      return [normalized];
    }
    const normalized = mapAssistantParts(message.content);
    validateNormalizedMessage(normalized);
    return [normalized];
  });
  validateImageSet(images);
  return { messages: mapped, images };
}

export function mapToolChoice(choice: IncomingToolChoice | undefined): NormalizedToolChoice | undefined {
  if (choice === undefined) return undefined;
  if (choice === "auto" || choice === "required" || choice === "none") return choice;
  if (choice.type === "named" && choice.name.trim().length > 0) return { type: "named", name: choice.name };
  throw new MessageMappingError("INVALID_TOOL_CHOICE", "toolChoice must be auto, required, none, or a named tool.");
}

export function toNormalizedInput(input: {
  messages: IncomingMessage[];
  tools?: IncomingTool[];
  toolChoice?: IncomingToolChoice;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
}): { input: NormalizedChatInput; images: ValidatedImage[] } {
  const mapped = mapIncomingMessages(input.messages, input.signal);
  const normalized: NormalizedChatInput = {
    messages: mapped.messages,
    ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
    ...(input.stream !== undefined ? { stream: input.stream } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
    ...(input.tools ? {
      tools: input.tools.map((tool) => ({
        name: tool.name,
        ...(tool.description ? { description: tool.description } : {}),
        parameters: tool.parameters ?? { type: "object", properties: {} },
      })),
    } : {}),
    ...(input.toolChoice !== undefined ? { toolChoice: mapToolChoice(input.toolChoice) } : {}),
  };
  return { input: normalized, images: mapped.images };
}

export function estimateIncomingTokens(messages: IncomingMessage[], tools?: IncomingTool[]): number {
  const counted = messages.map((message) => {
    let text = "";
    let extraToolItems = 0;
    let toolName: string | undefined;
    let toolId: string | undefined;
    let toolJson: unknown;
    let image: { width: number; height: number } | undefined;
    for (const part of message.content) {
      if (part.kind === "text") text += part.text;
      else if (part.kind === "data" && isTextMedia(part.mimeType)) {
        text += new TextDecoder("utf-8", { fatal: false }).decode(part.data);
      } else if (part.kind === "data" && part.mimeType.startsWith("image/")) {
        try {
          const validated = validateImagePart(part.mimeType, part.data);
          image = { width: validated.width, height: validated.height };
        } catch {
          extraToolItems += 0;
          text += "";
        }
      } else if (part.kind === "tool-call") {
        toolName = part.name;
        toolId = part.callId;
        toolJson = part.input;
      } else if (part.kind === "tool-result") {
        extraToolItems += 1;
        toolId = part.callId;
        for (const inner of part.content) {
          if (inner.kind === "text") text += inner.text;
        }
      }
    }
    return { text, toolName, toolId, toolJson, image, extraToolItems };
  });
  return countTokens({ messages: counted, tools });
}

export function estimateTextTokens(text: string): number {
  return saturateAdd(utf8TokenEstimate(text), 0);
}

export function estimateMessageTokens(message: IncomingMessage): number {
  return estimateIncomingTokens([message]);
}

export { utf8TokenEstimate, jsonTokenEstimate, imageTokenEstimate };
