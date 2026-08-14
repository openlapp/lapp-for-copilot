import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
for (const rel of ["dist", "out", ".tmp-vsix", ".tmp-package"]) {
  fs.rmSync(path.join(root, rel), { recursive: true, force: true });
}
