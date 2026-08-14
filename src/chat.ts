import {
  createLappClient,
  NormalizedChatError,
  parseToolArgumentsStrict,
  type LappProfile,
  type NormalizedStreamEvent,
} from "@openlapp/lapp";
import type { EligibleModel } from "./eligibility.js";
import {
  MessageMappingError,
  toNormalizedInput,
  type IncomingMessage,
  type IncomingTool,
  type IncomingToolChoice,
  type ProgressPart,
} from "./messages.js";
import { sanitizeError } from "./sanitize.js";

export interface ChatRequest {
  profile: LappProfile;
  model: EligibleModel;
  messages: IncomingMessage[];
  tools?: IncomingTool[];
  toolChoice?: IncomingToolChoice;
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  onProgress: (part: ProgressPart) => void;
}

export async function runChatRequest(request: ChatRequest): Promise<void> {
  request.signal.throwIfAborted();
  if (request.tools?.length && !request.model.toolCalling) {
    throw new MessageMappingError("TOOLS_NOT_SUPPORTED", "This model does not declare tool-call capability.");
  }
  const hasImage = request.messages.some((message) => message.content.some((part) => part.kind === "data" && part.mimeType.startsWith("image/")));
  if (hasImage && !request.model.imageInput) {
    throw new MessageMappingError("IMAGE_NOT_SUPPORTED", "This model does not declare image input.");
  }

  const mapped = toNormalizedInput({
    messages: request.messages,
    tools: request.tools,
    toolChoice: request.toolChoice,
    temperature: request.temperature,
    maxTokens: request.maxTokens ?? request.model.maxOutputTokens,
    stream: request.model.streaming,
    signal: request.signal,
  });

  const client = createLappClient({
    profile: request.profile,
    provider: request.model.providerId,
    model: request.model.modelId,
    ...(request.fetchImpl ? { fetchImpl: request.fetchImpl } : {}),
    ...(request.env ? { env: request.env } : {}),
    redactSuccessfulSecrets: true,
  });

  if (request.model.streaming) {
    for await (const event of client.streamNormalized(mapped.input)) {
      request.signal.throwIfAborted();
      emitStreamEvent(event, request.onProgress);
    }
    return;
  }

  const response = await client.chatNormalized(mapped.input);
  for (const part of response.parts) {
    request.signal.throwIfAborted();
    if (part.type === "text" && part.text) {
      request.onProgress({ type: "text", text: part.text });
    } else if (part.type === "tool-call") {
      request.onProgress({
        type: "tool-call",
        id: part.id,
        name: part.name,
        arguments: part.arguments,
      });
    }
  }
}

function emitStreamEvent(event: NormalizedStreamEvent, onProgress: (part: ProgressPart) => void): void {
  if (event.kind === "delta" && event.text) {
    onProgress({ type: "text", text: event.text });
    return;
  }
  if (event.kind === "tool-call") {
    onProgress({
      type: "tool-call",
      id: event.id,
      name: event.name,
      arguments: event.arguments,
    });
    return;
  }
  if (event.kind === "error") {
    throw new NormalizedChatError(sanitizeError(event.message));
  }
}

export function parseStreamedToolArguments(raw: string): Record<string, unknown> {
  return parseToolArgumentsStrict(raw);
}

export function toUserError(error: unknown): Error {
  if (error instanceof MessageMappingError || error instanceof NormalizedChatError) {
    return new Error(sanitizeError(error));
  }
  const message = sanitizeError(error);
  const wrapped = new Error(message);
  wrapped.name = error instanceof Error ? error.name : "Error";
  return wrapped;
}
