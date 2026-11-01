#!/usr/bin/env node
// État de reprise du bootstrap et journal des effets globaux à la machine.
// Fichiers propres à la machine, dans <dépôt>/.bootstrap/local/ (dossier qui s'ignore seul : son .gitignore vaut « * »,
// donc rien n'est jamais suivi par git, même avant la génération des fichiers du projet) : state.json et effects.json.
// Usage : node state.mjs <commande> --target <dépôt> [options]
//   init    [--config <bootstrap.json>] [--force]    crée l'état (refusé s'il existe, sauf --force qui repart de zéro)
//   config  --set <bootstrap.json>                   fusionne une configuration dans les réponses enregistrées
//   config  --out <fichier>                          écrit les réponses enregistrées dans un fichier (nouvelle session : bootstrap.json)
//   step    --id <étape> --status <doing|done|failed|skipped> [--note <texte>]
//   show | next | resume                             état de chaque étape | prochaine étape | prochaine étape + incohérences (lecture seule)
//   effect  --kind <npm-global|git-config-global|plugin|marketplace|custom> [options du type]   consigne AVANT l'action
//   effect  --done <id> [--failed]                   passe l'effet à « applied » (ou « failed »)
//   effects [--undo]                                 liste les effets ; --undo : commandes d'annulation, la plus récente d'abord
// Le script n'exécute jamais l'action ni son annulation : il lit l'état courant (lecture seule) et consigne.
// Réponses en JSON sur la sortie standard. Codes de sortie : 0 succès ; 1 usage ou entrée invalide.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FORMAT_VERSION = 1;
export const STATUSES = ["doing", "done", "failed", "skipped"];
export const EFFECT_KINDS = ["npm-global", "git-config-global", "plugin", "marketplace", "custom"];
// clés de bootstrap.json conservées dans les réponses (references/bootstrap-config.md) ; toute autre clé est ignorée
export const ANSWER_KEYS = ["projectName", "description", "visibility", "docLanguage", "docLanguageName", "stack", "keep", "modules", "cliInstall", "mainAgent", "profiles", "advisor", "date", "actionsCreditNote", "versions", "actions"];

// Étapes dans l'ordre. needs : un module au moins parmi la liste ; all : tous les modules de la liste (absents = toujours applicable).
// proof : preuve vérifiable de l'étape (absente = non vérifiable). En mode cliInstall « local », phase2-cli suit phase2-generate.
export const STEPS = [
  { id: "phase0-scope", title: "Cadrage : questions de la phase 0 et versions de l'environnement" },
  { id: "phase1-plan", title: "Plan : versions résolues, simulation, validation de l'utilisateur" },
  { id: "phase2-git", title: "Dépôt git initialisé, identité vérifiée", proof: "git" },
  { id: "phase2-cli", title: "CLI OpenSpec et Archgate installées (mode cliInstall)", needs: ["openspec", "archgate"] },
  { id: "phase2-generate", title: "Fichiers générés par scaffold.mjs", proof: "manifest" },
  { id: "phase2-openspec", title: "openspec init et configuration", needs: ["openspec"], proof: "openspec" },
  { id: "phase2-archgate", title: "archgate check passe", needs: ["archgate"] },
  { id: "phase2-archgate-plugin", title: "Plugin Archgate (archgate login, portée locale)", needs: ["archgate-plugin"] },
  { id: "phase2-githooks", title: "Hooks git activés (core.hooksPath)", needs: ["githooks"], proof: "githooks" },
  { id: "phase2-agent-teams", title: "Agent teams activés (settings.local.json)", needs: ["agent-teams"], proof: "agentTeams" },
  { id: "phase2-quality-gate", title: "Contrôle qualité (quality-gate.mjs) à 0", needs: ["claude"] },
  { id: "phase2-github", title: "Dépôt GitHub, labels, permissions, Project", needs: ["github"] },
  { id: "phase2-restart", title: "Redémarrage de Claude Code dans le dépôt" },
  { id: "phase3-verify", title: "Vérification de bout en bout (references/verification.md)" },
  { id: "phase3-audit", title: "Audit du projet (audit.mjs)" },
  { id: "phase4-adr", title: "ADR d'outillage acceptés (issue et PR)", all: ["archgate", "github"] },
];
const stepIds = new Set(STEPS.map((s) => s.id));

