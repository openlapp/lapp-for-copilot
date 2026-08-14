import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("dist-vsix");
if (!fs.existsSync(dir)) {
  console.error("dist-vsix/ is missing; run pnpm package first");
  process.exit(1);
}
const files = fs.readdirSync(dir).filter((name) => name.endsWith(".vsix"));
if (files.length !== 1) {
  console.error(`Expected exactly one VSIX in dist-vsix, found ${files.length}`);
  for (const name of files) console.error(`  ${name}`);
  process.exit(1);
}
const vsixPath = path.resolve(dir, files[0]);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `path=${vsixPath}\n`);
}
console.log(vsixPath);
