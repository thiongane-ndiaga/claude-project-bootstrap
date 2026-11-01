#!/usr/bin/env node
// Matrice des modules du générateur : invariants, reproductibilité, instantanés et validation par les vraies CLI.
// Usage : node tests/matrix.test.mjs              (compare aux instantanés de tests/snapshots/)
//         UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs   (réécrit les instantanés, à relire dans la PR)
// Les CLI openspec et archgate sont exigées quand la variable CI est définie ; sinon la validation est ignorée avec un message.
import "./tmp-root.mjs"; // dossier temporaire propre à l'exécution, supprimé à la sortie
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../skills/project-bootstrap/scripts/catalog.mjs";
import { localBinExec, realExec, runAudit } from "../skills/project-bootstrap/scripts/audit.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const scaffold = path.join(root, "skills", "project-bootstrap", "scripts", "scaffold.mjs");
const catalog = loadCatalog(path.join(root, "skills", "project-bootstrap", "assets", "modules"));
const SNAPSHOTS = path.join(root, "tests", "snapshots");
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";
const IN_CI = Boolean(process.env.CI);

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failed++;
};

// --- configuration déterministe : date, versions et SHA fixés (aucune valeur ne dépend du jour ni de la machine) -----------------
const pin = (c) => ({ tag: "v1.0.0", sha: c.repeat(40), published: "2026-01-01T00:00:00Z" });
const baseConfig = {
  projectName: "matrice",
  description: "Projet de la matrice de tests.",
  visibility: "private",
  docLanguageName: "Français",
  date: "2026-01-01",
  versions: { openspec: "1.16.0", archgate: "0.61.0", node: "24" },
  actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c") },
  actionsCreditNote: "crédit de test",
};

// variantes anglaises : les valeurs françaises de la configuration de base sont retirées (une valeur explicite l'emporte sur le défaut de la langue)
const ENGLISH = { docLanguage: "en", docLanguageName: undefined, actionsCreditNote: undefined };

// --- combinaisons déduites du catalogue --------------------------------------------------------------------------------------
export function combinations(modulesCatalog) {
  const names = Object.keys(modulesCatalog).filter((m) => m !== "core");
  const closure = (m, seen = new Set()) => {
    if (seen.has(m)) return seen;
    seen.add(m);
    for (const r of modulesCatalog[m].requires) closure(r, seen);
    return seen;
  };
  const defaults = names.filter((m) => modulesCatalog[m].default);
  return [
    { name: "core", modules: [], single: null },
    ...names.map((m) => ({ name: m, modules: [...closure(m)].filter((x) => x !== "core"), single: m })),
    { name: "default", modules: defaults, single: null },
    { name: "default-stack", modules: defaults, extra: { stack: "Node.js, modules ES" }, single: null },
    { name: "default-cli-user", modules: defaults, config: { cliInstall: "user" }, single: null },
    { name: "default-cli-local", modules: defaults, config: { cliInstall: "local" }, single: null },
    { name: "default-en", modules: defaults, config: ENGLISH, single: null },
    { name: "agent-profiles-main", modules: [...closure("agent-profiles")].filter((x) => x !== "core"), config: { mainAgent: "project-lead" }, single: null },
    { name: "agent-profiles-optional", modules: [...new Set([...closure("agent-profiles"), "github", "openspec", "archgate"])].filter((x) => x !== "core"), config: { profiles: ["business-analyst", "developer", "product-owner"] }, single: null },
    { name: "full", modules: names, single: null },
    { name: "full-en", modules: names, config: { ...ENGLISH, profiles: ["business-analyst", "developer", "product-owner"] }, single: null },
    { name: "full-public", modules: names, config: { visibility: "public" }, single: null },
  ];
}

function generate(combo, config = baseConfig) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-matrix-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify({ ...config, ...(combo.config ?? {}), modules: combo.modules, ...(combo.extra ?? {}) }));
  const out = path.join(dir, "projet");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out], { encoding: "utf8" });
  return { res, out, dir };
}

