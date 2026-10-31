#!/usr/bin/env node
// Tests de scaffold.mjs sur plusieurs combinaisons de modules. Usage : node tests/scaffold.test.mjs
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../skills/project-bootstrap/scripts/migrate.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const scaffold = path.join(root, "skills", "project-bootstrap", "scripts", "scaffold.mjs");
const manifest = JSON.parse(readFileSync(path.join(root, "skills", "project-bootstrap", "assets", "modules.json"), "utf8"));
const sha = (c) => ({ tag: "v1.0.0", sha: c.repeat(40) });
const base = {
  projectName: "Test",
  description: "Projet de test.",
  versions: { openspec: "1.0.0", archgate: "0.1.0", node: "24" },
  actions: { checkout: sha("a"), setupNode: sha("b"), releasePlease: sha("c") },
  actionsCreditNote: "crédit de test",
};

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failed++;
};

function run(config, extraArgs = [], target) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify(config));
  const out = target ?? path.join(dir, "out");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out, ...extraArgs], { encoding: "utf8" });
  return { res, out, dir, report: res.status === 0 || res.status === 3 ? JSON.parse(res.stdout) : null };
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const allModules = Object.keys(manifest.modules).filter((m) => m !== "core");
const cases = [
  { name: "tous les modules, privé", visibility: "private", modules: allModules },
  { name: "tous les modules, public", visibility: "public", modules: allModules },
  { name: "core seul", visibility: "private", modules: [] },
  { name: "claude + openspec", visibility: "public", modules: ["claude", "openspec"] },
  { name: "archgate + arc42 sans github", visibility: "private", modules: ["archgate", "arc42"] },
  { name: "github seul", visibility: "public", modules: ["github"] },
];

for (const c of cases) {
  const { res, out, dir, report } = run({ ...base, visibility: c.visibility, modules: c.modules });
  check(`${c.name} : succès`, res.status === 0, res.stderr);
  if (!report) continue;
  const files = walk(out);
  const leftovers = files.filter((f) => /@@module|@@end|\{\{[A-Z0-9_]+\}\}/.test(readFileSync(f, "utf8")));
  check(`${c.name} : aucun marqueur ni paramètre restant`, leftovers.length === 0, leftovers.join(", "));
  const active = new Set(["core", ...c.modules]);
  const expected = manifest.files.filter((f) => f.when.every((m) => active.has(m))).length + (active.has("claude") ? 1 : 0);
  check(`${c.name} : ${expected} fichiers`, report.created.length === expected, `${report.created.length} créés`);
  if (active.has("claude")) {
    const settings = JSON.parse(readFileSync(path.join(out, ".claude", "settings.json"), "utf8"));
    check(`${c.name} : settings.json valide`, Array.isArray(settings.permissions.allow));
  }
  if (active.has("github")) {
    const ci = readFileSync(path.join(out, ".github", "workflows", "ci.yml"), "utf8");
    const ciOs = JSON.parse(readFileSync(path.join(out, ".bootstrap", "checks.json"), "utf8")).ciOs;
    check(`${c.name} : matrice CI selon la visibilité`, c.visibility === "public" ? ciOs.includes("windows-latest") : ciOs.length === 1 && ciOs[0] === "ubuntu-latest");
    check(`${c.name} : la CI lit .bootstrap/checks.json`, ci.includes("run-checks.mjs --print-os") && ci.includes("node .bootstrap/run-checks.mjs"));
    check(`${c.name} : ci.yml sans clé « env: » vide`, !/^env:[ \t]*\n(\s*\n)*(?=\S)(?!\s)/m.test(ci), "env: sans contenu (rejeté par GitHub)");
    check(`${c.name} : actions épinglées sur un SHA`, [...ci.matchAll(/uses:\s*(\S+)/g)].every((m) => /@[0-9a-f]{40}$/.test(m[1])));
  }
  // relance : rien de créé, tout identique
  const again = run({ ...base, visibility: c.visibility, modules: c.modules }, [], out);
  check(`${c.name} : relance idempotente`, again.report?.created.length === 0 && again.report?.conflicts.length === 0);
  rmSync(dir, { recursive: true, force: true });
}

