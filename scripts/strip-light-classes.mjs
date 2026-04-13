/**
 * Remove tokens Tailwind `light:...` (reverter tema claro).
 * node scripts/strip-light-classes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");

function stripLights(s) {
  let out = s;
  let prev;
  do {
    prev = out;
    out = out.replace(/\s+light:[^\s"'`>]+/g, "");
  } while (out !== prev);
  return out;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (name === "theme") continue;
      walk(p, files);
    } else if (p.endsWith(".tsx") || p.endsWith(".ts")) files.push(p);
  }
  return files;
}

let n = 0;
for (const file of walk(root)) {
  const orig = fs.readFileSync(file, "utf8");
  const next = stripLights(orig);
  if (next !== orig) {
    fs.writeFileSync(file, next);
    n++;
  }
}
console.log("Ficheiros limpos:", n);
