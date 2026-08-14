import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { vsixReportMatches } from "./build-report-vsix.mjs";
import {
  isNonRuntimeDependencyPath,
  isVsixVendorPath,
  VSIX_VENDOR_ALLOWLIST,
  VSIX_VENDOR_AUDIT_EXCLUSIONS,
} from "./dep-files.mjs";
import { assertZipContainer, extractZip, listZipEntries } from "./zip-vsix.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vsixDir = path.join(root, "dist-vsix");
const files = fs.existsSync(vsixDir) ? fs.readdirSync(vsixDir).filter((name) => name.endsWith(".vsix")) : [];
if (files.length === 0) {
  throw new Error("no VSIX found; run pnpm package first");
}
const vsixPath = path.join(vsixDir, files.sort().at(-1));
const dest = fs.mkdtempSync(path.join(os.tmpdir(), "lapp-vsix-"));
const failures = [];

const bytes = fs.readFileSync(vsixPath);
const digest = crypto.createHash("sha512").update(bytes).digest("hex");
const reportPath = path.join(root, "BUILD_REPORT.md");
if (!fs.existsSync(reportPath) || !vsixReportMatches(fs.readFileSync(reportPath, "utf8"), {
  size: bytes.length,
  sha512: digest,
})) {
  failures.push("BUILD_REPORT VSIX size/SHA-512 does not match the packaged artifact");
}
try {
  assertZipContainer(bytes, vsixPath);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

let entries = [];
try {
  entries = await listZipEntries(vsixPath);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (entries.some((name) => name.startsWith("PaxHeader/") || name.includes("ustar"))) {
  failures.push("archive contains tar/pax markers; VSIX must be a ZIP");
}
if (!entries.includes("extension.vsixmanifest") && !entries.includes("[Content_Types].xml")) {
  failures.push("ZIP is missing VSIX root entries (extension.vsixmanifest / [Content_Types].xml)");
}

try {
  await extractZip(vsixPath, dest);
} catch (error) {
  failures.push(`ZIP extract failed: ${error instanceof Error ? error.message : String(error)}`);
}

const ext = path.join(dest, "extension");
function mustExist(rel) {
  if (!fs.existsSync(path.join(ext, rel))) failures.push(`missing ${rel}`);
}
function mustNotExist(rel) {
  if (fs.existsSync(path.join(ext, rel))) failures.push(`unexpected ${rel}`);
}

mustExist("package.json");
mustExist("dist/extension.cjs");
mustExist("dist/webview/assets/index.js");
mustExist("node_modules/@openlapp/lapp/package.json");
mustExist("node_modules/@openlapp/lapp/dist/index.js");
mustExist("node_modules/@openlapp/lapp/schema/provider.schema.json");
for (const rel of VSIX_VENDOR_ALLOWLIST) mustExist(rel);
for (const rel of VSIX_VENDOR_AUDIT_EXCLUSIONS) mustNotExist(rel);
mustNotExist("dist/extension.cjs.map");
mustNotExist("node_modules/@openlapp/lapp/conformance");
mustNotExist("test");
mustNotExist(".env");

const packedVendor = path.join(ext, "vendor");
if (fs.existsSync(packedVendor)) {
  for (const name of fs.readdirSync(packedVendor)) {
    const rel = `vendor/${name}`;
    if (!isVsixVendorPath(rel)) failures.push(`unexpected vendor path packed: ${rel}`);
  }
}

if (fs.existsSync(path.join(ext, "package.json"))) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ext, "package.json"), "utf8"));
  if (pkg.publisher !== "openlapp" || pkg.name !== "lapp-for-copilot") {
    failures.push(`unexpected identity ${pkg.publisher}.${pkg.name}`);
  }
  if (pkg.version !== "0.1.0") failures.push(`unexpected version ${pkg.version}`);
  if (!pkg.extensionKind?.includes("ui")) failures.push("extensionKind must be ui");
  if (!pkg.contributes?.languageModelChatProviders?.some((entry) => entry.vendor === "openlapp")) {
    failures.push("missing openlapp languageModelChatProviders contribution");
  }
  if (pkg.contributes?.configuration) failures.push("must not contribute a provider configuration schema");
  if (pkg.contributes?.viewsContainers) failures.push("must not contribute an Activity Bar container");
  if (JSON.stringify(pkg).includes("file:../")) failures.push("sibling file:../ dependency leaked into VSIX");
}

