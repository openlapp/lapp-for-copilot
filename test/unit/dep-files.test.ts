import { describe, expect, it } from "vitest";
import {
  VSIX_VENDOR_ALLOWLIST,
  VSIX_VENDOR_AUDIT_EXCLUSIONS,
  isNonRuntimeDependencyPath,
  isVsixVendorPath,
} from "../../src/shared/dep-files.js";

describe("runtime dependency allowlist", () => {
  it("keeps SDK runtime files and drops tests/specs/github", () => {
    expect(isNonRuntimeDependencyPath("@openlapp/lapp/dist/index.js")).toBe(false);
    expect(isNonRuntimeDependencyPath("@openlapp/lapp/schema/provider.schema.json")).toBe(false);
    expect(isNonRuntimeDependencyPath("@openlapp/lapp/conformance/sdk-v1/openai-chat-completions.json")).toBe(true);
    expect(isNonRuntimeDependencyPath("ajv/lib/ajv.js")).toBe(false);
    expect(isNonRuntimeDependencyPath("ajv/spec/index.spec.js")).toBe(true);
    expect(isNonRuntimeDependencyPath("something/test/foo.js")).toBe(true);
    expect(isNonRuntimeDependencyPath(".github/workflows/ci.yml")).toBe(true);
  });
});

describe("VSIX vendor allowlist", () => {
  it("packs only the runtime SDK tarball and vendor/PROVENANCE.md", () => {
    expect([...VSIX_VENDOR_ALLOWLIST]).toEqual([
      "vendor/openlapp-lapp-0.1.3-copilot.0.tgz",
      "vendor/PROVENANCE.md",
    ]);
    expect(isVsixVendorPath("vendor/openlapp-lapp-0.1.3-copilot.0.tgz")).toBe(true);
    expect(isVsixVendorPath("vendor/PROVENANCE.md")).toBe(true);
    expect(isVsixVendorPath("./vendor/PROVENANCE.md")).toBe(true);
  });

  it("excludes audit-only patch, source archive, and detailed provenance", () => {
    expect([...VSIX_VENDOR_AUDIT_EXCLUSIONS]).toEqual([
      "vendor/openlapp-lapp-0.1.3-copilot.0.patch",
      "vendor/openlapp-lapp-0.1.3-copilot.0-source.tar.gz",
      "vendor/openlapp-lapp-0.1.3-copilot.0-provenance.md",
    ]);
    for (const rel of VSIX_VENDOR_AUDIT_EXCLUSIONS) {
      expect(isVsixVendorPath(rel)).toBe(false);
    }
    expect(isVsixVendorPath("vendor/secret.env")).toBe(false);
    expect(isVsixVendorPath("vendor")).toBe(false);
  });
});
