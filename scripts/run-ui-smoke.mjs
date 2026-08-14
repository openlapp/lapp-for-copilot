import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractZip } from "./zip-vsix.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportPath = path.join(root, "out", "ui-smoke-status.json");
const UI_VERSION = "1.133.0";
const repoStorage = path.join(root, ".vscode-test-ui");
const storage = path.join(os.tmpdir(), "lapp-for-copilot-ui-smoke");
const checks = [
  "command palette Open Manager",
  "manager page title and navigation",
  "chat model picker shows openlapp model",
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

function writeReport(report) {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

function blocked(reason, extra = {}) {
  writeReport({ status: "BLOCKED", reason, ...extra });
  process.exit(0);
}

function failed(reason, extra = {}) {
  writeReport({ status: "FAILED", reason, ...extra });
  process.exit(1);
}

function writeSmokeProfile(home) {
  const providerDir = path.join(home, "providers", "demo");
  fs.mkdirSync(providerDir, { recursive: true });
  fs.writeFileSync(path.join(home, "global.json"), `${JSON.stringify({
    schemaVersion: "1.0",
    defaults: { chat: { providerId: "demo", modelId: "demo-chat" } },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(providerDir, "provider.json"), `${JSON.stringify({
    schemaVersion: "1.0",
    id: "demo",
    name: "Demo",
    enabled: true,
    baseUrl: "http://127.0.0.1:9/v1",
    protocols: ["openai-chat-completions"],
    auth: { type: "none" },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(providerDir, "models.json"), `${JSON.stringify({
    schemaVersion: "1.0",
    models: [{
      id: "demo-chat",
      name: "Demo Chat",
      enabled: true,
      protocols: ["openai-chat-completions"],
      inputModalities: ["text"],
      outputModalities: ["text"],
      capabilities: ["chat", "stream", "tool-call"],
    }],
  }, null, 2)}\n`);
}

function localStableRoot() {
  const dir = path.join(root, ".vscode-test", `vscode-${UI_VERSION}`);
  const exe = path.join(dir, "Code.exe");
  return fs.existsSync(exe) ? dir : undefined;
}

function platformCodeFolderName() {
  if (process.arch === "x64") return "VSCode-win32-x64-archive";
  if (process.arch === "arm64") return "VSCode-win32-arm64-archive";
  throw new Error(`unsupported arch ${process.arch}`);
}

function stageLocalVSCode(sourceRoot) {
  const dest = path.join(storage, platformCodeFolderName());
  fs.mkdirSync(storage, { recursive: true });
  const destExe = path.join(dest, "Code.exe");
  if (fs.existsSync(destExe)) return dest;
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.symlinkSync(sourceRoot, dest, "junction");
  if (!fs.existsSync(destExe)) {
    throw new Error(`staged VS Code missing Code.exe at ${destExe}`);
  }
  return dest;
}

function chromeDriverPresent(dir = storage) {
  const candidates = [
    path.join(dir, "chromedriver.exe"),
    path.join(dir, "chromedriver"),
    path.join(dir, "chromedriver-win64", "chromedriver.exe"),
    path.join(dir, "chromedriver-win32", "chromedriver.exe"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function reuseRepoChromeDriver() {
  if (chromeDriverPresent(storage)) return;
  const source = chromeDriverPresent(repoStorage);
  if (!source) return;
  const rel = path.relative(repoStorage, path.dirname(source));
  const destDir = path.join(storage, rel);
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(path.dirname(source), destDir, { recursive: true });
}

async function installExtensionFromVsix(vsixPath, extensionsDir) {
  const dest = path.join(extensionsDir, "openlapp.lapp-for-copilot-0.1.0");
  const tmp = path.join(storage, "vsix-unpack");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  await extractZip(vsixPath, tmp);
  const extSrc = path.join(tmp, "extension");
  if (!fs.existsSync(path.join(extSrc, "package.json"))) {
    throw new Error("VSIX missing extension/package.json");
  }
  fs.mkdirSync(extensionsDir, { recursive: true });
  fs.cpSync(extSrc, dest, { recursive: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (process.platform !== "win32") {
  blocked(`pre-launch: platform ${process.platform} is not win32`);
}

const sourceRoot = localStableRoot();
if (!sourceRoot) {
  blocked(
    `pre-launch: local Stable ${UI_VERSION} missing at .vscode-test/vscode-${UI_VERSION}/Code.exe`,
  );
}

let staged;
try {
  staged = stageLocalVSCode(sourceRoot);
} catch (error) {
  blocked(`pre-launch: cannot stage local VS Code: ${error instanceof Error ? error.message : String(error)}`);
}

const compiled = path.join(root, "out", "ui-smoke", "manager-smoke.cjs");
const build = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules", "esbuild", "bin", "esbuild"),
    path.join(root, "test", "ui-smoke", "manager-smoke.ts"),
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--external:vscode-extension-tester",
    `--outfile=${compiled}`,
  ],
  { cwd: root, encoding: "utf8" },
);
if (build.status !== 0) {
  failed(`ui-smoke compile failed: ${build.stderr || build.stdout}`);
}

const lappHome = path.join(storage, "lapp-home");
fs.rmSync(lappHome, { recursive: true, force: true });
writeSmokeProfile(lappHome);
process.env.LAPP_HOME = lappHome;
process.env.OPENLAPP_ACCEPT_SHARED_PROFILE = "1";
process.env.TEST_RESOURCES = storage;
process.env.CODE_VERSION = UI_VERSION;
delete process.env.CODE_TYPE;

const require = createRequire(import.meta.url);
const { ExTester, ReleaseQuality } = require("vscode-extension-tester");
const extensionsDir = path.join(storage, "extensions");
const tester = new ExTester(storage, ReleaseQuality.Stable, extensionsDir);

let launched = false;
let artifactReady = false;
try {
  reuseRepoChromeDriver();
  if (!chromeDriverPresent()) {
    try {
      await tester.downloadChromeDriver(UI_VERSION);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!chromeDriverPresent()) {
        blocked(`pre-launch: ChromeDriver unavailable for local VS Code ${UI_VERSION}: ${message}`, {
          executable: path.join(staged, "Code.exe"),
        });
      }
    }
  }

  const vsixPath = path.join(root, "dist-vsix", "lapp-for-copilot-0.1.0.vsix");
  if (!fs.existsSync(vsixPath)) {
    const pack = spawnSync("pnpm", ["package"], { cwd: root, stdio: "inherit", shell: true });
    if (pack.status !== 0 || !fs.existsSync(vsixPath)) {
      failed(`ui-smoke could not produce ${vsixPath} (exit ${pack.status ?? "null"})`);
    }
  }

  artifactReady = true;
  await installExtensionFromVsix(vsixPath, extensionsDir);

  launched = true;
  const code = await tester.runTests([compiled], {
    vscodeVersion: UI_VERSION,
    settings: path.join(root, "test", "ui-smoke", "settings.json"),
    config: path.join(root, "test", "ui-smoke", ".mocharc.json"),
    offline: true,
    resources: [],
  });
  if (code !== 0) {
    failed(`vscode-extension-tester mocha exited ${code}`, {
      executable: path.join(staged, "Code.exe"),
      storage,
    });
  }
} catch (error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  if (!launched && !artifactReady) {
    blocked(`pre-launch: ${message}`, { executable: path.join(staged, "Code.exe") });
  }
  failed(`vscode-extension-tester: ${message}`, {
    executable: path.join(staged, "Code.exe"),
    storage,
  });
}

writeReport({
  status: "PASSED",
  tests: checks,
  version: UI_VERSION,
  executable: path.join(staged, "Code.exe"),
  storage,
  lappHome,
});
