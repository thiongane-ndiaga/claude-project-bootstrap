#!/usr/bin/env node
// Tests de state.mjs : état de reprise, reprise après arrêt à chaque étape, journal des effets globaux.
// Usage : node tests/state.test.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANSWER_KEYS, STEPS, UsageError, finishEffect, init, isApplicable, listEffects, orderedSteps, planEffect, resume, run, setConfig, setStep, show } from "../skills/project-bootstrap/scripts/state.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateScript = path.join(root, "skills", "project-bootstrap", "scripts", "state.mjs");
const scaffold = path.join(root, "skills", "project-bootstrap", "scripts", "scaffold.mjs");

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failed++;
};
const mk = (prefix = "pb-state-") => mkdtempSync(path.join(tmpdir(), prefix));
const repo = () => {
  const dir = path.join(mk(), "depot");
  mkdirSync(dir);
  return dir;
};
const throws = (fn) => {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
};
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const stateOf = (target) => json(path.join(target, ".bootstrap", "local", "state.json"));
const tree = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).sort().join("|") : "(absent)");

// exécuteur simulé : enregistre les appels ; ne sait répondre qu'à des commandes de lecture
function fakeExec({ gitConfig = {}, gitMulti = [], npmGlobal = {}, marketplaces, plugins } = {}) {
  const calls = [];
  const exec = (cmd, args = []) => {
    calls.push([cmd, ...args].join(" "));
    if (cmd === "git" && args[0] === "config" && args[1] === "--global" && args[2] === "--get") {
      if (gitMulti.includes(args[3])) return { status: 2, stdout: "", stderr: "" };
      const v = gitConfig[args[3]];
      return v === undefined ? { status: 1, stdout: "", stderr: "" } : { status: 0, stdout: `${v}\n`, stderr: "" };
    }
    if (cmd === "npm" && args[0] === "ls") {
      // comme npm : code 1 quand un paquet manque, mais du JSON quand même
      const out = JSON.stringify({ dependencies: Object.fromEntries(Object.entries(npmGlobal).map(([k, v]) => [k, { version: v }])) });
      return { status: Object.keys(npmGlobal).length ? 0 : 1, stdout: out, stderr: "" };
    }
    if (cmd === "claude" && args.join(" ") === "plugin marketplace list") return marketplaces === undefined ? { status: 127, stdout: "", stderr: "", error: new Error("absent") } : { status: 0, stdout: marketplaces.join("\n"), stderr: "" };
    if (cmd === "claude" && args.join(" ") === "plugin list") return plugins === undefined ? { status: 127, stdout: "", stderr: "", error: new Error("absent") } : { status: 0, stdout: plugins.join("\n"), stderr: "" };
    return { status: 127, stdout: "", stderr: "commande non simulée", error: new Error("non simulée") };
  };
  return { exec, calls };
}
const noGit = () => ({ status: 1, stdout: "", stderr: "" });

// --- les étapes ---------------------------------------------------------------------------------------------------------------
check("étapes : identifiants uniques, de la phase 0 à la phase 4", new Set(STEPS.map((s) => s.id)).size === STEPS.length && STEPS[0].id === "phase0-scope" && STEPS.at(-1).id === "phase4-adr");
const MODULE_SETS = {
  "core seul": [],
  "défaut": ["claude", "openspec", "archgate", "arc42", "github", "release", "projects", "githooks"],
  "complet": ["claude", "openspec", "archgate", "archgate-plugin", "arc42", "github", "release", "projects", "githooks", "agent-teams", "dependabot"],
  "github seul": ["github"],
  "archgate sans github": ["archgate"],
  "openspec seul": ["openspec"],
};
{
  // une ligne par étape : condition sur les modules
  const only = (mods) => STEPS.filter((s) => isApplicable(s, new Set(["core", ...mods]))).map((s) => s.id);
  const base = ["phase0-scope", "phase1-plan", "phase2-git", "phase2-generate", "phase2-restart", "phase3-verify", "phase3-audit"];
  check("applicabilité : core seul -> uniquement les étapes communes", only([]).join() === base.join(), only([]).join());
  check("applicabilité : un module par étape (cli, openspec, archgate, plugin, hooks, agent teams, contrôle qualité, github)", [["openspec", "phase2-cli"], ["archgate", "phase2-cli"], ["openspec", "phase2-openspec"], ["archgate", "phase2-archgate"], ["archgate-plugin", "phase2-archgate-plugin"], ["githooks", "phase2-githooks"], ["agent-teams", "phase2-agent-teams"], ["claude", "phase2-quality-gate"], ["github", "phase2-github"]].every(([m, id]) => only([m]).includes(id) && !only([]).includes(id)));
  check("applicabilité : l'acceptation des ADR exige archgate ET github", !only(["archgate"]).includes("phase4-adr") && !only(["github"]).includes("phase4-adr") && only(["archgate", "github"]).includes("phase4-adr"));
  const ids = (cli) => orderedSteps({ answers: { cliInstall: cli } }).map((s) => s.id);
  check("ordre : phase2-cli avant la génération, après en mode local", ids("global").indexOf("phase2-cli") < ids("global").indexOf("phase2-generate") && ids("local").indexOf("phase2-cli") === ids("local").indexOf("phase2-generate") + 1 && ids("local").length === STEPS.length);
}

