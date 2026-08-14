import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const require = createRequire(import.meta.url);
const yazl = require("yazl");
const yauzl = require("yauzl");

const LOCAL_FILE_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const EOCD_SIGNATURE = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

export function assertZipContainer(buffer, label = "archive") {
  if (buffer.length < 22) {
    throw new Error(`${label} is too small to be a ZIP (${buffer.length} bytes)`);
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
    const head = buffer.subarray(0, 8).toString("latin1");
    throw new Error(
      `${label} is not a ZIP: missing local file header PK\\x03\\x04 (head ${JSON.stringify(head)})`,
    );
  }
  if (findEocdOffset(buffer) < 0) {
    throw new Error(
      `${label} is not a ZIP: end of central directory record signature not found`,
    );
  }
}

export function findEocdOffset(buffer) {
  const maxComment = 0xffff;
  const start = Math.max(0, buffer.length - (22 + maxComment));
  for (let i = buffer.length - 22; i >= start; i -= 1) {
    if (
      buffer[i] === EOCD_SIGNATURE[0]
      && buffer[i + 1] === EOCD_SIGNATURE[1]
      && buffer[i + 2] === EOCD_SIGNATURE[2]
      && buffer[i + 3] === EOCD_SIGNATURE[3]
    ) {
      const commentLength = buffer.readUInt16LE(i + 20);
      if (i + 22 + commentLength === buffer.length) return i;
    }
  }
  return -1;
}

function collectFiles(root) {
  const files = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) files.push(full);
    }
  }
  walk(root);
  return files;
}

export async function writeZipFromDirectory(sourceDir, destFile) {
  const zipfile = new yazl.ZipFile();
  const files = collectFiles(sourceDir);
  if (files.length === 0) throw new Error(`no files to zip under ${sourceDir}`);
  for (const file of files) {
    const rel = path.relative(sourceDir, file).split(path.sep).join("/");
    zipfile.addFile(file, rel);
  }
  const output = fs.createWriteStream(destFile);
  const done = pipeline(zipfile.outputStream, output);
  zipfile.end();
  await done;
  assertZipContainer(fs.readFileSync(destFile), destFile);
}

export function listZipEntries(file) {
  const buffer = fs.readFileSync(file);
  assertZipContainer(buffer, file);
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: true }, (error, zip) => {
      if (error) {
        reject(new Error(`${file} is not a readable ZIP: ${error.message}`));
        return;
      }
      const entries = [];
      zip.readEntry();
      zip.on("entry", (entry) => {
        entries.push(entry.fileName);
        zip.readEntry();
      });
      zip.on("end", () => resolve(entries));
      zip.on("error", (zipError) => reject(new Error(`${file} ZIP read failed: ${zipError.message}`)));
    });
  });
}

export function extractZip(file, destDir) {
  const buffer = fs.readFileSync(file);
  assertZipContainer(buffer, file);
  fs.mkdirSync(destDir, { recursive: true });
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: true }, (error, zip) => {
      if (error) {
        reject(new Error(`${file} is not a readable ZIP: ${error.message}`));
        return;
      }
      zip.readEntry();
      zip.on("entry", (entry) => {
        const target = path.join(destDir, entry.fileName);
        if (entry.fileName.endsWith("/")) {
          fs.mkdirSync(target, { recursive: true });
          zip.readEntry();
          return;
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        zip.openReadStream(entry, (streamError, readStream) => {
          if (streamError) {
            reject(streamError);
            return;
          }
          const write = fs.createWriteStream(target);
          readStream.pipe(write);
          write.on("close", () => zip.readEntry());
          write.on("error", reject);
        });
      });
      zip.on("end", () => resolve());
      zip.on("error", reject);
    });
  });
}

export { LOCAL_FILE_HEADER };