export class UsageError extends Error {}

// --- fichiers ----------------------------------------------------------------------------------------------------------------

const localDir = (target) => path.join(target, ".bootstrap", "local");
const stateFile = (target) => path.join(localDir(target), "state.json");
const effectsFile = (target) => path.join(localDir(target), "effects.json");

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// écriture atomique (fichier temporaire puis renommage, avec nouvelles tentatives : antivirus et indexeurs sous Windows)
function writeJsonAtomic(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  const ignore = path.join(path.dirname(file), ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  for (let attempt = 1; ; attempt++) {
    try {
      renameSync(tmp, file);
      return;
    } catch (err) {
      if (attempt >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(err.code)) throw err;
      sleepSync(50 * attempt);
    }
  }
}

function readJson(file) {
  if (!existsSync(file)) return null;
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new UsageError(`${file} illisible : ${err.message} (corrige-le ou supprime-le)`);
  }
  if (data?.version !== FORMAT_VERSION) throw new UsageError(`${file} : version de format ${JSON.stringify(data?.version)} inconnue (attendue : ${FORMAT_VERSION})`);
  return data;
}

function resolveTarget(target, { mustExist = false } = {}) {
  if (!target || target === true) throw new UsageError("--target <dépôt> est requis");
  const dir = path.resolve(target);
  if (existsSync(dir) && !statSync(dir).isDirectory()) throw new UsageError(`${dir} n'est pas un dossier`);
  if (mustExist && !existsSync(dir)) throw new UsageError(`dossier cible introuvable : ${dir}`);
  return dir;
}