// --- init, config, step, show ----------------------------------------------------------------------------------------------------
{
  const t = mk();
  const cfgFile = path.join(t, "bootstrap.json");
  writeFileSync(cfgFile, JSON.stringify({ projectName: "Test", modules: ["openspec"], versions: { openspec: "1.0.0" }, token: "ghp_secret", GITHUB_TOKEN: "x" }));
  const target = repo();
  const out = run(["init", "--target", target, "--config", cfgFile]);
  const state = stateOf(target);
  check("init : état dans .bootstrap/local/, configuration conservée, aucune étape faite", out.modules.join() === "openspec" && state.answers.projectName === "Test" && Object.keys(state.steps).length === 0 && state.version === 1);
  check("init : les clés hors schéma (jeton) ne sont jamais enregistrées et sont signalées", !JSON.stringify(state).includes("ghp_secret") && !("token" in state.answers) && out.ignoredKeys.join() === "token,GITHUB_TOKEN" && ANSWER_KEYS.includes("modules"));
  check("init : le dossier s'ignore seul et aucun fichier temporaire ne reste (écriture atomique)", readFileSync(path.join(target, ".bootstrap", "local", ".gitignore"), "utf8") === "*\n" && readdirSync(path.join(target, ".bootstrap", "local")).every((f) => !f.endsWith(".tmp")));
  const g = (...a) => spawnSync("git", ["-C", target, ...a], { encoding: "utf8" });
  g("init", "-q");
  const status = g("status", "--porcelain", "-uall").stdout;
  check("git ne voit ni state.json ni .bootstrap/local, même avant toute génération (git status propre)", status.trim() === "" && g("check-ignore", ".bootstrap/local/state.json").status === 0, status);
  check("init refusé quand l'état existe (l'avancement n'est pas effacé)", throws(() => run(["init", "--target", target])) instanceof UsageError && stateOf(target).answers.projectName === "Test");
  setStep({ target, id: "phase0-scope", status: "done", note: "ok", now: new Date("2027-01-15T10:00:00Z") });
  const forced = run(["init", "--target", target, "--force"]);
  check("init --force : repart de zéro", forced.modules.length === 0 && Object.keys(stateOf(target).steps).length === 0);
  run(["init", "--target", target, "--force", "--config", cfgFile]);
  const s = setStep({ target, id: "phase0-scope", status: "done", note: "ok", now: new Date("2027-01-15T10:00:00Z") });
  check("step : étape consignée avec sa date et sa note", s.status === "done" && s.at === "2027-01-15T10:00:00.000Z" && s.note === "ok" && stateOf(target).steps["phase0-scope"].status === "done");
  const before = readFileSync(path.join(target, ".bootstrap", "local", "state.json"), "utf8");
  const e1 = throws(() => setStep({ target, id: "nope", status: "done" }));
  const e2 = throws(() => setStep({ target, id: "phase1-plan", status: "fini" }));
  check("step : identifiant ou statut inconnu refusé, état inchangé", e1 instanceof UsageError && e2 instanceof UsageError && readFileSync(path.join(target, ".bootstrap", "local", "state.json"), "utf8") === before);
  const v = show({ target, exec: noGit });
  check("show : statut de chaque étape, étapes d'un module absent non applicables", v.steps.find((x) => x.id === "phase0-scope").status === "done" && v.steps.find((x) => x.id === "phase2-githooks").applicable === false && v.next.id === "phase1-plan");

  // config : restitution de bootstrap.json dans une nouvelle session, fusion de la configuration résolue en phase 1
  setConfig({ target, set: { versions: { openspec: "2.0.0" }, actions: { checkout: { tag: "v1", sha: "a".repeat(40) } }, secret: "x" } });
  const outFile = path.join(t, "restored.json");
  const written = run(["config", "--target", target, "--out", outFile]);
  const restored = json(outFile);
  check("config --out : la configuration enregistrée est restituée à l'identique (fusion de --set comprise, sans clé hors schéma)", written.keys.includes("actions") && restored.projectName === "Test" && restored.versions.openspec === "2.0.0" && restored.actions.checkout.tag === "v1" && !("secret" in restored) && JSON.stringify(restored) === JSON.stringify(stateOf(target).answers));
  check("config sans état ou sans option : refusé", throws(() => run(["config", "--target", repo(), "--out", outFile])) instanceof UsageError && throws(() => run(["config", "--target", target])) instanceof UsageError);

  const e3 = throws(() => setStep({ target: repo(), id: "phase0-scope", status: "done" }));
  check("step sans état : refusé avec un message qui renvoie à init", e3 instanceof UsageError && /init/.test(e3.message));
  const missing = path.join(t, "inexistant");
  check("init, step et effect sur une cible inexistante : refusés, rien n'est créé", [() => run(["init", "--target", missing]), () => run(["step", "--target", missing, "--id", "phase0-scope", "--status", "done"]), () => run(["effect", "--target", missing, "--kind", "custom", "--do", "echo"])].every((fn) => throws(fn) instanceof UsageError) && !existsSync(missing));
  writeFileSync(path.join(target, ".bootstrap", "local", "state.json"), "{ pas du json");
  const bad = throws(() => show({ target, exec: noGit }));
  check("état illisible : erreur claire, rien n'est écrasé", bad instanceof UsageError && /illisible/.test(bad.message) && readFileSync(path.join(target, ".bootstrap", "local", "state.json"), "utf8") === "{ pas du json");
  writeFileSync(path.join(target, ".bootstrap", "local", "state.json"), JSON.stringify({ version: 99, steps: {} }));
  check("version de format inconnue : refusée", throws(() => show({ target, exec: noGit })) instanceof UsageError && /version de format/.test(throws(() => show({ target, exec: noGit })).message));
  check("--target absent ou fichier refusé", throws(() => run(["show"])) instanceof UsageError && throws(() => run(["show", "--target", cfgFile])) instanceof UsageError);
}