// --- lecture d'une arborescence : chemin (séparateur /) -> octets ------------------------------------------------------------
export function readTree(dir) {
  const files = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files[path.relative(dir, p).split(path.sep).join("/")] = readFileSync(p);
    }
  };
  walk(dir);
  return files;
}

// Fichiers sans base de fusion, par construction : partagés (fusion par lignes ou JSON), propres au projet (owned), réglages Claude
const NO_BASE = new Set([...catalog.files.filter((f) => f.merge || f.owned).map((f) => f.path), ".claude/settings.json"]);

// --- invariants : renvoie la liste des problèmes ------------------------------------------------------------------------------
export function invariants(files) {
  const problems = [];
  for (const [rel, buf] of Object.entries(files)) {
    const text = buf.toString("utf8");
    if (/\{\{[A-Z0-9_]+\}\}/.test(text)) problems.push(`${rel} : paramètre non remplacé`);
    if (/@@(module:[\w|-]+|end)/.test(text)) problems.push(`${rel} : marqueur de module restant`);
    if (buf.includes(Buffer.from("\r\n"))) problems.push(`${rel} : fins de ligne CRLF`);
    if (rel.endsWith(".json")) {
      try {
        JSON.parse(text);
      } catch {
        problems.push(`${rel} : JSON invalide`);
      }
    }
  }
  const manifestBuf = files[".bootstrap/manifest.json"];
  if (!manifestBuf) problems.push("manifeste absent");
  else {
    const m = JSON.parse(manifestBuf.toString("utf8"));
    for (const rel of Object.keys(m.files ?? {})) {
      if (rel.includes("\\")) problems.push(`${rel} : clé du manifeste avec antislash`);
      if (!(rel in files)) problems.push(`${rel} : fichier du manifeste absent`);
      const base = files[`.bootstrap/base/${rel}.base`];
      if (base && files[rel] && !base.equals(files[rel])) problems.push(`${rel} : base différente du fichier généré`);
      if (!base && m.files[rel].status === "created" && rel in files && !NO_BASE.has(rel)) problems.push(`${rel} : base de fusion absente`);
    }
  }
  return problems;
}

// --- instantanés ---------------------------------------------------------------------------------------------------------------
// Chemin -> SHA-256 des octets ; le manifeste (version du plugin) est listé sans empreinte ; .bootstrap/base/ est dérivé, exclu.
export function snapshotOf(files) {
  const snap = {};
  for (const rel of Object.keys(files).sort()) {
    if (rel.startsWith(".bootstrap/base/")) continue;
    snap[rel] = rel === ".bootstrap/manifest.json" ? null : createHash("sha256").update(files[rel]).digest("hex");
  }
  return snap;
}

export function compareSnapshot(name, snap, { dir = SNAPSHOTS, update = UPDATE } = {}) {
  const file = path.join(dir, `${name}.json`);
  const json = JSON.stringify(snap, null, 2) + "\n";
  if (update) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, json);
    return { ok: true, message: "instantané réécrit" };
  }
  const how = `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`;
  if (!existsSync(file)) return { ok: false, message: `instantané manquant ${path.basename(file)} : ${how}` };
  const expected = JSON.parse(readFileSync(file, "utf8"));
  const added = Object.keys(snap).filter((k) => !(k in expected));
  const removed = Object.keys(expected).filter((k) => !(k in snap));
  const changed = Object.keys(snap).filter((k) => k in expected && snap[k] !== expected[k]);
  if (!added.length && !removed.length && !changed.length) return { ok: true, message: "" };
  const parts = [added.length && `ajoutés : ${added.join(", ")}`, removed.length && `retirés : ${removed.join(", ")}`, changed.length && `modifiés : ${changed.join(", ")}`].filter(Boolean);
  return { ok: false, message: `${parts.join(" ; ")} — si voulu : ${how}, puis relire le diff` };
}

