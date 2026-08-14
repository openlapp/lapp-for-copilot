import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, MAX_IMAGE_COUNT } from "../../src/constants.js";
import { validateImagePart, validateImageSet } from "../../src/image.js";
import { gif1x1, jpeg1x1, png1x1, webp1x1 } from "../helpers/images.js";

describe("image validation", () => {
  it("accepts PNG/JPEG/GIF signatures and dimensions", () => {
    expect(validateImagePart("image/png", png1x1())).toMatchObject({ width: 1, height: 1 });
    expect(validateImagePart("image/jpeg", jpeg1x1())).toMatchObject({ width: 1, height: 1 });
    expect(validateImagePart("image/gif", gif1x1())).toMatchObject({ width: 1, height: 1 });
    expect(validateImagePart("image/webp", webp1x1()).width).toBeGreaterThan(0);
  });

  it("rejects bad signatures, oversize, and too many images", () => {
    expect(() => validateImagePart("image/png", Uint8Array.from([1, 2, 3]))).toThrow();
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(png1x1());
    expect(() => validateImagePart("image/png", huge)).toThrow(/5 MiB/);
    expect(() => validateImageSet(Array.from({ length: MAX_IMAGE_COUNT + 1 }, () => validateImagePart("image/png", png1x1())))).toThrow(/10/);
  });

  it("honors cancellation", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => validateImagePart("image/png", png1x1(), controller.signal)).toThrow();
  });
});