function pluginVersion() {
  try {
    return JSON.parse(readFileSync(path.join(here, "..", "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
}

// --- exécuteur (lecture seule) -------------------------------------------------------------------------------------------------

// arguments contrôlés : seuls des caractères sûrs atteignent un shell (shims .cmd de npm et de claude sous Windows)
const SAFE_ARG = /^[\w.@/:=~\\-]+$/;
const SHELL_CLIS = new Set(["npm", "claude"]);
export function realExec(cmd, args = [], { cwd } = {}) {
  const useShell = process.platform === "win32" && SHELL_CLIS.has(cmd);
  if (useShell && !args.every((a) => SAFE_ARG.test(a))) throw new UsageError(`argument refusé pour ${cmd} : ${args.join(" ")}`);
  const res = useShell ? spawnSync(`${cmd} ${args.join(" ")}`, { encoding: "utf8", cwd, shell: true }) : spawnSync(cmd, args, { encoding: "utf8", cwd });
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "", error: res.error };
}

// --- étapes ------------------------------------------------------------------------------------------------------------------

const modulesOf = (state) => new Set(["core", ...(state?.answers?.modules ?? [])]);
export const isApplicable = (step, modules) => (!step.needs || step.needs.some((m) => modules.has(m))) && (!step.all || step.all.every((m) => modules.has(m)));

// ordre des étapes : en mode local, npm ci suit la génération (package.json)
export function orderedSteps(state) {
  if (state?.answers?.cliInstall !== "local") return STEPS;
  const rest = STEPS.filter((s) => s.id !== "phase2-cli");
  rest.splice(rest.findIndex((s) => s.id === "phase2-generate") + 1, 0, STEPS.find((s) => s.id === "phase2-cli"));
  return rest;
}

// preuves vérifiables de l'état réel du dépôt
export function evidence(target, exec = realExec) {
  const has = (p) => existsSync(path.join(target, ...p.split("/")));
  let hooksPath = "";
  if (has(".git")) {
    const res = exec("git", ["-C", target, "config", "--get", "core.hooksPath"], { cwd: target });
    hooksPath = res.status === 0 ? res.stdout.trim() : "";
  }
  let agentTeams = false;
  try {
    agentTeams = readFileSync(path.join(target, ".claude", "settings.local.json"), "utf8").includes("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS");
  } catch {
    agentTeams = false;
  }
  return {
    git: has(".git"),
    manifest: has(".bootstrap/manifest.json"),
    openspec: has("openspec/config.yaml"),
    githooks: hooksPath === ".githooks",
    agentTeams,
  };
}

// statut effectif de chaque étape : « done » sans sa preuve redevient à faire (incohérence)
function evaluate(state, ev) {
  const modules = modulesOf(state);
  const inconsistencies = [];
  const steps = orderedSteps(state).map((s) => {
    const recorded = state?.steps?.[s.id];
    const applicable = isApplicable(s, modules);
    let status = recorded?.status ?? "pending";
    const proof = s.proof ? Boolean(ev[s.proof]) : null;
    if (status === "done" && proof === false) {
      inconsistencies.push(`${s.id} : marquée faite, mais la preuve manque (${s.proof})`);
      status = "to-redo";
    }
    return { id: s.id, title: s.title, applicable, status, proof, ...(recorded?.note ? { note: recorded.note } : {}), ...(recorded?.at ? { at: recorded.at } : {}), ...(recorded?.deduced ? { deduced: true } : {}) };
  });
  const next = steps.find((s) => s.applicable && !["done", "skipped"].includes(s.status)) ?? null;
  return { steps, next: next ? { id: next.id, title: next.title, status: next.status } : null, inconsistencies };
}

// --- commandes ---------------------------------------------------------------------------------------------------------------

// ne garde que les clés connues de bootstrap.json ; renvoie aussi celles qui ont été ignorées
function pickAnswers(config) {
  const kept = {};
  const ignored = [];
  for (const [k, v] of Object.entries(config ?? {})) (ANSWER_KEYS.includes(k) ? (kept[k] = v) : ignored.push(k));
  return { kept, ignored };
}

export function init({ target, config, force = false, now = new Date() }) {
  const dir = resolveTarget(target, { mustExist: true });
  if (existsSync(stateFile(dir)) && !force) throw new UsageError("état déjà présent : utilise « resume » pour reprendre (ou --force pour repartir de zéro)");
  const { kept, ignored } = pickAnswers(config);
  const state = { version: FORMAT_VERSION, plugin: pluginVersion(), updatedAt: now.toISOString(), answers: kept, steps: {} };
  writeJsonAtomic(stateFile(dir), state);
  return { target: dir, state: ".bootstrap/local/state.json", modules: kept.modules ?? [], ignoredKeys: ignored };
}

export function setConfig({ target, set, out, now = new Date() }) {
  const dir = resolveTarget(target, { mustExist: true });
  const state = readJson(stateFile(dir));
  if (!state) throw new UsageError("aucun état : lance « init » d'abord");
  if (set !== undefined) {
    const { kept, ignored } = pickAnswers(set);
    state.answers = { ...state.answers, ...kept };
    state.updatedAt = now.toISOString();
    writeJsonAtomic(stateFile(dir), state);
    return { modules: state.answers.modules ?? [], ignoredKeys: ignored };
  }
  if (typeof out !== "string") throw new UsageError("config attend --set <bootstrap.json> ou --out <fichier>");
  writeFileSync(path.resolve(out), JSON.stringify(state.answers, null, 2) + "\n");
  return { written: path.resolve(out), keys: Object.keys(state.answers) };
}

export function setStep({ target, id, status, note, now = new Date() }) {
  const dir = resolveTarget(target, { mustExist: true });
  if (!stepIds.has(id)) throw new UsageError(`étape inconnue : ${JSON.stringify(id)} (étapes : ${[...stepIds].join(", ")})`);
  if (!STATUSES.includes(status)) throw new UsageError(`statut invalide : ${JSON.stringify(status)} (${STATUSES.join(", ")})`);
  const state = readJson(stateFile(dir));
  if (!state) throw new UsageError("aucun état : lance « init » d'abord");
  state.steps[id] = { status, at: now.toISOString(), ...(note ? { note: String(note) } : {}) };
  state.updatedAt = now.toISOString();
  writeJsonAtomic(stateFile(dir), state);
  return { id, ...state.steps[id] };
}

export function show({ target, exec = realExec }) {
  const dir = resolveTarget(target);
  const state = readJson(stateFile(dir));
  const view = evaluate(state, evidence(dir, exec));
  return { target: dir, exists: existsSync(dir), state: state ? "present" : "absent", plugin: state?.plugin ?? null, steps: view.steps, next: view.next };
}

export function nextStep({ target, exec = realExec }) {
  return { next: show({ target, exec }).next };
}

// lecture seule : n'écrit rien, même quand l'état est absent ou le dossier inexistant
export function resume({ target, exec = realExec }) {
  const dir = resolveTarget(target);
  const ev = evidence(dir, exec);
  let state = readJson(stateFile(dir));
  const deduced = [];
  const hadState = Boolean(state);
  if (!state) {
    // état absent (contexte perdu, fichier supprimé) : l'avancement est déduit des preuves vérifiables ;
    // sans manifeste on ne connaît pas les modules (ils ne sont pas rangés dans le dépôt avant la génération)
    state = { version: FORMAT_VERSION, answers: {}, steps: {} };
    if (ev.manifest) {
      try {
        const manifest = JSON.parse(readFileSync(path.join(dir, ".bootstrap", "manifest.json"), "utf8"));
        state.answers = { ...pickAnswers(manifest.config).kept, modules: (manifest.modules ?? []).filter((m) => m !== "core") };
      } catch {
        state.answers = {};
      }
    }
    const mark = (id) => {
      state.steps[id] = { status: "done", deduced: true };
      deduced.push(id);
    };
    if (ev.manifest) for (const id of ["phase0-scope", "phase1-plan"]) mark(id);
    if (ev.git) mark("phase2-git");
    if (ev.manifest) mark("phase2-generate");
    if (ev.openspec) mark("phase2-openspec");
    if (ev.githooks) mark("phase2-githooks");
    if (ev.agentTeams) mark("phase2-agent-teams");
    // une étape non vérifiable qui précède une étape prouvée est faite (les suivantes en dépendent)
    const order = orderedSteps(state);
    const lastProven = Math.max(-1, ...deduced.map((id) => order.findIndex((s) => s.id === id)));
    const modules = modulesOf(state);
    order.forEach((s, i) => {
      if (i < lastProven && isApplicable(s, modules) && !state.steps[s.id]) mark(s.id);
    });
  }
  const view = evaluate(state, ev);
  return {
    target: dir,
    exists: existsSync(dir),
    state: hadState ? "present" : "absent",
    next: view.next,
    answers: state.answers ?? {},
    inconsistencies: view.inconsistencies,
    deduced,
    steps: view.steps,
  };
}

// --- journal des effets globaux ----------------------------------------------------------------------------------------------

const noControl = (v) => typeof v === "string" && v.length > 0 && !/[\u0000-\u001f]/.test(v);
const show1 = (v) => (/^[\w.\/:@=+~-]+$/.test(v) ? v : JSON.stringify(v));
const expandHome = (p) => p.replace(/^~(?=$|[\\/])/, homedir());
const line = (argv) => argv.map(show1).join(" ");

function planFor(kind, a, exec, cwd) {
  if (kind === "npm-global") {
    const pkg = a.package;
    if (typeof pkg !== "string" || !/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/.test(pkg)) throw new UsageError("--package <nom npm> est requis (ex. archgate, @fission-ai/openspec)");
    if (a.version !== undefined && !/^\d+\.\d+\.\d+([-+][\w.-]+)?$/.test(String(a.version))) throw new UsageError("--version doit être une version exacte (ex. 1.2.3)");
    if (a.prefix !== undefined && !noControl(a.prefix)) throw new UsageError("--prefix invalide");
    if (a.prefix !== undefined && process.platform === "win32") throw new UsageError("--prefix n'a pas de sens sous Windows (le préfixe npm y est déjà propre à l'utilisateur) : mode global");
    const prefix = a.prefix ? ["--prefix", String(a.prefix)] : [];
    // npm ls sort en 1 quand le paquet est absent tout en écrivant du JSON : on lit la sortie quel que soit le code
    const read = exec("npm", ["ls", "-g", "--depth=0", "--json", ...(a.prefix ? ["--prefix", expandHome(String(a.prefix))] : [])], { cwd });
    let previous = null;
    try {
      previous = JSON.parse(read.stdout || "{}").dependencies?.[pkg]?.version ?? null;
    } catch {
      previous = null;
    }
    const doArgv = ["npm", "install", "-g", ...prefix, a.version ? `${pkg}@${a.version}` : pkg];
    const undoArgv = previous ? ["npm", "install", "-g", ...prefix, `${pkg}@${previous}`] : ["npm", "uninstall", "-g", ...prefix, pkg];
    return { do: line(doArgv), doArgv, previous, undo: line(undoArgv), undoArgv };
  }
  if (kind === "git-config-global") {
    if (typeof a.key !== "string" || !/^[a-z][\w-]*(\.[\w-]+)+$/i.test(a.key)) throw new UsageError("--key <section.nom> est requis");
    if (!noControl(a.value)) throw new UsageError("--value est requis (texte sur une ligne)");
    const read = exec("git", ["config", "--global", "--get", a.key], { cwd });
    if (read.status === 2) throw new UsageError(`${a.key} a plusieurs valeurs : non géré, utilise --kind custom avec une annulation écrite à la main`);
    const previous = read.status === 0 ? read.stdout.replace(/\r?\n$/, "") : null;
    const doArgv = ["git", "config", "--global", a.key, a.value];
    const undoArgv = previous !== null ? ["git", "config", "--global", a.key, previous] : ["git", "config", "--global", "--unset", a.key];
    return { do: line(doArgv), doArgv, previous, undo: line(undoArgv), undoArgv };
  }
  if (kind === "plugin" || kind === "marketplace") {
    const isPlugin = kind === "plugin";
    let name;
    let doArgv;
    let undoArgv;
    let listArgv;
    if (isPlugin) {
      if (typeof a.name !== "string" || !/^[\w.@-]+$/.test(a.name)) throw new UsageError("--name <plugin@marketplace> est requis");
      const scope = a.scope ?? "local";
      if (!["user", "project", "local"].includes(scope)) throw new UsageError("--scope doit valoir user, project ou local");
      name = a.name;
      doArgv = ["claude", "plugin", "install", name, "--scope", scope];
      undoArgv = ["claude", "plugin", "uninstall", name, "--scope", scope];
      listArgv = ["plugin", "list"];
    } else {
      if (typeof a.source !== "string" || !/^[\w.@/:=~-]+$/.test(a.source)) throw new UsageError("--source <url ou propriétaire/dépôt> est requis");
      name = a.name ?? a.source.replace(/\/+$/, "").split("/").pop().replace(/\.git$/, "");
      if (!/^[\w.@-]+$/.test(name)) throw new UsageError("--name invalide");
      doArgv = ["claude", "plugin", "marketplace", "add", a.source];
      undoArgv = ["claude", "plugin", "marketplace", "remove", name];
      listArgv = ["plugin", "marketplace", "list"];
    }
    // l'annulation retire pour toute la machine : on lit ce qui existait avant l'action
    const read = exec("claude", listArgv, { cwd });
    const readable = read.status === 0 && !read.error;
    const present = readable && read.stdout.includes(name.split("@")[0]);
    const entry = { do: line(doArgv), doArgv, previous: readable ? (present ? "déjà présent" : null) : "inconnu" };
    if (present) return { ...entry, undo: null, undoArgv: null, caution: `${name} existait avant l'action : ne pas le retirer, d'autres projets peuvent l'utiliser` };
    return {
      ...entry,
      undo: line(undoArgv),
      undoArgv,
      ...(readable ? {} : { caution: `l'état précédent n'a pas pu être lu : vérifier qu'aucun autre projet n'utilise ${name} avant d'annuler` }),
    };
  }
  if (kind === "custom") {
    if (!noControl(a.do)) throw new UsageError("--do <commande> est requis pour un effet custom");
    if (a.undo !== undefined && !noControl(a.undo)) throw new UsageError("--undo invalide");
    return { do: a.do, previous: null, undo: a.undo ?? null, ...(a.label ? { label: String(a.label) } : {}) };
  }
  throw new UsageError(`type d'effet inconnu : ${JSON.stringify(kind)} (${EFFECT_KINDS.join(", ")})`);
}

export function planEffect({ target, kind, args = {}, exec = realExec, now = new Date() }) {
  const dir = resolveTarget(target, { mustExist: true });
  if (!EFFECT_KINDS.includes(kind)) throw new UsageError(`type d'effet inconnu : ${JSON.stringify(kind)} (${EFFECT_KINDS.join(", ")})`);
  const plan = planFor(kind, args, exec, dir);
  const journal = readJson(effectsFile(dir)) ?? { version: FORMAT_VERSION, effects: [] };
  const id = journal.effects.reduce((m, e) => Math.max(m, e.id), 0) + 1;
  const entry = { id, kind, at: now.toISOString(), ...plan, status: "planned" };
  journal.effects.push(entry);
  writeJsonAtomic(effectsFile(dir), journal);
  return entry;
}

export function finishEffect({ target, id, failed = false, now = new Date() }) {
  const dir = resolveTarget(target, { mustExist: true });
  const journal = readJson(effectsFile(dir));
  const entry = journal?.effects.find((e) => e.id === Number(id));
  if (!entry) throw new UsageError(`effet inconnu : ${JSON.stringify(id)}`);
  entry.status = failed ? "failed" : "applied";
  entry.doneAt = now.toISOString();
  writeJsonAtomic(effectsFile(dir), journal);
  return entry;
}

export function listEffects({ target, undo = false }) {
  const dir = resolveTarget(target);
  const journal = readJson(effectsFile(dir)) ?? { version: FORMAT_VERSION, effects: [] };
  if (!undo) return { effects: journal.effects };
  const applied = journal.effects.filter((e) => e.status === "applied").reverse();
  return {
    undo: applied.map((e) => ({
      id: e.id,
      kind: e.kind,
      command: e.undo ?? null,
      ...(e.undoArgv ? { argv: e.undoArgv } : {}),
      ...(e.undo ? {} : { note: e.caution ?? "annulation manuelle : aucune commande connue" }),
      ...(e.undo && e.caution ? { note: e.caution } : {}),
      ...(e.previous ? { previous: e.previous } : {}),
    })),
    note: "commandes proposées, jamais exécutées par ce script : relire avant de les lancer (une CLI retirée peut servir à d'autres projets)",
  };
}

// --- CLI ---------------------------------------------------------------------------------------------------------------------

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) throw new UsageError(`argument inattendu : ${a}`);
    const key = a.slice(2);
    options[key] = rest[i + 1] === undefined || rest[i + 1].startsWith("--") ? true : rest[++i];
  }
  return { command, options };
}

