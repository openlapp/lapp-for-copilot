import { describe, expect, it } from "vitest";
import { isCurrentPreview, remainingPreviewOperationId } from "../../src/shared/preview.js";

describe("discovery preview identity", () => {
  it("rejects a stale operation id and accepts the current one", () => {
    expect(isCurrentPreview("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222")).toBe(false);
    expect(isCurrentPreview("11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isCurrentPreview("", "11111111-1111-1111-1111-111111111111")).toBe(false);
    expect(isCurrentPreview("", undefined)).toBe(false);
  });

  it("clears the in-flight preview id only when cancel matches", () => {
    expect(remainingPreviewOperationId("aaa", "aaa")).toBeUndefined();
    expect(remainingPreviewOperationId("bbb", "aaa")).toBe("bbb");
    expect(remainingPreviewOperationId(undefined, "aaa")).toBeUndefined();
  });
});
