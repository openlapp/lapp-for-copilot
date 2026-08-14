import { describe, expect, it } from "vitest";
import { buildIdentityMaps, publicModelId } from "../../src/model-id.js";

describe("model ids", () => {
  it("is deterministic SHA-256 base64url", () => {
    const a = publicModelId({ providerId: "p", modelId: "m" });
    const b = publicModelId({ providerId: "p", modelId: "m" });
    expect(a).toBe(b);
    expect(a).toMatch(/^lapp-[A-Za-z0-9_-]+$/);
    expect(publicModelId({ providerId: "p", modelId: "n" })).not.toBe(a);
  });

  it("detects collisions on the reverse map", () => {
    const collided = buildIdentityMaps(
      [
        { providerId: "a", modelId: "1" },
        { providerId: "b", modelId: "2" },
      ],
      () => "lapp-collision",
    );
    expect(collided.diagnostics.some((item) => item.code === "MODEL_ID_COLLISION")).toBe(true);
    expect(collided.fromPublic.has("lapp-collision")).toBe(false);
  });
});
