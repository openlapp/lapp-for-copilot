import { describe, expect, it } from "vitest";
import { catalogFingerprint, modelInformationFingerprint } from "../../src/shared/fingerprint.js";

const base = {
  id: "lapp-a",
  name: "Demo",
  family: "openlapp",
  version: "1.0",
  maxInputTokens: 1000,
  maxOutputTokens: 200,
  tooltip: "Demo via OpenLAPP",
  detail: "Demo",
  capabilities: { toolCalling: true, imageInput: false, vision: false, agentMode: true },
};

describe("model information fingerprint", () => {
  it("changes when name, limits, capabilities, or labels change", () => {
    const original = modelInformationFingerprint(base);
    expect(modelInformationFingerprint({ ...base, name: "Other" })).not.toBe(original);
    expect(modelInformationFingerprint({ ...base, maxInputTokens: 2000 })).not.toBe(original);
    expect(modelInformationFingerprint({ ...base, capabilities: { ...base.capabilities, imageInput: true } })).not.toBe(original);
    expect(modelInformationFingerprint({ ...base, detail: "Other provider" })).not.toBe(original);
    expect(catalogFingerprint([base])).toBe(catalogFingerprint([{ ...base }]));
  });
});
