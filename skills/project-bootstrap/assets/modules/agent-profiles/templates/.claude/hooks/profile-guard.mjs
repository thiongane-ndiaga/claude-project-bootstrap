#!/usr/bin/env node
// Hook PreToolUse unique des profils d'agents : borne les écritures, le shell, les agents et les skills de chaque profil selon agent_type.
// Sous-agent : agent_type est le nom du profil. Teammate : agent_type est le nom du teammate, qui doit porter celui de son profil.
// Un agent absent de PROFILES (session sans réglage `agent`, autre agent) n'est pas borné. Sortie 2 = refus (stderr renvoyé à Claude).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// write : préfixes (relatifs à la racine du projet) où le profil peut écrire.
// shell : commandes permises en plus de la lecture seule de read-only-bash.mjs (motifs ancrés sur la commande entière).
// agents, skills : agents (subagent_type) et skills que le profil peut lancer lui-même ; tout le reste est refusé. Un agent lancé échappe à cette table
// (son agent_type est le sien) : n'y mettre que des agents déjà bornés par leur propre frontmatter, sans outil Agent.
// writeExcept : le profil écrit partout sauf sous ces entrées (dossier terminé par « / », sinon fichier exact), sans tenir compte de la casse ; shellOpen : shell non borné.
// namedAgents : types que le profil peut lancer avec un name égal au type (teammate nommé comme son profil) ; skillsOpen : skills non bornés ;
// shellHint : phrase ajoutée à un refus du shell.
// Commandes gh de pilotage de project-lead : verbe d'écriture d'issue ou de PR, jetons du jeu fermé de read-only-bash.mjs,
// chaîne entre guillemets droits seulement comme valeur de --title, -t ou --subject (ni $, ni accent grave, ni guillemet : aucune substitution),
// --body-file et -F avec un chemin relatif sans « .. », options dangereuses refusées.
const GH_VERBS = new Set(["create", "comment", "edit", "close", "reopen", "merge", "ready"]);
const GH_DENIED_LONG = new Set(["--admin", "--web", "--repo", "--delete-last", "--body", "--editor"]);
const GH_DENIED_SHORT = new Set(["w", "R", "b", "e"]);
const GH_TITLES = new Set(["--title", "-t", "--subject"]);
const GH_WORD = /^[\w./:@^~=,#+-]+$/;
const GH_QUOTED = /^"[\p{L}\p{N} ,.:'’()_/#-]+"$/u;
const GH_PATH = /^[\w.][\w./-]*$/;
function ghPilot(command) {
  if (/[\r\n\u2028\u2029]/.test(command)) return false;
  const tokens = command.match(/"[^"]*"|\S+/gu) ?? [];
  if (tokens[0] !== "gh" || !["issue", "pr"].includes(tokens[1]) || !GH_VERBS.has(tokens[2])) return false;
  const relativePath = (value) => GH_PATH.test(value) && !value.split("/").includes("..");
  let previous = "";
  for (const token of tokens.slice(3)) {
    if (token.startsWith('"')) {
      if (!GH_QUOTED.test(token) || !GH_TITLES.has(previous)) return false;
    } else {
      if (!GH_WORD.test(token)) return false;
      if (token.startsWith("--")) {
        const [name, value] = token.split(/=(.*)/s);
        if (GH_DENIED_LONG.has(name)) return false;
        if (name === "--body-file" && value !== undefined && !relativePath(value)) return false;
      } else if (token.startsWith("-") && token !== "-") {
        if (!/^-[A-Za-z]$/.test(token) || GH_DENIED_SHORT.has(token[1])) return false;
      } else if (token === "-") {
        return false;
      } else if ((previous === "--body-file" || previous === "-F") && !relativePath(token)) {
        return false;
      }
    }
    previous = token;
  }
  return true;
}

// Outils MCP : permis à un profil de la table si la partie finale du nom (après le dernier « __ ») est un nom de lecture sans mot d'écriture,
// ou si le nom complet figure dans mcpAllow de l'entrée. Défaut fermé : un outil de lecture au nom inhabituel s'ajoute à mcpAllow.
// Skills à contexte isolé : leurs outils portent agent_type « general-purpose », hors de la table. Le hook refuse un skill dont l'en-tête déclare
// « context: fork » (projet, configuration de l'utilisateur, plugins installés). Introuvable : permis ; fichier présent mais illisible : refus.
const MCP_READ_START = /^(get|list|search|read|find|fetch|view|describe|show|check)(_|$)/;
const MCP_READ_END = /_(read|get|list|search)$/;
const WRITE_WORDS = new Set(["create", "update", "delete", "remove", "write", "set", "add", "edit", "modify", "replace", "insert", "send", "post", "put", "patch", "merge", "mark", "move", "upload", "publish", "run", "exec", "execute", "mutate", "mutation", "trigger", "cancel", "dismiss", "assign", "approve", "apply", "commit", "push", "or", "query"]);
function mcpRead(tool) {
  const cut = tool.lastIndexOf("__");
  const name = cut >= 6 ? tool.slice(cut + 2) : "";
  if (!name || name.split("_").some((word) => WRITE_WORDS.has(word.toLowerCase()))) return false;
  return MCP_READ_START.test(name) || MCP_READ_END.test(name);
}

const SKILL_NAME = /^[\w-][\w.-]*(:[\w-][\w.-]*)?$/;
const FORK = /^context:\s*["']?fork["']?\s*(#.*)?$/m;
function declaresFork(file) {
  if (!existsSync(file)) return false;
  const head = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, "utf8"));
  return head ? FORK.test(head[1]) : false;
}
function pluginDirs(plugin, config) {
  const dirs = new Set();
  const registry = path.join(config, "plugins", "installed_plugins.json");
  if (existsSync(registry)) {
    for (const [key, installs] of Object.entries(JSON.parse(readFileSync(registry, "utf8")).plugins ?? {})) {
      if (key.split("@")[0] === plugin) for (const install of installs) if (install?.installPath) dirs.add(install.installPath);
    }
  }
  const cache = path.join(config, "plugins", "cache");
  if (existsSync(cache)) {
    for (const market of readdirSync(cache)) {
      const dir = path.join(cache, market, plugin);
      if (existsSync(dir)) for (const version of readdirSync(dir)) dirs.add(path.join(dir, version));
    }
  }
  return [...dirs];
}
function forkedSkill(name, root) {
  const config = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  const [first, second] = name.split(":");
  const files =
    second === undefined
      ? [path.join(root, ".claude", "skills", first, "SKILL.md"), path.join(root, ".claude", "commands", first + ".md"), path.join(config, "skills", first, "SKILL.md"), path.join(config, "commands", first + ".md")]
      : [
          path.join(root, ".claude", "commands", first, second + ".md"),
          path.join(config, "commands", first, second + ".md"),
          ...pluginDirs(first, config).flatMap((dir) => [path.join(dir, "skills", second, "SKILL.md"), path.join(dir, "commands", second + ".md")]),
        ];
  return files.some(declaresFork);
}

