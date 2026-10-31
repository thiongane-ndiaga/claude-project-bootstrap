#!/usr/bin/env node
// Audit en lecture seule d'un projet généré : rapporte chaque écart connu avec la correction proposée, ne modifie rien.
// Usage : node audit.mjs --target <dépôt> [--json] [--forge [--repo propriétaire/nom] [--project <n> --owner <login>]] [--workstation]
// Chaque contrôle donne { id, statut, message, correction } ; statut : ok | ecart | non-verifiable (un non-verifiable n'est pas un écart).
// Codes de sortie : 0 aucun écart ; 1 au moins un écart ; 2 erreur d'usage.
// Sans --forge ni --workstation, l'audit n'émet aucun appel réseau. Auditer un projet exécute son outillage (archgate check charge ses
// règles .rules.ts, openspec doctor...) : à réserver aux dépôts de confiance. Aucune valeur d'entrée n'est insérée dans un shell.
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const OWNER_RE = /^[\w.-]+$/;
const GITHUB_ACTIONS_APP_ID = 15368;
// CLI installées par npm : raccourcis .cmd sous Windows, qui exigent un shell (arguments toujours constants ici)
const SHELL_CLIS = new Set(["openspec", "archgate", "npm"]);
const ACTION_KEYS = { "actions/checkout": "checkout", "actions/setup-node": "setupNode", "googleapis/release-please-action": "releasePlease" };

// Exécuteur réel : { status, stdout, stderr, error }. Le dossier cible ne passe que par cwd, jamais dans une chaîne de commande.
export function realExec(cmd, args = [], { cwd, env, timeout = 120000 } = {}) {
  const opts = { encoding: "utf8", cwd, timeout, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, OPENSPEC_TELEMETRY: "0", ...env } };
  if (SHELL_CLIS.has(cmd)) {
    // défense en profondeur : seuls des arguments constants et sûrs peuvent atteindre un shell
    if (!args.every((a) => /^[\w.=:-]+$/.test(a))) throw new Error(`argument refusé pour ${cmd} : ${args.join(" ")}`);
    const res = spawnSync(`${cmd} ${args.join(" ")}`, { ...opts, shell: true });
    return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "", error: res.error };
  }
  const res = spawnSync(cmd, args, opts);
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "", error: res.error };
}

const ok = (id, message) => ({ id, statut: "ok", message });
const ecart = (id, message, correction) => ({ id, statut: "ecart", message, correction });
const nv = (id, message) => ({ id, statut: "non-verifiable", message });

// CLI introuvable : échec de lancement, ou statut 127 (sh) / 9009 (cmd.exe) quand un shell est utilisé
const missing = (res) => Boolean(res.error && res.error.code !== "ETIMEDOUT") || res.status === 127 || res.status === 9009;
const timedOut = (res) => res.error?.code === "ETIMEDOUT";
const semver = (text) => /\d+\.\d+\.\d+/.exec(text ?? "")?.[0];
const readText = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const readJson = (file) => JSON.parse(readText(file));
const real = (p) => {
  let r;
  try {
    r = realpathSync.native(p);
  } catch {
    r = path.resolve(p);
  }
  return process.platform === "win32" ? r.toLowerCase() : r;
};

// --- lecture des formulaires et des workflows --------------------------------------------------------------------------------

