import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const media = path.join(root, "media");
const dest = path.join(media, "icon.png");
if (!fs.existsSync(dest)) {
  throw new Error("media/icon.png is missing; restore it with python brand/distribute.py");
}
console.log("media/icon.png present");
