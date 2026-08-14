import { describe, expect, it } from "vitest";
import { sanitizeText } from "../../src/sanitize.js";

describe("sanitization", () => {
  it("redacts secrets, vault refs, homes, and image bytes", () => {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? "C:\\\\Users\\\\someone";
    const text = sanitizeText(`Bearer sk-secretvalue123 vault://demo/default env://OPENAI_KEY data:image/png;base64,AAAA ${home} raw-response`);
    expect(text).not.toMatch(/sk-secretvalue123/);
    expect(text).not.toMatch(/vault:\/\/demo\/default/);
    expect(text).not.toContain(home);
    expect(text).not.toMatch(/AAAA/);
  });
});