// Valeur de la clé `labels` d'un formulaire : tableau, `undefined` (pas de clé) ou `null` (format non reconnu)
export function parseFormLabels(text) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => /^labels:/.test(l));
  if (i < 0) return undefined;
  const rest = lines[i].slice("labels:".length).trim();
  const clean = (s) => s.trim().replace(/^["']|["']$/g, "");
  if (rest.startsWith("[") && rest.endsWith("]")) return rest.slice(1, -1).split(",").map(clean).filter(Boolean);
  if (rest === "") {
    const items = [];
    for (let j = i + 1; j < lines.length; j++) {
      const m = /^\s+-\s+(.+?)\s*$/.exec(lines[j]);
      if (!m) break;
      items.push(clean(m[1]));
    }
    return items.length ? items : null;
  }
  if (/^[^[\]{}&*!|>%@`]+$/.test(rest)) return rest.split(",").map(clean).filter(Boolean);
  return null;
}

function formLabels(target) {
  const dir = path.join(target, ".github", "ISSUE_TEMPLATE");
  if (!existsSync(dir)) return { forms: [], unknown: [] };
  const forms = [];
  const unknown = [];
  for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n) && n !== "config.yml").sort()) {
    const labels = parseFormLabels(readText(path.join(dir, f)));
    if (labels === null) unknown.push(f);
    else if (labels) forms.push({ file: f, labels });
  }
  return { forms, unknown };
}

// Jobs d'un workflow : [{ key, name, body }]
function workflowJobs(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (start < 0) return [];
  const jobs = [];
  let cur = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S/.test(l)) break;
    const m = /^ {2}([\w-]+):\s*$/.exec(l);
    if (m) {
      cur = { key: m[1], name: null, body: [] };
      jobs.push(cur);
      continue;
    }
    if (cur) {
      cur.body.push(l);
      const n = /^ {4}name:\s*(.+?)\s*$/.exec(l);
      if (n && !cur.name) cur.name = n[1].replace(/^["']|["']$/g, "");
    }
  }
  return jobs;
}

// Noms de checks attendus : tous les jobs de tous les workflows, matrices développées (littérales ou pilotées par ciOs)
function expectedContexts(target) {
  const dir = path.join(target, ".github", "workflows");
  let ciOs = ["ubuntu-latest"];
  try {
    const checks = readJson(path.join(target, ".bootstrap", "checks.json"));
    if (Array.isArray(checks.ciOs) && checks.ciOs.length) ciOs = checks.ciOs;
  } catch {
    // pas de checks.json : valeur par défaut
  }
  const names = new Set();
  if (!existsSync(dir)) return names;
  for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
    for (const job of workflowJobs(readText(path.join(dir, f)))) {
      const display = job.name ?? job.key;
      const body = job.body.join("\n");
      if (/^\s+matrix:/m.test(body)) {
        const os = /^\s+os:\s*(.+)$/m.exec(body)?.[1]?.trim() ?? "";
        const list = os.startsWith("[") ? os.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean) : /fromJSON/i.test(os) ? ciOs : [];
        if (list.length) {
          for (const o of list) names.add(`${display} (${o})`);
          continue;
        }
      }
      names.add(display);
    }
  }
  return names;
}

// SHA des actions : { "actions/checkout": sha, ... } par fichier
function pinnedActions(text) {
  const out = {};
  for (const m of text.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@([0-9a-f]{40})/g)) out[m[1]] = m[2];
  return out;
}

// --- gh en lecture seule -----------------------------------------------------------------------------------------------------

export function isGhWrite(args) {
  const i = args.findIndex((a) => a === "-X" || a === "--method");
  const method = i >= 0 ? String(args[i + 1] ?? "").toUpperCase() : null;
  if (method && method !== "GET") return true;
  if (args[0] === "api" && args[1] === "graphql") return args.some((a) => /\bmutation\b/i.test(String(a)));
  const hasField = args.some((a) => ["-f", "-F", "--field", "--raw-field"].includes(a));
  return hasField && method !== "GET";
}

function makeGh(exec) {
  return (args) => {
    if (isGhWrite(args)) throw new Error(`écriture refusée en audit : gh ${args.join(" ")}`);
    const res = exec("gh", args, { cwd: tmpdir() });
    if (missing(res)) throw new Error("gh introuvable");
    if (res.status !== 0) {
      const err = new Error((res.stderr || res.stdout || "gh a échoué").trim().split("\n")[0]);
      err.status = res.status;
      throw err;
    }
    return res.stdout;
  };
}

// --- contrôles locaux --------------------------------------------------------------------------------------------------------

function checkManifest(ctx) {
  const file = path.join(ctx.target, ".bootstrap", "manifest.json");
  if (!existsSync(file)) return [nv("manifeste", "projet sans manifeste : adopter le projet avec scaffold.mjs --adopt")];
  try {
    ctx.manifest = readJson(file);
  } catch (err) {
    return [ecart("manifeste", `manifeste illisible (${err.message})`, "corriger ou supprimer .bootstrap/manifest.json puis relancer scaffold.mjs --update")];
  }
  ctx.modules = new Set(["core", ...(ctx.manifest.modules ?? [])]);
  return [ok("manifeste", `manifeste lu (plugin ${ctx.manifest.plugin?.version ?? "?"})`)];
}

function checkUpdate(ctx) {
  if (!ctx.manifest) return [nv("mise-a-jour", "pas de manifeste lisible")];
  const results = [];
  const wanted = ctx.pluginVersion;
  const have = ctx.manifest.plugin?.version;
  if (wanted && have !== wanted) results.push(ecart("version-plugin", `le manifeste est en ${have}, le plugin en ${wanted}`, `node scaffold.mjs --update --target <dépôt>`));
  else results.push(ok("version-plugin", `manifeste à la version ${have}`));
  const res = ctx.exec(process.execPath, [path.join(here, "scaffold.mjs"), "--update", "--dry-run", "--target", ctx.target], { cwd: tmpdir() });
  let report = null;
  try {
    if (res.status === 0 || res.status === 3) report = JSON.parse(res.stdout);
  } catch {
    report = null;
  }
  if (!report) return [...results, nv("mise-a-jour", `simulation de mise à jour impossible (${(res.stderr || "sortie illisible").trim().split("\n")[0]})`)];
  const pending = ["created", "updated", "reconciled", "conflicts"].filter((k) => report[k]?.length);
  if (pending.length) {
    const detail = pending.map((k) => `${k}: ${report[k].join(", ")}`).join(" ; ");
    results.push(ecart("mise-a-jour", `mise à jour en attente (${detail})`, "node scaffold.mjs --update --target <dépôt> --dry-run --diff, puis sans --dry-run"));
  } else {
    results.push(ok("mise-a-jour", report.retired?.length ? `rien en attente (fichiers retirés du modèle, non supprimés : ${report.retired.join(", ")})` : "rien en attente"));
  }
  if (report.baseInvalid?.length) results.push(ecart("bases", `bases de fusion invalides : ${report.baseInvalid.join(", ")}`, "restaurer .bootstrap/base depuis git, ou supprimer la base (le prochain --update la reconstitue)"));
  else results.push(ok("bases", "bases de fusion valides"));
  return results;
}

function checkGithooks(ctx) {
  if (!ctx.modules?.has("githooks")) return [];
  const git = (args) => ctx.exec("git", ["-C", ctx.target, ...args], { cwd: tmpdir() });
  const top = git(["rev-parse", "--show-toplevel"]);
  if (missing(top) || top.status !== 0) return [nv("hooks-git", "la cible n'est pas un dépôt git")];
  if (real(top.stdout.trim()) !== real(ctx.target)) return [nv("hooks-git", "la cible est dans un dépôt parent : hooks non contrôlés")];
  const results = [];
  const hook = ".githooks/pre-push";
  const idx = /^(\d{6})/.exec(git(["ls-files", "-s", "--", hook]).stdout)?.[1];
  const head = /^(\d{6})/.exec(git(["ls-tree", "HEAD", "--", hook]).stdout)?.[1];
  const bad = [];
  if (!idx) bad.push("non suivi par git");
  else if (idx !== "100755") bad.push(`mode ${idx} dans l'index`);
  if (head && head !== "100755") bad.push(`mode ${head} dans le dernier commit`);
  if (process.platform !== "win32" && existsSync(path.join(ctx.target, hook)) && !(statSync(path.join(ctx.target, hook)).mode & 0o111)) bad.push("non exécutable sur le disque");
  results.push(bad.length ? ecart("hooks-mode", `${hook} : ${bad.join(", ")}`, `chmod +x ${hook} && git update-index --chmod=+x ${hook}, puis commiter`) : ok("hooks-mode", `${hook} exécutable et enregistré`));
  const hp = git(["config", "--get", "core.hooksPath"]).stdout.trim();
  results.push(hp === ".githooks" ? ok("hooks-chemin", "core.hooksPath = .githooks") : ecart("hooks-chemin", `core.hooksPath vaut « ${hp || "(vide)"} »`, "git config core.hooksPath .githooks"));
  return results;
}

function checkForms(ctx) {
  if (!ctx.modules?.has("github")) return [];
  let known;
  try {
    known = new Set(readJson(path.join(ctx.target, ".github", "labels.json")).map((l) => String(l.name).toLowerCase()));
  } catch (err) {
    return [nv("formulaires-labels", `labels.json illisible ou absent (${err.message})`)];
  }
  const { forms, unknown } = formLabels(ctx.target);
  ctx.forms = forms;
  const bad = [];
  for (const f of forms) for (const l of f.labels) if (!known.has(l.toLowerCase())) bad.push(`${f.file} → « ${l} »`);
  if (bad.length) return [ecart("formulaires-labels", `labels posés par un formulaire et absents de labels.json : ${bad.join(" ; ")}`, "ajouter le label à .github/labels.json (puis node scripts/sync-labels.mjs) ou corriger le formulaire")];
  if (unknown.length) return [nv("formulaires-labels", `format de la clé labels non reconnu : ${unknown.join(", ")}`)];
  return [ok("formulaires-labels", "les labels des formulaires figurent dans labels.json")];
}

function probe(ctx, cli) {
  const res = ctx.exec(cli, ["--version"], { cwd: ctx.target });
  return missing(res) || res.status !== 0 ? null : semver(res.stdout + res.stderr);
}

function checkVersions(ctx) {
  const ci = path.join(ctx.target, ".github", "workflows", "ci.yml");
  if (!existsSync(ci)) return [];
  const text = readText(ci);
  const results = [];
  for (const [tool, mod, envName] of [["openspec", "openspec", "OPENSPEC_VERSION"], ["archgate", "archgate", "ARCHGATE_VERSION"]]) {
    if (!ctx.modules?.has(mod)) continue;
    const sources = {};
    const inCi = new RegExp(`${envName}:\\s*"?([\\w.-]+)`).exec(text)?.[1];
    if (inCi) sources["ci.yml"] = inCi;
    const inManifest = ctx.manifest?.config?.versions?.[tool];
    if (inManifest) sources.manifeste = inManifest;
    const installed = probe(ctx, tool);
    if (installed) sources["poste"] = installed;
    const values = new Set(Object.values(sources));
    if (!inCi && !inManifest) results.push(nv(`version-${tool}`, "version épinglée introuvable dans ci.yml et le manifeste"));
    else if (values.size > 1) results.push(ecart(`version-${tool}`, `${tool} : ${Object.entries(sources).map(([k, v]) => `${k} ${v}`).join(", ")}`, `npm install -g ${tool === "openspec" ? "@fission-ai/openspec" : "archgate"}@${inCi ?? inManifest}`));
    else results.push(ok(`version-${tool}`, `${tool} ${[...values][0]}${installed ? "" : " (CLI du poste non vérifiée)"}`));
  }
  return results;
}

function checkActions(ctx) {
  const dir = path.join(ctx.target, ".github", "workflows");
  if (!existsSync(dir) || !ctx.manifest) return [];
  const byFile = {};
  for (const f of ["ci.yml", "release.yml"]) if (existsSync(path.join(dir, f))) byFile[f] = pinnedActions(readText(path.join(dir, f)));
  const bad = [];
  const pins = ctx.manifest.config?.actions ?? {};
  const seen = {};
  for (const [file, actions] of Object.entries(byFile)) {
    for (const [action, sha] of Object.entries(actions)) {
      if (seen[action] && seen[action].sha !== sha) bad.push(`${action} : ${seen[action].file} ${seen[action].sha.slice(0, 7)} ≠ ${file} ${sha.slice(0, 7)}`);
      seen[action] ??= { file, sha };
      const key = ACTION_KEYS[action];
      if (key && pins[key]?.sha && pins[key].sha !== sha) bad.push(`${action} dans ${file} (${sha.slice(0, 7)}) ≠ manifeste (${pins[key].sha.slice(0, 7)})`);
    }
  }
  return bad.length ? [ecart("actions-epinglees", bad.join(" ; "), "aligner les SHA des workflows et config.actions du manifeste")] : [ok("actions-epinglees", "SHA des actions cohérents")];
}

function runTool(ctx, id, cli, args) {
  if (missing(ctx.exec(cli, ["--version"], { cwd: ctx.target }))) return nv(id, `${cli} introuvable`);
  const res = ctx.exec(cli, args, { cwd: ctx.target });
  if (missing(res)) return nv(id, `${cli} introuvable`);
  if (timedOut(res)) return nv(id, `${cli} ${args[0]} : délai dépassé`);
  if (res.status !== 0) return ecart(id, `${cli} ${args.join(" ")} : échec\n${(res.stdout + res.stderr).trim().slice(0, 400)}`, `corriger puis relancer ${cli} ${args.join(" ")}`);
  return ok(id, `${cli} ${args[0]} passe`);
}

function checkTools(ctx) {
  const results = [];
  if (ctx.modules?.has("archgate")) results.push(runTool(ctx, "archgate-check", "archgate", ["check", "--output", "console"]));
  if (ctx.modules?.has("openspec")) {
    results.push(runTool(ctx, "openspec-validate", "openspec", ["validate", "--all", "--strict", "--no-interactive"]));
    const res = ctx.exec("openspec", ["doctor", "--json"], { cwd: ctx.target });
    if (missing(res)) results.push(nv("openspec-doctor", "openspec introuvable"));
    else {
      try {
        const doc = JSON.parse(res.stdout);
        if (doc.root?.path && real(doc.root.path) !== real(ctx.target)) results.push(nv("openspec-doctor", `racine OpenSpec rapportée : ${doc.root.path} (n'est pas la cible)`));
        else {
          const errors = [...(doc.status ?? []), ...(doc.root?.status ?? [])].filter((s) => s.severity === "error");
          if (doc.root?.healthy === false || errors.length) results.push(ecart("openspec-doctor", `openspec doctor : ${errors.map((e) => e.code ?? e.message).join(", ") || "racine non saine"}`, "openspec doctor"));
          else results.push(ok("openspec-doctor", "openspec doctor sain"));
        }
      } catch {
        results.push(nv("openspec-doctor", "sortie de openspec doctor illisible"));
      }
    }
  }
  return results;
}

function checkSettings(ctx) {
  if (!ctx.manifest) return [];
  const results = [];
  for (const f of ["settings.json", "settings.local.json"]) {
    const file = path.join(ctx.target, ".claude", f);
    if (!existsSync(file)) continue;
    try {
      if (readJson(file).agent === "archgate:developer") results.push(ecart("agent-impose", `.claude/${f} impose l'agent archgate:developer`, `retirer la clé "agent" de .claude/${f}`));
    } catch {
      results.push(nv("agent-impose", `.claude/${f} illisible`));
    }
  }
  if (!results.length) results.push(ok("agent-impose", "aucun agent imposé par les réglages du projet"));
  const adrs = path.join(ctx.target, ".archgate", "adrs");
  if (ctx.modules?.has("archgate") && existsSync(adrs) && readdirSync(adrs).some((n) => /^GEN-001/.test(n))) results.push(ecart("adr-exemple", "ADR d'exemple GEN-001 créé par archgate init", "supprimer .archgate/adrs/GEN-001*"));
  else if (ctx.modules?.has("archgate")) results.push(ok("adr-exemple", "pas d'ADR d'exemple"));
  return results;
}

// --- contrôles de la forge ---------------------------------------------------------------------------------------------------

function repoOf(ctx, repo) {
  if (repo) return repo;
  const res = ctx.exec("git", ["-C", ctx.target, "remote", "get-url", "origin"], { cwd: tmpdir() });
  const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\s*$/.exec(res.stdout ?? "");
  return m && validRepo(m[1]) ? m[1] : null;
}

function checkForgeLabels(ctx, gh, repo) {
  if (!ctx.forms?.length) return [nv("forge-labels", "aucun formulaire à comparer (module github absent ou formulaires illisibles)")];
  const have = new Set(gh(["api", "--paginate", `repos/${repo}/labels?per_page=100`, "--jq", ".[].name"]).split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean));
  const bad = [];
  for (const f of ctx.forms) for (const l of f.labels) if (!have.has(l.toLowerCase())) bad.push(`${f.file} → « ${l} »`);
  return bad.length ? [ecart("forge-labels", `labels posés par un formulaire et absents du dépôt : ${bad.join(" ; ")} (GitHub les ignore en silence)`, "node scripts/sync-labels.mjs")] : [ok("forge-labels", "les labels des formulaires existent sur le dépôt")];
}

function requiredContexts(gh, repo) {
  const required = [];
  let found = false;
  try {
    const p = JSON.parse(gh(["api", `repos/${repo}/branches/main/protection`]));
    found = true;
    for (const c of p.required_status_checks?.checks ?? []) required.push({ context: c.context, appId: c.app_id });
    for (const c of p.required_status_checks?.contexts ?? []) if (!required.some((r) => r.context === c)) required.push({ context: c });
  } catch (err) {
    if (!/HTTP (403|404)|Not Found|Forbidden|upgrade/i.test(err.message)) throw err;
  }
  try {
    const rules = JSON.parse(gh(["api", `repos/${repo}/rules/branches/main`]));
    found = true;
    for (const r of rules) if (r.type === "required_status_checks") for (const c of r.parameters?.required_status_checks ?? []) required.push({ context: c.context, appId: c.integration_id });
  } catch (err) {
    if (!/HTTP (403|404)|Not Found|Forbidden|upgrade/i.test(err.message)) throw err;
  }
  return found ? required : null;
}

function checkProtection(ctx, gh, repo) {
  const required = requiredContexts(gh, repo);
  if (required === null) return [nv("forge-protection", "protection de main absente ou inaccessible (dépôt privé en plan gratuit, ou droits insuffisants)")];
  const expected = expectedContexts(ctx.target);
  const bad = [];
  const foreign = [];
  for (const r of required) {
    if (r.appId && r.appId !== GITHUB_ACTIONS_APP_ID && r.appId !== -1) foreign.push(r.context);
    else if (!expected.has(r.context)) bad.push(r.context);
  }
  if (bad.length) return [ecart("forge-protection", `checks exigés sur main introuvables parmi les jobs des workflows : ${bad.join(", ")} (jobs connus : ${[...expected].join(", ")})`, "mettre à jour les checks exigés dans la protection de main, ou renommer le job")];
  if (foreign.length) return [nv("forge-protection", `checks d'une autre application, non comparables : ${foreign.join(", ")}`)];
  return [ok("forge-protection", required.length ? `checks exigés présents : ${required.map((r) => r.context).join(", ")}` : "aucun check exigé")];
}

async function checkMigrations(ctx, gh, repo) {
  if (!ctx.manifest) return [nv("migrations", "pas de manifeste lisible")];
  const dir = path.join(here, "..", "migrations");
  const results = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".mjs")).sort()) {
    const m = await import(pathToFileURL(path.join(dir, name)).href);
    if (!m.modules.every((x) => ctx.modules.has(x))) continue;
    try {
      const planned = await m.plan({ gh, repo, target: ctx.target, manifest: ctx.manifest });
      const actions = Array.isArray(planned) ? planned : (planned.actions ?? []);
      const notes = Array.isArray(planned) ? [] : (planned.notes ?? []);
      const suffix = notes.length ? ` — notes : ${notes.join(" ; ")}` : "";
      if (actions.length) results.push(ecart(`migration-${m.id}`, `migration en attente (${actions.length} action(s)) : ${actions.map((a) => a.description).join(" ; ")}${suffix}`, "node migrate.mjs --target <dépôt> (simulation), puis --apply avec l'accord de l'utilisateur"));
      else results.push(ok(`migration-${m.id}`, `forge conforme${suffix}`));
    } catch (err) {
      results.push(nv(`migration-${m.id}`, err.message));
    }
  }
  return results;
}

