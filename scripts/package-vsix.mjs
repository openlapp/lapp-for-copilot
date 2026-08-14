import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyVsixReportFacts } from "./build-report-vsix.mjs";
import { isNonRuntimeDependencyPath, isVsixVendorPath, VSIX_VENDOR_ALLOWLIST } from "./dep-files.mjs";
import { extractZip, writeZipFromDirectory } from "./zip-vsix.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const staging = path.join(root, ".tmp-package");
const outDir = path.join(root, "dist-vsix");

function copyFiltered(from, to, skip) {
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) return;
  if (skip(from, stat)) return;
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      copyFiltered(path.join(from, name), path.join(to, name), skip);
    }
    return;
  }
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function shouldSkipSdk(file, stat) {
  const base = path.basename(file);
  if (stat.isFile() && (base.endsWith(".map") || base.endsWith(".tsbuildinfo"))) return true;
  const rel = path.relative(path.join(root, "node_modules"), file).split(path.sep).join("/");
  return isNonRuntimeDependencyPath(rel);
}

function shouldSkipNative(file, stat) {
  const base = path.basename(file);
  if (stat.isFile() && base.endsWith(".map")) return true;
  return false;
}

function copyPackageIfExists(name, skip = shouldSkipNative) {
  const source = path.join(root, "node_modules", name);
  if (!fs.existsSync(source)) {
    throw new Error(`required package missing: ${name}`);
  }
  copyFiltered(source, path.join(staging, "node_modules", name), skip);
}

const build = spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit", shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(path.join(staging, "node_modules"), { recursive: true });

for (const rel of [
  "package.json",
  "LICENSE",
  "README.md",
  "media",
  "walkthrough",
  "dist",
  ...VSIX_VENDOR_ALLOWLIST,
]) {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) {
    if (rel === "README.md") continue;
    throw new Error(`missing ${rel}`);
  }
  copyFiltered(from, path.join(staging, rel), (file, stat) => {
    const base = path.basename(file);
    return stat.isFile() && (base.endsWith(".map") || base.endsWith(".log"));
  });
}

const stagedVendor = path.join(staging, "vendor");
if (fs.existsSync(stagedVendor)) {
  for (const name of fs.readdirSync(stagedVendor)) {
    const rel = `vendor/${name}`;
    if (!isVsixVendorPath(rel)) {
      throw new Error(`refusing to pack audit-only vendor path: ${rel}`);
    }
  }
}

copyPackageIfExists("@openlapp/lapp", shouldSkipSdk);
copyPackageIfExists("@napi-rs/keyring");
copyPackageIfExists("ajv");
copyPackageIfExists("ajv-formats");
copyPackageIfExists("fast-deep-equal");
copyPackageIfExists("fast-uri");
copyPackageIfExists("json-schema-traverse");
copyPackageIfExists("require-from-string");

const nativeName = "@napi-rs/keyring-win32-x64-msvc";
const nativeCandidates = [
  path.join(root, "node_modules", nativeName),
  path.join(root, "node_modules", "@napi-rs", "keyring", "node_modules", nativeName),
];
const nativeSource = nativeCandidates.find((candidate) => fs.existsSync(candidate));
if (!nativeSource) {
  throw new Error("Windows x64 keyring native package is missing");
}
copyFiltered(nativeSource, path.join(staging, "node_modules", nativeName), shouldSkipNative);

const pkg = JSON.parse(fs.readFileSync(path.join(staging, "package.json"), "utf8"));
delete pkg.scripts;
delete pkg.devDependencies;
delete pkg.pnpm;
pkg.dependencies = { "@openlapp/lapp": pkg.dependencies["@openlapp/lapp"] };
fs.writeFileSync(path.join(staging, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

fs.mkdirSync(outDir, { recursive: true });
const stagedVsix = path.join(staging, `${pkg.name}-${pkg.version}.vsix`);
const vsce = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules", "@vscode", "vsce", "vsce"),
    "package",
    "--no-dependencies",
    "--allow-missing-repository",
    "--out",
    stagedVsix,
  ],
  { cwd: staging, stdio: "inherit" },
);
if (vsce.status !== 0) process.exit(vsce.status ?? 1);

if (!fs.existsSync(stagedVsix)) throw new Error("VSIX was not produced");
const unpack = path.join(staging, "unpacked");
fs.rmSync(unpack, { recursive: true, force: true });
fs.mkdirSync(unpack, { recursive: true });
await extractZip(stagedVsix, unpack);
const extensionRoot = path.join(unpack, "extension");
copyFiltered(path.join(staging, "node_modules"), path.join(extensionRoot, "node_modules"), (file, stat) => {
  const base = path.basename(file);
  if (stat.isFile() && (base.endsWith(".map") || base.endsWith(".tsbuildinfo"))) return true;
  const rel = path.relative(path.join(staging, "node_modules"), file).split(path.sep).join("/");
  return isNonRuntimeDependencyPath(rel);
});
const vsix = path.basename(stagedVsix);
const vsixPath = path.join(outDir, vsix);
fs.rmSync(vsixPath, { force: true });
await writeZipFromDirectory(unpack, vsixPath);
const artifact = fs.readFileSync(vsixPath);
const hash = crypto.createHash("sha512").update(artifact).digest("hex");
fs.writeFileSync(
  path.join(outDir, `${vsix}.sha512`),
  `${hash}  ${vsix}\n`,
);
const reportPath = path.join(root, "BUILD_REPORT.md");
fs.writeFileSync(reportPath, applyVsixReportFacts(fs.readFileSync(reportPath, "utf8"), {
  size: artifact.length,
  sha512: hash,
}));
console.log(`VSIX ${vsixPath}`);
console.log(`SHA-512 ${hash}`);
console.log(`BUILD_REPORT synchronized ${artifact.length} ${hash}`);
