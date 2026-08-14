import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const versionArg = process.argv.find((value) => value.startsWith("--version"));
const version = versionArg
  ? (versionArg.includes("=") ? versionArg.split("=")[1] : process.argv[process.argv.indexOf(versionArg) + 1])
  : process.env.VSCODE_TEST_VERSION ?? "1.128.1";

const build = spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit", shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

const env = {
  ...process.env,
  VSCODE_TEST_VERSION: version,
};
const result = spawnSync(process.execPath, [path.join(root, "test", "integration", "run.mjs")], {
  cwd: root,
  stdio: "inherit",
  env,
});

const marker = path.join(root, "out", "integration-status.json");
if (result.status !== 0 && !fs.existsSync(marker)) {
  process.exit(result.status ?? 1);
}
process.exit(result.status ?? 0);