function checkProject(ctx, gh, owner, project) {
  if (!ctx.modules?.has("projects")) return [];
  if (!owner || !project) return [nv("forge-project", "numéro de Project et propriétaire non fournis (--project et --owner)")];
  const query = "query($owner: String!, $number: Int!) { repositoryOwner(login: $owner) { ... on ProjectV2Owner { projectV2(number: $number) { workflows(first: 50) { nodes { name enabled } } } } } }";
  const data = JSON.parse(gh(["api", "graphql", "-f", `query=${query}`, "-f", `owner=${owner}`, "-F", `number=${project}`]));
  const nodes = data.data?.repositoryOwner?.projectV2?.workflows?.nodes;
  if (!nodes) return [nv("forge-project", "Project introuvable ou inaccessible")];
  const off = [];
  for (const wanted of ["Auto-add to project", "Item closed", "Pull request merged"]) {
    const w = nodes.find((n) => n.name === wanted);
    if (!w || !w.enabled) off.push(wanted);
  }
  if (off.length) return [ecart("forge-project", `automatisations du Project désactivées : ${off.join(", ")}`, "les activer dans le Project (⋯ → Workflows)")];
  return [ok("forge-project", "Auto-add, Item closed et Pull request merged sont activées. La cible d'« Auto-add » (dépôt, filtre) n'est pas exposée par l'API : à vérifier à la main dans ⋯ → Workflows")];
}