const QUALITY_GATE = /^node \.claude[\\/]hooks[\\/]quality-gate\.mjs$/;
const RUN_CHECKS = /^node \.bootstrap[\\/]run-checks\.mjs$/;
const REVIEW_CONTEXT = /^archgate review-context( --(staged|run-checks|verbose|strict|base( [\w./-]+)?|domain [\w-]+))*$/;

const PROFILES = {
  architect: {
    write: ["docs/architecture/"],
    agents: [],
    skills: ["archgate:adr-author", "adr-options-comparison", "arc42-update"],
    // titre : lettres, chiffres, espace et ponctuation simple seulement (ni guillemet, ni parenthèse, ni substitution : PowerShell évalue les parenthèses)
    shell: [/^archgate adr create --title "[\p{L}\p{N} ,.:'’_-]+" --domain [a-z0-9-]+$/u, /^archgate adr domain list$/],
  },
  "qa-engineer": {
    write: ["tests/", "test/"],
    agents: [],
    skills: ["spec-review", "pr-readiness-review"],
    shell: [
      QUALITY_GATE,
      RUN_CHECKS,
      REVIEW_CONTEXT,
    ],
  },
  "product-owner": { write: [], shell: [], agents: [], skills: [] },
  // profils en lecture seule du lot 2a ; l'entrée de second-opinion borne aussi un teammate de ce nom lancé avec un autre type d'agent
  "acceptance-tester": { write: [], shell: [], agents: [], skills: [] },
  scout: { write: [], shell: [], agents: [], skills: [] },
  "second-opinion": { write: [], shell: [], agents: [], skills: [] },
  // profils en lecture seule du lot 2b
  "devops-engineer": { write: [], shell: [], agents: [], skills: [] },
  "compliance-reviewer": { write: [], shell: [], agents: [], skills: [] },
  // developer : la stack n'est pas choisie, donc pas de dossiers d'écriture permis ; les dossiers de gouvernance lui sont interdits.
  // Son shell n'est pas borné (build, tests) : il peut écrire dans ces dossiers par la ligne de commande, le bornage est un garde-fou.
  developer: { writeExcept: [".archgate/", ".bootstrap/", ".claude/", ".git/", ".githooks/", ".github/", ".release-please-manifest.json", "agents.md", "claude.md", "docs/architecture/", "docs/workflow.md", "openspec/changes/archive/", "openspec/config.yaml", "openspec/config.yml", "openspec/schemas/", "openspec/specs/", "release-please-config.json"], shellOpen: true, agents: [], skills: [] },
  "business-analyst": {
    write: ["openspec/changes/"],
    shell: [/^openspec new change "?[a-z0-9-]+"?$/, /^openspec instructions "?[a-z-]+"? --change "?[a-z0-9-]+"?( --json)?$/, /^openspec context( --json)?$/],
    agents: [],
    skills: ["openspec-propose", "openspec-update-change", "opsx:propose", "opsx:update"],
  },
  // project-lead (agent principal avec mainAgent) : n'écrit pas ; il pilote (archivage, contrôles, issues et PR) et lance les profils.
  "project-lead": {
    write: [],
    shell: [/^openspec archive [a-z0-9-]+ --yes$/, QUALITY_GATE, RUN_CHECKS, REVIEW_CONTEXT, /^archgate session-context( --max-entries \d+)?$/, ghPilot],
    shellHint: "Délègue cette commande à developer ou demande-la à l'utilisateur.",
    agents: ["architect", "qa-engineer", "developer", "business-analyst", "product-owner", "acceptance-tester", "scout", "second-opinion", "devops-engineer", "compliance-reviewer"],
    namedAgents: ["architect", "qa-engineer", "developer", "business-analyst", "product-owner", "acceptance-tester", "scout", "devops-engineer", "compliance-reviewer"],
    skills: [],
    skillsOpen: true,
    mcpAllow: [],
  },
};

