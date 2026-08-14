const SKIP_DIR = new Set(["test", "tests", "__tests__", "spec", ".github", "conformance"]);

export function isNonRuntimeDependencyPath(relativePosix: string): boolean {
  const parts = relativePosix.split("/").filter(Boolean);
  if (parts.some((part) => SKIP_DIR.has(part))) return true;
  const base = parts.at(-1) ?? "";
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(base);
}

export const NON_RUNTIME_DEP_DIRS = [...SKIP_DIR];

/** Vendor paths that may appear in the VSIX. Audit-only artifacts stay in the repo. */
export const VSIX_VENDOR_ALLOWLIST = [
  "vendor/openlapp-lapp-0.1.3-copilot.0.tgz",
  "vendor/PROVENANCE.md",
] as const;

export const VSIX_VENDOR_AUDIT_EXCLUSIONS = [
  "vendor/openlapp-lapp-0.1.3-copilot.0.patch",
  "vendor/openlapp-lapp-0.1.3-copilot.0-source.tar.gz",
  "vendor/openlapp-lapp-0.1.3-copilot.0-provenance.md",
] as const;

export function normalizeVendorRel(relativePosix: string): string {
  return String(relativePosix).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isVsixVendorPath(relativePosix: string): boolean {
  return (VSIX_VENDOR_ALLOWLIST as readonly string[]).includes(normalizeVendorRel(relativePosix));
}
