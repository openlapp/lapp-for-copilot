import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

for (const leftover of ["extension.js", "extension.js.map"]) {
  fs.rmSync(path.join(root, "dist", leftover), { force: true });
}

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "src", "extension.ts")],
  outfile: path.join(root, "dist", "extension.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  sourcesContent: false,
  legalComments: "none",
  minify: false,
  logLevel: "info",
  external: ["vscode", "@openlapp/lapp", "@napi-rs/keyring"],
});