// --- exécution -----------------------------------------------------------------------------------------------------------------
if (UPDATE && IN_CI) {
  console.log("FAIL UPDATE_SNAPSHOTS=1 est refusé quand CI est défini : une mise à jour masquerait une régression");
  process.exit(1);
}
const combos = combinations(catalog.modules);
const covered = new Set(combos.filter((c) => c.single).map((c) => c.single));
const uncovered = Object.keys(catalog.modules).filter((m) => m !== "core" && !covered.has(m));
check("matrice : chaque module du catalogue a sa combinaison", uncovered.length === 0, `modules sans combinaison : ${uncovered.join(", ")}`);
check("matrice : core seul, un module par combinaison, défaut, défaut avec stack, modes user et local, anglais, agent principal, profils optionnels, complet, complet en public", combos.length === Object.keys(catalog.modules).length - 1 + 11 && combos.some((c) => c.name === "core" && c.modules.length === 0) && ["default", "default-stack", "default-cli-user", "default-cli-local", "default-en", "agent-profiles-main", "agent-profiles-optional", "full", "full-public", "full-en"].every((n) => combos.some((c) => c.name === n)));
{
  // instantané orphelin : module retiré ou renommé ; la mise à jour supprime les orphelins
  const orphans = existsSync(SNAPSHOTS) ? readdirSync(SNAPSHOTS).filter((f) => f.endsWith(".json") && !combos.some((c) => `${c.name}.json` === f)) : [];
  if (UPDATE) for (const f of orphans) rmSync(path.join(SNAPSHOTS, f));
  check("instantanés : aucun instantané orphelin (module retiré ou renommé)", UPDATE || orphans.length === 0, `orphelins : ${orphans.join(", ")} — UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs les supprime`);
}
const release = combos.find((c) => c.name === "release");
check("matrice : un module est généré avec la chaîne de ses dépendances", release.modules.includes("github") && release.modules.includes("release"));

// l'aide d'invariants détecte les problèmes (contrôle des contrôles)
{
  const mk = (extra = {}, manifest = { files: { "a.txt": {} } }) => ({ ".bootstrap/manifest.json": Buffer.from(JSON.stringify(manifest)), "a.txt": Buffer.from("ok\n"), ...extra });
  check("invariants : fichiers sains -> aucun problème", invariants(mk()).length === 0);
  check("invariants : paramètre non remplacé détecté", invariants(mk({ "a.txt": Buffer.from("{{PROJECT_NAME}}") })).some((p) => /paramètre/.test(p)));
  check("invariants : expression GitHub Actions légitime non confondue avec un paramètre", invariants(mk({ "a.txt": Buffer.from("${{ matrix.os }}") })).length === 0);
  check("invariants : marqueur de module restant détecté", invariants(mk({ "a.txt": Buffer.from("# @@end") })).some((p) => /marqueur/.test(p)));
  check("invariants : CRLF détecté", invariants(mk({ "a.txt": Buffer.from("a\r\nb") })).some((p) => /CRLF/.test(p)));
  check("invariants : JSON invalide détecté", invariants(mk({ "x.json": Buffer.from("{") })).some((p) => /JSON/.test(p)));
  check("invariants : antislash dans une clé du manifeste et fichier absent détectés", (() => { const p = invariants(mk({}, { files: { "a\\b.txt": {} } })); return p.some((x) => /antislash/.test(x)) && p.some((x) => /absent/.test(x)); })());
  check("invariants : base différente du fichier détectée", invariants(mk({ ".bootstrap/base/a.txt.base": Buffer.from("autre\n") })).some((p) => /base/.test(p)));
}

