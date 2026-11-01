#!/usr/bin/env node
// Hook PreToolUse unique des profils d'agents : borne les écritures, le shell, les agents et les skills de chaque profil selon agent_type.
// Sous-agent : agent_type est le nom du profil. Teammate : agent_type est le nom du teammate, qui doit porter celui de son profil.
// Un agent absent de PROFILES (agent principal, autre agent) n'est pas borné. Sortie 2 = refus (stderr renvoyé à Claude).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// write : préfixes (relatifs à la racine du projet) où le profil peut écrire.
// shell : commandes permises en plus de la lecture seule de read-only-bash.mjs (motifs ancrés sur la commande entière).
// agents, skills : agents (subagent_type) et skills que le profil peut lancer lui-même ; tout le reste est refusé. Un agent lancé échappe à cette table
// (son agent_type est le sien) : n'y mettre que des agents déjà bornés par leur propre frontmatter, sans outil Agent.
const PROFILES = {
  architect: {
    write: ["docs/architecture/"],
    agents: ["architecture-explorer", "arc42-keeper"],
    skills: ["archgate:adr-author"],
    // titre : lettres, chiffres, espace et ponctuation simple seulement (ni guillemet, ni parenthèse, ni substitution : PowerShell évalue les parenthèses)
    shell: [/^archgate adr create --title "[\p{L}\p{N} ,.:'’_-]+" --domain [a-z0-9-]+$/u, /^archgate adr domain list$/],
  },
  "qa-engineer": {
    write: ["tests/", "test/"],
    agents: ["spec-reviewer"],
    skills: [],
    shell: [
      /^node \.claude[\\/]hooks[\\/]quality-gate\.mjs$/,
      /^node \.bootstrap[\\/]run-checks\.mjs$/,
      /^archgate review-context( --(staged|run-checks|verbose|strict|base( [\w./-]+)?|domain [\w-]+))*$/,
    ],
  },
  // Agents que les profils peuvent lancer : leurs bornes sont reprises ici pour ne pas dépendre de leur hook de frontmatter (inactif pour un teammate).
  // Sans liste agents ni skills, ils ne lancent rien.
  "arc42-keeper": { write: ["docs/architecture/arc42/"], shell: [] },
  "spec-reviewer": { write: [], shell: [] },
  "architecture-explorer": { write: [], shell: [] },
};

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const AGENT_TOOLS = new Set(["Agent", "Task"]);

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const profile = Object.hasOwn(PROFILES, event.agent_type ?? "") ? PROFILES[event.agent_type] : undefined;
if (!profile) process.exit(0);

const deny = (reason) => {
  process.stderr.write(`Profil ${event.agent_type} : ${reason}\n`);
  process.exit(2);
};
const toolInput = event.tool_input ?? {};

// Pour un profil de la table, toute erreur interne est un refus : un code de sortie 1 laisserait l'outil s'exécuter.
try {
  if (WRITE_TOOLS.has(event.tool_name)) {
    const target = toolInput.file_path ?? toolInput.notebook_path;
    if (!target) deny("chemin d'écriture absent");
    const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
    if (!root) deny("racine du projet inconnue");
    const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
    if (!profile.write.some((prefix) => rel.startsWith(prefix))) {
      deny(`écriture refusée : ${rel} est hors de ${profile.write.join(", ")}`);
    }
  } else if (AGENT_TOOLS.has(event.tool_name)) {
    const type = toolInput.subagent_type ?? "general-purpose";
    if (toolInput.name || toolInput.team_name) deny("agent nommé refusé (un agent nommé est un teammate, que le hook de frontmatter ne borne pas)");
    if (!(profile.agents ?? []).includes(type)) deny(`agent « ${type} » non permis (permis : ${(profile.agents ?? []).join(", ") || "aucun"})`);
  } else if (event.tool_name === "Skill") {
    const skill = String(toolInput.skill ?? "");
    if (!(profile.skills ?? []).includes(skill)) deny(`skill « ${skill} » non permis`);
  } else if (SHELL_TOOLS.has(event.tool_name)) {
    const command = String(toolInput.command ?? "").trim();
    if (!profile.shell.some((re) => re.test(command))) {
      const readOnly = path.join(path.dirname(fileURLToPath(import.meta.url)), "read-only-bash.mjs");
      const res = spawnSync(process.execPath, [readOnly], { input: raw, encoding: "utf8" });
      if (res.status !== 0) deny(res.stderr.trim() || `commande refusée « ${command} »`);
    }
  }
} catch (err) {
  deny(`erreur interne du hook (${err.message})`);
}
process.exit(0);
