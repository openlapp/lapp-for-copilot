import { describe, expect, it } from "vitest";
import { countTokens, imageTokenEstimate, resolveTokenLimits, saturateAdd, utf8TokenEstimate, MAX_SAFE } from "../../src/tokens.js";

describe("token counting", () => {
  it("uses ceil(utf8Bytes/3) and message overhead", () => {
    expect(utf8TokenEstimate("abc")).toBe(1);
    expect(utf8TokenEstimate("abcd")).toBe(2);
    expect(utf8TokenEstimate("你好")).toBe(2);
    expect(utf8TokenEstimate("🙂")).toBe(2);
    expect(countTokens({ messages: [{ text: "abc" }] })).toBe(9);
  });

  it("counts tools and images conservatively", () => {
    const image = imageTokenEstimate(100, 100);
    expect(image).toBe(Math.max(1024, Math.ceil((100 * 100) / 600)));
    const total = countTokens({
      messages: [{ text: "hi", toolName: "fn", toolId: "c1", toolJson: { a: 1 }, image: { width: 100, height: 100 } }],
      tools: [{ name: "fn", description: "d", parameters: { type: "object" } }],
    });
    expect(total).toBeGreaterThan(1024);
  });

  it("saturates at MAX_SAFE_INTEGER", () => {
    expect(saturateAdd(MAX_SAFE, 10)).toBe(MAX_SAFE);
    expect(countTokens({
      messages: [{ text: "x".repeat(20), extraToolItems: 0 }],
    })).toBeLessThan(MAX_SAFE);
    expect(saturateAdd(MAX_SAFE - 1, 2)).toBe(MAX_SAFE);
  });

  it("resolves token fallbacks", () => {
    expect(resolveTokenLimits(undefined, undefined)).toEqual({ ok: true, limits: { input: 28672, output: 4096 } });
    expect(resolveTokenLimits(undefined, 99)).toEqual({ ok: true, limits: { input: 8192, output: 99 } });
    expect(resolveTokenLimits(16, undefined)).toEqual({ ok: true, limits: { input: 12, output: 4 } });
    expect(resolveTokenLimits(1, undefined).ok).toBe(false);
    expect(resolveTokenLimits(8, 8).ok).toBe(false);
  });
});
