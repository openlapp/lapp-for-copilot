import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

describe("release notes renderer", () => {
  it("extracts the CHANGELOG section for the current package version", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { version: string };
    const notesPath = path.join(root, "release-notes.md");
    fs.rmSync(notesPath, { force: true });
    const result = spawnSync(process.execPath, [
      path.join(root, ".github", "scripts", "render-release-notes.mjs"),
      `v${pkg.version}`,
    ], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GITHUB_REF_NAME: "main" },
    });
    expect(result.status).toBe(0);
    expect(fs.existsSync(notesPath)).toBe(true);
    const body = fs.readFileSync(notesPath, "utf8");
    expect(body).toContain(`## ${pkg.version}`);
    expect(body).not.toBe("main\n");
    fs.rmSync(notesPath, { force: true });
  });
});
