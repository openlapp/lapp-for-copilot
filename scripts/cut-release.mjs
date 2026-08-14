import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const push = process.argv.includes("--push");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tag = `v${pkg.version}`;

function git(args, { allowFail = false } = {}) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0 && !allowFail) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(detail || `git ${args.join(" ")} failed`);
  }
  return result;
}

const existing = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true });
if (existing.status === 0) {
  console.error(`tag ${tag} already exists`);
  process.exit(1);
}

git(["tag", "-a", tag, "-m", tag]);
console.log(`tagged ${tag}`);

if (push) {
  git(["push", "origin", "HEAD"]);
  git(["push", "origin", tag]);
  console.log(`pushed HEAD and ${tag} to origin`);
} else {
  console.log(`next: git push origin HEAD && git push origin ${tag}`);
  console.log("or:   pnpm release:push");
}
