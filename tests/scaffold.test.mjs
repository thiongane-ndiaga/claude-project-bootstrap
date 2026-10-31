#!/usr/bin/env node
// Tests de scaffold.mjs sur plusieurs combinaisons de modules. Usage : node tests/scaffold.test.mjs
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../skills/project-bootstrap/scripts/migrate.mjs";
import { syncLabels } from "../skills/project-bootstrap/assets/templates/scripts/sync-labels.mjs";
import { formatReport, isGhWrite, parseArgs, parseFormLabels, realExec, runAudit } from "../skills/project-bootstrap/scripts/audit.mjs";

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
    check(`${c.name} : actions épinglées sur un SHA`, [...ci.matchAll(/uses:\s*(\S+)/g)].every((m) => m[1].startsWith("./") || /@[0-9a-f]{40}$/.test(m[1])));
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
    check("manifeste : empreinte de chaque fichier généré", Object.entries(m.files).every(([rel, f]) => f.sha256 === sha(read(r.out, rel)) && f.status === ([".bootstrap/checks.json", ".github/actions/project-setup/action.yml"].includes(rel) ? "kept" : "created")) && "CLAUDE.md" in m.files);
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
  const runScript = (script, args, env = process.env) => {
    const res = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env });
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

  // fusion à trois voies avec base conservée dans le projet (#81, ARCH-006)
  {
    const WF = "docs/workflow.md";
    const baseOf = (rel) => ".bootstrap/base/" + rel + ".base";
    const appendTo = (rel, text) => (skill) => {
      const f = path.join(skill, "assets", "templates", ...rel.split("/"));
      writeFileSync(f, readFileSync(f, "utf8") + text);
    };
    const p1 = plugin("9.4.0");
    const p2 = plugin("9.5.0", appendTo(WF, "\nNouvelle section v9.5.\n"));
    const p3 = plugin("9.6.0", (skill) => {
      appendTo(WF, "\nNouvelle section v9.5.\n")(skill);
      appendTo(WF, "\nNouvelle section v9.6.\n")(skill);
    });
    const fresh = (modules = ["claude", "github"]) => {
      const out = path.join(mkdir("pb-3w-"), "repo");
      runScript(p1.script, ["--config", withConfig(cfg(modules)), "--target", out]);
      return out;
    };
    const editTop = (out, eol = "\n") => {
      const lines = read(out, WF).split("\n");
      lines[0] = "# Mon workflow";
      writeFileSync(path.join(out, ...WF.split("/")), lines.join(eol));
    };

    // bases écrites à la génération : fichiers du modèle seulement, suffixe .base, jamais pour les fichiers partagés ou owned
    const out = fresh();
    check(
      "base : copie écrite pour un fichier du modèle, suffixe .base, contenu du modèle",
      exists(out, baseOf(WF)) && read(out, baseOf(WF)) === read(out, WF) && exists(out, baseOf("CLAUDE.md")),
    );
    check("base : aucune pour un fichier partagé ni pour un fichier owned", !exists(out, baseOf(".gitignore")) && !exists(out, baseOf(".claude/settings.json")) && !exists(out, baseOf(".bootstrap/checks.json")));
    check("base : aucun fichier de .bootstrap/base sans le suffixe .base", (() => {
      const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [e.name]));
      return walk(path.join(out, ".bootstrap", "base")).every((n) => n.endsWith(".base"));
    })());

    // modifications éloignées : fusion sans conflit
    editTop(out);
    const dry = runScript(p2.script, ["--update", "--target", out, "--dry-run"]);
    check("fusion : --dry-run rapporte reconciled sans rien écrire", dry.res.status === 0 && dry.report.reconciled.includes(WF) && read(out, WF).startsWith("# Mon workflow") && !/v9\.5/.test(read(out, WF)) && !/v9\.5/.test(read(out, baseOf(WF))));
    const up = runScript(p2.script, ["--update", "--target", out]);
    check("fusion : ajout du projet et changement du modèle conservés, code 0", up.res.status === 0 && up.report.reconciled.includes(WF) && up.report.conflicts.length === 0 && read(out, WF).startsWith("# Mon workflow") && /Nouvelle section v9\.5/.test(read(out, WF)), JSON.stringify(up.report));
    check("fusion : statut reconciled, base = nouveau modèle", JSON.parse(read(out, ".bootstrap/manifest.json")).files[WF].status === "reconciled" && /v9\.5/.test(read(out, baseOf(WF))));
    // idempotence
    const again = runScript(p2.script, ["--update", "--target", out]);
    check("fusion : idempotente (fichier customized, rien de réécrit, manifeste intact)", again.res.status === 0 && again.report.customized.includes(WF) && again.report.reconciled.length === 0 && again.report.created.length === 0 && again.report.updated.length === 0 && again.report.manifest === undefined, JSON.stringify(again.report));
    // persistance : nouveau changement du modèle, la personnalisation survit
    const up3 = runScript(p3.script, ["--update", "--target", out]);
    check("fusion : seconde mise à jour refusionne, jamais de remplacement", up3.res.status === 0 && up3.report.reconciled.includes(WF) && read(out, WF).startsWith("# Mon workflow") && /v9\.6/.test(read(out, WF)));

    // modifications voisines : conflit, fichier intact, proposition avec marqueurs
    const near = fresh();
    const last = read(near, WF).replace(/\n+$/, "") + " (projet)\n";
    writeFileSync(path.join(near, ...WF.split("/")), last);
    const conflict = runScript(p2.script, ["--update", "--target", near, "--diff"]);
    check("conflit : code 3, fichier intact, aucun marqueur écrit", conflict.res.status === 3 && conflict.report.conflicts.includes(WF) && read(near, WF) === last && !/<<<<<<</.test(read(near, WF)));
    check("conflit : proposition avec marqueurs sous diffs, base conservée", /<<<<<<< projet/.test(conflict.report.diffs?.[WF] ?? "") && !/v9\.5/.test(read(near, baseOf(WF))));
    const adoptC = runScript(p2.script, ["--update", "--target", near, "--adopt"]);
    check("conflit + --adopt : adopté, code 0, base = nouveau modèle", adoptC.res.status === 0 && adoptC.report.adopted.includes(WF) && read(near, WF) === last && /v9\.5/.test(read(near, baseOf(WF))), JSON.stringify(adoptC.report));

    // --adopt n'empêche pas une fusion propre
    const both = fresh();
    editTop(both);
    const adoptClean = runScript(p2.script, ["--update", "--target", both, "--adopt"]);
    check("--adopt : une fusion propre l'emporte (non adopté)", adoptClean.res.status === 0 && adoptClean.report.reconciled.includes(WF) && !adoptClean.report.adopted.includes(WF));

    // le projet contient déjà le changement du modèle : rien à écrire
    const same = fresh();
    writeFileSync(path.join(same, ...WF.split("/")), read(same, WF) + "\nNouvelle section v9.5.\n");
    const sameUp = runScript(p2.script, ["--update", "--target", same]);
    check("fusion identique au fichier : non réécrit, rapporté identical, base à jour", sameUp.res.status === 0 && sameUp.report.identical.includes(WF) && !sameUp.report.reconciled.includes(WF) && /v9\.5/.test(read(same, baseOf(WF))), JSON.stringify(sameUp.report));

    // CRLF restauré
    const crlf = fresh();
    editTop(crlf, "\r\n");
    const crlfUp = runScript(p2.script, ["--update", "--target", crlf]);
    const crlfText = readFileSync(path.join(crlf, ...WF.split("/")), "utf8");
    check("fusion : fins de ligne CRLF du fichier restaurées", crlfUp.res.status === 0 && crlfUp.report.reconciled.includes(WF) && crlfText.includes("\r\n") && !/[^\r]\n/.test(crlfText), JSON.stringify(crlfUp.report));
    // base relue en CRLF : toujours valide
    const crlfBase = fresh();
    editTop(crlfBase);
    const bf = path.join(crlfBase, ...baseOf(WF).split("/"));
    writeFileSync(bf, readFileSync(bf, "utf8").replace(/\n/g, "\r\n"));
    check("base réécrite en CRLF : reste valide", runScript(p2.script, ["--update", "--target", crlfBase]).report.reconciled.includes(WF));

    // replis : base absente, base altérée, git indisponible
    const noBase = fresh();
    editTop(noBase);
    rmSync(path.join(noBase, ...baseOf(WF).split("/")));
    const nb = runScript(p2.script, ["--update", "--target", noBase]);
    check("repli : base absente -> conflit, fichier intact, pas signalée invalide", nb.res.status === 3 && nb.report.conflicts.includes(WF) && !nb.report.baseInvalid.includes(WF));
    const badBase = fresh();
    editTop(badBase);
    writeFileSync(path.join(badBase, ...baseOf(WF).split("/")), "base altérée\n");
    const bb = runScript(p2.script, ["--update", "--target", badBase]);
    check("repli : base altérée -> conflit et baseInvalid", bb.res.status === 3 && bb.report.conflicts.includes(WF) && bb.report.baseInvalid.includes(WF));
    const noGit = fresh();
    editTop(noGit);
    const noGitUp = runScript(p2.script, ["--update", "--target", noGit], { ...process.env, PATH: "", Path: "" });
    check("repli : git indisponible -> conflit, fichier intact", noGitUp.res.status === 3 && noGitUp.report.conflicts.includes(WF) && read(noGit, WF).startsWith("# Mon workflow") && !/v9\.5/.test(read(noGit, WF)), noGitUp.res.stderr);

    // fichier partagé : le mécanisme existant garde la priorité (pas de base, fusion par lignes)
    const shared = fresh();
    writeFileSync(path.join(shared, ".gitignore"), "mon-dossier/\n");
    const sharedUp = runScript(p2.script, ["--update", "--target", shared]);
    check("fichier partagé : fusion par lignes inchangée, aucune base", sharedUp.res.status === 0 && read(shared, ".gitignore").includes("mon-dossier/") && !exists(shared, baseOf(".gitignore")));

    // date figée au manifeste : conservée avec --update --config sans date
    const dated = fresh();
    const mf = path.join(dated, ".bootstrap", "manifest.json");
    const m0 = JSON.parse(readFileSync(mf, "utf8"));
    check("date : enregistrée au manifeste à la première génération", /^\d{4}-\d{2}-\d{2}$/.test(m0.config.date ?? ""));
    m0.config.date = "2020-01-02";
    writeFileSync(mf, JSON.stringify(m0, null, 2) + "\n");
    runScript(p1.script, ["--update", "--target", dated, "--config", withConfig(cfg(["claude", "github"]))]);
    check("date : conservée par --update --config sans date", JSON.parse(readFileSync(mf, "utf8")).config.date === "2020-01-02");

    // bit exécutable conservé (POSIX)
    if (process.platform !== "win32") {
      const hooks = path.join(mkdir("pb-3w-x-"), "repo");
      const p4 = plugin("9.7.0", appendTo(".githooks/pre-push", "\n# hook v9.7\n"));
      runScript(p1.script, ["--config", withConfig(cfg(["claude", "githooks"])), "--target", hooks]);
      const hook = path.join(hooks, ".githooks", "pre-push");
      writeFileSync(hook, "# hook du projet\n" + readFileSync(hook, "utf8"));
      chmodSync(hook, 0o755);
      const hookUp = runScript(p4.script, ["--update", "--target", hooks]);
      check("fusion : bit exécutable de pre-push conservé", hookUp.res.status === 0 && hookUp.report.reconciled.includes(".githooks/pre-push") && (statSync(hook).mode & 0o111) !== 0, JSON.stringify(hookUp.report));
    }
  }

  // fichier propre au projet (owned) : créé une fois, jamais touché ensuite, même si le modèle change
  const own1 = plugin("9.2.0");
  const own2 = plugin("9.3.0", (skill) => {
    const f = path.join(skill, "assets", "templates", ".bootstrap", "checks.json");
    writeFileSync(f, readFileSync(f, "utf8") + "\n");
  });
  const ownOut = path.join(mkdir("pb-own-"), "repo");
  runScript(own1.script, ["--config", withConfig(cfg(["claude"])), "--target", ownOut]);
  const checksBefore = read(ownOut, ".bootstrap/checks.json");
  check("owned : checks.json créé à la première génération, consigné kept", JSON.parse(read(ownOut, ".bootstrap/manifest.json")).files[".bootstrap/checks.json"].status === "kept");
  const ownUp = runScript(own2.script, ["--update", "--target", ownOut]);
  check("owned : intact, ni remplacé ni en conflit après changement du modèle", read(ownOut, ".bootstrap/checks.json") === checksBefore && ownUp.res.status === 0 && !ownUp.report.updated.includes(".bootstrap/checks.json") && !ownUp.report.conflicts.includes(".bootstrap/checks.json"), JSON.stringify(ownUp.report));
  writeFileSync(path.join(ownOut, ".bootstrap", "checks.json"), "[]\n");
  const ownUp2 = runScript(own2.script, ["--update", "--target", ownOut]);
  check("owned : personnalisé, jamais touché", read(ownOut, ".bootstrap/checks.json") === "[]\n" &&ownUp2.res.status === 0);

  // labels natifs de la forge : formulaires, synchronisation non destructive, migration 0002 (#29)
  {
    const tpl = (rel) => readFileSync(path.join(root, "skills", "project-bootstrap", "assets", "templates", ...rel.split("/")), "utf8");
    const modelLabels = JSON.parse(tpl(".github/labels.json"));
    const names = modelLabels.map((l) => l.name);
    check("labels : le modèle ne décrit que bug, enhancement, adr et chore (noms plats, sans needs-adr)", JSON.stringify(names) === JSON.stringify(["bug", "enhancement", "adr", "chore"]) && !names.some((n) => n.includes(":")));
    check("labels : bug et enhancement sont natifs, adr et chore propres au plugin", modelLabels.filter((l) => l.native).map((l) => l.name).join() === "bug,enhancement");
    const formLabels = ["bug", "feature", "architecture-decision"].map((f) => /^labels:\s*\["([^"]+)"\]/m.exec(tpl(`.github/ISSUE_TEMPLATE/${f}.yml`))?.[1]);
    check("labels : formulaires bug -> bug, feature -> enhancement, décision -> adr", formLabels.join() === "bug,enhancement,adr", formLabels.join());
    check("labels : chaque label posé par un formulaire figure dans labels.json", formLabels.every((l) => names.includes(l)));

    // --- synchronisation (gh simulé)
    const syncGh = (existing, opts = {}) => {
      const calls = [];
      const gh = (args) => {
        calls.push(args.join(" "));
        if (args[1] === "list") {
          if (opts.listFails) throw new Error("non authentifié");
          return JSON.stringify(existing.map((name) => ({ name })));
        }
        return "";
      };
      return { gh, calls };
    };
    const creates = (calls) => calls.filter((c) => c.startsWith("label create"));
    const s1 = syncGh(["bug", "enhancement", "adr"]);
    const r1 = syncLabels({ labels: modelLabels, gh: s1.gh });
    check("sync : natifs existants intouchés, label du plugin existant mis à jour (--force), absent créé sans --force", r1.skipped.join() === "bug,enhancement" && r1.updated.join() === "adr" && r1.created.join() === "chore" && creates(s1.calls).every((c) => (c.startsWith("label create adr") ? c.includes("--force") : !c.includes("--force"))) && !creates(s1.calls).some((c) => /label create (bug|enhancement)/.test(c)), s1.calls.join(" | "));
    const s2 = syncGh(["Bug", "ENHANCEMENT"]);
    const r2 = syncLabels({ labels: modelLabels, gh: s2.gh });
    check("sync : natif présent avec une autre casse -> pas de doublon, pas de modification", r2.skipped.join() === "bug,enhancement" && !creates(s2.calls).some((c) => /label create (bug|enhancement)/i.test(c)));
    const s3 = syncGh([]);
    const r3 = syncLabels({ labels: modelLabels, gh: s3.gh });
    check("sync : natifs absents créés avec la couleur et la description du fichier, sans --force", r3.created.join() === "bug,enhancement,adr,chore" && creates(s3.calls).length === 4 && creates(s3.calls).every((c) => !c.includes("--force")) && creates(s3.calls)[0].includes("--color d73a4a"));
    const s4 = syncGh([], { listFails: true });
    let syncThrew = false;
    try { syncLabels({ labels: modelLabels, gh: s4.gh }); } catch { syncThrew = true; }
    check("sync : lecture des labels impossible -> erreur, aucune création", syncThrew && creates(s4.calls).length === 0);
    const noGh = spawnSync(process.execPath, [path.join(root, "skills", "project-bootstrap", "assets", "templates", "scripts", "sync-labels.mjs")], { encoding: "utf8", env: { ...process.env, PATH: "", Path: "" } });
    check("sync : script lancé sans gh -> code non nul", noGh.status === 1, noGh.stderr);

    // --- documentation du skill (exigences documentaires de la spec forge-labels)
    const skillMd = readFileSync(path.join(root, "skills", "project-bootstrap", "SKILL.md"), "utf8");
    check("skill : le principe « réutiliser avant de créer » est énoncé, pour les modules de forge ou de suivi", /Réutiliser avant de créer/.test(skillMd) && /module de forge ou de suivi/.test(skillMd));
    check("skill : les notes d'une migration sont à présenter à l'utilisateur", /notes/.test(skillMd) && /présente-les à l'utilisateur/.test(skillMd));

    // --- moteur de migration : notes
    const notesDir = mkdir("pb-notes-");
    writeFileSync(path.join(notesDir, "0900-notes.mjs"), 'export const id = "0900-notes"; export const title = "t"; export const modules = ["github"];\nexport function plan() { return { actions: [{ description: "a", command: "c", run: () => { globalThis.__noteRan = true; } }], notes: ["information"] }; }\n');
    const notesProj = path.join(mkdir("pb-notesproj-"), "repo");
    run(cfg(["github"]), [], notesProj);
    const withNotes = await runMigrations({ dir: notesDir, target: notesProj, repo: "o/r", gh: () => "" });
    check("migration : plan { actions, notes } -> notes dans le résultat, rien d'exécuté en simulation", withNotes[0].notes.join() === "information" && withNotes[0].actions.length === 1 && globalThis.__noteRan !== true);
    const only0001 = mkdir("pb-only1-");
    cpSync(path.join(root, "skills", "project-bootstrap", "migrations", "0001-actions-pr-permission.mjs"), path.join(only0001, "0001-actions-pr-permission.mjs"));
    const proj0001 = path.join(mkdir("pb-m1-"), "repo");
    run(cfg(["github", "release"]), [], proj0001);
    const sim0001 = await runMigrations({ dir: only0001, target: proj0001, repo: "o/r", gh: () => JSON.stringify({ can_approve_pull_request_reviews: false, default_workflow_permissions: "read" }) });
    check("migration : 0001 (tableau) -> notes vides", Array.isArray(sim0001[0].notes) && sim0001[0].notes.length === 0);

    // --- migration 0002 (gh simulé avec état)
    const dir0002 = mkdir("pb-mig2dir-");
    cpSync(path.join(root, "skills", "project-bootstrap", "migrations", "0002-native-labels.mjs"), path.join(dir0002, "0002-native-labels.mjs"));
    const mkState = (labels, items) => ({
      labels: new Map(labels.map(([n, c, d]) => [n, { color: c, description: d }])),
      items: items.map(([number, ls]) => ({ number, labels: [...ls] })),
      calls: [], events: [], posts: 0, failOnPost: 0, failList: null,
    });
    const repoGh = (st) => (args) => {
      const a = args.join(" ");
      st.calls.push(a);
      const f = {};
      args.forEach((x, i) => { if (x === "-f") { const [k, ...v] = args[i + 1].split("="); f[k] = v.join("="); } });
      const method = args.includes("-X") ? args[args.indexOf("-X") + 1] : "GET";
      const route = args.find((x) => x.startsWith("repos/")) ?? "";
      if (method === "GET" && route.endsWith("/labels?per_page=100")) return [...st.labels].map(([n, v]) => JSON.stringify([n, v.color, v.description])).join("\n");
      if (method === "GET" && route.endsWith("/issues")) {
        if (st.failList && f.labels.toLowerCase() === st.failList) throw new Error("API indisponible");
        return st.items.filter((i) => i.labels.some((l) => l.toLowerCase() === f.labels.toLowerCase())).map((i) => JSON.stringify([i.number, i.labels])).join("\n");
      }
      const post = /\/issues\/(\d+)\/labels$/.exec(route);
      if (method === "POST" && !post && route.endsWith("/labels")) { st.labels.set(f.name, { color: f.color, description: f.description }); st.events.push(`create:${f.name}`); return ""; }
      if (method === "POST" && post) {
        st.posts++;
        if (st.failOnPost && st.posts === st.failOnPost) throw new Error("échec de la pose");
        st.items.find((i) => i.number === Number(post[1])).labels.push(f["labels[]"]);
        st.events.push(`post:${post[1]}:${f["labels[]"]}`);
        return "";
      }
      const del = /\/labels\/(.+)$/.exec(route);
      if (method === "DELETE" && del) {
        const name = decodeURIComponent(del[1]);
        st.labels.delete(name);
        for (const i of st.items) i.labels = i.labels.filter((l) => l !== name);
        st.events.push(`delete:${name}`);
        return "";
      }
      throw new Error("appel inattendu : " + a);
    };
    const oldLabels = () => [["bug", "d73a4a", "Something isn't working"], ["enhancement", "a2eeef", "New feature or request"], ["type:bug", "d73a4a", "x"], ["type:feature", "1d76db", "y"], ["type:adr", "5319e7", "Décision"], ["type:chore", "c5def5", "Maintenance"], ["needs-adr", "fbca04", "z"]];
    const newProj = () => { const d = path.join(mkdir("pb-m2-"), "repo"); run(cfg(["github"]), [], d); return d; };
    const m2 = (target, st, opts = {}) => runMigrations({ dir: dir0002, target, repo: "o/r", gh: repoGh(st), ...opts });
    const manifestMigrations = (d) => JSON.parse(read(d, ".bootstrap/manifest.json")).migrations;

    // simulation
    const st1 = mkState(oldLabels(), [[1, ["type:bug"]], [2, ["type:feature"]], [3, ["type:chore"]], [4, ["type:chore", "type:feature"]]]);
    const p1 = newProj();
    const sim2 = await m2(p1, st1);
    check("0002 : simulation -> actions listées avec les comptes, aucune écriture", sim2.length === 1 && sim2[0].applied === false && sim2[0].actions.some((a) => /sur 2 élément\(s\)/.test(a.description) && a.description.includes("type:chore")) && st1.events.length === 0 && st1.calls.every((c) => !/-X (POST|DELETE)/.test(c)), sim2[0].actions.map((a) => a.description).join(" / "));
    check("0002 : chaque commande vise le dépôt reçu", st1.calls.every((c) => c.includes("repos/o/r")), st1.calls.find((c) => !c.includes("repos/o/r")));
    // application
    const st2 = mkState(oldLabels(), [[1, ["type:bug"]], [2, ["type:feature"]], [3, ["type:chore"]], [4, ["type:chore", "type:feature"]], [5, ["type:adr"]]]);
    const p2 = newProj();
    const app2 = await m2(p2, st2, { apply: true });
    const orderOk = ["bug", "enhancement", "chore", "adr"].every((n) => {
      const del = st2.events.findIndex((e) => e === `delete:type:${n === "enhancement" ? "feature" : n}`);
      const lastPost = Math.max(...st2.events.map((e, i) => (e.endsWith(`:${n}`) && e.startsWith("post") ? i : -1)));
      return del > lastPost && lastPost >= 0;
    });
    check("0002 : application -> nouveaux labels posés sur chaque élément, anciens supprimés, ordre poser puis supprimer", app2[0].applied === true && orderOk && st2.items.find((i) => i.number === 4).labels.sort().join() === "chore,enhancement" && ![...st2.labels.keys()].some((n) => n.startsWith("type:")), st2.events.join(" "));
    check("0002 : label de remplacement existant (bug, enhancement) non recréé ni modifié", !st2.events.includes("create:bug") && !st2.events.includes("create:enhancement") && st2.labels.get("bug").description === "Something isn't working");
    check("0002 : adr et chore créés avec la couleur et la description de l'ancien label", st2.labels.get("adr").color === "5319e7" && st2.labels.get("chore").description === "Maintenance");
    check("0002 : needs-adr inutilisé supprimé, migration consignée au manifeste", !st2.labels.has("needs-adr") && manifestMigrations(p2).includes("0002-native-labels"));
    // idempotence : plan sur l'état après application
    const after = await runMigrations({ dir: dir0002, target: newProj(), repo: "o/r", gh: repoGh(st2) });
    check("0002 : état après application -> aucune action", after[0].actions.length === 0 && after[0].notes.length === 0);
    // natifs absents
    const st3 = mkState([["type:bug", "d73a4a", ""], ["type:feature", "1d76db", ""]], [[1, ["type:bug"]]]);
    await m2(newProj(), st3, { apply: true });
    check("0002 : natifs absents créés avec les valeurs de GitHub", st3.labels.get("bug")?.color === "d73a4a" && st3.labels.get("bug")?.description === "Something isn't working" && st3.labels.get("enhancement")?.color === "a2eeef");
    // casse
    const st4 = mkState([["Bug", "d73a4a", "Something isn't working"], ["type:bug", "d73a4a", ""]], [[1, ["type:bug"]]]);
    await m2(newProj(), st4, { apply: true });
    check("0002 : natif présent avec une autre casse -> pas de doublon créé", !st4.events.includes("create:bug") && st4.events.includes("post:1:bug"));
    // plus de 1000 éléments
    const many = Array.from({ length: 1500 }, (_, i) => [i + 1, ["type:bug"]]);
    const st5 = mkState([["bug", "d73a4a", "x"], ["type:bug", "d73a4a", ""]], many);
    await m2(newProj(), st5, { apply: true });
    check("0002 : plus de mille éléments -> tous relabellisés avant la suppression", st5.items.every((i) => i.labels.join() === "bug") && st5.events.at(-1) === "delete:type:bug");
    // élément qui est une PR : même chemin (issues et PR partagent l'API)
    check("0002 : les éléments sont posés par l'API des issues (valable pour les PR)", st2.calls.some((c) => /issues\/\d+\/labels/.test(c)) && !st2.calls.some((c) => c.includes("gh pr")));
    // lecture incomplète : pas de suppression
    const st6 = mkState([["bug", "d73a4a", "x"], ["type:bug", "d73a4a", ""]], [[1, ["type:bug"]]]);
    st6.failList = "type:bug";
    let listThrew = false;
    try { await m2(newProj(), st6, { apply: true }); } catch { listThrew = true; }
    check("0002 : lecture des éléments en échec -> erreur, aucune suppression", listThrew && !st6.events.some((e) => e.startsWith("delete")));
    // échec en cours de pose, puis reprise
    const st7 = mkState([["bug", "d73a4a", "x"], ["type:bug", "d73a4a", ""]], [[1, ["type:bug"]], [2, ["type:bug"]], [3, ["type:bug"]]]);
    st7.failOnPost = 2;
    const p7 = newProj();
    let failed = false;
    try { await m2(p7, st7, { apply: true }); } catch { failed = true; }
    check("0002 : échec pendant l'application -> ancien label conservé, éléments encore étiquetés, migration non consignée", failed && st7.labels.has("type:bug") && st7.items.every((i) => i.labels.includes("type:bug")) && !manifestMigrations(p7).includes("0002-native-labels"));
    st7.failOnPost = 0;
    const resume = await m2(p7, st7);
    check("0002 : relance -> seules les actions restantes (pose sur les éléments sans le nouveau label, puis suppression)", resume[0].actions.some((a) => /sur 2 élément\(s\)/.test(a.description)) && !resume[0].actions.some((a) => a.description.startsWith("Créer")), resume[0].actions.map((a) => a.description).join(" / "));
    await m2(p7, st7, { apply: true });
    check("0002 : reprise terminée -> tout posé, ancien label supprimé", st7.items.every((i) => i.labels.join() === "bug" || i.labels.sort().join() === "bug") && !st7.labels.has("type:bug"));
    // needs-adr
    const st8 = mkState([["needs-adr", "fbca04", "z"]], [[1, ["needs-adr"]], [2, ["needs-adr"]]]);
    const p8 = newProj();
    const r8 = await m2(p8, st8, { apply: true });
    check("0002 : needs-adr seul et utilisé -> aucune action, note avec le compte, non consignée", r8[0].actions.length === 0 && /2 élément\(s\)/.test(r8[0].notes.join()) && r8[0].applied === false && !manifestMigrations(p8).includes("0002-native-labels") && st8.labels.has("needs-adr"));
    const st9 = mkState([["bug", "d73a4a", "x"], ["type:bug", "d73a4a", ""], ["needs-adr", "fbca04", "z"]], [[1, ["type:bug", "needs-adr"]]]);
    const r9 = await m2(newProj(), st9, { apply: true });
    check("0002 : needs-adr utilisé avec d'autres anciens labels -> conservé et signalé, le reste migré", st9.labels.has("needs-adr") && !st9.labels.has("type:bug") && r9[0].notes.length === 1);
    // aucun ancien label
    const st10 = mkState([["bug", "d73a4a", "x"], ["enhancement", "a2eeef", "y"]], []);
    const r10 = await m2(newProj(), st10);
    check("0002 : aucun ancien label -> aucune action", r10[0].actions.length === 0 && r10[0].notes.length === 0);
    check("0002 : ignorée si le module github est absent", (await m2((() => { const d = path.join(mkdir("pb-m2x-"), "repo"); run(cfg(["claude"]), [], d); return d; })(), mkState([], []))).length === 0);
  }

  // audit en lecture seule d'un projet généré (#46) : projets réels (scaffold + git), CLI et gh simulés
  {
    const MODS = ["claude", "github", "openspec", "archgate", "release", "githooks"];
    const detected = new Set();
    const mkProject = (modules = MODS, { git = true, name = "projet" } = {}) => {
      const dir = path.join(mkdir("pb-audit-"), name);
      run(cfg(modules), [], dir);
      if (git) {
        const g = (...a) => spawnSync("git", ["-C", dir, ...a], { encoding: "utf8" });
        g("init", "-q");
        g("config", "user.name", "t");
        g("config", "user.email", "t@t");
        if (modules.includes("githooks") && process.platform !== "win32") chmodSync(path.join(dir, ".githooks", "pre-push"), 0o755);
        g("add", "-A");
        if (modules.includes("githooks")) g("update-index", "--chmod=+x", ".githooks/pre-push");
        g("commit", "-q", "-m", "init");
        g("config", "core.hooksPath", ".githooks");
      }
      return dir;
    };
    const git = (dir, ...a) => spawnSync("git", ["-C", dir, ...a], { encoding: "utf8" });
    const ciVersion = (dir, name) => new RegExp(`${name}:\\s*"?([\\w.-]+)`).exec(read(dir, ".github/workflows/ci.yml"))[1];
    const res = (status = 0, stdout = "", stderr = "") => ({ status, stdout, stderr });
    // exécuteur simulé : git et scaffold sont réels, les CLI du projet et gh sont simulés
    const fake = (dir, o = {}) => {
      const calls = [];
      const exec = (cmd, args = [], opts = {}) => {
        calls.push([cmd, ...args].join(" "));
        if (o.throwOn?.(cmd, args)) throw new Error("boom");
        if (cmd === "git") return realExec(cmd, args, opts);
        if (cmd === process.execPath) return o.scaffold ?? realExec(cmd, args, opts);
        const j = args.join(" ");
        if (["openspec", "archgate", "npm", "gh"].includes(cmd) && o.absent?.includes(cmd)) return res(127);
        if (cmd === "openspec") {
          if (j === "--version") return res(0, `${o.openspecVersion ?? ciVersion(dir, "OPENSPEC_VERSION")}\n`);
          if (j.startsWith("validate")) return o.validate ?? res(0, "ok");
          if (j.startsWith("doctor")) return o.doctor ?? res(0, JSON.stringify({ root: { path: dir, healthy: true, status: [] }, status: [] }));
        }
        if (cmd === "archgate") {
          if (j === "--version") return res(0, `${o.archgateVersion ?? ciVersion(dir, "ARCHGATE_VERSION")}\n`);
          if (j.startsWith("check")) return o.check ?? res(0, "check passed");
        }
        if (cmd === "npm") return res(0, `${o.npmPrefix ?? tmpdir()}\n`);
        if (cmd === "gh") return o.gh ? o.gh(args) : res(0, "");
        return res(127);
      };
      return { exec, calls };
    };
    const audit = async (dir, o = {}, extra = {}) => {
      const f = fake(dir, o);
      const report = await runAudit({ target: dir, exec: f.exec, ...extra });
      for (const r of report.results) if (r.statut === "ecart") detected.add(r.id);
      return { ...report, calls: f.calls };
    };
    const by = (r, id) => r.results.find((x) => x.id === id);
    const ecarts = (r) => r.results.filter((x) => x.statut === "ecart").map((x) => x.id);

    // --- rapport, codes, projet sain
    const healthy = mkProject();
    const rep0 = await audit(healthy);
    check("audit : projet sain -> aucun écart, code 0", rep0.summary.ecart === 0 && rep0.summary.ok >= 10, JSON.stringify(rep0.results.filter((r) => r.statut !== "ok")));
    check("audit : aucun appel à gh sans --forge ni --workstation", !rep0.calls.some((c) => c.startsWith("gh ")));
    const snap = (dir) => {
      const files = git(dir, "ls-files").stdout.split("\n").filter(Boolean).sort();
      const h = createHash("sha256");
      for (const f of files) h.update(f + readFileSync(path.join(dir, f)).toString("latin1"));
      h.update(readFileSync(path.join(dir, ".git", "index")));
      return h.digest("hex");
    };
    const before = snap(healthy);
    await audit(healthy, { throwOn: () => false });
    check("audit : fichiers suivis et index git identiques avant et après", snap(healthy) === before);
    check("audit : télémétrie coupée pour les CLI du projet (env de l'exécuteur réel)", realExec(process.execPath, ["-e", "process.stdout.write(process.env.OPENSPEC_TELEMETRY)"]).stdout === "0");
    const spaced = mkProject(MODS, { name: "mon projet (test) & co" });
    check("audit : cible avec espaces et métacaractères", (await audit(spaced)).summary.ecart === 0);
    check("audit : --json -> résultats et compte par statut", (() => { const r = JSON.parse(JSON.stringify(rep0)); return Array.isArray(r.results) && typeof r.summary.ok === "number" && "non-verifiable" in r.summary; })());
    const bare = path.join(mkdir("pb-audit-bare-"), "vide");
    mkdirSync(bare, { recursive: true });
    const repBare = await audit(bare);
    check("audit : dossier sans manifeste -> tout non vérifiable, résumé explicite", repBare.summary.ok === 0 && repBare.summary.ecart === 0 && repBare.summary["non-verifiable"] >= 2 && /Aucun contrôle n'a pu être effectué/.test(formatReport(repBare)) && by(repBare, "manifeste").message.includes("--adopt"));
    check("audit : usage -> cible absente ou dossier inexistant", parseArgs([]).error && parseArgs(["--target", path.join(bare, "nope")]).error);
    check("audit : usage -> --repo invalide (a/../b, métacaractères) refusé avant toute commande", ["a/../b", "a b/c", "a/b;ls", "../x"].every((r) => parseArgs(["--target", bare, "--repo", r]).error) && !parseArgs(["--target", bare, "--repo", "o/r"]).error);
    check("audit : usage -> option inconnue, --project non numérique", parseArgs(["--target", bare, "--nope"]).error && parseArgs(["--target", bare, "--project", "x"]).error);
    const boom = await audit(healthy, { throwOn: (cmd, args) => cmd === "git" && args.includes("rev-parse") });
    check("audit : une exception dans un contrôle -> non vérifiable, les autres s'exécutent", by(boom, "hooks-git")?.statut === "non-verifiable" && boom.summary.ok >= 8, JSON.stringify(boom.results.filter((r) => r.statut !== "ok")));
    const slow = await audit(healthy, { check: { status: null, stdout: "", stderr: "", error: Object.assign(new Error("t"), { code: "ETIMEDOUT" }) } });
    check("audit : délai dépassé -> non vérifiable", by(slow, "archgate-check")?.statut === "non-verifiable" && /délai/.test(by(slow, "archgate-check").message));

    // --- manifeste, mise à jour, bases
    const p1 = mkProject();
    writeFileSync(path.join(p1, ".bootstrap", "manifest.json"), "{ pas du json");
    const r1 = await audit(p1);
    check("piège : manifeste illisible -> écart", by(r1, "manifeste")?.statut === "ecart");
    const p2 = mkProject();
    const mf = JSON.parse(read(p2, ".bootstrap/manifest.json"));
    mf.plugin.version = "0.0.1";
    writeFileSync(path.join(p2, ".bootstrap", "manifest.json"), JSON.stringify(mf, null, 2));
    const r2 = await audit(p2);
    check("piège : version du manifeste en retard -> écart avec la correction", by(r2, "version-plugin")?.statut === "ecart" && /--update/.test(by(r2, "version-plugin").correction));
    const p3 = mkProject();
    rmSync(path.join(p3, ".gitattributes"));
    const r3 = await audit(p3);
    check("piège : fichier du modèle manquant -> mise à jour en attente (écart)", by(r3, "mise-a-jour")?.statut === "ecart" && /\.gitattributes/.test(by(r3, "mise-a-jour").message), JSON.stringify(by(r3, "mise-a-jour")));
    const canned = (o) => res(o.status ?? 0, JSON.stringify({ created: [], updated: [], reconciled: [], conflicts: [], merged: [], retired: [], baseInvalid: [], ...o.report }));
    const rr = await audit(healthy, { scaffold: canned({ report: { reconciled: ["CLAUDE.md"] } }) });
    check("audit : fusion propre en attente (reconciled) -> écart", by(rr, "mise-a-jour")?.statut === "ecart" && /reconciled/.test(by(rr, "mise-a-jour").message));
    const rc = await audit(healthy, { scaffold: canned({ status: 3, report: { conflicts: ["ci.yml"] } }) });
    check("audit : conflit (sortie 3 normale) -> écart, pas erreur de l'outil", by(rc, "mise-a-jour")?.statut === "ecart");
    const rn = await audit(healthy, { scaffold: canned({ report: { merged: [".gitignore"], retired: ["x.md"], manifest: "updated" } }) });
    check("audit : merged, retired et manifest:updated ne sont pas des écarts", by(rn, "mise-a-jour")?.statut === "ok" && /x\.md/.test(by(rn, "mise-a-jour").message));
    const rb = await audit(healthy, { scaffold: canned({ report: { baseInvalid: ["CLAUDE.md"] } }) });
    check("piège : base de fusion altérée -> écart", by(rb, "bases")?.statut === "ecart");
    const re = await audit(healthy, { scaffold: res(1, "", "erreur") });
    check("audit : scaffold en erreur (sortie 1) -> non vérifiable", by(re, "mise-a-jour")?.statut === "non-verifiable");

    // --- hooks git (git réel)
    const hooksProject = (mode, { commitMode = mode, hooksPath = true } = {}) => {
      const d = mkProject(MODS, { git: false });
      const g = (...a) => git(d, ...a);
      g("init", "-q"); g("config", "user.name", "t"); g("config", "user.email", "t@t");
      if (process.platform !== "win32") chmodSync(path.join(d, ".githooks", "pre-push"), mode === "100755" ? 0o755 : 0o644);
      g("add", "-A");
      g("update-index", mode === "100755" ? "--chmod=+x" : "--chmod=-x", ".githooks/pre-push");
      g("commit", "-q", "-m", "x");
      if (commitMode !== mode) g("update-index", commitMode === "100755" ? "--chmod=+x" : "--chmod=-x", ".githooks/pre-push");
      if (hooksPath) g("config", "core.hooksPath", ".githooks");
      return d;
    };
    const h1 = await audit(hooksProject("100644"));
    check("piège : bit exécutable de pre-push non enregistré (100644) -> écart avec la correction", by(h1, "hooks-mode")?.statut === "ecart" && /100644/.test(by(h1, "hooks-mode").message) && /update-index --chmod=\+x/.test(by(h1, "hooks-mode").correction));
    const h2 = await audit(hooksProject("100644", { commitMode: "100755" }));
    check("piège : 100755 dans l'index mais 100644 dans le dernier commit -> écart", by(h2, "hooks-mode")?.statut === "ecart" && /dernier commit/.test(by(h2, "hooks-mode").message), by(h2, "hooks-mode")?.message);
    const h3 = await audit(hooksProject("100755", { hooksPath: false }));
    check("piège : core.hooksPath non réglé -> écart avec la correction", by(h3, "hooks-chemin")?.statut === "ecart" && /git config core.hooksPath \.githooks/.test(by(h3, "hooks-chemin").correction));
    if (process.platform !== "win32") {
      const h4 = mkProject();
      chmodSync(path.join(h4, ".githooks", "pre-push"), 0o644);
      check("piège : pre-push non exécutable sur le disque -> écart", by(await audit(h4), "hooks-mode")?.statut === "ecart");
    }
    const parent = mkdir("pb-audit-parent-");
    spawnSync("git", ["-C", parent, "init", "-q"]);
    const child = path.join(parent, "enfant");
    run(cfg(MODS), [], child);
    check("audit : cible dans un dépôt git parent -> hooks non vérifiables", by(await audit(child), "hooks-git")?.statut === "non-verifiable");
    check("audit : cible sans dépôt git -> hooks non vérifiables", by(await audit(mkProject(MODS, { git: false })), "hooks-git")?.statut === "non-verifiable");

    // --- formulaires et labels
    const setLabels = (dir, value) => {
      const f = path.join(dir, ".github", "ISSUE_TEMPLATE", "bug.yml");
      writeFileSync(f, readFileSync(f, "utf8").replace(/^labels:.*$/m, value));
    };
    check("audit : parseFormLabels lit crochets, bloc YAML et chaîne à virgules", JSON.stringify([parseFormLabels('labels: ["a", "b"]'), parseFormLabels("labels:\n  - a\n  - b\nbody:"), parseFormLabels("labels: a, b"), parseFormLabels("name: x"), parseFormLabels("labels: &x [a]")]) === JSON.stringify([["a", "b"], ["a", "b"], ["a", "b"], undefined, null]));
    const f1 = mkProject();
    setLabels(f1, 'labels: ["inconnu"]');
    const rf1 = await audit(f1);
    check("piège : formulaire qui pose un label absent de labels.json -> écart qui nomme le formulaire", by(rf1, "formulaires-labels")?.statut === "ecart" && /bug\.yml/.test(by(rf1, "formulaires-labels").message) && /inconnu/.test(by(rf1, "formulaires-labels").message));
    const f2 = mkProject();
    setLabels(f2, 'labels: ["BUG"]');
    check("audit : casse des labels ignorée", by(await audit(f2), "formulaires-labels")?.statut === "ok");
    const f3 = mkProject();
    setLabels(f3, "labels:\n  - bug");
    check("audit : liste YAML en bloc lue", by(await audit(f3), "formulaires-labels")?.statut === "ok");
    const f4 = mkProject();
    setLabels(f4, "labels: &ancre [bug]");
    check("audit : format de labels non reconnu -> non vérifiable", by(await audit(f4), "formulaires-labels")?.statut === "non-verifiable");

    // --- versions des CLI et des actions
    const v1 = await audit(healthy, { openspecVersion: "9.9.9" });
    check("piège : OpenSpec du poste différent de la CI -> écart avec les deux versions et la commande", by(v1, "version-openspec")?.statut === "ecart" && /9\.9\.9/.test(by(v1, "version-openspec").message) && /1\.0\.0/.test(by(v1, "version-openspec").message) && /npm install -g @fission-ai\/openspec@/.test(by(v1, "version-openspec").correction));
    const v2 = await audit(healthy, { absent: ["openspec"] });
    check("audit : CLI absente -> pas d'écart sur la version, validate non vérifiable", by(v2, "version-openspec")?.statut === "ok" && by(v2, "openspec-validate")?.statut === "non-verifiable");
    const a1 = mkProject();
    const rel = path.join(a1, ".github", "workflows", "release.yml");
    writeFileSync(rel, readFileSync(rel, "utf8") + "\n      - uses: actions/checkout@" + "0".repeat(40) + "\n");
    const ra1 = await audit(a1);
    check("piège : même action avec un SHA différent entre ci.yml et release.yml -> écart", by(ra1, "actions-epinglees")?.statut === "ecart" && /actions\/checkout/.test(by(ra1, "actions-epinglees").message));
    const a2 = mkProject();
    const mfa = JSON.parse(read(a2, ".bootstrap/manifest.json"));
    mfa.config.actions.checkout.sha = "1".repeat(40);
    writeFileSync(path.join(a2, ".bootstrap", "manifest.json"), JSON.stringify(mfa, null, 2));
    check("audit : SHA d'une action différent du manifeste -> écart", by(await audit(a2), "actions-epinglees")?.statut === "ecart");

    // --- outils du projet, réglages
    const t1 = await audit(healthy, { check: res(1, "violation ARCH-004") });
    check("piège : archgate check échoue (dont rules: incohérent) -> écart qui reprend la sortie", by(t1, "archgate-check")?.statut === "ecart" && /violation ARCH-004/.test(by(t1, "archgate-check").message));
    const t2 = await audit(healthy, { doctor: res(0, JSON.stringify({ root: { path: healthy, healthy: false }, status: [{ severity: "error", code: "no_openspec_root" }] })) });
    check("piège : openspec doctor sort en 0 avec un statut d'erreur -> écart", by(t2, "openspec-doctor")?.statut === "ecart" && /no_openspec_root/.test(by(t2, "openspec-doctor").message));
    const t3 = await audit(healthy, { doctor: res(0, JSON.stringify({ root: { path: path.dirname(healthy), healthy: true }, status: [] })) });
    check("audit : openspec doctor rapporte la racine d'un dépôt parent -> non vérifiable", by(t3, "openspec-doctor")?.statut === "non-verifiable");
    const s1 = mkProject();
    mkdirSync(path.join(s1, ".claude"), { recursive: true });
    writeFileSync(path.join(s1, ".claude", "settings.local.json"), '{ "agent": "archgate:developer" }');
    const rs1 = await audit(s1);
    check("piège : agent archgate:developer imposé par les réglages du projet -> écart avec la correction", by(rs1, "agent-impose")?.statut === "ecart" && /retirer la clé/.test(by(rs1, "agent-impose").correction));
    const s2 = mkProject();
    mkdirSync(path.join(s2, ".archgate", "adrs"), { recursive: true });
    writeFileSync(path.join(s2, ".archgate", "adrs", "GEN-001-exemple.md"), "# exemple");
    check("piège : ADR d'exemple GEN-001 -> écart", by(await audit(s2), "adr-exemple")?.statut === "ecart");

    // --- forge (gh simulé)
    const labelsGh = (names) => (args) => (args.some((a) => /labels\?per_page/.test(a)) ? res(0, names.join("\n")) : res(0, ""));
    const forgeGh = ({ labels = ["bug", "enhancement", "adr", "chore"], protection, rules, other } = {}) => (args) => {
      const route = args.find((a) => a.startsWith("repos/")) ?? "";
      if (/\/labels\?per_page/.test(route)) return res(0, args.some((a) => /@json/.test(a)) ? labels.map((n) => JSON.stringify([n, "ededed", ""])).join("\n") : labels.join("\n"));
      if (/\/branches\/main\/protection$/.test(route)) return protection ?? res(1, "", "gh: Branch not protected (HTTP 404)");
      if (/\/rules\/branches\/main$/.test(route)) return rules ?? res(0, "[]");
      if (/\/actions\/permissions\/workflow$/.test(route)) return res(0, JSON.stringify({ can_approve_pull_request_reviews: true, default_workflow_permissions: "read" }));
      if (other) return other(args, route);
      return res(0, "");
    };
    const forgeOpts = { repo: "o/r", forge: true };
    const prot = (contexts, appId = 15368) => res(0, JSON.stringify({ required_status_checks: { checks: contexts.map((c) => ({ context: c, app_id: appId })) } }));
    const ciOsOf = JSON.parse(read(healthy, ".bootstrap/checks.json")).ciOs;
    const okCtx = ["pr-title", ...ciOsOf.map((o) => `checks (${o})`)];
    const noForge = await audit(healthy, { gh: forgeGh() }, { forge: false });
    check("audit : aucun appel gh quand --forge est absent", !noForge.calls.some((c) => c.startsWith("gh ")));
    const fo1 = await audit(healthy, { gh: forgeGh({ protection: prot(okCtx) }) }, forgeOpts);
    check("audit : forge saine (labels, protection, migrations) -> aucun écart", fo1.summary.ecart === 0 && by(fo1, "forge-labels")?.statut === "ok" && by(fo1, "forge-protection")?.statut === "ok", JSON.stringify(fo1.results.filter((r) => r.statut !== "ok")));
    check("audit : aucune écriture émise vers la forge", fo1.calls.filter((c) => c.startsWith("gh ")).every((c) => !/-X (POST|PUT|PATCH|DELETE)/.test(c)));
    const fo2 = await audit(healthy, { gh: forgeGh({ labels: ["bug", "enhancement"], protection: prot(okCtx) }) }, forgeOpts);
    check("piège : label posé par un formulaire absent du dépôt -> écart avec sync-labels", by(fo2, "forge-labels")?.statut === "ecart" && /sync-labels/.test(by(fo2, "forge-labels").correction));
    const fo3 = await audit(healthy, { gh: forgeGh({ protection: prot(["tests (ubuntu-latest)", "pr-title"]) }) }, forgeOpts);
    check("piège : check exigé par la protection de main inexistant (job renommé) -> écart qui le nomme", by(fo3, "forge-protection")?.statut === "ecart" && /tests \(ubuntu-latest\)/.test(by(fo3, "forge-protection").message));
    const fo4 = await audit(healthy, { gh: forgeGh({ rules: res(0, JSON.stringify([{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "pr-title" }] } }])) }) }, forgeOpts);
    check("audit : protection par ruleset lue", by(fo4, "forge-protection")?.statut === "ok" && /pr-title/.test(by(fo4, "forge-protection").message));
    const fo5 = await audit(healthy, { gh: forgeGh({ protection: res(1, "", "gh: Upgrade to GitHub Pro (HTTP 403)"), rules: res(1, "", "gh: Not Found (HTTP 404)") }) }, forgeOpts);
    check("audit : protection absente ou inaccessible (403, 404) -> non vérifiable", by(fo5, "forge-protection")?.statut === "non-verifiable");
    const fo6 = await audit(healthy, { gh: forgeGh({ protection: prot(["SonarCloud Code Analysis"], 12345) }) }, forgeOpts);
    check("audit : check d'une autre application -> non vérifiable", by(fo6, "forge-protection")?.statut === "non-verifiable");
    const fo7 = await audit(healthy, { gh: forgeGh() }, { forge: true });
    check("audit : --forge sans dépôt (ni --repo ni origin) -> forge non vérifiable", by(fo7, "forge")?.statut === "non-verifiable");
    const fo8 = await audit(healthy, { gh: forgeGh({ protection: prot(okCtx) }) }, forgeOpts);
    check("audit : check d'une matrice lu depuis ciOs (checks (os))", by(fo8, "forge-protection")?.statut === "ok" && /checks \(ubuntu-latest\)/.test(by(fo8, "forge-protection").message));
    const mgm = JSON.parse(read(healthy, ".bootstrap/manifest.json"));
    mgm.migrations = ["0001-actions-pr-permission"];
    const consigned = mkProject();
    writeFileSync(path.join(consigned, ".bootstrap", "manifest.json"), JSON.stringify(mgm, null, 2));
    const driftGh = (args) => (args.some((a) => /\/actions\/permissions\/workflow$/.test(a)) ? res(0, JSON.stringify({ can_approve_pull_request_reviews: false, default_workflow_permissions: "read" })) : forgeGh({ protection: prot(okCtx) })(args));
    const fo9 = await audit(consigned, { gh: driftGh }, forgeOpts);
    check("piège : permission des Actions revenue en arrière après la consignation de 0001 -> écart", by(fo9, "migration-0001-actions-pr-permission")?.statut === "ecart" && /Autoriser les Actions/.test(by(fo9, "migration-0001-actions-pr-permission").message));
    const oldLabelsGh = (args) => {
      const route = args.find((a) => a.startsWith("repos/")) ?? "";
      if (/\/labels\?per_page/.test(route) && args.includes("--jq") && args.includes("--paginate") && args.some((a) => /name, \.color/.test(a))) return res(0, JSON.stringify(["needs-adr", "fbca04", "z"]));
      if (/\/issues$/.test(route)) return res(0, JSON.stringify([7, ["needs-adr"]]));
      return forgeGh({ protection: prot(okCtx) })(args);
    };
    const fo10 = await audit(healthy, { gh: oldLabelsGh }, forgeOpts);
    check("audit : notes d'une migration reprises dans le message (needs-adr utilisé)", /needs-adr/.test(by(fo10, "migration-0002-native-labels")?.message ?? "") && by(fo10, "migration-0002-native-labels")?.statut === "ok", by(fo10, "migration-0002-native-labels")?.message);
    check("audit : isGhWrite refuse POST, DELETE, -f sans -X GET, mutation graphql ; accepte GET, -X GET -f, graphql de lecture", [["api", "-X", "POST", "repos/o/r/labels"], ["api", "-X", "DELETE", "repos/o/r/labels/x"], ["api", "repos/o/r/labels", "-f", "name=x"], ["api", "graphql", "-f", "query=mutation { x }"]].every(isGhWrite) && ![["api", "repos/o/r/labels"], ["api", "-X", "GET", "repos/o/r/issues", "-f", "labels=x"], ["api", "graphql", "-f", "query=query { x }", "-f", "owner=o", "-F", "number=4"]].some(isGhWrite));

    // --- automatisations du Project
    const projModules = [...MODS, "projects"];
    const pp = mkProject(projModules);
    const wf = (nodes) => (args) => (args[1] === "graphql" ? res(0, JSON.stringify({ data: { repositoryOwner: { projectV2: { workflows: { nodes } } } } })) : forgeGh({ protection: prot(okCtx) })(args));
    const allOn = [{ name: "Auto-add to project", enabled: true }, { name: "Item closed", enabled: true }, { name: "Pull request merged", enabled: true }];
    const pr1 = await audit(pp, { gh: wf(allOn) }, { ...forgeOpts, project: "4", owner: "moi" });
    check("audit : automatisations du Project actives -> ok avec la mention de la cible à vérifier à la main", by(pr1, "forge-project")?.statut === "ok" && /à la main/.test(by(pr1, "forge-project").message));
    const gq = pr1.calls.find((c) => c.includes("graphql"));
    check("audit : owner et numéro passés en variables GraphQL, jamais interpolés dans la requête", /-f owner=moi/.test(gq) && /-F number=4/.test(gq) && !/login: ?"?moi/.test(gq.split("query=")[1].split(" -f ")[0]));
    const pr2 = await audit(pp, { gh: wf(allOn.map((w) => (w.name === "Item closed" ? { ...w, enabled: false } : w))) }, { ...forgeOpts, project: "4", owner: "moi" });
    check("piège : automatisation « Item closed » désactivée -> écart", by(pr2, "forge-project")?.statut === "ecart" && /Item closed/.test(by(pr2, "forge-project").message));
    const pr3 = await audit(pp, { gh: wf(allOn) }, forgeOpts);
    check("audit : Project sans numéro ni propriétaire -> non vérifiable", by(pr3, "forge-project")?.statut === "non-verifiable");

    // --- poste de travail
    const home = mkdir("pb-audit-home-");
    mkdirSync(path.join(home, ".claude", "plugins"), { recursive: true });
    const plug = path.join(home, ".claude", "plugins", "cache", "archgate");
    mkdirSync(plug, { recursive: true });
    const pluginsFile = (entries) => writeFileSync(path.join(home, ".claude", "plugins", "installed_plugins.json"), JSON.stringify({ plugins: { "archgate@archgate": entries } }));
    pluginsFile([{ scope: "local", projectPath: "/x", installPath: plug }]);
    writeFileSync(path.join(plug, "settings.json"), '{ "agent": "archgate:developer" }');
    const ghAuth = (scopes) => (args) => (args[0] === "--version" ? res(0, "gh version 2.103.3\n") : args[0] === "auth" ? res(0, scopes === null ? "Logged in" : `Logged in\n  - Token scopes: ${scopes}`) : res(0, ""));
    const ws = (o = {}, extra = {}) => audit(pp, { gh: ghAuth("'gist', 'project', 'repo'"), npmPrefix: o.npmPrefix, ...o }, { workstation: true, home, ...extra });
    const w0 = await ws();
    check("audit : poste sain (plugin imposant un agent seulement en portée locale) -> aucun écart", w0.results.filter((r) => r.id.startsWith("poste")).every((r) => r.statut !== "ecart"), JSON.stringify(w0.results.filter((r) => r.id.startsWith("poste") && r.statut !== "ok")));
    const w1 = await ws({}, { nodeVersion: "18.20.0" });
    check("piège : Node trop ancien -> écart", by(w1, "poste-node")?.statut === "ecart");
    const w2 = await audit(pp, { gh: ghAuth("'gist', 'repo'") }, { workstation: true, home });
    check("piège : scope project manquant sur gh -> écart avec la correction", by(w2, "poste-gh-scope")?.statut === "ecart" && /gh auth refresh -h github\.com -s project/.test(by(w2, "poste-gh-scope").correction));
    const w3 = await audit(pp, { gh: ghAuth(null) }, { workstation: true, home });
    check("audit : jeton sans liste de scopes -> non vérifiable", by(w3, "poste-gh-scope")?.statut === "non-verifiable");
    const w4 = await audit(pp, { absent: ["gh", "npm"] }, { workstation: true, home });
    check("piège : gh absent du PATH -> écart avec la correction ; npm absent -> non vérifiable", by(w4, "poste-gh")?.statut === "ecart" && /rouvrir le terminal/.test(by(w4, "poste-gh").correction) && (process.platform === "win32" || by(w4, "poste-npm")?.statut === "non-verifiable"));
    pluginsFile([{ scope: "user", installPath: plug }]);
    const w5 = await ws();
    check("piège : plugin Archgate en portée utilisateur qui impose un agent -> écart avec la correction locale", by(w5, "poste-archgate-plugin")?.statut === "ecart" && /--scope user/.test(by(w5, "poste-archgate-plugin").correction) && /locale/.test(by(w5, "poste-archgate-plugin").correction));
    check("audit : aucune correction ne contient sudo", [w0, w1, w2, w5, fo1, fo2, fo3, h1].every((r) => r.results.every((x) => !/\bsudo\b/.test(x.correction ?? ""))));
    if (process.platform !== "win32") {
      const ro = mkdir("pb-audit-ro-");
      chmodSync(ro, 0o555);
      const w6 = await audit(pp, { gh: ghAuth("'project'"), npmPrefix: ro }, { workstation: true, home });
      chmodSync(ro, 0o755);
      check("piège : préfixe npm non inscriptible -> écart avec --prefix ~/.local, sans sudo", process.getuid?.() === 0 || (by(w6, "poste-npm")?.statut === "ecart" && /--prefix ~\/\.local/.test(by(w6, "poste-npm").correction) && !/sudo/.test(by(w6, "poste-npm").correction)));
    }

    // --- codes de sortie réels du script (processus, CLI et gh réels, sans réseau)
    const auditScript = path.join(root, "skills", "project-bootstrap", "scripts", "audit.mjs");
    const proc = (args) => spawnSync(process.execPath, [auditScript, ...args], { encoding: "utf8" });
    const light = mkProject(["claude", "github", "githooks"]);
    const px0 = proc(["--target", light]);
    check("audit : processus -> projet sain, code 0 et résumé lisible", px0.status === 0 && /Résumé : \d+ ok, 0 écart/.test(px0.stdout), px0.stdout + px0.stderr);
    git(light, "config", "--unset", "core.hooksPath");
    const px1 = proc(["--target", light]);
    check("audit : processus -> un écart, code 1 et la correction affichée", px1.status === 1 && /git config core\.hooksPath \.githooks/.test(px1.stdout), px1.stdout + px1.stderr);
    const pxj = proc(["--target", light, "--json"]);
    check("audit : processus --json -> objet JSON avec le compte par statut", (() => { try { const j = JSON.parse(pxj.stdout); return j.summary.ecart === 1 && Array.isArray(j.results); } catch { return false; } })());
    const px2 = proc([]);
    check("audit : processus -> erreur d'usage, code 2", px2.status === 2 && /--target est obligatoire/.test(px2.stderr), px2.stderr);
    check("audit : processus -> --repo invalide, code 2 sans rien lancer", proc(["--target", light, "--forge", "--repo", "a/../b"]).status === 2);

    // --- documentation du skill (exigence « Intégration au skill »)
    const skillText = readFileSync(path.join(root, "skills", "project-bootstrap", "SKILL.md"), "utf8");
    const phase3 = skillText.slice(skillText.indexOf("## Phase 3"), skillText.indexOf("## Phase 4"));
    const phase5 = skillText.slice(skillText.indexOf("## Phase 5"));
    check("skill : l'audit est lancé en fin de phase 3, avec l'accord de l'utilisateur pour --forge et la mise en garde sur la confiance", /audit\.mjs --target/.test(phase3) && /--forge/.test(phase3) && /accord de l'utilisateur/.test(phase3) && /dépôts de confiance/.test(phase3));
    check("skill : l'audit est lancé après une mise à jour (phase 5)", /audit\.mjs --target/.test(phase5));
    check("skill : l'audit est dans la vérification de bout en bout", /audit\.mjs --target/.test(readFileSync(path.join(root, "skills", "project-bootstrap", "references", "verification.md"), "utf8")));

    // --- chaque piège de la table du design est détecté au moins une fois par un test ci-dessus
    const table = ["hooks-mode", "hooks-chemin", "archgate-check", "agent-impose", "adr-exemple", "version-openspec", "version-plugin", "mise-a-jour", "bases", "formulaires-labels", "forge-labels", "forge-protection", "migration-0001-actions-pr-permission", "forge-project", "poste-npm", "poste-archgate-plugin", "poste-gh-scope", "actions-epinglees", "openspec-doctor"];
    const missingIds = table.filter((id) => !detected.has(id) && !(process.platform === "win32" && id === "poste-npm"));
    check("audit : la table piège -> contrôle est couverte (chaque contrôle a détecté un écart)", missingIds.length === 0, missingIds.join(", "));
  }

  // action de préparation propre au projet, appelée par ci.yml (#82)
  {
    const ACTION = ".github/actions/project-setup/action.yml";
    const o1 = plugin("9.8.0");
    const o2 = plugin("9.9.0", (skill) => {
      const f = path.join(skill, "assets", "templates", ...ACTION.split("/"));
      writeFileSync(f, readFileSync(f, "utf8") + "# modèle v9.9\n");
    });
    const out = path.join(mkdir("pb-setup-"), "repo");
    runScript(o1.script, ["--config", withConfig(cfg(["claude", "github"])), "--target", out]);
    const action = read(out, ACTION);
    check("project-setup : action composite créée, étape bash, consignée kept", /using:\s*composite/.test(action) && /shell:\s*bash/.test(action) && JSON.parse(read(out, ".bootstrap/manifest.json")).files[ACTION].status === "kept");
    const ci = read(out, ".github/workflows/ci.yml");
    const at = (needle) => ci.indexOf(needle);
    check("project-setup : ci.yml l'appelle après le checkout et avant les commandes du projet", at("uses: ./.github/actions/project-setup") > at("actions/checkout@") && at("uses: ./.github/actions/project-setup") < at("run-checks.mjs\n"), ci);
    check("project-setup : noms des jobs inchangés (plan, checks, pr-title)", /^ {2}plan:/m.test(ci) && /^ {2}checks:/m.test(ci) && /^ {2}pr-title:/m.test(ci));
    check("project-setup : docs/workflow.md désigne l'action", /project-setup/.test(read(out, "docs/workflow.md")));
    const custom = action.replace("run: echo", "run: echo installe-mes-outils #");
    writeFileSync(path.join(out, ...ACTION.split("/")), custom);
    const upd = runScript(o2.script, ["--update", "--target", out]);
    check("project-setup : personnalisée, jamais touchée ni signalée après changement du modèle", upd.res.status === 0 && read(out, ACTION) === custom && !upd.report.conflicts.includes(ACTION) && !upd.report.updated.includes(ACTION) && upd.report.kept.includes(ACTION), JSON.stringify(upd.report));
    check(
      "project-setup : modèle valide (name, description, composite, shell sur chaque étape run)",
      /^name:\s*\S+/m.test(action) && /^description:\s*\S+/m.test(action) && /using:\s*composite/.test(action) && (action.match(/^\s+run:/gm) ?? []).length === (action.match(/^\s+shell:\s*bash/gm) ?? []).length && (action.match(/^\s+- name:/gm) ?? []).length === 1,
    );
    rmSync(path.join(out, ...ACTION.split("/")));
    check("project-setup : recréée si le projet l'a supprimée", runScript(o2.script, ["--update", "--target", out]).report.created.includes(ACTION) && exists(out, ACTION));

    // migration d'un projet généré avec l'ancien modèle (sans action, commentaire d'installation dans ci.yml)
    const CI = ".github/workflows/ci.yml";
    const oldComment = "      # Installer ici la chaîne d'outils de la stack choisie (langage, dépendances) avant les commandes du projet\n";
    const legacy = plugin("9.7.0", (skill) => {
      const f = path.join(skill, "assets", "templates", ...CI.split("/"));
      writeFileSync(f, readFileSync(f, "utf8").replace(/ {6}# Chaîne d'outils[^\n]*\n {6}- name: Chaîne d'outils du projet[^\n]*\n {8}uses: \.\/\.github\/actions\/project-setup\n/, oldComment));
      const mj = path.join(skill, "assets", "modules.json");
      const catalog = JSON.parse(readFileSync(mj, "utf8"));
      catalog.files = catalog.files.filter((e) => e.path !== ACTION);
      writeFileSync(mj, JSON.stringify(catalog));
    });
    const old = () => {
      const dir = path.join(mkdir("pb-setup-old-"), "repo");
      runScript(legacy.script, ["--config", withConfig(cfg(["claude", "github"])), "--target", dir]);
      return dir;
    };
    check("migration : l'ancien modèle n'a ni action ni appel", (() => { const d = old(); return !exists(d, ACTION) && !read(d, CI).includes("project-setup") && read(d, CI).includes(oldComment); })());
    const intact = old();
    const mig1 = runScript(o2.script, ["--update", "--target", intact]);
    check("migration : ci.yml resté tel que généré -> updated, action créée kept, code 0", mig1.res.status === 0 && mig1.report.updated.includes(CI) && mig1.report.created.includes(ACTION) && JSON.parse(read(intact, ".bootstrap/manifest.json")).files[ACTION].status === "kept" && read(intact, CI).includes("uses: ./.github/actions/project-setup"), JSON.stringify(mig1.report));
    const mig4 = runScript(o2.script, ["--update", "--target", intact]);
    check("migration : deuxième mise à jour sans effet", mig4.res.status === 0 && mig4.report.created.length === 0 && mig4.report.updated.length === 0 && mig4.report.reconciled.length === 0 && mig4.report.conflicts.length === 0 && mig4.report.manifest === undefined, JSON.stringify(mig4.report));
    const far = old();
    writeFileSync(path.join(far, ...CI.split("/")), read(far, CI) + "# ajout du projet en fin de fichier\n");
    const mig2 = runScript(o2.script, ["--update", "--target", far]);
    check("migration : ci.yml modifié loin -> reconciled, action créée", mig2.res.status === 0 && mig2.report.reconciled.includes(CI) && mig2.report.created.includes(ACTION) && read(far, CI).includes("ajout du projet") && read(far, CI).includes("uses: ./.github/actions/project-setup"), JSON.stringify(mig2.report));
    const near = old();
    const nearCi = read(near, CI).replace(oldComment, "      - name: Installer mes outils\n        run: echo mes-outils\n");
    writeFileSync(path.join(near, ...CI.split("/")), nearCi);
    const mig3 = runScript(o2.script, ["--update", "--target", near]);
    check("migration : ci.yml modifié à l'emplacement remplacé -> conflit, intact, action créée, code 3", mig3.res.status === 3 && mig3.report.conflicts.includes(CI) && read(near, CI) === nearCi && mig3.report.created.includes(ACTION), JSON.stringify(mig3.report));
    const sans = path.join(mkdir("pb-setup2-"), "repo");
    runScript(o1.script, ["--config", withConfig(cfg(["claude"])), "--target", sans]);
    check("project-setup : absente sans le module github", !exists(sans, ACTION));
  }

  // adoption d'un projet sans manifeste
  const adopted = path.join(mkdir("pb-adopt-"), "repo");
  mkdirSync(adopted, { recursive: true });
  writeFileSync(path.join(adopted, "CLAUDE.md"), "# Existant\n");
  const ad = runScript(v1.script, ["--config", withConfig(cfg(["claude"])), "--target", adopted, "--adopt"]);
  const mf = JSON.parse(read(adopted, ".bootstrap/manifest.json"));
  check("adoption : fichier existant repris tel quel et consigné", ad.res.status === 0 && ad.report.adopted.includes("CLAUDE.md") && read(adopted, "CLAUDE.md") === "# Existant\n" && mf.files["CLAUDE.md"].status === "adopted");
  const ad2 = runScript(v1.script, ["--update", "--target", adopted]);
  check("adoption : relance sans effet", ad2.res.status === 0 && ad2.report.created.length === 0 && ad2.report.manifest === undefined && ad2.report.customized.includes("CLAUDE.md"));

  // migrations hors fichiers : 0001 seule (dossier dédié), 0002 plus bas
  const dir0001 = mkdir("pb-mig-dir-");
  cpSync(path.join(root, "skills", "project-bootstrap", "migrations", "0001-actions-pr-permission.mjs"), path.join(dir0001, "0001-actions-pr-permission.mjs"));
  const mig = path.join(mkdir("pb-mig-"), "repo");
  run(cfg(["github", "release"]), [], mig);
  const calls = [];
  const fakeGh = (state) => (args) => {
    calls.push(args.join(" "));
    return args.includes("PUT") ? "" : JSON.stringify({ can_approve_pull_request_reviews: state, default_workflow_permissions: "read" });
  };
  const sim = await runMigrations({ dir: dir0001, target: mig, repo: "o/r", gh: fakeGh(false) });
  check("migration : simulation proposée sans rien modifier", sim.length === 1 && sim[0].id === "0001-actions-pr-permission" && sim[0].actions.length === 1 && sim[0].applied === false && !calls.some((c) => c.includes("PUT")));
  const ok = await runMigrations({ dir: dir0001, target: mig, repo: "o/r", gh: fakeGh(true), apply: true });
  check("migration : réglage déjà conforme, rien à faire", ok.length === 1 && ok[0].actions.length === 0 && ok[0].applied === false && !calls.some((c) => c.includes("PUT")));
  const applied = await runMigrations({ dir: dir0001, target: mig, repo: "o/r", gh: fakeGh(false), apply: true });
  check("migration : appliquée et consignée dans le manifeste", applied[0].applied === true && calls.some((c) => c.includes("PUT") && c.includes("can_approve_pull_request_reviews=true")) && JSON.parse(read(mig, ".bootstrap/manifest.json")).migrations.includes("0001-actions-pr-permission"));
  check("migration : déjà consignée, non rejouée", (await runMigrations({ dir: dir0001, target: mig, repo: "o/r", gh: fakeGh(false) })).length === 0);
  const noRelease = path.join(mkdir("pb-mig2-"), "repo");
  run(cfg(["github"]), [], noRelease);
  check("migration : ignorée si le module concerné est absent", (await runMigrations({ dir: dir0001, target: noRelease, repo: "o/r", gh: fakeGh(false) })).length === 0);
  let threw = false;
  try { await runMigrations({ dir: dir0001, target: path.join(mkdir("pb-mig3-"), "x"), repo: "o/r", gh: fakeGh(false) }); } catch { threw = true; }
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