const nativeHits = [];
if (fs.existsSync(ext)) {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = path.relative(ext, full).split(path.sep).join("/");
        if (entry.name.endsWith(".map")) failures.push(`source map packed: ${rel}`);
        if (entry.name.endsWith(".node")) nativeHits.push(rel);
        if (rel.startsWith("node_modules/") && isNonRuntimeDependencyPath(rel.slice("node_modules/".length))) {
          failures.push(`non-runtime dependency packed: ${rel}`);
        }
      }
    }
  }
  walk(ext);
}
if (!nativeHits.some((rel) => rel.includes("win32-x64") || rel.includes("keyring"))) {
  failures.push("Windows x64 keyring native loader is missing");
}

const tarball = fs.readFileSync(path.join(root, "vendor", "openlapp-lapp-0.1.3-copilot.0.tgz"));
const expected = "5789550C75CD5E3A4D3CB0C11C6EE66A06F69872AFCB5BA69CE64C0E29F54753BFDDDB79A1B92E3C630E81BBCF6C457A97D4B2FFABF936A4B29EEF6DC7AB461D";
const actual = crypto.createHash("sha512").update(tarball).digest("hex").toUpperCase();
if (actual !== expected) failures.push("vendored SDK SHA-512 mismatch");

if (fs.existsSync(path.join(ext, "node_modules/@openlapp/lapp/package.json"))) {
  const packed = JSON.parse(fs.readFileSync(path.join(ext, "node_modules/@openlapp/lapp/package.json"), "utf8"));
  if (packed.version !== "0.1.3-copilot.0") failures.push(`packed SDK version ${packed.version}`);
}

const install = installWithIsolatedVsCode(vsixPath);
if (!install.ok) failures.push(install.message);
else console.log(install.message);

fs.rmSync(dest, { recursive: true, force: true });
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`VSIX ok: ${vsixPath}`);
console.log(`zip-entries: ${entries.length}`);
console.log(`native: ${nativeHits.join(", ")}`);

function quote(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function runCodeCli(cli, args) {
  const command = [cli, ...args].map(quote).join(" ");
  return spawnSync(command, {
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  });
}

function resolveCodeCli() {
  const candidates = [
    path.join(root, ".vscode-test", "vscode-1.133.0", "bin", "code.cmd"),
    path.join(root, ".vscode-test", "vscode-1.128.1", "bin", "code.cmd"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function installWithIsolatedVsCode(vsix) {
  const cli = resolveCodeCli();
  if (!cli) {
    return {
      ok: false,
      message: "VS Code CLI not found under .vscode-test/vscode-1.133.0/bin/code.cmd for isolated install",
    };
  }
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), "lapp-vscode-install-"));
  const extensionsDir = path.join(isolated, "extensions");
  const userDataDir = path.join(isolated, "user-data");
  fs.mkdirSync(extensionsDir, { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  const installResult = runCodeCli(cli, [
    "--install-extension",
    vsix,
    "--force",
    "--extensions-dir",
    extensionsDir,
    "--user-data-dir",
    userDataDir,
  ]);
  const listResult = runCodeCli(cli, [
    "--list-extensions",
    "--show-versions",
    "--extensions-dir",
    extensionsDir,
    "--user-data-dir",
    userDataDir,
  ]);
  const combined = `${installResult.stdout ?? ""}\n${installResult.stderr ?? ""}\n${listResult.stdout ?? ""}\n${listResult.stderr ?? ""}`;
  const listed = (listResult.stdout ?? "").trim();
  fs.rmSync(isolated, { recursive: true, force: true });
  if (installResult.status !== 0) {
    return {
      ok: false,
      message: `isolated VS Code install failed (${cli} exit ${installResult.status}): ${combined.trim()}`,
    };
  }
  if (!listed.includes("openlapp.lapp-for-copilot")) {
    return {
      ok: false,
      message: `isolated VS Code --list-extensions did not include openlapp.lapp-for-copilot (got ${JSON.stringify(listed)})`,
    };
  }
  return {
    ok: true,
    message: `isolated install/list ok via ${cli}: ${listed.split(/\r?\n/).filter(Boolean).join(", ")}`,
  };
}