// l'aide d'instantanés : manquant, identique, différent, mise à jour
{
  const d = mkdtempSync(path.join(tmpdir(), "pb-snap-"));
  const snap = { "a.txt": "aa", ".bootstrap/manifest.json": null };
  const miss = compareSnapshot("x", snap, { dir: d, update: false });
  check("instantané : manquant -> échec avec la commande de création", !miss.ok && /UPDATE_SNAPSHOTS=1/.test(miss.message));
  compareSnapshot("x", snap, { dir: d, update: true });
  check("instantané : réécrit puis identique -> succès", compareSnapshot("x", snap, { dir: d, update: false }).ok);
  const diff = compareSnapshot("x", { "a.txt": "bb", "b.txt": "cc" }, { dir: d, update: false });
  check("instantané : différent -> modifiés, ajoutés et retirés nommés", !diff.ok && /modifiés : a\.txt/.test(diff.message) && /ajoutés : b\.txt/.test(diff.message) && /retirés : \.bootstrap\/manifest\.json/.test(diff.message));
  const files = { ".bootstrap/manifest.json": Buffer.from("v1"), ".bootstrap/base/a.txt.base": Buffer.from("x"), "z.txt": Buffer.from("z"), "a.txt": Buffer.from("a") };
  const s1 = snapshotOf(files);
  const s2 = snapshotOf({ ...files, ".bootstrap/manifest.json": Buffer.from("v2") });
  check("instantané : manifeste sans empreinte, bases exclues, chemins triés, version du plugin sans effet", s1[".bootstrap/manifest.json"] === null && !(".bootstrap/base/a.txt.base" in s1) && Object.keys(s1).join() === ".bootstrap/manifest.json,a.txt,z.txt" && JSON.stringify(s1) === JSON.stringify(s2));
  rmSync(d, { recursive: true, force: true });
}

// --- chaque combinaison -------------------------------------------------------------------------------------------------------
for (const combo of combos) {
  const g = generate(combo);
  check(`${combo.name} : génération réussie (code 0)`, g.res.status === 0, (g.res.stderr || g.res.stdout).slice(0, 300));
  if (g.res.status !== 0) continue;
  const files = readTree(g.out);
  const problems = invariants(files);
  check(`${combo.name} : invariants (paramètres, marqueurs, JSON, manifeste, CRLF, bases)`, problems.length === 0, problems.slice(0, 5).join(" ; "));
  const again = generate(combo);
  const same = JSON.stringify(snapshotOf(readTree(again.out))) === JSON.stringify(snapshotOf(files)) && readTree(again.out)[".bootstrap/manifest.json"].equals(files[".bootstrap/manifest.json"]);
  check(`${combo.name} : deux générations identiques`, same);
  const upd = spawnSync(process.execPath, [scaffold, "--update", "--dry-run", "--target", g.out], { encoding: "utf8" });
  let rep = null;
  try {
    rep = JSON.parse(upd.stdout);
  } catch {
    // sortie illisible : signalée ci-dessous
  }
  check(`${combo.name} : mise à jour immédiate sans effet`, upd.status === 0 && rep && ["created", "updated", "merged", "reconciled", "adopted", "retired", "baseInvalid", "conflicts"].every((k) => rep[k].length === 0) && rep.manifest === undefined, (upd.stderr || upd.stdout).slice(0, 300));
  const cmp = compareSnapshot(combo.name, snapshotOf(files));
  check(`${combo.name} : instantané ${UPDATE ? "(réécrit)" : "identique"}`, cmp.ok, cmp.message);
  rmSync(g.dir, { recursive: true, force: true });
  rmSync(again.dir, { recursive: true, force: true });
}

// --- validation par les vraies CLI (sélections par défaut et complète) ------------------------------------------------------
export function cliVersion(cli) {
  const r = realExec(cli, ["--version"]);
  return r.error || r.status !== 0 ? null : /\d+\.\d+\.\d+/.exec(r.stdout + r.stderr)?.[0] ?? null;
}

// Décide quoi faire quand une CLI manque : échec en CI, sinon ignorer avec un message
export function missingPolicy(missing, inCi) {
  if (!missing.length) return "run";
  return inCi ? "fail" : "skip";
}

check("CLI absentes : ignorées hors CI, échec en CI", missingPolicy(["openspec"], false) === "skip" && missingPolicy(["openspec"], true) === "fail" && missingPolicy([], true) === "run");

