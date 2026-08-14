import { describe, expect, it } from "vitest";
import { parseUtilitySettings, parseWebviewMessage, transactionOperationType } from "../../src/manager/validate.js";

describe("webview message validation", () => {
  it("accepts known messages and rejects unknown ones", () => {
    expect(parseWebviewMessage({ type: "ready" })).toEqual({ type: "ready" });
    expect(() => parseWebviewMessage({ type: "explode" })).toThrow();
    expect(() => parseWebviewMessage({ type: "transact" })).toThrow();
    expect(parseWebviewMessage({
      type: "previewModels",
      providerId: "demo",
      expectedRevision: "rev",
      operationId: "11111111-1111-1111-1111-111111111111",
    }).type).toBe("previewModels");
    expect(() => parseWebviewMessage({ type: "persistDraft", draft: { secret: "x" } })).toThrow(/unsupported/);
    expect(() => parseWebviewMessage({ type: "clearDraft" })).toThrow(/unsupported/);
  });

  it("requires hashed selectors and confirmation for utility writes", () => {
    expect(() => parseUtilitySettings({ utilityModel: "gpt-4" })).toThrow(/openlapp/);
    expect(() => parseWebviewMessage({
      type: "applyUtilitySettings",
      next: { utilityModel: "openlapp/lapp-abc" },
    })).toThrow(/confirm/);
    expect(parseWebviewMessage({
      type: "applyUtilitySettings",
      next: { utilityModel: "openlapp/lapp-abc", byokUtilityModelDefault: "none" },
      confirmed: true,
    }).type).toBe("applyUtilitySettings");
  });

  it("echoes only the transaction operation type for result binding", () => {
    expect(transactionOperationType({ type: "provider.set", input: { id: "demo" } })).toBe("provider.set");
    expect(transactionOperationType({ type: "provider.delete", providerId: "demo" })).toBe("provider.delete");
    expect(transactionOperationType({ type: "model.set", input: {} })).toBe("model.set");
    expect(transactionOperationType({})).toBeUndefined();
    expect(transactionOperationType(null)).toBeUndefined();
  });
});
