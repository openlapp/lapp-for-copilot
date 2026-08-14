import { describe, expect, it } from "vitest";
import { fromVsCodeMessages } from "../../src/vscode-messages.js";

function userMessage(content: unknown[]): Parameters<typeof fromVsCodeMessages>[0][number] {
  return { role: 1, name: undefined, content } as Parameters<typeof fromVsCodeMessages>[0][number];
}

describe("vscode message mapping", () => {
  it("drops cache_control and prompt-tsx parts without throwing", () => {
    const mapped = fromVsCodeMessages([userMessage([
      {
        callId: "c1",
        content: [
          { value: "file contents" },
          { mimeType: "cache_control", data: new TextEncoder().encode("ephemeral") },
          { value: { kind: "tsx" } },
        ],
      },
    ])]);
    expect(mapped).toEqual([{
      role: "user",
      content: [{
        kind: "tool-result",
        callId: "c1",
        content: [{ kind: "text", text: "file contents" }],
      }],
    }]);
  });

  it("forwards image and text data parts", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    const mapped = fromVsCodeMessages([userMessage([
      { value: "what is this?" },
      { mimeType: "image/png", data: png },
      { mimeType: "text/plain", data: new TextEncoder().encode("note") },
    ])]);
    expect(mapped[0]?.content).toEqual([
      { kind: "text", text: "what is this?" },
      { kind: "data", mimeType: "image/png", data: png },
      { kind: "data", mimeType: "text/plain", data: new TextEncoder().encode("note") },
    ]);
  });
});
