/**
 * Adiciona utilitários light: nos .tsx sob src/ (uso único; não voltar a correr
 * após o projeto já ter light: nas classes).
 * Executar: node scripts/apply-theme-light.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");

const rules = [
  [/bg-neutral-950\/60/g, "bg-neutral-950/60 light:bg-white/90"],
  [/bg-neutral-950\/50/g, "bg-neutral-950/50 light:bg-white/85"],
  [/bg-neutral-950\/10/g, "bg-neutral-950/10 light:bg-zinc-100"],
  [/bg-neutral-950(?![\w-/])/g, "bg-neutral-950 light:bg-zinc-100"],
  [/bg-neutral-900\/60/g, "bg-neutral-900/60 light:bg-zinc-50"],
  [/bg-neutral-900\/50/g, "bg-neutral-900/50 light:bg-zinc-50"],
  [/bg-neutral-900\/30/g, "bg-neutral-900/30 light:bg-zinc-100"],
  [/bg-neutral-900\/20/g, "bg-neutral-900/20 light:bg-zinc-50"],
  [/bg-neutral-900(?![\w-/])/g, "bg-neutral-900 light:bg-white"],
  [/bg-neutral-800\/80/g, "bg-neutral-800/80 light:bg-zinc-100"],
  [/bg-neutral-800\/50/g, "bg-neutral-800/50 light:bg-zinc-100"],
  [/bg-neutral-800(?![\w-/])/g, "bg-neutral-800 light:bg-zinc-200"],
  [/bg-black\/20/g, "bg-black/20 light:bg-zinc-200/80"],
  [/border-neutral-900/g, "border-neutral-900 light:border-zinc-200"],
  [/border-neutral-800\/80/g, "border-neutral-800/80 light:border-zinc-200"],
  [/border-neutral-800\/50/g, "border-neutral-800/50 light:border-zinc-200"],
  [/border-neutral-800(?![\w-/])/g, "border-neutral-800 light:border-zinc-200"],
  [/border-neutral-700/g, "border-neutral-700 light:border-zinc-300"],
  [/divide-neutral-900/g, "divide-neutral-900 light:divide-zinc-200"],
  [/divide-neutral-800/g, "divide-neutral-800 light:divide-zinc-200"],
  [/text-neutral-50(?![\w-])/g, "text-neutral-50 light:text-zinc-900"],
  [/text-neutral-100(?![\w-])/g, "text-neutral-100 light:text-zinc-900"],
  [/text-neutral-200(?![\w-])/g, "text-neutral-200 light:text-zinc-800"],
  [/text-neutral-300(?![\w-])/g, "text-neutral-300 light:text-zinc-700"],
  [/text-neutral-400(?![\w-])/g, "text-neutral-400 light:text-zinc-600"],
  [/text-neutral-500(?![\w-])/g, "text-neutral-500 light:text-zinc-500"],
  [/text-neutral-600(?![\w-])/g, "text-neutral-600 light:text-zinc-500"],
  [/placeholder:text-neutral-500/g, "placeholder:text-neutral-500 light:placeholder:text-zinc-400"],
  [/placeholder:text-neutral-600/g, "placeholder:text-neutral-600 light:placeholder:text-zinc-400"],
  [/ring-neutral-800/g, "ring-neutral-800 light:ring-zinc-200"],
  [/ring-amber-500\/30/g, "ring-amber-500/30 light:ring-amber-600/25"],
  [/hover:border-neutral-100/g, "hover:border-neutral-100 light:hover:border-zinc-400"],
  [/hover:border-neutral-700/g, "hover:border-neutral-700 light:hover:border-zinc-300"],
  [/hover:bg-neutral-900\/50/g, "hover:bg-neutral-900/50 light:hover:bg-zinc-100"],
  [/hover:bg-neutral-900(?![\w-/])/g, "hover:bg-neutral-900 light:hover:bg-zinc-100"],
  [/hover:bg-neutral-800/g, "hover:bg-neutral-800 light:hover:bg-zinc-200"],
  [/hover:bg-neutral-200/g, "hover:bg-neutral-200 light:hover:bg-zinc-300"],
  [/focus:border-neutral-100/g, "focus:border-neutral-100 light:focus:border-zinc-500"],
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (path.basename(p) === "theme") continue;
      walk(p, files);
    } else if (p.endsWith(".tsx")) files.push(p);
  }
  return files;
}

function alreadyHasLightDuplication(s) {
  return /light:light:/.test(s);
}

const files = walk(root);
let changed = 0;
for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  if (file.includes("theme-toggle") || file.includes("theme-provider")) continue;
  const orig = s;
  for (const [re, rep] of rules) {
    s = s.replace(re, rep);
  }
  if (s !== orig && !alreadyHasLightDuplication(s)) {
    fs.writeFileSync(file, s);
    changed++;
  }
}
console.log("Ficheiros atualizados:", changed);
