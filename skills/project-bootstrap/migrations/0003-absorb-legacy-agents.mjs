// Migration de fichiers : avec le module agent-profiles, les quatre agents historiques et le hook restrict-path.mjs
// ne sont plus générés (ARCH-016). Un projet déjà généré les contient encore ; `scaffold.mjs --update` les signale
// « retired » et les retire du manifeste sans les supprimer.
// Un fichier n'est retiré que s'il est égal (fins de ligne ramenées à LF) à sa copie `.bootstrap/base/<chemin>.base`,
// la version générée la dernière fois : sans copie ou modifié, il est conservé et signalé par une note.
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

export const id = "0003-absorb-legacy-agents";
export const title = "Retirer les agents historiques absorbés par les profils";
export const modules = ["agent-profiles"];

const AGENTS = [".claude/agents/architecture-explorer.md", ".claude/agents/arc42-keeper.md", ".claude/agents/spec-reviewer.md", ".claude/agents/traceability-checker.md"];
const HOOK = ".claude/hooks/restrict-path.mjs";

const readText = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const here = (target, rel) => path.join(target, ...rel.split("/"));
const baseOf = (target, rel) => path.join(target, ".bootstrap", "base", ...rel.split("/")) + ".base";

// fichiers de .claude/ (hors ceux à retirer) qui citent le hook restrict-path.mjs
function citingHook(target, removed) {
  const found = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (!removed.has(path.relative(target, full).split(path.sep).join("/")) && name !== "restrict-path.mjs" && readText(full).includes("restrict-path")) found.push(path.relative(target, full).split(path.sep).join("/"));
    }
  };
  walk(path.join(target, ".claude"));
  return found;
}

export function plan({ target, manifest }) {
  const actions = [];
  const notes = [];
  const intact = (rel) => {
    if (!existsSync(here(target, rel))) return false;
    if (!existsSync(baseOf(target, rel))) {
      notes.push(`${rel} conservé : pas de copie de base dans .bootstrap/base (fichier conservé, adopté ou fusionné). À retirer à la main s'il ne sert plus.`);
      return false;
    }
    if (readText(here(target, rel)) !== readText(baseOf(target, rel))) {
      notes.push(`${rel} conservé : modifié par le projet. Les profils ne le bornent plus (hors de la table du hook) ; le retirer à la main s'il ne sert plus.`);
      return false;
    }
    return true;
  };
  const toRemove = AGENTS.filter(intact);
  if (existsSync(here(target, HOOK)) && intact(HOOK)) {
    const citers = citingHook(target, new Set(toRemove));
    if (citers.length) notes.push(`${HOOK} conservé : cité par ${citers.join(", ")}.`);
    else toRemove.push(HOOK);
  }
  for (const rel of toRemove) {
    actions.push({
      description: `Retirer ${rel} (remplacé par les profils architect et qa-engineer)`,
      command: `rm ${rel}`,
      run() {
        unlinkSync(here(target, rel));
        unlinkSync(baseOf(target, rel));
        delete manifest.files?.[rel];
      },
    });
  }
  return { actions, notes };
}
