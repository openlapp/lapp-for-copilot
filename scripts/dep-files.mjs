const SKIP_DIR = new Set(["test", "tests", "__tests__", "spec", ".github", "conformance"]);

export function isNonRuntimeDependencyPath(relativePosix) {
  const parts = String(relativePosix).split("/").filter(Boolean);
  if (parts.some((part) => SKIP_DIR.has(part))) return true;
  const base = parts.at(-1) ?? "";
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(base);
}

/** Vendor paths that may appear in the VSIX. Audit-only artifacts stay in the repo. */
export const VSIX_VENDOR_ALLOWLIST = [
  "vendor/openlapp-lapp-0.1.3-copilot.0.tgz",
  "vendor/PROVENANCE.md",
];

export const VSIX_VENDOR_AUDIT_EXCLUSIONS = [
  "vendor/openlapp-lapp-0.1.3-copilot.0.patch",
  "vendor/openlapp-lapp-0.1.3-copilot.0-source.tar.gz",
  "vendor/openlapp-lapp-0.1.3-copilot.0-provenance.md",
];

export function normalizeVendorRel(relativePosix) {
  return String(relativePosix).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isVsixVendorPath(relativePosix) {
  return VSIX_VENDOR_ALLOWLIST.includes(normalizeVendorRel(relativePosix));
}