function readConfigFile(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new UsageError(`configuration illisible (${file}) : ${err.message}`);
  }
}

export function run(argv, { exec = realExec } = {}) {
  const { command, options: o } = parseArgs(argv);
  switch (command) {
    case "init":
      return init({ target: o.target, config: typeof o.config === "string" ? readConfigFile(o.config) : undefined, force: o.force === true });
    case "config":
      return setConfig({ target: o.target, set: typeof o.set === "string" ? readConfigFile(o.set) : undefined, out: o.out });
    case "step":
      return setStep({ target: o.target, id: o.id, status: o.status, note: typeof o.note === "string" ? o.note : undefined });
    case "show":
      return show({ target: o.target, exec });
    case "next":
      return nextStep({ target: o.target, exec });
    case "resume":
      return resume({ target: o.target, exec });
    case "effect":
      if (o.done !== undefined) return finishEffect({ target: o.target, id: o.done, failed: o.failed === true });
      return planEffect({ target: o.target, kind: o.kind, args: o, exec });
    case "effects":
      return listEffects({ target: o.target, undo: o.undo === true });
    default:
      throw new UsageError("Usage : node state.mjs <init|config|step|show|next|resume|effect|effects> --target <dépôt> [options] (voir l'en-tête du script)");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(run(process.argv.slice(2)), null, 2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}