// --- contrôles du poste ------------------------------------------------------------------------------------------------------

function checkWorkstation(ctx, opts) {
  const results = [];
  const node = opts.nodeVersion ?? process.versions.node;
  const [maj, min] = node.split(".").map(Number);
  results.push(maj > 20 || (maj === 20 && min >= 19) ? ok("poste-node", `Node ${node}`) : ecart("poste-node", `Node ${node} < 20.19`, "installer Node.js ≥ 20.19"));
  const git = ctx.exec("git", ["--version"], { cwd: tmpdir() });
  results.push(missing(git) ? ecart("poste-git", "git introuvable", "installer git") : ok("poste-git", git.stdout.trim()));
  if (ctx.modules?.has("github") || ctx.modules?.has("projects")) {
    const gh = ctx.exec("gh", ["--version"], { cwd: tmpdir() });
    if (missing(gh)) results.push(ecart("poste-gh", "gh introuvable", "installer GitHub CLI puis rouvrir le terminal"));
    else {
      results.push(ok("poste-gh", gh.stdout.split("\n")[0]));
      if (ctx.modules.has("projects")) {
        const auth = ctx.exec("gh", ["auth", "status", "-h", "github.com"], { cwd: tmpdir() });
        const scopes = /Token scopes:\s*(.+)/i.exec(`${auth.stdout}\n${auth.stderr}`)?.[1];
        if (auth.status !== 0 && !scopes) results.push(ecart("poste-gh-scope", "gh non authentifié sur github.com", "gh auth login -h github.com -s project"));
        else if (!scopes) results.push(nv("poste-gh-scope", "gh ne rapporte pas de scopes (jeton fin ou GH_TOKEN)"));
        else results.push(/\bproject\b/.test(scopes) ? ok("poste-gh-scope", "scope project présent") : ecart("poste-gh-scope", `scope project absent (${scopes})`, "gh auth refresh -h github.com -s project"));
      }
    }
  }
  if (process.platform !== "win32") {
    const npm = ctx.exec("npm", ["config", "get", "prefix"], { cwd: tmpdir() });
    if (missing(npm) || npm.status !== 0) results.push(nv("poste-npm", "npm introuvable"));
    else {
      const prefix = npm.stdout.trim();
      const dir = existsSync(path.join(prefix, "lib", "node_modules")) ? path.join(prefix, "lib", "node_modules") : prefix;
      try {
        accessSync(dir, constants.W_OK);
        results.push(ok("poste-npm", `préfixe npm ${prefix} inscriptible`));
      } catch {
        results.push(ecart("poste-npm", `préfixe npm ${prefix} non inscriptible`, "npm install -g --prefix ~/.local <paquet> (avec ~/.local/bin dans le PATH), sans sudo"));
      }
    }
  }
  const configDir = opts.configDir ?? process.env.CLAUDE_CONFIG_DIR ?? path.join(opts.home ?? homedir(), ".claude");
  try {
    const data = readJson(path.join(configDir, "plugins", "installed_plugins.json"));
    const entries = (data.plugins ?? data)["archgate@archgate"] ?? [];
    const bad = entries.filter((e) => e.scope === "user" && e.installPath && existsSync(path.join(e.installPath, "settings.json")) && "agent" in readJson(path.join(e.installPath, "settings.json")));
    results.push(bad.length ? ecart("poste-archgate-plugin", "plugin Archgate installé en portée utilisateur : il impose un agent à toutes les sessions", "claude plugin uninstall archgate@archgate --scope user, puis l'installer en portée locale dans le projet") : ok("poste-archgate-plugin", "pas de plugin Archgate imposant un agent en portée utilisateur"));
  } catch {
    results.push(nv("poste-archgate-plugin", "installed_plugins.json absent ou illisible"));
  }
  return results;
}