// --- reprise : arrêt simulé après chaque étape ---------------------------------------------------------------------------------------
// construit dans le dépôt les preuves vérifiables des étapes faites (dépôt git, manifeste, openspec/, hooks, agent teams)
function buildEvidence(target, doneIds) {
  const done = new Set(doneIds);
  mkdirSync(target, { recursive: true });
  const git = (...a) => spawnSync("git", ["-C", target, ...a], { encoding: "utf8" });
  if (done.has("phase2-git")) git("init", "-q");
  if (done.has("phase2-generate")) {
    mkdirSync(path.join(target, ".bootstrap"), { recursive: true });
    writeFileSync(path.join(target, ".bootstrap", "manifest.json"), JSON.stringify({ modules: [], config: {}, files: {} }));
  }
  if (done.has("phase2-openspec")) {
    mkdirSync(path.join(target, "openspec"), { recursive: true });
    writeFileSync(path.join(target, "openspec", "config.yaml"), "schema: spec-driven\n");
  }
  if (done.has("phase2-githooks")) git("config", "core.hooksPath", ".githooks");
  if (done.has("phase2-agent-teams")) {
    mkdirSync(path.join(target, ".claude"), { recursive: true });
    writeFileSync(path.join(target, ".claude", "settings.local.json"), JSON.stringify({ env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" } }));
  }
}
for (const [label, modules] of Object.entries(MODULE_SETS)) {
  for (const cliInstall of ["global", "local"]) {
    if (cliInstall === "local" && !modules.some((m) => ["openspec", "archgate"].includes(m))) continue;
    const mods = new Set(["core", ...modules]);
    const applicable = orderedSteps({ answers: { cliInstall } }).filter((s) => isApplicable(s, mods));
    const problems = [];
    for (let i = -1; i < applicable.length; i++) {
      // arrêt simulé après l'étape i : les étapes 0..i sont faites, rien ne suit
      const target = repo();
      const doneIds = applicable.slice(0, i + 1).map((s) => s.id);
      buildEvidence(target, doneIds);
      init({ target, config: { modules, cliInstall } });
      for (const id of doneIds) setStep({ target, id, status: "done" });
      const r = resume({ target });
      const expected = applicable[i + 1]?.id ?? null;
      if ((r.next?.id ?? null) !== expected || r.inconsistencies.length) problems.push(`après ${applicable[i]?.id ?? "(début)"} : next=${r.next?.id ?? null} attendu ${expected}, ${r.inconsistencies.join("; ")}`);
    }
    check(`reprise (${label}, CLI ${cliInstall}) : après un arrêt à chaque étape applicable (${applicable.length}), la suivante est proposée`, problems.length === 0, problems.join(" | "));
  }
}
{
  const target = repo();
  init({ target, config: { modules: ["openspec"] } });
  const ids = show({ target, exec: noGit }).steps.filter((s) => s.applicable).map((s) => s.id);
  check("module absent : les étapes githooks, github, archgate, agent teams ne sont pas applicables", !ids.some((id) => /githooks|github|archgate|agent-teams|quality-gate|phase4/.test(id)) && ids.includes("phase2-cli") && ids.includes("phase2-openspec"));
  for (const s of STEPS.filter((x) => isApplicable(x, new Set(["core", "openspec"])))) setStep({ target, id: s.id, status: s.id === "phase3-audit" ? "skipped" : "done" });
  check("tout est fait ou ignoré : next vaut null (hors preuves : incohérences signalées)", show({ target, exec: noGit }).next?.id !== "phase3-audit" && resume({ target, exec: noGit }).inconsistencies.length > 0);
  const allDone = repo();
  buildEvidence(allDone, STEPS.map((s) => s.id));
  init({ target: allDone, config: { modules: [] } });
  for (const s of STEPS.filter((x) => isApplicable(x, new Set(["core"])))) setStep({ target: allDone, id: s.id, status: "done" });
  check("tout est fait : next vaut null", resume({ target: allDone }).next === null);
}
{
  // preuve manquante : étape marquée faite, preuve absente -> à refaire
  const target = repo();
  init({ target, config: { modules: ["openspec", "githooks"] } });
  for (const id of ["phase0-scope", "phase1-plan", "phase2-git", "phase2-cli", "phase2-generate"]) setStep({ target, id, status: "done" });
  const r = resume({ target, exec: noGit });
  check("preuve manquante : incohérences signalées (dépôt git, manifeste) et première étape à refaire proposée", r.inconsistencies.length === 2 && /phase2-git/.test(r.inconsistencies[0]) && /phase2-generate/.test(r.inconsistencies[1]) && r.next.id === "phase2-git" && r.next.status === "to-redo", JSON.stringify(r));
  const hooks = repo();
  buildEvidence(hooks, ["phase2-git"]);
  init({ target: hooks, config: { modules: ["githooks"] } });
  setStep({ target: hooks, id: "phase2-git", status: "done" });
  setStep({ target: hooks, id: "phase2-githooks", status: "done" });
  check("preuve manquante : core.hooksPath non réglé -> étape githooks à refaire", resume({ target: hooks }).inconsistencies.some((i) => /phase2-githooks/.test(i)));
  const partial = repo();
  mkdirSync(path.join(partial, "openspec"));
  init({ target: partial, config: { modules: ["openspec"] } });
  setStep({ target: partial, id: "phase2-openspec", status: "done" });
  check("preuve : un dossier openspec/ sans config.yaml (init interrompu) ne vaut pas preuve", resume({ target: partial, exec: noGit }).inconsistencies.some((i) => /phase2-openspec/.test(i)));
  const interrupted = repo();
  init({ target: interrupted, config: { modules: [] } });
  setStep({ target: interrupted, id: "phase0-scope", status: "done" });
  setStep({ target: interrupted, id: "phase1-plan", status: "doing", note: "plan en cours" });
  const ri = resume({ target: interrupted, exec: noGit });
  check("étape en cours (doing) ou en échec : reprise sur cette étape avec sa note", ri.next.id === "phase1-plan" && ri.next.status === "doing" && ri.steps.find((s) => s.id === "phase1-plan").note === "plan en cours");
  setStep({ target: interrupted, id: "phase1-plan", status: "failed", note: "plan refusé" });
  check("étape en échec : proposée de nouveau", resume({ target: interrupted, exec: noGit }).next.status === "failed");
}
{
  // état absent : l'avancement est déduit des preuves du dépôt (génération réelle par scaffold.mjs)
  const t = mk();
  const target = path.join(t, "depot");
  const cfg = path.join(t, "bootstrap.json");
  writeFileSync(
    cfg,
    JSON.stringify({
      projectName: "Test",
      description: "Projet de test.",
      visibility: "private",
      modules: ["claude", "openspec", "githooks"],
      versions: { openspec: "1.0.0", archgate: "0.1.0", node: "24" },
      actions: { checkout: { tag: "v1", sha: "a".repeat(40) }, setupNode: { tag: "v1", sha: "b".repeat(40) }, releasePlease: { tag: "v1", sha: "c".repeat(40) } },
    }),
  );
  const gen = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", target], { encoding: "utf8" });
  check("état absent : génération réelle du dépôt de test", gen.status === 0, gen.stderr);
  spawnSync("git", ["-C", target, "init", "-q"]);
  mkdirSync(path.join(target, "openspec"), { recursive: true });
  writeFileSync(path.join(target, "openspec", "config.yaml"), "schema: spec-driven\n");
  const filesBefore = tree(target);
  const r = resume({ target });
  check("état absent : étapes déduites (git, génération, openspec, phases 0 et 1) et réponses relues du manifeste", r.state === "absent" && ["phase0-scope", "phase1-plan", "phase2-git", "phase2-generate", "phase2-openspec"].every((id) => r.deduced.includes(id)) && r.answers.modules.join() === "claude,openspec,githooks" && r.answers.projectName === "Test", JSON.stringify(r.deduced));
  check("état absent : l'étape CLI, qui précède des étapes prouvées, est déduite faite ; la suivante est githooks", r.deduced.includes("phase2-cli") && r.next.id === "phase2-githooks", JSON.stringify(r.next));
  check("resume est en lecture seule : aucun fichier créé ou modifié", tree(target) === filesBefore && !existsSync(path.join(target, ".bootstrap", "local")));
  const none = resume({ target: path.join(mk(), "inexistant"), exec: noGit });
  check("dépôt inexistant : code 0, exists false, on repart de la phase 0 sans rien créer", none.next.id === "phase0-scope" && none.exists === false && none.deduced.length === 0 && !existsSync(none.target));
  const empty = repo();
  check("dossier sans .bootstrap : on repart de la phase 0 sans rien créer", resume({ target: empty, exec: noGit }).next.id === "phase0-scope" && !existsSync(path.join(empty, ".bootstrap")));

  // scaffold.mjs (génération, --update) ne touche pas à l'état ni au journal ; --detect signale un état
  init({ target, config: { modules: ["claude", "openspec", "githooks"] } });
  planEffect({ target, kind: "custom", args: { do: "echo 1", undo: "echo 2" } });
  const stateBefore = readFileSync(path.join(target, ".bootstrap", "local", "state.json"), "utf8");
  const effectsBefore = readFileSync(path.join(target, ".bootstrap", "local", "effects.json"), "utf8");
  const again = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", target], { encoding: "utf8" });
  const upd = spawnSync(process.execPath, [scaffold, "--update", "--target", target], { encoding: "utf8" });
  check("scaffold.mjs (relance, --update) laisse l'état et le journal intacts", again.status === 0 && upd.status === 0 && readFileSync(path.join(target, ".bootstrap", "local", "state.json"), "utf8") === stateBefore && readFileSync(path.join(target, ".bootstrap", "local", "effects.json"), "utf8") === effectsBefore, again.stderr + upd.stderr);
  const detect = JSON.parse(spawnSync(process.execPath, [scaffold, "--detect", "--target", target], { encoding: "utf8" }).stdout);
  check("--detect signale l'état de reprise", detect.resumable === true && JSON.parse(spawnSync(process.execPath, [scaffold, "--detect", "--target", repo()], { encoding: "utf8" }).stdout).resumable === false);
}

// --- journal des effets globaux -----------------------------------------------------------------------------------------------------
{
  const target = repo();
  const f = fakeExec({ gitConfig: { "core.autocrlf": "true" }, npmGlobal: { archgate: "0.9.0" }, marketplaces: ["officiel"], plugins: ["autre@officiel"] });
  const g1 = planEffect({ target, kind: "git-config-global", args: { key: "core.autocrlf", value: "input" }, exec: f.exec, now: new Date("2027-01-15T10:00:00Z") });
  check("git : valeur précédente lue avant l'action, annulation qui la rétablit (chaîne et tableau d'arguments)", g1.previous === "true" && g1.do === "git config --global core.autocrlf input" && g1.undo === "git config --global core.autocrlf true" && g1.undoArgv.join("|") === "git|config|--global|core.autocrlf|true" && g1.status === "planned" && g1.id === 1);
  const g2 = planEffect({ target, kind: "git-config-global", args: { key: "user.name", value: 'Jean "Dupont"' }, exec: f.exec });
  check("git : clé absente -> annulation par --unset ; valeur à espaces et guillemets gardée telle quelle dans le tableau", g2.previous === null && g2.undo === "git config --global --unset user.name" && g2.doArgv[4] === 'Jean "Dupont"' && g2.do === 'git config --global user.name "Jean \\"Dupont\\""');
  const multi = fakeExec({ gitMulti: ["remote.origin.fetch"] });
  check("git : clé à plusieurs valeurs refusée (annuler supprimerait tout)", throws(() => planEffect({ target, kind: "git-config-global", args: { key: "remote.origin.fetch", value: "x" }, exec: multi.exec })) instanceof UsageError);
  const n1 = planEffect({ target, kind: "npm-global", args: { package: "archgate", version: "1.2.3" }, exec: f.exec });
  check("npm : paquet déjà installé -> annulation vers la version précédente", n1.previous === "0.9.0" && n1.do === "npm install -g archgate@1.2.3" && n1.undo === "npm install -g archgate@0.9.0" && n1.doArgv.join("|") === "npm|install|-g|archgate@1.2.3");
  const f2 = fakeExec();
  const n2 = planEffect({ target, kind: "npm-global", args: { package: "@fission-ai/openspec", version: "1.0.0", prefix: process.platform === "win32" ? undefined : "~/.local" }, exec: f2.exec });
  const withPrefix = process.platform === "win32" ? "" : " --prefix ~/.local";
  check("npm : paquet absent (npm ls sort en 1 avec du JSON) -> annulation par npm uninstall -g, préfixe conservé", n2.previous === null && n2.do === `npm install -g${withPrefix} @fission-ai/openspec@1.0.0` && n2.undo === `npm uninstall -g${withPrefix} @fission-ai/openspec`);
  if (process.platform !== "win32") check("npm : le préfixe ~ est développé pour la lecture, pas dans la commande consignée", f2.calls.some((c) => c.startsWith("npm ls -g --depth=0 --json --prefix ") && !c.includes("~")));
  else check("npm : --prefix refusé sous Windows (le mode user y équivaut au mode global)", throws(() => planEffect({ target, kind: "npm-global", args: { package: "archgate", prefix: "C:/x" }, exec: f2.exec })) instanceof UsageError);
  const p1 = planEffect({ target, kind: "plugin", args: { name: "archgate@archgate" }, exec: f.exec });
  const m1 = planEffect({ target, kind: "marketplace", args: { source: "https://plugins.archgate.dev/archgate.git" }, exec: f.exec });
  check("plugin et marketplace absents : portée locale par défaut, annulation par uninstall / remove", p1.undo === "claude plugin uninstall archgate@archgate --scope local" && m1.do === "claude plugin marketplace add https://plugins.archgate.dev/archgate.git" && m1.undo === "claude plugin marketplace remove archgate" && !m1.caution);
  const already = planEffect({ target, kind: "marketplace", args: { source: "https://x.example/officiel.git" }, exec: f.exec });
  check("marketplace déjà présent avant l'action : aucune annulation, avertissement (d'autres projets l'utilisent peut-être)", already.undo === null && already.previous === "déjà présent" && /ne pas le retirer/.test(already.caution));
  const blind = fakeExec();
  const unknown = planEffect({ target, kind: "plugin", args: { name: "x@y", scope: "user" }, exec: blind.exec });
  check("état précédent illisible : annulation proposée avec une mise en garde", unknown.undo === "claude plugin uninstall x@y --scope user" && /n'a pas pu être lu/.test(unknown.caution) && unknown.previous === "inconnu");
  const c1 = planEffect({ target, kind: "custom", args: { do: "archgate login" }, exec: f.exec });
  const c2 = planEffect({ target, kind: "custom", args: { do: "winget install GitHub.cli", undo: "winget uninstall GitHub.cli" }, exec: f.exec });
  check("custom : sans annulation -> null, avec annulation -> consignée", c1.undo === null && c2.undo === "winget uninstall GitHub.cli");
  check("le script n'exécute jamais l'action : seules des lectures ont été lancées", [...f.calls, ...f2.calls, ...blind.calls].every((c) => /^(git config --global --get |npm ls -g |claude plugin (marketplace )?list)/.test(c)), f.calls.join(" | "));
  const ids = json(path.join(target, ".bootstrap", "local", "effects.json")).effects.map((e) => e.id);
  check("identifiants croissants consignés dans effects.json, un effet par paquet", ids.join() === "1,2,3,4,5,6,7,8,9,10", ids.join());
  check("rien n'est « applied » avant --done : la liste d'annulation est vide", listEffects({ target, undo: true }).undo.length === 0);
  finishEffect({ target, id: 1, now: new Date("2027-01-15T10:05:00Z") });
  finishEffect({ target, id: 3 });
  finishEffect({ target, id: 9 });
  finishEffect({ target, id: 10, failed: true });
  const all = listEffects({ target }).effects;
  check("--done -> applied, --failed -> failed, les autres restent planned", all.find((e) => e.id === 1).status === "applied" && all.find((e) => e.id === 10).status === "failed" && all.find((e) => e.id === 2).status === "planned" && all.find((e) => e.id === 1).doneAt === "2027-01-15T10:05:00.000Z");
  const undo = listEffects({ target, undo: true });
  check("effects --undo : effets appliqués seulement, le plus récent d'abord, annulation manuelle signalée, jamais exécutées", undo.undo.map((u) => u.id).join() === "9,3,1" && undo.undo[0].command === null && /manuelle|ne pas/.test(undo.undo[0].note) && undo.undo[1].command === "npm install -g archgate@0.9.0" && undo.undo[1].argv[0] === "npm" && /jamais exécutées/.test(undo.note));
  const before = readFileSync(path.join(target, ".bootstrap", "local", "effects.json"), "utf8");
  const refused = [
    () => planEffect({ target, kind: "docker", args: {}, exec: f.exec }),
    () => planEffect({ target, kind: "npm-global", args: { package: "a b" }, exec: f.exec }),
    () => planEffect({ target, kind: "npm-global", args: { package: "archgate&calc" }, exec: f.exec }),
    () => planEffect({ target, kind: "npm-global", args: { package: "archgate|x" }, exec: f.exec }),
    () => planEffect({ target, kind: "npm-global", args: { package: "archgate;x" }, exec: f.exec }),
    () => planEffect({ target, kind: "npm-global", args: { package: "archgate", version: "1; rm" }, exec: f.exec }),
    () => planEffect({ target, kind: "npm-global", args: { package: "archgate", version: "latest" }, exec: f.exec }),
    () => planEffect({ target, kind: "git-config-global", args: { key: "a b", value: "x" }, exec: f.exec }),
    () => planEffect({ target, kind: "git-config-global", args: { key: "sansection", value: "x" }, exec: f.exec }),
    () => planEffect({ target, kind: "git-config-global", args: { key: "a.b" }, exec: f.exec }),
    () => planEffect({ target, kind: "plugin", args: { name: "x", scope: "monde" }, exec: f.exec }),
    () => planEffect({ target, kind: "plugin", args: { name: "x y" }, exec: f.exec }),
    () => planEffect({ target, kind: "marketplace", args: { source: "a b" }, exec: f.exec }),
    () => planEffect({ target, kind: "custom", args: {}, exec: f.exec }),
    () => finishEffect({ target, id: 99 }),
  ];
  check("entrées invalides refusées (espace, &, |, ;, version non exacte, clé sans section…)", refused.every((fn) => throws(fn) instanceof UsageError));
  check("après des entrées invalides, le journal est inchangé", readFileSync(path.join(target, ".bootstrap", "local", "effects.json"), "utf8") === before);
}

// --- ligne de commande -------------------------------------------------------------------------------------------------------------------
{
  const target = repo();
  const cli = (...a) => spawnSync(process.execPath, [stateScript, ...a], { encoding: "utf8" });
  const r1 = cli("init", "--target", target);
  const r2 = cli("step", "--target", target, "--id", "phase0-scope", "--status", "done", "--note", "réponses reçues");
  const r3 = cli("next", "--target", target);
  check("CLI : init, step, next répondent en JSON avec le code 0", r1.status === 0 && r2.status === 0 && JSON.parse(r2.stdout).status === "done" && r3.status === 0 && JSON.parse(r3.stdout).next.id === "phase1-plan", r1.stderr + r2.stderr + r3.stderr);
  const bad = cli("step", "--target", target, "--id", "inconnue", "--status", "done");
  const again = cli("init", "--target", target);
  const usage = cli("peut-etre");
  check("CLI : entrée invalide, init répété ou commande inconnue -> code 1 et message sur la sortie d'erreur", bad.status === 1 && /étape inconnue/.test(bad.stderr) && again.status === 1 && /déjà présent/.test(again.stderr) && usage.status === 1 && /Usage/.test(usage.stderr));
  const e = cli("effect", "--target", target, "--kind", "custom", "--do", "echo 1", "--undo", "echo 2");
  const done = cli("effect", "--target", target, "--done", String(JSON.parse(e.stdout).id));
  const und = cli("effects", "--target", target, "--undo");
  check("CLI : effect, effect --done, effects --undo", e.status === 0 && done.status === 0 && JSON.parse(und.stdout).undo[0].command === "echo 2", e.stderr + done.stderr + und.stderr);
  const rs = cli("resume", "--target", path.join(mk(), "x"));
  check("CLI : resume d'une cible inexistante -> code 0", rs.status === 0 && JSON.parse(rs.stdout).next.id === "phase0-scope");
}

// --- skill, tests ----------------------------------------------------------------------------------------------------------------------
{
  const skill = readFileSync(path.join(root, "skills", "project-bootstrap", "SKILL.md"), "utf8");
  const missing = ["state.mjs resume", "state.mjs init", "state.mjs config", "--out", "state.mjs step", "--status doing", "state.mjs effect", "state.mjs effects --target <dépôt> --undo", "--done <id>", "npm-global", "git-config-global", "marketplace", "--kind plugin", "--kind custom", "archgate login", "git config --global", "resumable", ".bootstrap/local"].filter((s) => !skill.includes(s));
  check("SKILL.md : reprise, restitution de la configuration, étapes, journal des actions globales et liste d'annulation décrits", missing.length === 0, missing.join(", "));
  check("SKILL.md : chaque étape de state.mjs y est nommée", STEPS.every((s) => skill.includes(`\`${s.id}\``)), STEPS.filter((s) => !skill.includes(`\`${s.id}\``)).map((s) => s.id).join(", "));
  const checks = json(path.join(root, ".bootstrap", "checks.json"));
  check(".bootstrap/checks.json lance tests/state.test.mjs", checks.checks.some((c) => /tests\/state\.test\.mjs/.test(c.command)));
  const pr = readFileSync(path.join(root, ".github", "pull_request_template.md"), "utf8");
  check("le modèle de PR cite aussi tests/state.test.mjs", /state\.test\.mjs/.test(pr));
}

console.log(failed ? `\n${failed} échec(s)` : "\nTous les tests de l'état de reprise passent");
process.exit(failed ? 1 : 0);
