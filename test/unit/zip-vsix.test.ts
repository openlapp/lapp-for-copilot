import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// ZIP helper is a Node ESM script; types live beside it and are checked at runtime.
// @ts-expect-error TS7016: no module declaration for .mjs helper
import { assertZipContainer, writeZipFromDirectory } from "../../scripts/zip-vsix.mjs";

describe("VSIX ZIP container", () => {
  it("rejects a USTAR/tar payload the way the broken VSIX was built", () => {
    const ustar = Buffer.alloc(512, 0);
    Buffer.from("extension/").copy(ustar, 0);
    Buffer.from("ustar").copy(ustar, 257);
    expect(() => assertZipContainer(ustar, "fake.vsix")).toThrow(/not a ZIP|end of central directory/i);
  });

  it("accepts a yazl ZIP with EOCD", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "lapp-zip-"));
    writeFileSync(path.join(dir, "extension.vsixmanifest"), "<PackageManifest />\n");
    const dest = path.join(dir, "out.vsix");
    await writeZipFromDirectory(dir, dest);
    const bytes = readFileSync(dest);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(() => assertZipContainer(bytes, dest)).not.toThrow();
  });
});
