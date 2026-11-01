#!/usr/bin/env node
// Tests du hook profile-guard.mjs (ARCH-011) : table des profils, écritures, shell, sous-agent et teammate.
// Lancé par tests/modules.test.mjs ou seul : node profile-guard.test.mjs
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const modules = path.join(here, "..", "..");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
};

// projet d'essai : hooks copiés tels que le générateur les écrit
const project = path.join(mkdtempSync(path.join(tmpdir(), "pb-guard-")), "projet avec espace");
mkdirSync(path.join(project, ".claude", "hooks"), { recursive: true });
for (const [dir, file] of [["agent-profiles", "profile-guard.mjs"], ["claude", "read-only-bash.mjs"]]) {
  cpSync(path.join(modules, dir, "templates", ".claude", "hooks", file), path.join(project, ".claude", "hooks", file));
}
const guard = path.join(project, ".claude", "hooks", "profile-guard.mjs");

const run = (event) => {
  const res = spawnSync(process.execPath, [guard], { input: JSON.stringify({ cwd: project, ...event }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  return { code: res.status, err: res.stderr };
};
const write = (agent, file, tool = "Write") => run({ agent_type: agent, tool_name: tool, tool_input: { file_path: file } });
const shell = (agent, command, tool = "Bash") => run({ agent_type: agent, tool_name: tool, tool_input: { command } });

// écritures
check("architect : écriture dans docs/architecture/ permise", write("architect", path.join(project, "docs", "architecture", "adrs", "x.md")).code === 0);
check("architect : chemin relatif permis", write("architect", "docs/architecture/arc42/05.md").code === 0);
const outside = write("architect", path.join(project, "src", "x.js"));
check("architect : écriture hors périmètre refusée (code 2, chemin nommé)", outside.code === 2 && /src\/x\.js/.test(outside.err), outside.err);
check("qa-engineer : écriture dans tests/ et test/ permise", write("qa-engineer", "tests/a.test.js").code === 0 && write("qa-engineer", "test/a.js", "Edit").code === 0);
check("qa-engineer : écriture dans src/ refusée", write("qa-engineer", "src/x.js").code === 2);
check("remontée de dossier refusée", write("architect", "docs/architecture/../../src/x.js").code === 2);
check("préfixe voisin refusé (docs/architecture-old/)", write("architect", "docs/architecture-old/x.md").code === 2);
check("chemin hors du projet refusé", write("architect", path.resolve(project, "..", "docs", "architecture", "x.md")).code === 2);
check("casse différente refusée (Tests/)", write("qa-engineer", "Tests/a.js").code === 2 && write("architect", "DOCS/architecture/x.md").code === 2);
check("dossier voisin tests-x/ refusé", write("qa-engineer", "tests-x/a.js").code === 2);
check("NotebookEdit et MultiEdit bornés", run({ agent_type: "qa-engineer", tool_name: "NotebookEdit", tool_input: { notebook_path: "src/n.ipynb" } }).code === 2 && write("qa-engineer", "src/x.js", "MultiEdit").code === 2);
check("écriture sans chemin refusée pour un profil", run({ agent_type: "architect", tool_name: "Write", tool_input: {} }).code === 2);

// shell
check("lecture seule permise (git status)", shell("qa-engineer", "git status").code === 0 && shell("architect", "git log --oneline").code === 0);
check("cat refusé (hors liste de lecture seule)", shell("architect", "cat README.md").code === 2);
check("commande composée refusée", shell("architect", "git status && rm -rf x").code === 2 && shell("qa-engineer", "git status; rm x").code === 2);
check("redirection refusée", shell("qa-engineer", "git log > x.txt").code === 2);
check("PowerShell borné comme Bash", shell("architect", "Remove-Item x", "PowerShell").code === 2 && shell("architect", "git status", "PowerShell").code === 0);

// commandes supplémentaires
const gate = "node .claude/hooks/quality-gate.mjs";
check("qa-engineer : quality-gate et run-checks permis", shell("qa-engineer", gate).code === 0 && shell("qa-engineer", "node .bootstrap/run-checks.mjs").code === 0 && shell("qa-engineer", "node .claude\\hooks\\quality-gate.mjs", "PowerShell").code === 0);
check("qa-engineer : archgate review-context avec options permis", shell("qa-engineer", "archgate review-context --base --run-checks").code === 0 && shell("qa-engineer", "archgate review-context --base main --domain architecture").code === 0);
check("architect : quality-gate refusé", shell("architect", gate).code === 2);
check("qa-engineer : options inconnues ou chaînage refusés", shell("qa-engineer", "archgate review-context --output x").code === 2 && shell("qa-engineer", `${gate} && rm x`).code === 2 && shell("qa-engineer", `${gate} --fix`).code === 2);
const adr = 'archgate adr create --title "Choix de la base" --domain architecture';
check("architect : archgate adr create permis", shell("architect", adr).code === 0);
check("qa-engineer : archgate adr create refusé", shell("qa-engineer", adr).code === 2);
check("architect : titre avec séparateur ou substitution refusé", ["archgate adr create --title \"a\" && rm x --domain d", 'archgate adr create --title "a; rm x" --domain d', 'archgate adr create --title "$(rm x)" --domain d', 'archgate adr create --title "a" --domain d extra'].every((c) => shell("architect", c).code === 2));
const injections = [
  'archgate adr create --title "x” (Remove-Item src -Recurse) “" --domain architecture', // guillemets typographiques : PowerShell évalue les parenthèses
  'archgate adr create --title "x" (Remove-Item src) --domain architecture',
  'archgate adr create --title "a`b" --domain architecture',
  'archgate adr create --title "a\nb" --domain architecture',
  'archgate adr create --title "a" --domain architecture --body "x"',
  'archgate adr create --title "a (b)" --domain architecture',
  'archgate adr create --title "" --domain architecture',
  'archgate adr create --title "a" --domain Architecture',
];
check("architect : injections par le titre ou les options refusées", injections.every((c) => shell("architect", c).code === 2 && shell("architect", c, "PowerShell").code === 2), injections.filter((c) => shell("architect", c).code !== 2).join(" | "));
check("architect : titres légitimes (accents, apostrophe, ponctuation) permis", ["Choix d'une base", "Décision : stockage, v2", "Règles de l’équipe"].every((t) => shell("architect", `archgate adr create --title "${t}" --domain architecture`).code === 0));
check("architect : archgate adr domain list permis", shell("architect", "archgate adr domain list").code === 0 && shell("architect", "archgate adr domain list --x").code === 2);
check("qa-engineer : archgate review-context --domain exige un domaine", shell("qa-engineer", "archgate review-context --domain").code === 2 && shell("qa-engineer", "archgate review-context --staged --strict --verbose").code === 0);

// agents et skills lançables
const launch = (agent, input) => run({ agent_type: agent, tool_name: "Agent", tool_input: input });
const skill = (agent, name) => run({ agent_type: agent, tool_name: "Skill", tool_input: { skill: name } });
check("architect : architecture-explorer et arc42-keeper permis", launch("architect", { subagent_type: "architecture-explorer", prompt: "x" }).code === 0 && launch("architect", { subagent_type: "arc42-keeper", prompt: "x", run_in_background: true }).code === 0);
check("qa-engineer : spec-reviewer permis", launch("qa-engineer", { subagent_type: "spec-reviewer", prompt: "x" }).code === 0);
const gp = launch("architect", { subagent_type: "general-purpose", prompt: "x" });
check("general-purpose refusé, agent nommé dans le message", gp.code === 2 && /general-purpose/.test(gp.err), gp.err);
check("appel sans subagent_type (vaut general-purpose) refusé", launch("architect", { prompt: "x" }).code === 2 && launch("qa-engineer", {}).code === 2);
check("agent d'un autre profil refusé (qa-engineer ne lance pas arc42-keeper)", launch("qa-engineer", { subagent_type: "arc42-keeper" }).code === 2 && launch("architect", { subagent_type: "spec-reviewer" }).code === 2);
check("agent nommé ou d'équipe refusé même s'il est permis", launch("architect", { subagent_type: "arc42-keeper", name: "k" }).code === 2 && launch("qa-engineer", { subagent_type: "spec-reviewer", team_name: "t" }).code === 2);
check("noms hérités d'Object.prototype refusés comme agents", launch("architect", { subagent_type: "constructor" }).code === 2 && launch("architect", { subagent_type: "toString" }).code === 2);
check("architect : archgate:adr-author permis", skill("architect", "archgate:adr-author").code === 0);
check("skills non permis refusés (reviewer, onboard, sans nom, autre profil)", skill("architect", "archgate:onboard").code === 2 && skill("qa-engineer", "archgate:reviewer").code === 2 && skill("qa-engineer", "archgate:adr-author").code === 2 && run({ agent_type: "architect", tool_name: "Skill", tool_input: {} }).code === 2);
check("agent principal et autres agents peuvent lancer agents et skills", run({ tool_name: "Agent", tool_input: { subagent_type: "general-purpose" } }).code === 0 && launch("writer", { subagent_type: "general-purpose" }).code === 0 && skill("writer", "x").code === 0);

check("Task, ancien nom de l'outil Agent, est borné comme Agent", run({ agent_type: "architect", tool_name: "Task", tool_input: { subagent_type: "general-purpose" } }).code === 2 && run({ agent_type: "architect", tool_name: "Task", tool_input: { subagent_type: "arc42-keeper" } }).code === 0);
check("team_name seul refusé ; un profil ne lance ni un autre profil ni lui-même", launch("architect", { subagent_type: "arc42-keeper", team_name: "t" }).code === 2 && launch("architect", { subagent_type: "qa-engineer" }).code === 2 && launch("architect", { subagent_type: "architect" }).code === 2 && launch("qa-engineer", { subagent_type: "architect" }).code === 2);
check("agent de plugin préfixé et casse différente refusés", launch("architect", { subagent_type: "archgate:developer" }).code === 2 && launch("architect", { subagent_type: "Arc42-Keeper" }).code === 2 && launch("architect", { subagent_type: "" }).code === 2 && launch("architect", { subagent_type: null }).code === 2);

// agents lançables : leurs bornes viennent de la table, pas de leur hook de frontmatter (inactif pour un teammate)
check("liste agents ou skills absente : tout refusé (arc42-keeper, spec-reviewer, architecture-explorer ne lancent rien)", ["arc42-keeper", "spec-reviewer", "architecture-explorer"].every((a) => launch(a, { subagent_type: "general-purpose" }).code === 2 && launch(a, { subagent_type: "spec-reviewer" }).code === 2 && skill(a, "archgate:adr-author").code === 2));
check("arc42-keeper n'écrit que dans docs/architecture/arc42/", write("arc42-keeper", "docs/architecture/arc42/05.md").code === 0 && write("arc42-keeper", "docs/architecture/adrs/x.md").code === 2 && write("arc42-keeper", "src/x.js").code === 2);
check("spec-reviewer et architecture-explorer n'écrivent nulle part", write("spec-reviewer", "docs/x.md").code === 2 && write("architecture-explorer", "docs/architecture/x.md").code === 2);
check("spec-reviewer : shell en lecture seule", shell("spec-reviewer", "openspec validate x --strict").code === 0 && shell("spec-reviewer", "git status").code === 0 && shell("spec-reviewer", "rm -rf x").code === 2 && shell("spec-reviewer", "cat x").code === 2);

// agents non bornés et entrées inattendues
check("agent principal (sans agent_type) non borné", run({ tool_name: "Write", tool_input: { file_path: "src/x.js" } }).code === 0 && run({ tool_name: "Bash", tool_input: { command: "rm -rf x" } }).code === 0);
check("agent hors de la table non borné", write("writer", "src/x.js").code === 0 && shell("developer", "npm test").code === 0);
check("noms hérités d'Object.prototype non bornés", write("constructor", "src/x.js").code === 0 && write("toString", "src/x.js").code === 0);
check("autres outils non concernés", run({ agent_type: "architect", tool_name: "Read", tool_input: { file_path: "src/x.js" } }).code === 0);
const garbage = spawnSync(process.execPath, [guard], { input: "pas du json", encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
check("entrée illisible : code 0", garbage.status === 0, String(garbage.status));

// teammate : agent_type est le nom du teammate, identique à celui du profil
check("teammate nommé comme son profil : mêmes refus et autorisations", write("qa-engineer", "src/x.js").code === 2 && write("qa-engineer", "tests/x.js").code === 0);
check("teammate nommé autrement : non borné (limite documentée)", write("qa", "src/x.js").code === 0);

// refus par défaut : racine inconnue, chemin absent
const noRoot = (() => {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const res = spawnSync(process.execPath, [guard], { input: JSON.stringify({ agent_type: "architect", tool_name: "Write", tool_input: { file_path: "docs/architecture/x.md" } }), encoding: "utf8", env });
  return res.status;
})();
check("racine du projet inconnue : refus (code 2)", noRoot === 2, String(noRoot));
check("agent non borné sans racine : code 0", (() => {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  return spawnSync(process.execPath, [guard], { input: JSON.stringify({ agent_type: "writer", tool_name: "Write", tool_input: { file_path: "x" } }), encoding: "utf8", env }).status === 0;
})());

// lecture seule absente : refus par défaut
rmSync(path.join(project, ".claude", "hooks", "read-only-bash.mjs"));
check("read-only-bash.mjs absent : commande refusée", shell("architect", "git status").code === 2);

rmSync(path.dirname(project), { recursive: true, force: true });
console.log(failures ? `\n${failures} échec(s)` : "\nTous les tests du hook passent");
process.exit(failures ? 1 : 0);