// conflit : un fichier existant différent n'est jamais écrasé
{
  const dir = mkdtempSync(path.join(tmpdir(), "pb-conf-"));
  const out = path.join(dir, "out");
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "CLAUDE.md"), "contenu de l'utilisateur\n");
  const again = run({ ...base, visibility: "private", modules: [] }, [], out);
  check("conflit signalé (code 3)", again.res.status === 3 && again.report.conflicts.includes("CLAUDE.md"));
  check("fichier existant conservé", readFileSync(path.join(out, "CLAUDE.md"), "utf8") === "contenu de l'utilisateur\n");
  rmSync(dir, { recursive: true, force: true });
  // fichier généré puis personnalisé alors que le modèle n'a pas changé : ce n'est pas un conflit
  const first = run({ ...base, visibility: "private", modules: [] });
  writeFileSync(path.join(first.out, "CLAUDE.md"), "contenu de l'utilisateur\n");
  const same = run({ ...base, visibility: "private", modules: [] }, [], first.out);
  check("personnalisation sans changement de modèle : ni conflit ni écrasement", same.res.status === 0 && same.report.customized.includes("CLAUDE.md") && readFileSync(path.join(first.out, "CLAUDE.md"), "utf8") === "contenu de l'utilisateur\n");
  rmSync(first.dir, { recursive: true, force: true });
}

