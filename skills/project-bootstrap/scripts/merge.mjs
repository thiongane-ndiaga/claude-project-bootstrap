// Fusion de fichiers partagés avec un fichier existant du projet : jamais de perte, rien n'est retiré.
// - mergeLines : fichiers de lignes (.gitignore, .gitattributes). Ajoute les règles absentes, par blocs.
// - mergeJson  : fichiers JSON (.claude/settings.json). Objets fusionnés par clé, tableaux réunis sans doublon,
//                valeurs scalaires de l'existant conservées.

// - mergeThreeWay : fusion à trois voies d'un fichier modifié par le projet (ARCH-006), via `git merge-file`.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// current (fichier du projet), base (ce que le plugin avait généré) et proposed (nouveau modèle) sont en LF.
// Renvoie { status: "clean", text } (aucun conflit), { status: "conflict", text } (text contient les marqueurs, à ne
// jamais écrire dans un fichier du projet) ou { status: "error" } (git absent, interrompu ou en échec).
// env : environnement du processus git (les tests y retirent git du PATH).
export function mergeThreeWay(current, base, proposed, env = process.env) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-merge-"));
  try {
    const [c, b, p] = ["projet", "base", "modele"].map((n) => path.join(dir, n));
    writeFileSync(c, current);
    writeFileSync(b, base);
    writeFileSync(p, proposed);
    const res = spawnSync("git", ["merge-file", "-p", "--diff3", "-L", "projet", "-L", "base", "-L", "modele", c, b, p], { encoding: "utf8", env });
    if (res.error || res.status === null || res.status < 0 || res.status > 127) return { status: "error" };
    const text = (res.stdout ?? "").replace(/\r\n/g, "\n");
    return res.status === 0 ? { status: "clean", text } : { status: "conflict", text };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Blocs séparés par une ligne vide : un bloc n'est ajouté (avec ses commentaires) que s'il apporte au moins une règle absente.
export function mergeLines(existing, generated) {
  const have = new Set(existing.split("\n").map((l) => l.trim()).filter(Boolean));
  const additions = [];
  for (const block of generated.split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const missing = lines.filter((l) => !l.trim().startsWith("#") && !have.has(l.trim()));
    if (missing.length === 0) continue;
    additions.push(lines.filter((l) => l.trim().startsWith("#") || missing.includes(l)).join("\n"));
  }
  if (additions.length === 0) return existing;
  const base = existing.endsWith("\n") || existing === "" ? existing : `${existing}\n`;
  return `${base}${base === "" ? "" : "\n"}${additions.join("\n\n")}\n`;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function mergeValue(current, generated) {
  if (isObject(current) && isObject(generated)) {
    const out = { ...current };
    for (const [k, v] of Object.entries(generated)) out[k] = k in current ? mergeValue(current[k], v) : v;
    return out;
  }
  if (Array.isArray(current) && Array.isArray(generated)) {
    const seen = new Set(current.map((v) => JSON.stringify(v)));
    return [...current, ...generated.filter((v) => !seen.has(JSON.stringify(v)))];
  }
  return current;
}

// Renvoie null si l'existant n'est pas un JSON valide (le fichier est alors traité comme un conflit).
export function mergeJson(existing, generated) {
  let current;
  try {
    current = JSON.parse(existing);
  } catch {
    return null;
  }
  return JSON.stringify(mergeValue(current, JSON.parse(generated)), null, 2) + "\n";
}
