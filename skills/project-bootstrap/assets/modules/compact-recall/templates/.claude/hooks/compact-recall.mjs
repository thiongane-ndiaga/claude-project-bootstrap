#!/usr/bin/env node
// Hook SessionStart (matcher compact) : après une compaction, écrit sur la sortie standard un rappel lu sur le disque
// (branche courante, changements OpenSpec en cours avec leurs tâches faites). Claude Code ajoute cette sortie au contexte.
// Aucune CLI hors git ; ne bloque jamais la session : toute erreur est ignorée et la sortie est 0.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_CHANGES = 10;
// Racine du projet : deux dossiers au-dessus de .claude/hooks, quel que soit le dossier courant.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lines = ["Contexte compacté : relis CLAUDE.md (règles, échelle d'arbitrage) et docs/workflow.md avant de poursuivre."];

try {
  const git = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  const branch = (git.stdout ?? "").trim();
  if (git.status === 0 && branch) lines.push(`Branche : ${branch}`);
} catch {
  // volontairement ignoré
}

try {
  const dir = path.join(root, "openspec", "changes");
  if (existsSync(dir)) {
    const changes = [];
    for (const name of readdirSync(dir).sort()) {
      if (name === "archive" || !statSync(path.join(dir, name)).isDirectory()) continue;
      const tasks = path.join(dir, name, "tasks.md");
      if (!existsSync(tasks)) continue;
      const text = readFileSync(tasks, "utf8").replace(/\r\n?/g, "\n");
      const done = (text.match(/^\s*- \[[xX]\]/gm) ?? []).length;
      const open = (text.match(/^\s*- \[ \]/gm) ?? []).length;
      changes.push(`- ${name} : ${done}/${done + open} tâches faites`);
    }
    if (changes.length) {
      lines.push("Changements OpenSpec en cours :", ...changes.slice(0, MAX_CHANGES));
      if (changes.length > MAX_CHANGES) lines.push(`- … ${changes.length - MAX_CHANGES} autres`);
    }
  }
} catch {
  // volontairement ignoré
}

process.stdout.write(lines.join("\n") + "\n");
process.exit(0);
