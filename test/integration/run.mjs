import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const version = process.env.VSCODE_TEST_VERSION ?? "1.128.1";
const out = path.join(root, "out");
fs.mkdirSync(out, { recursive: true });

function writeStatus(status) {
  fs.writeFileSync(path.join(out, "integration-status.json"), `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status, null, 2));
}

function detectInsiders() {
  const candidates = [
    process.env.VSCODE_INSIDERS,
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Microsoft VS Code Insiders", "Code - Insiders.exe"),
    path.join(process.env.ProgramFiles ?? "", "Microsoft VS Code Insiders", "Code - Insiders.exe"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function localStable(target) {
  const exe = path.join(root, ".vscode-test", `vscode-${target}`, "Code.exe");
  return fs.existsSync(exe) ? exe : undefined;
}

function writeProfile(home, port) {
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
    baseUrl: `http://127.0.0.1:${port}/v1`,
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

const insiders = detectInsiders();
if (insiders) {
  console.log(`Detected VS Code Insiders at ${insiders} (reported separately; tests target Stable).`);
}

const mock = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  res.end("data: {\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n");
});

await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
const port = mock.address().port;
const lappHome = fs.mkdtempSync(path.join(os.tmpdir(), "lapp-home-"));
writeProfile(lappHome, port);

let launched = false;
try {
  let vscodeExecutablePath;
  try {
    vscodeExecutablePath = localStable(version) ?? await downloadAndUnzipVSCode(version);
  } catch (error) {
    writeStatus({
      status: "BLOCKED",
      version,
      insiders: Boolean(insiders),
      reason: `pre-launch: cannot obtain VS Code ${version}: ${error instanceof Error ? error.message : String(error)}`,
    });
    process.exitCode = 0;
    vscodeExecutablePath = undefined;
  }
  if (vscodeExecutablePath) {
    launched = true;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lapp-int-"));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath: root,
      extensionTestsPath: path.join(root, "test", "integration", "suite", "index.mjs"),
      launchArgs: [tmp, "--disable-extensions", "--disable-workspace-trust"],
      extensionTestsEnv: {
        LAPP_HOME: lappHome,
        OPENLAPP_ACCEPT_SHARED_PROFILE: "1",
      },
    });
    writeStatus({ status: "PASSED", version, insiders: Boolean(insiders), executable: vscodeExecutablePath });
  }
} catch (error) {
  writeStatus({
    status: launched ? "FAILED" : "BLOCKED",
    version,
    insiders: Boolean(insiders),
    reason: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = launched ? 1 : 0;
} finally {
  mock.close();
}