{
  const installed = { openspec: cliVersion("openspec"), archgate: cliVersion("archgate") };
  // chaque outil est traité séparément : absent, il est ignoré avec un message (hors CI) ou fait échouer (en CI)
  const policy = (tool) => missingPolicy(installed[tool] ? [] : [tool], IN_CI);
  for (const tool of Object.keys(installed)) {
    if (policy(tool) === "fail") check(`CLI réelle : ${tool} installé (exigé en CI)`, false, `${tool} introuvable`);
    else if (policy(tool) === "skip") console.log(`skip validation ${tool} : introuvable (exigé quand CI est défini)`);
  }
  const bothPresent = Boolean(installed.openspec && installed.archgate);
  // chemin réel (développe les noms courts 8.3 de Windows, comme git et openspec doctor)
  const realPath = (p) => {
    const r = realpathSync.native(p);
    return process.platform === "win32" ? r.toLowerCase() : r;
  };
  if (installed.openspec || installed.archgate) {
    for (const name of ["default", "full", "full-en"]) {
      const combo = combos.find((c) => c.name === name);
      // versions épinglées = celles installées, pour que l'audit n'y voie pas d'écart (les instantanés, eux, gardent des constantes)
      const versions = { ...baseConfig.versions, ...(installed.openspec && { openspec: installed.openspec }), ...(installed.archgate && { archgate: installed.archgate }) };
      const g = generate(combo, { ...baseConfig, versions });
      if (g.res.status !== 0) {
        check(`${name} : génération pour la validation réelle`, false, g.res.stderr);
        continue;
      }
      // dépôt git temporaire indépendant du poste : identité fixée, ni signature ni hooks globaux
      const git = (...a) => spawnSync("git", ["-C", g.out, "-c", "commit.gpgsign=false", "-c", "core.hooksPath=", ...a], { encoding: "utf8" });
      git("init", "-q");
      git("config", "user.name", "matrice");
      git("config", "user.email", "matrice@example.invalid");
      if (process.platform !== "win32" && existsSync(path.join(g.out, ".githooks", "pre-push"))) chmodSync(path.join(g.out, ".githooks", "pre-push"), 0o755);
      git("add", "-A");
      if (existsSync(path.join(g.out, ".githooks", "pre-push"))) git("update-index", "--chmod=+x", ".githooks/pre-push");
      git("commit", "-q", "--no-verify", "-m", "init");
      git("config", "core.hooksPath", ".githooks");
      if (installed.openspec) {
        const init = realExec("openspec", ["init", "--tools", "claude", "--language", combo.config?.docLanguage ?? "fr", "--no-animation"], { cwd: g.out });
        check(`${name} : openspec init réussit`, init.status === 0, (init.stderr || init.stdout).slice(0, 300));
        const touched = spawnSync("git", ["-C", g.out, "diff", "--name-only"], { encoding: "utf8" }).stdout.trim();
        check(`${name} : openspec init ne modifie aucun fichier suivi du projet généré`, touched === "", touched);
        const val = realExec("openspec", ["validate", "--all", "--strict", "--no-interactive"], { cwd: g.out });
        check(`${name} : openspec validate --all --strict`, val.status === 0, (val.stdout + val.stderr).slice(0, 400));
        const doc = realExec("openspec", ["doctor", "--json"], { cwd: g.out });
        let doctorOk = false;
        let doctorDetail = (doc.stderr || doc.stdout).slice(0, 300);
        try {
          const d = JSON.parse(doc.stdout);
          const errors = [...(d.status ?? []), ...(d.root?.status ?? [])].filter((s) => s.severity === "error");
          const sameRoot = d.root?.path && realPath(d.root.path) === realPath(g.out);
          doctorOk = d.root?.healthy !== false && errors.length === 0 && sameRoot;
          if (!doctorOk) doctorDetail = JSON.stringify({ errors, racine: d.root?.path, cible: g.out });
        } catch {
          // sortie illisible : échec ci-dessous
        }
        check(`${name} : openspec doctor sans anomalie, racine = projet`, doctorOk, doctorDetail);
      }
      if (installed.archgate) {
        const ag = realExec("archgate", ["check", "--output", "console"], { cwd: g.out });
        check(`${name} : archgate check`, ag.status === 0, (ag.stdout + ag.stderr).slice(0, 400));
      }
      const audit = await runAudit({ target: g.out });
      const ecarts = audit.results.filter((r) => r.statut === "ecart");
      const unverified = audit.results.filter((r) => r.statut === "non-verifiable");
      check(`${name} : audit sans écart`, ecarts.length === 0, ecarts.map((e) => `${e.id}: ${e.message}`).join(" | ").slice(0, 500));
      // avec les deux CLI présentes, aucun contrôle ne doit rester non vérifiable (dossier dans un dépôt parent, doctor illisible…)
      if (bothPresent) check(`${name} : audit sans contrôle non vérifiable`, unverified.length === 0, unverified.map((e) => `${e.id}: ${e.message}`).join(" | ").slice(0, 500));
      rmSync(g.dir, { recursive: true, force: true });
    }
  }
}

