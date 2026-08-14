import { describe, expect, it } from "vitest";
import { inspectRuntime } from "../../src/platform.js";

describe("runtime gate", () => {
  const context = { extension: { extensionKind: 1 } } as never;

  it("accepts local Windows x64 UI hosts", () => {
    expect(inspectRuntime(context, { platform: "win32", arch: "x64" }).ok).toBe(true);
  });

  it("rejects remote hosts and non-win32/non-x64", () => {
    expect(inspectRuntime({ extension: { extensionKind: 2 } } as never, { platform: "win32", arch: "x64" }).ok).toBe(false);
    expect(inspectRuntime(context, { platform: "linux", arch: "x64" }).code).toBe("UNSUPPORTED_OS");
    expect(inspectRuntime(context, { platform: "win32", arch: "arm64" }).code).toBe("UNSUPPORTED_ARCH");
  });
});
