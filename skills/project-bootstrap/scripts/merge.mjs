// Fusion de fichiers partagés avec un fichier existant du projet : jamais de perte, rien n'est retiré.
// - mergeLines : fichiers de lignes (.gitignore, .gitattributes). Ajoute les règles absentes, par blocs.
// - mergeJson  : fichiers JSON (.claude/settings.json). Objets fusionnés par clé, tableaux réunis sans doublon,
//                valeurs scalaires de l'existant conservées.

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
