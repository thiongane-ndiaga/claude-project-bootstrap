#!/usr/bin/env node
// Hook SessionStart (mode d'installation local) : met node_modules/.bin devant le PATH de l'outil Bash de la session,
// pour que `claude` lancé directement trouve openspec et archgate. Le fichier CLAUDE_ENV_FILE est lu comme du shell Bash.
// Ne bloque jamais le démarrage : sans CLAUDE_ENV_FILE ou en cas d'échec d'écriture, sortie 0.
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envFile = process.env.CLAUDE_ENV_FILE;
if (envFile) {
  try {
    let bin = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", ".bin");
    // Git Bash sous Windows : C:\a\b -> /c/a/b
    if (process.platform === "win32") bin = bin.replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase()).replace(/\\/g, "/");
    appendFileSync(envFile, `export PATH='${bin.replace(/'/g, "'\\''")}':"$PATH"\n`);
  } catch {
    // volontairement ignoré
  }
}
process.exit(0);