// --- orchestration -----------------------------------------------------------------------------------------------------------

export async function runAudit({ target, forge = false, workstation = false, repo, project, owner, exec = realExec, home, configDir, nodeVersion } = {}) {
  const ctx = { target: path.resolve(target), exec, pluginVersion: null };
  try {
    ctx.pluginVersion = readJson(path.join(here, "..", "..", "..", ".claude-plugin", "plugin.json")).version;
  } catch {
    // plugin lancé hors de son arborescence
  }
  const results = [];
  try {
    results.push(...checkManifest(ctx));
  } catch (err) {
    results.push(nv("manifeste", err.message));
  }
  const steps = [["mise-a-jour", checkUpdate], ["hooks-git", checkGithooks], ["formulaires-labels", checkForms], ["versions", checkVersions], ["actions-epinglees", checkActions], ["outils", checkTools], ["reglages", checkSettings]];
  for (const [id, step] of steps) {
    try {
      results.push(...step(ctx));
    } catch (err) {
      results.push(nv(id, err.message));
    }
  }
  if (forge) {
    const slug = repoOf(ctx, repo);
    if (!slug) results.push(nv("forge", "dépôt GitHub introuvable : passer --repo propriétaire/nom ou configurer le remote origin"));
    else {
      const gh = makeGh(exec);
      for (const [id, fn] of [["forge-labels", () => checkForgeLabels(ctx, gh, slug)], ["forge-protection", () => checkProtection(ctx, gh, slug)], ["migrations", () => checkMigrations(ctx, gh, slug)], ["forge-project", () => checkProject(ctx, gh, owner, project)]]) {
        try {
          results.push(...(await fn()));
        } catch (err) {
          results.push(nv(id, err.message));
        }
      }
    }
  }
  if (workstation) {
    try {
      results.push(...checkWorkstation(ctx, { home, configDir, nodeVersion }));
    } catch (err) {
      results.push(nv("poste", err.message));
    }
  }
  const summary = { ok: 0, ecart: 0, "non-verifiable": 0 };
  for (const r of results) summary[r.statut]++;
  return { target: ctx.target, results, summary };
}

