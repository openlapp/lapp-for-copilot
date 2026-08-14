import { describe, expect, it } from "vitest";
import { buildCatalog, evaluateModel, hasExplicitCapability } from "../../src/eligibility.js";
import { publicModelId } from "../../src/model-id.js";
import { makeProfile } from "../helpers/profile.js";
import type { ModelDescriptor } from "@openlapp/lapp";

function descriptor(over: Partial<ModelDescriptor> = {}): ModelDescriptor {
  return {
    providerId: "demo",
    providerEnabled: true,
    modelId: "demo-chat",
    modelEnabled: true,
    protocols: ["openai-chat-completions"],
    baseUrl: "https://api.example.test/v1",
    ...over,
  };
}

describe("eligibility", () => {
  it("excludes disabled provider or model", () => {
    expect(evaluateModel(descriptor({ providerEnabled: false })).ok).toBe(false);
    expect(evaluateModel(descriptor({ modelEnabled: false })).ok).toBe(false);
  });

  it("excludes unsupported protocols", () => {
    expect(evaluateModel(descriptor({ protocols: ["openai-images"] })).ok).toBe(false);
  });

  it("allows missing outputModalities and excludes explicit non-text", () => {
    expect(evaluateModel(descriptor({ outputModalities: undefined })).ok).toBe(true);
    expect(evaluateModel(descriptor({ outputModalities: ["image"] })).ok).toBe(false);
    expect(evaluateModel(descriptor({ outputModalities: ["text", "image"] })).ok).toBe(true);
  });

  it("never infers tool/image/stream from the model name", () => {
    const named = evaluateModel(descriptor({
      modelName: "gpt-vision-tools-stream",
      capabilities: [],
      inputModalities: ["text"],
    }));
    expect(named.ok).toBe(true);
    if (named.ok) {
      expect(named.eligible.toolCalling).toBe(false);
      expect(named.eligible.streaming).toBe(false);
      expect(named.eligible.imageInput).toBe(false);
    }
    expect(hasExplicitCapability(["chat"], "tool-call")).toBe(false);
  });

  it("advertises capabilities only when explicit", () => {
    const eligible = evaluateModel(descriptor({
      capabilities: ["chat", "stream", "tool-call"],
      inputModalities: ["text", "image"],
    }));
    expect(eligible.ok).toBe(true);
    if (eligible.ok) {
      expect(eligible.eligible.toolCalling).toBe(true);
      expect(eligible.eligible.streaming).toBe(true);
      expect(eligible.eligible.imageInput).toBe(true);
    }
  });

  it("applies token fallbacks and excludes contradictory limits", () => {
    const both = evaluateModel(descriptor({ contextWindow: 10000, maxOutputTokens: 2000 }));
    expect(both.ok).toBe(true);
    if (both.ok) {
      expect(both.eligible.maxInputTokens).toBe(8000);
      expect(both.eligible.maxOutputTokens).toBe(2000);
    }
    const contextOnly = evaluateModel(descriptor({ contextWindow: 8000 }));
    expect(contextOnly.ok).toBe(true);
    if (contextOnly.ok) {
      expect(contextOnly.eligible.maxOutputTokens).toBe(2000);
      expect(contextOnly.eligible.maxInputTokens).toBe(6000);
    }
    const outputOnly = evaluateModel(descriptor({ maxOutputTokens: 111 }));
    expect(outputOnly.ok).toBe(true);
    if (outputOnly.ok) {
      expect(outputOnly.eligible.maxInputTokens).toBe(8192);
      expect(outputOnly.eligible.maxOutputTokens).toBe(111);
    }
    const neither = evaluateModel(descriptor({}));
    expect(neither.ok).toBe(true);
    if (neither.ok) {
      expect(neither.eligible.maxInputTokens).toBe(28672);
      expect(neither.eligible.maxOutputTokens).toBe(4096);
    }
    expect(evaluateModel(descriptor({ contextWindow: 10, maxOutputTokens: 10 })).ok).toBe(false);
    expect(evaluateModel(descriptor({ contextWindow: 1.5 as unknown as number })).ok).toBe(false);
    expect(evaluateModel(descriptor({ contextWindow: Number.MAX_SAFE_INTEGER + 1 })).ok).toBe(false);
  });

  it("builds stable public ids without exposing provider/model ids", () => {
    const catalog = buildCatalog(makeProfile());
    expect(catalog.models).toHaveLength(1);
    const model = catalog.models[0]!;
    expect(model.publicId).toBe(publicModelId({ providerId: "demo", modelId: "demo-chat" }));
    expect(model.publicId.startsWith("lapp-")).toBe(true);
    expect(model.selector.startsWith("openlapp/lapp-")).toBe(true);
    expect(model.publicId.includes("demo")).toBe(false);
  });
});
