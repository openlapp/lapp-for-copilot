import type {
  LanguageModelChatRequestMessage,
  LanguageModelChatTool,
  LanguageModelChatToolMode,
} from "vscode";
import { IMAGE_MEDIA_TYPES, TEXT_MEDIA_TYPES } from "./constants.js";
import type { IncomingMessage, IncomingPart, IncomingTool, IncomingToolChoice } from "./messages.js";

interface TextLike { value: string }
interface DataLike { mimeType: string; data: Uint8Array }
interface ToolCallLike { callId: string; name: string; input: unknown }
interface ToolResultLike { callId: string; content: unknown[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isText(part: unknown): part is TextLike {
  return isRecord(part) && typeof part.value === "string" && !("callId" in part) && !("mimeType" in part);
}

function isData(part: unknown): part is DataLike {
  return isRecord(part) && typeof part.mimeType === "string" && part.data instanceof Uint8Array;
}

function isToolCall(part: unknown): part is ToolCallLike {
  return isRecord(part) && typeof part.callId === "string" && typeof part.name === "string" && "input" in part;
}

function isToolResult(part: unknown): part is ToolResultLike {
  return isRecord(part) && typeof part.callId === "string" && Array.isArray(part.content) && !("name" in part && "input" in part);
}

function isForwardableDataMime(mimeType: string): boolean {
  return (TEXT_MEDIA_TYPES as readonly string[]).includes(mimeType)
    || (IMAGE_MEDIA_TYPES as readonly string[]).includes(mimeType);
}

function compactParts(parts: Array<IncomingPart | undefined>): IncomingPart[] {
  return parts.filter((part): part is IncomingPart => part !== undefined);
}

function mapPart(part: unknown): IncomingPart | undefined {
  if (isText(part)) return { kind: "text", text: part.value };
  if (isData(part)) {
    if (!isForwardableDataMime(part.mimeType)) return undefined;
    return { kind: "data", mimeType: part.mimeType, data: part.data };
  }
  if (isToolCall(part)) return { kind: "tool-call", callId: part.callId, name: part.name, input: part.input };
  if (isToolResult(part)) {
    return {
      kind: "tool-result",
      callId: part.callId,
      content: compactParts(part.content.map((inner) => mapPart(inner))),
    };
  }
  if (typeof part === "string") return { kind: "text", text: part };
  return undefined;
}

export function fromVsCodeMessages(messages: readonly LanguageModelChatRequestMessage[]): IncomingMessage[] {
  return messages.map((message) => {
    const role = Number(message.role) === 2 ? "assistant" : Number(message.role) === 3 ? "system" : "user";
    return {
      role,
      content: compactParts(message.content.map((part) => mapPart(part))),
    };
  });
}

export function fromVsCodeTools(tools: readonly LanguageModelChatTool[] | undefined): IncomingTool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((tool) => ({
    name: tool.name,
    ...(tool.description ? { description: tool.description } : {}),
    ...(tool.inputSchema ? { parameters: tool.inputSchema as Record<string, unknown> } : {}),
  }));
}

export function fromVsCodeToolMode(
  mode: LanguageModelChatToolMode | undefined,
  tools: readonly LanguageModelChatTool[] | undefined,
  modelOptions: Record<string, unknown> | undefined,
): IncomingToolChoice | undefined {
  const named = modelOptions?.toolChoice ?? modelOptions?.tool_choice;
  if (typeof named === "string" && named !== "auto" && named !== "required" && named !== "none") {
    return { type: "named", name: named };
  }
  if (named && typeof named === "object" && "name" in named && typeof (named as { name: unknown }).name === "string") {
    return { type: "named", name: (named as { name: string }).name };
  }
  if (!tools?.length) return tools === undefined ? undefined : "none";
  if (mode === 2) return "required";
  if (named === "none") return "none";
  return "auto";
}

export function tokenCountSource(text: string | LanguageModelChatRequestMessage): IncomingMessage[] | string {
  if (typeof text === "string") return text;
  return fromVsCodeMessages([text]);
}
