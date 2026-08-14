import { describe, expect, it } from "vitest";
import { mapIncomingMessages, MessageMappingError, normalizeToolInput } from "../../src/messages.js";
import { png1x1 } from "../helpers/images.js";

describe("message mapping", () => {
  it("rejects mixed user content", () => {
    expect(() => mapIncomingMessages([{
      role: "user",
      content: [
        { kind: "text", text: "hi" },
        { kind: "tool-result", callId: "1", content: [{ kind: "text", text: "ok" }] },
      ],
    }])).toThrow(MessageMappingError);
  });

  it("accepts pure tool results and rejects image tool results", () => {
    const mapped = mapIncomingMessages([{
      role: "user",
      content: [{ kind: "tool-result", callId: "1", content: [{ kind: "text", text: "ok" }] }],
    }]);
    expect(mapped.messages[0]?.content[0]).toMatchObject({ type: "tool-result", toolCallId: "1" });
    expect(() => mapIncomingMessages([{
      role: "user",
      content: [{
        kind: "tool-result",
        callId: "1",
        content: [{ kind: "data", mimeType: "image/png", data: png1x1() }],
      }],
    }])).toThrow(/image/i);
  });

  it("accepts UTF-8 data types and rejects invalid UTF-8", () => {
    const json = new TextEncoder().encode("{\"a\":1}");
    const mapped = mapIncomingMessages([{
      role: "user",
      content: [{ kind: "data", mimeType: "application/json", data: json }],
    }]);
    expect(mapped.messages[0]?.content[0]?.type).toBe("data");
    expect(() => mapIncomingMessages([{
      role: "user",
      content: [{ kind: "data", mimeType: "text/plain", data: Uint8Array.from([0xff, 0xfe]) }],
    }])).toThrow();
  });

  it("preserves assistant text then tool calls and rejects text after tools", () => {
    const mapped = mapIncomingMessages([{
      role: "assistant",
      content: [
        { kind: "text", text: "calling" },
        { kind: "tool-call", callId: "1", name: "fn", input: { x: 1 } },
      ],
    }]);
    expect(mapped.messages[0]?.content.map((part) => part.type)).toEqual(["text", "tool-call"]);
    expect(() => mapIncomingMessages([{
      role: "assistant",
      content: [
        { kind: "tool-call", callId: "1", name: "fn", input: { x: 1 } },
        { kind: "text", text: "later" },
      ],
    }])).toThrow(/after the first tool call/i);
  });

  it("requires strict JSON objects for tool arguments", () => {
    expect(normalizeToolInput("{\"a\":1}")).toEqual({ a: 1 });
    expect(() => normalizeToolInput("[]")).toThrow();
    expect(() => normalizeToolInput("not-json")).toThrow();
    expect(() => normalizeToolInput(3)).toThrow();
  });

  it("skips host cache_control sentinels in tool results", () => {
    const mapped = mapIncomingMessages([{
      role: "user",
      content: [{
        kind: "tool-result",
        callId: "c1",
        content: [
          { kind: "text", text: "file contents" },
          { kind: "data", mimeType: "cache_control", data: new TextEncoder().encode("ephemeral") },
        ],
      }],
    }]);
    expect(mapped.messages[0]?.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "c1",
      content: [{ type: "text", text: "file contents" }],
    });
  });

  it("keeps a placeholder when a tool result is only host sentinels", () => {
    const mapped = mapIncomingMessages([{
      role: "user",
      content: [{
        kind: "tool-result",
        callId: "c1",
        content: [{ kind: "data", mimeType: "cache_control", data: new TextEncoder().encode("ephemeral") }],
      }],
    }]);
    expect(mapped.messages[0]?.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "c1",
      content: [{ type: "text", text: "" }],
    });
  });

  it("skips unknown assistant data instead of failing the turn", () => {
    const mapped = mapIncomingMessages([{
      role: "assistant",
      content: [
        { kind: "data", mimeType: "cache_control", data: new TextEncoder().encode("ephemeral") },
        { kind: "text", text: "hello" },
      ],
    }]);
    expect(mapped.messages[0]?.content).toEqual([{ type: "text", text: "hello" }]);
  });
});
