/**
 * TanStack Router code-splitter embeds absolute paths in single-quoted import()
 * strings. Paths like …/mosip's inji/… break Babel's template parser.
 * Re-apply after every `npm install` / `bun install`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(
  root,
  "node_modules/@tanstack/router-plugin/dist/esm/core/code-splitter/compilers.js",
);

const before =
  "template.statement(`const ${splitNodeMeta.localImporterIdent} = () => import('${splitUrl}')`)";
const after =
  "template.statement(`const ${splitNodeMeta.localImporterIdent} = () => import(${JSON.stringify(splitUrl)})`)";

let source;
try {
  source = readFileSync(target, "utf8");
} catch {
  console.warn("[patch-tanstack] compilers.js not found — skip");
  process.exit(0);
}

if (source.includes(after)) {
  console.log("[patch-tanstack] already patched");
  process.exit(0);
}

if (!source.includes(before)) {
  console.warn(
    "[patch-tanstack] expected pattern missing — @tanstack/router-plugin may have changed",
  );
  process.exit(0);
}

const patched = source.replaceAll(before, after);
writeFileSync(target, patched);
console.log("[patch-tanstack] patched apostrophe-safe dynamic imports");