// Chemin réel : l'ancêtre existant le plus long est résolu (liens, jonctions, noms courts 8.3, casse réelle), puis le reste du chemin.
function realTarget(absolute) {
  let head = absolute;
  const tail = [];
  while (!existsSync(head)) {
    const parent = path.dirname(head);
    if (parent === head) break;
    tail.unshift(path.basename(head));
    head = parent;
  }
  return path.join(realpathSync.native(head), ...tail);
}

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
    const rel = path.relative(realpathSync.native(root), realTarget(path.resolve(event.cwd ?? root, target))).split(path.sep).join("/");
    const segments = rel.split("/");
    if (segments.some((seg) => seg.includes(":"))) deny(`chemin refusé (caractère « : » dans ${rel})`);
    if (profile.writeExcept) {
      // Windows ignore les points et espaces finals d'un segment : comparer sur la forme normalisée
      const norm = segments.map((seg) => seg.replace(/[. ]+$/, "")).join("/").toLowerCase();
      if (rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)) deny(`écriture refusée : ${rel} est hors du projet`);
      const blocked = profile.writeExcept.find((entry) => (entry.endsWith("/") ? norm.startsWith(entry.toLowerCase()) : norm === entry.toLowerCase()));
      if (blocked) deny(`écriture refusée : ${rel} est dans ${blocked} (dossier ou fichier de gouvernance)`);
    } else if (!profile.write.some((prefix) => rel.startsWith(prefix))) {
      deny(`écriture refusée : ${rel} est hors de ${profile.write.join(", ")}`);
    }
  } else if (AGENT_TOOLS.has(event.tool_name)) {
    const type = toolInput.subagent_type ?? "general-purpose";
    if ((toolInput.name || toolInput.team_name) && !((profile.namedAgents ?? []).includes(type) && toolInput.name === type)) deny("agent nommé refusé (le name doit égaler le subagent_type d'un type de namedAgents)");
    if (!(profile.agents ?? []).includes(type)) deny(`agent « ${type} » non permis (permis : ${(profile.agents ?? []).join(", ") || "aucun"})`);
  } else if (event.tool_name === "Skill") {
    const skill = String(toolInput.skill ?? "");
    if (!profile.skillsOpen && !(profile.skills ?? []).includes(skill)) deny(`skill « ${skill} » non permis`);
    const name = skill.trim().replace(/^\//, "");
    if (!SKILL_NAME.test(name)) deny(`nom de skill invalide « ${skill} »`);
    const projectRoot = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
    if (!projectRoot) deny("racine du projet inconnue");
    if (forkedSkill(name, projectRoot)) deny(`skill « ${skill} » à contexte isolé (context: fork) refusé : ses outils échapperaient à la table`);
  } else if (String(event.tool_name ?? "").startsWith("mcp__")) {
    const tool = String(event.tool_name);
    if (!mcpRead(tool) && !(profile.mcpAllow ?? []).includes(tool)) deny(`outil MCP « ${tool} » non classé en lecture : demande-le à l'utilisateur ou ajoute-le à mcpAllow de .claude/hooks/profile-guard.mjs${/github/i.test(tool) ? " ; pour GitHub, utilise gh issue ou gh pr" : ""}`);
  } else if (SHELL_TOOLS.has(event.tool_name)) {
    const command = String(toolInput.command ?? "").trim();
    if (!profile.shellOpen && !profile.shell.some((match) => (typeof match === "function" ? match(command) : match.test(command)))) {
      const readOnly = path.join(path.dirname(fileURLToPath(import.meta.url)), "read-only-bash.mjs");
      const res = spawnSync(process.execPath, [readOnly], { input: raw, encoding: "utf8" });
      if (res.status !== 0) deny((res.stderr.trim() || `commande refusée « ${command} »`) + (profile.shellHint ? " " + profile.shellHint : ""));
    }
  }
} catch (err) {
  deny(`erreur interne du hook (${err.message})`);
}
process.exit(0);
