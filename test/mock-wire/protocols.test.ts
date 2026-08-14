import { describe, expect, it } from "vitest";
import { runChatRequest } from "../../src/chat.js";
import { buildCatalog } from "../../src/eligibility.js";
import { MessageMappingError } from "../../src/messages.js";
import { png1x1 } from "../helpers/images.js";
import { makeProfile } from "../helpers/profile.js";

interface Capture {
  url: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function sseResponse(wire: string): Response {
  return new Response(wire, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function installFetch(handler: (capture: Capture) => Response): { captures: Capture[]; fetchImpl: typeof fetch } {
  const captures: Capture[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const capture = { url, body, headers };
    captures.push(capture);
    return handler(capture);
  };
  return { captures, fetchImpl };
}

async function run(protocol: string, fetchImpl: typeof fetch, over: Partial<Parameters<typeof runChatRequest>[0]> = {}) {
  const profile = makeProfile({
    protocol,
    capabilities: ["chat", "stream", "tool-call"],
    inputModalities: ["text", "image"],
  });
  const model = buildCatalog(profile).models[0]!;
  const parts: Array<Record<string, unknown>> = [];
  await runChatRequest({
    profile,
    model,
    messages: over.messages ?? [{ role: "user", content: [{ kind: "text", text: "Say hello." }] }],
    signal: over.signal ?? new AbortController().signal,
    fetchImpl,
    onProgress: (part) => parts.push(part),
    tools: over.tools,
    toolChoice: over.toolChoice,
    ...over,
  });
  return parts;
}

describe("openai-chat-completions mock wire", () => {
  it("streams text and records the outbound body", async () => {
    const { captures, fetchImpl } = installFetch(() => sseResponse(
      "data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"lo\"}}]}\n\ndata: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n",
    ));
    const parts = await run("openai-chat-completions", fetchImpl);
    expect(captures[0]?.url).toContain("/chat/completions");
    expect(captures[0]?.body.model).toBe("demo-chat");
    expect(captures[0]?.body.stream).toBe(true);
    expect(captures[0]?.body.messages).toEqual([
      { role: "user", content: "Say hello." },
    ]);
    expect(parts).toEqual([
      { type: "text", text: "Hel" },
      { type: "text", text: "lo" },
    ]);
  });

  it("maps tool calls and pure tool results", async () => {
    const { captures, fetchImpl } = installFetch(() => sseResponse(
      "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call_weather\",\"function\":{\"name\":\"get_weather\",\"arguments\":\"{\\\"city\\\":\\\"Shanghai\\\"}\"}}]}}]}\n\ndata: {\"choices\":[{\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\ndata: [DONE]\n\n",
    ));
    const parts = await run("openai-chat-completions", fetchImpl, {
      messages: [
        { role: "user", content: [{ kind: "tool-result", callId: "call_weather", content: [{ kind: "text", text: "sunny" }] }] },
      ],
      tools: [{ name: "get_weather", parameters: { type: "object", properties: { city: { type: "string" } } } }],
      toolChoice: "auto",
    });
    const body = captures[0]?.body as { messages: Array<Record<string, unknown>>; tools: unknown; tool_choice: unknown };
    expect(body.messages[0]).toMatchObject({ role: "tool", tool_call_id: "call_weather", content: "sunny" });
    expect(body.tool_choice).toBe("auto");
    expect(parts[0]).toMatchObject({ type: "tool-call", id: "call_weather", name: "get_weather", arguments: { city: "Shanghai" } });
  });

  it("sends image bytes as a data URL and never fetches image URLs", async () => {
    const { captures, fetchImpl } = installFetch(() => sseResponse(
      "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\n\ndata: [DONE]\n\n",
    ));
    await run("openai-chat-completions", fetchImpl, {
      messages: [{
        role: "user",
        content: [
          { kind: "text", text: "what is this?" },
          { kind: "data", mimeType: "image/png", data: png1x1() },
        ],
      }],
    });
    const content = (captures[0]?.body.messages as Array<{ content: unknown }>)[0]?.content;
    expect(JSON.stringify(content)).toContain("data:image/png;base64,");
    expect(JSON.stringify(content)).not.toContain("https://");
  });
});

describe("openai-responses mock wire", () => {
  it("streams text against /responses", async () => {
    const { captures, fetchImpl } = installFetch(() => sseResponse(
      "event: response.output_text.delta\ndata: {\"type\":\"response.output_text.delta\",\"delta\":\"Hi\"}\n\nevent: response.completed\ndata: {\"type\":\"response.completed\",\"response\":{\"status\":\"completed\"}}\n\n",
    ));
    const parts = await run("openai-responses", fetchImpl);
    expect(captures[0]?.url).toContain("/responses");
    expect(captures[0]?.body.input).toEqual([{ role: "user", content: [{ type: "input_text", text: "Say hello." }] }]);
    expect(parts).toEqual([{ type: "text", text: "Hi" }]);
  });
});

describe("anthropic-messages mock wire", () => {
  it("streams text and sets anthropic-version", async () => {
    const { captures, fetchImpl } = installFetch(() => sseResponse(
      "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\nevent: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Yo\"}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
    ));
    const parts = await run("anthropic-messages", fetchImpl);
    expect(captures[0]?.url).toContain("/messages");
    expect(captures[0]?.headers["anthropic-version"]).toBe("2023-06-01");
    expect(captures[0]?.body.messages).toEqual([{ role: "user", content: [{ type: "text", text: "Say hello." }] }]);
    expect(parts.some((part) => part.type === "text" && part.text === "Yo")).toBe(true);
  });
});

describe("rejection and cancellation", () => {
  it("fails invalid streamed tool JSON instead of using {}", async () => {
    const { fetchImpl } = installFetch(() => sseResponse(
      "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"c1\",\"function\":{\"name\":\"fn\",\"arguments\":\"not-json\"}}]}}]}\n\ndata: [DONE]\n\n",
    ));
    await expect(run("openai-chat-completions", fetchImpl, {
      tools: [{ name: "fn", parameters: { type: "object" } }],
    })).rejects.toThrow();
  });

  it("rejects mixed user content before fetch", async () => {
    const { captures, fetchImpl } = installFetch(() => jsonResponse({}));
    await expect(run("openai-chat-completions", fetchImpl, {
      messages: [{
        role: "user",
        content: [
          { kind: "text", text: "hi" },
          { kind: "tool-result", callId: "1", content: [{ kind: "text", text: "x" }] },
        ],
      }],
    })).rejects.toBeInstanceOf(MessageMappingError);
    expect(captures).toHaveLength(0);
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    const { fetchImpl } = installFetch(() => {
      controller.abort();
      return sseResponse("data: {\"choices\":[{\"delta\":{\"content\":\"no\"}}]}\n\n");
    });
    controller.abort();
    await expect(run("openai-chat-completions", fetchImpl, { signal: controller.signal })).rejects.toThrow();
  });
});