// mode local avec le registre npm : lockfile, npm ci, CLI du projet, hook et audit (réseau : exigé en CI, sinon PB_NETWORK_TESTS=1)
{
  const installed = { openspec: cliVersion("openspec"), archgate: cliVersion("archgate") };
  const network = IN_CI || process.env.PB_NETWORK_TESTS === "1";
  if (!network) console.log("skip mode local avec le registre npm : définir PB_NETWORK_TESTS=1 (exigé quand CI est défini)");
  else if (!installed.openspec || !installed.archgate) {
    if (IN_CI) check("mode local : openspec et archgate installés (exigés en CI)", false, "CLI introuvable");
    else console.log("skip mode local avec le registre npm : openspec et archgate introuvables");
  } else {
    const combo = combos.find((c) => c.name === "default-cli-local");
    const g = generate(combo, { ...baseConfig, versions: { ...baseConfig.versions, openspec: installed.openspec, archgate: installed.archgate } });
    check("mode local : génération avec les versions installées", g.res.status === 0, g.res.stderr);
    if (g.res.status === 0) {
      const git = (...a) => spawnSync("git", ["-C", g.out, "-c", "commit.gpgsign=false", "-c", "core.hooksPath=", ...a], { encoding: "utf8" });
      git("init", "-q");
      git("config", "user.name", "matrice");
      git("config", "user.email", "matrice@example.invalid");
      if (process.platform !== "win32") chmodSync(path.join(g.out, ".githooks", "pre-push"), 0o755);
      git("add", "-A");
      git("update-index", "--chmod=+x", ".githooks/pre-push");
      git("commit", "-q", "--no-verify", "-m", "init");
      git("config", "core.hooksPath", ".githooks");
      const lock = realExec("npm", ["install", "--package-lock-only"], { cwd: g.out, timeout: 240000 });
      check("mode local : npm install --package-lock-only crée le lockfile", lock.status === 0 && existsSync(path.join(g.out, "package-lock.json")), (lock.stderr || lock.stdout).slice(0, 300));
      const ci = realExec("npm", ["ci"], { cwd: g.out, timeout: 240000 });
      check("mode local : npm ci installe les CLI du projet", ci.status === 0, (ci.stderr || ci.stdout).slice(0, 300));
      const bin = path.join(g.out, "node_modules", ".bin");
      check("mode local : node_modules/.bin contient openspec et archgate", ["openspec", "archgate"].every((c) => existsSync(path.join(bin, c)) || existsSync(path.join(bin, `${c}.cmd`))));
      const local = localBinExec(realExec, g.out);
      const v = local("openspec", ["--version"], { cwd: g.out });
      check("mode local : openspec du projet à la version épinglée", v.status === 0 && v.stdout.includes(installed.openspec), v.stdout + v.stderr);
      const init = local("openspec", ["init", "--tools", "claude", "--language", "fr", "--no-animation"], { cwd: g.out });
      check("mode local : openspec init réussit", init.status === 0, (init.stderr || init.stdout).slice(0, 300));
      const gate = spawnSync(process.execPath, [path.join(g.out, ".claude", "hooks", "quality-gate.mjs")], { cwd: g.out, encoding: "utf8" });
      check("mode local : quality-gate.mjs passe", gate.status === 0, (gate.stdout + gate.stderr).slice(0, 400));
      const audit = await runAudit({ target: g.out });
      const ecarts = audit.results.filter((r) => r.statut === "ecart");
      check("mode local : audit sans écart", ecarts.length === 0, ecarts.map((e) => `${e.id}: ${e.message}`).join(" | ").slice(0, 500));
    }
    rmSync(g.dir, { recursive: true, force: true });
  }
}

if (failed > 0) {
  console.log(`\n${failed} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests de la matrice passent");