// erreurs de configuration
check("dépendance manquante refusée", run({ ...base, visibility: "private", modules: ["release"] }).res.status === 1);
check("module inconnu refusé", run({ ...base, visibility: "private", modules: ["nope"] }).res.status === 1);
check("visibilité invalide refusée", run({ ...base, visibility: "internal", modules: [] }).res.status === 1);
{
  const { versions, ...noVersions } = base;
  const r = run({ ...noVersions, visibility: "private", modules: ["github", "openspec"] });
  check("paramètre manquant refusé", r.res.status !== 0 && /OPENSPEC_VERSION/.test(r.res.stderr), r.res.stderr);
}
// modules incompatibles (champ « conflicts ») : catalogue de test passé par --catalog
{
  const catalog = (modules) => {
    const f = path.join(mkdtempSync(path.join(tmpdir(), "pb-cat-")), "modules.json");
    writeFileSync(f, JSON.stringify({ modules: { core: { requires: [] }, ...modules }, files: [] }));
    return f;
  };
  const sel = (modules, cat) => run({ ...base, visibility: "private", modules }, ["--catalog", cat]);
  const ok = catalog({ a: { requires: [] }, b: { requires: [], conflicts: ["a"] }, c: { requires: ["a"] } });
  check("conflicts : configuration compatible acceptée", sel(["a", "c"], ok).res.status === 0);
  const bad = sel(["a", "b"], ok);
  check("conflicts : modules incompatibles refusés (code 2)", bad.res.status === 2 && /Modules incompatibles : a [/] b/.test(bad.res.stderr), bad.res.stderr);
  check("conflicts : un seul côté suffit, quel que soit l'ordre", sel(["b", "a"], ok).res.status === 2);
  check("conflicts : rien n'est écrit en cas de conflit", (() => { try { statSync(bad.out); return false; } catch { return true; } })());
  check("conflicts : module inconnu dans le catalogue refusé", sel(["a"], catalog({ a: { requires: [], conflicts: ["zzz"] } })).res.status === 1);
  check("conflicts : conflit avec un module requis refusé", sel(["a", "b"], catalog({ a: { requires: [] }, b: { requires: ["a"], conflicts: ["a"] } })).res.status === 1);
  check("conflicts : dépendance non satisfaite refusée (code 1)", sel(["c"], ok).res.status === 1);
  check("conflicts : le catalogue réel n'a aucune incompatibilité interne", Object.entries(manifest.modules).every(([m, d]) => (d.conflicts ?? []).every((c) => manifest.modules[c] && c !== m)));
}
// manifeste, projet existant, ajout de module, fusion de fichiers partagés (#27)
{
  const cfg = (modules, extra = {}) => ({ ...base, visibility: "private", modules, ...extra });
  const sha = (text) => createHash("sha256").update(text).digest("hex");
  const read = (out, rel) => readFileSync(path.join(out, ...rel.split("/")), "utf8");
  const manifestOf = (out) => JSON.parse(read(out, ".bootstrap/manifest.json"));
  const pluginVersion = JSON.parse(readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8")).version;
  const exists = (out, rel) => {
    try { statSync(path.join(out, ...rel.split("/"))); return true; } catch { return false; }
  };

  // manifeste écrit par le scaffold : version du plugin, modules, empreinte de chaque fichier
  {
    const r = run(cfg(["claude", "github"]));
    const m = manifestOf(r.out);
    check("manifeste : écrit avec la version du plugin et les modules", m.schema === 1 && m.plugin.version === pluginVersion && m.modules.includes("github") && m.modules.includes("core"));
    check("manifeste : empreinte de chaque fichier généré", Object.entries(m.files).every(([rel, f]) => f.sha256 === sha(read(r.out, rel)) && f.status === "created") && "CLAUDE.md" in m.files);
    check("manifeste : réponses de la phase 0 conservées", m.config.projectName === "Test" && m.config.versions.node === "24");
    const dry = run(cfg(["claude"]), ["--dry-run"]);
    check("manifeste : pas écrit en dry-run", !exists(dry.out, ".bootstrap/manifest.json"));
    rmSync(r.dir, { recursive: true, force: true });
  }

  // ajout d'un module sur un dépôt bootstrappé : fichiers personnalisés intacts, fichiers non modifiés mis à jour
  {
    const first = run(cfg(["claude", "github"]));
    writeFileSync(path.join(first.out, "CLAUDE.md"), "# Mon CLAUDE.md personnalisé\n");
    const again = run(cfg(["claude", "github", "openspec"]), [], first.out);
    check("ajout de module : fichier personnalisé conservé et signalé (code 3)", again.res.status === 3 && again.report.conflicts.includes("CLAUDE.md") && read(first.out, "CLAUDE.md") === "# Mon CLAUDE.md personnalisé\n");
    check("ajout de module : fichiers du nouveau module créés", again.report.created.includes(".claude/agents/spec-reviewer.md") && exists(first.out, ".claude/agents/spec-reviewer.md"));
    check("ajout de module : fichier non modifié remplacé par le modèle à jour", again.report.updated.includes(".github/workflows/ci.yml") && /OpenSpec validate/.test(read(first.out, ".github/workflows/ci.yml")));
    const m = manifestOf(first.out);
    check("ajout de module : manifeste à jour, empreinte du fichier personnalisé inchangée", m.modules.includes("openspec") && m.files["CLAUDE.md"].sha256 !== sha("# Mon CLAUDE.md personnalisé\n"));
    // idempotence : relancer sans rien changer ne touche à rien
    writeFileSync(path.join(first.out, "CLAUDE.md"), read(first.out, "CLAUDE.md"));
    const same = run(cfg(["claude", "github", "openspec"]), [], first.out);
    check("idempotence : deuxième exécution sans effet", same.report.created.length === 0 && same.report.updated.length === 0 && same.report.merged.length === 0 && same.report.manifest === undefined, JSON.stringify(same.report));
    rmSync(first.dir, { recursive: true, force: true });
  }

  // dépôt existant non bootstrappé : fichiers partagés fusionnés, fichiers du projet conservés
  {
    const dir = mkdtempSync(path.join(tmpdir(), "pb-exist-"));
    const out = path.join(dir, "repo");
    mkdirSync(path.join(out, ".claude"), { recursive: true });
    writeFileSync(path.join(out, ".gitignore"), "node_modules/\ndist/\n");
    writeFileSync(path.join(out, ".claude", "settings.json"), JSON.stringify({ model: "sonnet", permissions: { allow: ["Bash(npm test)"], deny: ["Bash(rm *)"] } }));
    writeFileSync(path.join(out, "CLAUDE.md"), "# Projet existant\n");
    const r = run(cfg(["claude"], { keep: ["CLAUDE.md"] }), [], out);
    const gi = read(out, ".gitignore");
    check("dépôt existant : .gitignore fusionné sans perte", r.report.merged.includes(".gitignore") && gi.startsWith("node_modules/\ndist/\n") && gi.includes(".claude/settings.local.json"), gi);
    const settings = JSON.parse(read(out, ".claude/settings.json"));
    check("dépôt existant : settings.json fusionné par clé", r.report.merged.includes(".claude/settings.json") && settings.model === "sonnet" && settings.permissions.allow.includes("Bash(npm test)") && settings.permissions.allow.includes("Bash(git status *)") && settings.permissions.deny[0] === "Bash(rm *)" && Array.isArray(settings.hooks.TaskCompleted));
    check("dépôt existant : fichier listé dans keep intact (code 0)", r.res.status === 0 && r.report.kept.includes("CLAUDE.md") && read(out, "CLAUDE.md") === "# Projet existant\n", JSON.stringify(r.report));
    const again = run(cfg(["claude"], { keep: ["CLAUDE.md"] }), [], out);
    check("dépôt existant : fusion idempotente", again.report.merged.length === 0 && again.report.created.length === 0 && again.report.manifest === undefined, JSON.stringify(again.report));
    // JSON invalide dans l'existant : conflit, jamais d'écrasement
    rmSync(dir, { recursive: true, force: true });
    const dir2 = mkdtempSync(path.join(tmpdir(), "pb-exist2-"));
    const out2 = path.join(dir2, "repo");
    mkdirSync(path.join(out2, ".claude"), { recursive: true });
    writeFileSync(path.join(out2, ".claude", "settings.json"), "{ pas du json");
    const broken = run(cfg(["claude"]), [], out2);
    check("dépôt existant : settings.json illisible signalé, non écrasé", broken.res.status === 3 && broken.report.conflicts.includes(".claude/settings.json") && read(out2, ".claude/settings.json") === "{ pas du json");
    rmSync(dir2, { recursive: true, force: true });
  }

  // diff proposé pour un fichier personnalisé
  {
    const dir = mkdtempSync(path.join(tmpdir(), "pb-diff-"));
    const out = path.join(dir, "repo");
    mkdirSync(out, { recursive: true });
    writeFileSync(path.join(out, "CLAUDE.md"), "perso-unique-xyz\n");
    const again = run(cfg(["claude"]), ["--diff"], out);
    check("--diff : diff fourni pour le fichier en conflit", again.res.status === 3 && /perso-unique-xyz/.test(again.report.diffs?.["CLAUDE.md"] ?? ""), JSON.stringify(again.report.diffs));
    rmSync(dir, { recursive: true, force: true });
  }

  // détection de l'état du dépôt cible
  {
    const detect = (target) => JSON.parse(spawnSync(process.execPath, [scaffold, "--detect", "--target", target], { encoding: "utf8" }).stdout);
    const first = run(cfg(["claude", "github"]));
    const d = detect(first.out);
    check("--detect : dépôt bootstrappé reconnu", d.bootstrapped === true && d.manifest.plugin.version === pluginVersion && d.manifest.modules.includes("github") && d.claude === true && d.ci.includes("ci.yml") && d.sharedFiles.includes("CLAUDE.md"), JSON.stringify(d));
    const dir = mkdtempSync(path.join(tmpdir(), "pb-detect-"));
    writeFileSync(path.join(dir, "package.json"), "{}");
    const e = detect(dir);
    check("--detect : dépôt existant non bootstrappé", e.exists === true && e.bootstrapped === false && e.packageJson === true && e.topLevel.includes("package.json"), JSON.stringify(e));
    check("--detect : dossier absent", detect(path.join(dir, "absent")).exists === false);
    rmSync(first.dir, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }

  // modèles qui ne citent que ce qui est généré
  {
    const claudeOnly = run(cfg(["claude"]));
    const withSpec = run(cfg(["claude", "openspec"], { stack: "Node.js 24, modules ES" }));
    check("CLAUDE.md : stack non choisie par défaut", /La stack n'est pas choisie/.test(read(claudeOnly.out, "CLAUDE.md")));
    check("CLAUDE.md : stack connue citée", /\*\*Stack\*\* : Node\.js 24, modules ES\./.test(read(withSpec.out, "CLAUDE.md")) && !/n'est pas choisie/.test(read(withSpec.out, "CLAUDE.md")));
    check("CLAUDE.md : section Agents absente sans agent généré", !/Agents du projet/.test(read(claudeOnly.out, "CLAUDE.md")) && /Agents du projet/.test(read(withSpec.out, "CLAUDE.md")));
    check("workflow.md : mention « optionnel » seulement s'il y a une étape optionnelle", !/marquées « optionnel »/.test(read(claudeOnly.out, "docs/workflow.md")) && /marquées « optionnel »/.test(read(withSpec.out, "docs/workflow.md")));
    rmSync(claudeOnly.dir, { recursive: true, force: true });
    rmSync(withSpec.dir, { recursive: true, force: true });
  }
}
// mise à jour d'un projet vers une nouvelle version du plugin, adoption, migrations hors fichiers (#44)
{
  const cfg = (modules, extra = {}) => ({ ...base, visibility: "private", modules, ...extra });
  const read = (out, rel) => readFileSync(path.join(out, ...rel.split("/")), "utf8");
  const exists = (out, rel) => {
    try { statSync(path.join(out, ...rel.split("/"))); return true; } catch { return false; }
  };
  const mkdir = (prefix) => mkdtempSync(path.join(tmpdir(), prefix));
  // copie du plugin à une version donnée, modifiable pour simuler la version suivante
  const plugin = (version, mutate = () => {}) => {
    const dir = mkdir("pb-plugin-");
    cpSync(path.join(root, "skills"), path.join(dir, "skills"), { recursive: true });
    cpSync(path.join(root, ".claude-plugin"), path.join(dir, ".claude-plugin"), { recursive: true });
    const pj = path.join(dir, ".claude-plugin", "plugin.json");
    writeFileSync(pj, JSON.stringify({ ...JSON.parse(readFileSync(pj, "utf8")), version }));
    mutate(path.join(dir, "skills", "project-bootstrap"));
    return { dir, script: path.join(dir, "skills", "project-bootstrap", "scripts", "scaffold.mjs") };
  };
  const runScript = (script, args) => {
    const res = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    return { res, report: res.status === 0 || res.status === 3 ? JSON.parse(res.stdout) : null };
  };
  const withConfig = (config) => {
    const f = path.join(mkdir("pb-cfg-"), "bootstrap.json");
    writeFileSync(f, JSON.stringify(config));
    return f;
  };

  const v1 = plugin("9.0.0");
  const v2 = plugin("9.1.0", (skill) => {
    const t = path.join(skill, "assets", "templates");
    writeFileSync(path.join(t, "docs", "workflow.md"), readFileSync(path.join(t, "docs", "workflow.md"), "utf8") + "\nNouvelle section v9.1.\n");
    writeFileSync(path.join(t, "CLAUDE.md"), readFileSync(path.join(t, "CLAUDE.md"), "utf8") + "\nRègle ajoutée en v9.1.\n");
    writeFileSync(path.join(t, "NOTES.md"), "# Notes\n");
    const mj = path.join(skill, "assets", "modules.json");
    const catalog = JSON.parse(readFileSync(mj, "utf8"));
    catalog.files = catalog.files.filter((f) => f.path !== ".gitattributes");
    catalog.files.push({ path: "NOTES.md", when: ["core"] });
    writeFileSync(mj, JSON.stringify(catalog));
  });

  // génération avec la version N, personnalisation, mise à jour vers N+1
  const out = path.join(mkdir("pb-upd-"), "repo");
  runScript(v1.script, ["--config", withConfig(cfg(["claude", "github"])), "--target", out]);
  writeFileSync(path.join(out, "CLAUDE.md"), "# CLAUDE.md du projet\n");
  writeFileSync(path.join(out, ".gitignore"), read(out, ".gitignore") + "dist/\n");
  const up = runScript(v2.script, ["--update", "--target", out, "--diff"]);
  check("mise à jour : conflit seulement sur le fichier personnalisé dont le modèle a changé (code 3)", up.res.status === 3 && up.report.conflicts.length === 1 && up.report.conflicts[0] === "CLAUDE.md", JSON.stringify(up.report));
  check("mise à jour : fichier personnalisé conservé, diff proposé", read(out, "CLAUDE.md") === "# CLAUDE.md du projet\n" && /Règle ajoutée en v9\.1/.test(up.report.diffs?.["CLAUDE.md"] ?? ""));
  check("mise à jour : fichier non modifié remplacé par le nouveau modèle", up.report.updated.includes("docs/workflow.md") && /Nouvelle section v9\.1/.test(read(out, "docs/workflow.md")));
  check("mise à jour : nouveau fichier du modèle ajouté", up.report.created.includes("NOTES.md") && exists(out, "NOTES.md"));
  check("mise à jour : personnalisation sans changement de modèle ni conflit ni perte", up.report.customized.includes(".gitignore") && read(out, ".gitignore").includes("dist/"));
  check("mise à jour : fichier retiré du modèle signalé, jamais supprimé", up.report.retired.includes(".gitattributes") && exists(out, ".gitattributes"));
  check("mise à jour : versions du plugin consignées", up.report.fromVersion === "9.0.0" && up.report.toVersion === "9.1.0" && JSON.parse(read(out, ".bootstrap/manifest.json")).plugin.version === "9.1.0");
  const detected = JSON.parse(spawnSync(process.execPath, [v2.script, "--detect", "--target", out], { encoding: "utf8" }).stdout);
  check("--detect : mise à jour disponible selon la version du manifeste", detected.pluginVersion === "9.1.0" && detected.updateAvailable === false);
  const detectedOld = JSON.parse(spawnSync(process.execPath, [v1.script, "--detect", "--target", out], { encoding: "utf8" }).stdout);
  check("--detect : version du manifeste différente de celle du plugin", detectedOld.updateAvailable === true);
  // idempotence
  const again = runScript(v2.script, ["--update", "--target", out]);
  check("mise à jour : idempotente (rien créé, remplacé ni fusionné, manifeste intact)", again.report.created.length === 0 && again.report.updated.length === 0 && again.report.merged.length === 0 && again.report.manifest === undefined && again.report.conflicts.join() === "CLAUDE.md", JSON.stringify(again.report));
  // après résolution à la main d'un conflit, --adopt le consigne : plus signalé tant que le modèle ne change pas
  const adopt = runScript(v2.script, ["--update", "--target", out, "--adopt"]);
  check("--adopt : conflit consigné, code 0", adopt.res.status === 0 && adopt.report.adopted.includes("CLAUDE.md"), JSON.stringify(adopt.report));
  const after = runScript(v2.script, ["--update", "--target", out]);
  check("--adopt : fichier adopté plus signalé (modèle inchangé)", after.res.status === 0 && after.report.customized.includes("CLAUDE.md") && after.report.manifest === undefined);
  check("--update sans manifeste refusé", runScript(v2.script, ["--update", "--target", path.join(mkdir("pb-none-"), "x")]).res.status === 1);

  // adoption d'un projet sans manifeste
  const adopted = path.join(mkdir("pb-adopt-"), "repo");
  mkdirSync(adopted, { recursive: true });
  writeFileSync(path.join(adopted, "CLAUDE.md"), "# Existant\n");
  const ad = runScript(v1.script, ["--config", withConfig(cfg(["claude"])), "--target", adopted, "--adopt"]);
  const mf = JSON.parse(read(adopted, ".bootstrap/manifest.json"));
  check("adoption : fichier existant repris tel quel et consigné", ad.res.status === 0 && ad.report.adopted.includes("CLAUDE.md") && read(adopted, "CLAUDE.md") === "# Existant\n" && mf.files["CLAUDE.md"].status === "adopted");
  const ad2 = runScript(v1.script, ["--update", "--target", adopted]);
  check("adoption : relance sans effet", ad2.res.status === 0 && ad2.report.created.length === 0 && ad2.report.manifest === undefined && ad2.report.customized.includes("CLAUDE.md"));

  // migrations hors fichiers
  const mig = path.join(mkdir("pb-mig-"), "repo");
  run(cfg(["github", "release"]), [], mig);
  const calls = [];
  const fakeGh = (state) => (args) => {
    calls.push(args.join(" "));
    return args.includes("PUT") ? "" : JSON.stringify({ can_approve_pull_request_reviews: state, default_workflow_permissions: "read" });
  };
  const sim = await runMigrations({ target: mig, repo: "o/r", gh: fakeGh(false) });
  check("migration : simulation proposée sans rien modifier", sim.length === 1 && sim[0].id === "0001-actions-pr-permission" && sim[0].actions.length === 1 && sim[0].applied === false && !calls.some((c) => c.includes("PUT")));
  const ok = await runMigrations({ target: mig, repo: "o/r", gh: fakeGh(true), apply: true });
  check("migration : réglage déjà conforme, rien à faire", ok.length === 1 && ok[0].actions.length === 0 && ok[0].applied === false && !calls.some((c) => c.includes("PUT")));
  const applied = await runMigrations({ target: mig, repo: "o/r", gh: fakeGh(false), apply: true });
  check("migration : appliquée et consignée dans le manifeste", applied[0].applied === true && calls.some((c) => c.includes("PUT") && c.includes("can_approve_pull_request_reviews=true")) && JSON.parse(read(mig, ".bootstrap/manifest.json")).migrations.includes("0001-actions-pr-permission"));
  check("migration : déjà consignée, non rejouée", (await runMigrations({ target: mig, repo: "o/r", gh: fakeGh(false) })).length === 0);
  const noRelease = path.join(mkdir("pb-mig2-"), "repo");
  run(cfg(["github"]), [], noRelease);
  check("migration : ignorée si le module concerné est absent", (await runMigrations({ target: noRelease, repo: "o/r", gh: fakeGh(false) })).length === 0);
  let threw = false;
  try { await runMigrations({ target: path.join(mkdir("pb-mig3-"), "x"), repo: "o/r", gh: fakeGh(false) }); } catch { threw = true; }
  check("migration : projet sans manifeste refusé", threw);
}
// dry-run : n'écrit rien
{
  const r = run({ ...base, visibility: "private", modules: allModules }, ["--dry-run"]);
  let exists = true;
  try { statSync(r.out); } catch { exists = false; }
  check("dry-run n'écrit rien", r.res.status === 0 && !exists);
}
// point d'extension .bootstrap/checks.json : une seule liste pour le contrôle local, le pre-push et la CI
{
  const { res, out } = run({ ...base, visibility: "public", modules: ["claude", "githooks", "github"] });
  const checksFile = path.join(out, ".bootstrap", "checks.json");
  const runner = path.join(out, ".bootstrap", "run-checks.mjs");
  const gate = path.join(out, ".claude", "hooks", "quality-gate.mjs");
  const prePush = path.join(out, ".githooks", "pre-push");
  const node = (script, cwd = out) => spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
  const write = (checks) => writeFileSync(checksFile, JSON.stringify({ ciOs: ["ubuntu-latest"], checks }));
  const fail = `node -e "process.exit(1)"`;
  const pass = `node -e "process.exit(0)"`;
  check("checks.json : généré et valide", res.status === 0 && Array.isArray(JSON.parse(readFileSync(checksFile, "utf8")).checks));
  check("checks.json vide : le contrôle qualité passe", node(gate).status === 0, node(gate).stderr);
  write([{ name: "ok", command: pass }]);
  check("commande en succès : contrôle qualité et run-checks à 0", node(gate).status === 0 && node(runner).status === 0);
  write([{ name: "ko", command: fail }]);
  const g = node(gate);
  check("commande bloquante en échec : contrôle qualité à 2", g.status === 2 && /ko : échec/.test(g.stderr), g.stderr);
  check("commande bloquante en échec : run-checks à 1 (CI)", node(runner).status === 1);
  check("commande bloquante en échec : pre-push refuse", node(prePush).status === 1);
  write([{ name: "souple", command: fail, blocking: false }]);
  const soft = node(gate);
  check("commande non bloquante : signalée sans bloquer", soft.status === 0 && /non bloquant/.test(soft.stderr), soft.stderr);
  check("commande non bloquante : run-checks à 0", node(runner).status === 0);
  const other = process.platform === "win32" ? "linux" : "windows";
  write([{ name: "autre-os", command: fail, os: [other] }]);
  check("commande réservée à un autre système : ignorée", node(gate).status === 0);
  write([{ name: "mauvais-os", command: pass, os: ["beos"] }]);
  check("checks.json invalide : contrôle qualité en échec", node(gate).status === 2 && node(runner).status === 1);
  writeFileSync(checksFile, JSON.stringify({ ciOs: ["ubuntu-latest", "macos-latest"], checks: [] }));
  const osOut = spawnSync(process.execPath, [runner, "--print-os"], { cwd: out, encoding: "utf8" });
  check("--print-os : matrice de la CI", osOut.stdout.trim() === JSON.stringify(["ubuntu-latest", "macos-latest"]), osOut.stdout);
}
// agents en lecture seule : chaque commande citée dans leur modèle doit passer le hook read-only-bash.mjs
{
  const tpl = path.join(root, "skills", "project-bootstrap", "assets", "templates", ".claude");
  const hook = path.join(tpl, "hooks", "read-only-bash.mjs");
  const agentsDir = path.join(tpl, "agents");
  const verdict = (command) =>
    spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_input: { command } }), encoding: "utf8" }).status;
  check("hook lecture seule : commande autorisée acceptée", verdict("git log main..HEAD --oneline") === 0);
  check("hook lecture seule : caractère % refusé", verdict("git log main..HEAD --format=%s") === 2);
  for (const file of readdirSync(agentsDir)) {
    const text = readFileSync(path.join(agentsDir, file), "utf8");
    if (!text.includes("read-only-bash.mjs")) continue;
    const refused = [];
    for (const line of text.split("\n")) {
      if (/pas d[eu' ]|n'exécute aucune/i.test(line)) continue; // consigne d'interdiction, pas une commande à lancer
      for (const [, cmd] of line.matchAll(/`((?:git|gh|openspec|archgate) [^`]+)`/g)) {
        const command = cmd.replace(/<([^>]+)>/g, "$1").replace(/ N\b/g, " 1");
        if (verdict(command) !== 0) refused.push(command);
      }
    }
    check(`${file} : commandes citées acceptées par le hook`, refused.length === 0, refused.join(" | "));
  }
}

console.log(failed ? `\n${failed} échec(s)` : "\nTous les tests passent");
process.exit(failed ? 1 : 0);