export function formatReport({ target, results, summary }) {
  const lines = [`Audit de ${target}`, ""];
  const tag = { ok: "ok    ", ecart: "ECART ", "non-verifiable": "?     " };
  for (const r of results) {
    lines.push(`${tag[r.statut]} ${r.id} — ${r.message}`);
    if (r.correction) lines.push(`       correction : ${r.correction}`);
  }
  lines.push("", `Résumé : ${summary.ok} ok, ${summary.ecart} écart(s), ${summary["non-verifiable"]} non vérifiable(s).`);
  if (summary.ok === 0 && summary.ecart === 0) lines.push("Aucun contrôle n'a pu être effectué.");
  return lines.join("\n");
}

const USAGE = "Usage : node audit.mjs --target <dépôt> [--json] [--forge [--repo propriétaire/nom] [--project <n> --owner <login>]] [--workstation]";

const validRepo = (s) => REPO_RE.test(s) && !s.split("/").some((part) => /^[.]+$/.test(part));

export function parseArgs(argv) {
  const flags = new Set(["--json", "--forge", "--workstation"]);
  const valued = new Set(["--target", "--repo", "--project", "--owner"]);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (flags.has(a)) out[a.slice(2)] = true;
    else if (valued.has(a) && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) out[a.slice(2)] = argv[++i];
    else return { error: `option inconnue ou sans valeur : ${a}` };
  }
  if (!out.target) return { error: "--target est obligatoire" };
  if (!existsSync(out.target) || !statSync(out.target).isDirectory()) return { error: `dossier introuvable : ${out.target}` };
  if (out.repo !== undefined && !validRepo(out.repo)) return { error: "--repo doit être de la forme propriétaire/nom" };
  if (out.owner !== undefined && !OWNER_RE.test(out.owner)) return { error: "--owner invalide" };
  if (out.project !== undefined && !/^\d+$/.test(out.project)) return { error: "--project doit être un numéro" };
  return { options: out };
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`${parsed.error}\n${USAGE}`);
    process.exit(2);
  }
  const o = parsed.options;
  const report = await runAudit({ target: o.target, forge: o.forge, workstation: o.workstation, repo: o.repo, project: o.project, owner: o.owner });
  console.log(o.json ? JSON.stringify(report, null, 2) : formatReport(report));
  process.exit(report.summary.ecart > 0 ? 1 : 0);
}
