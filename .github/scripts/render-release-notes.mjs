import fs from "node:fs";

const tag = process.env.GITHUB_REF_NAME ?? process.argv[2] ?? "";
const version = tag.replace(/^v/, "");
if (!version) {
  console.error("usage: render-release-notes.mjs <tag>");
  process.exit(1);
}

const changelog = fs.existsSync("CHANGELOG.md") ? fs.readFileSync("CHANGELOG.md", "utf8") : "";
const lines = changelog.split(/\r?\n/);
const notes = [];
let inSection = false;
for (const line of lines) {
  if (/^## [0-9]/.test(line)) {
    if (inSection) break;
    if (new RegExp(`^## ${version.replaceAll(".", "\\.")}(?: |$|-)`).test(line)) {
      inSection = true;
      notes.push(line);
    }
    continue;
  }
  if (inSection) notes.push(line);
}

const body = inSection ? `${notes.join("\n").trim()}\n` : `${tag}\n`;
if (!inSection) {
  console.warn(`No CHANGELOG.md section for ${version}; writing the tag as notes.`);
}
fs.writeFileSync("release-notes.md", body);
console.log(`Rendered release notes for ${version} (${body.trim().split(/\n/).length} lines)`);
