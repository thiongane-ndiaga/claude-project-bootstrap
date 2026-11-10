#!/usr/bin/env node
// Tests de scaffold.mjs sur plusieurs combinaisons de modules. Usage : node tests/scaffold.test.mjs
import "./tmp-root.mjs"; // dossier temporaire propre à l'exécution, supprimé à la sortie
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, realpathSync, statSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../skills/project-bootstrap/scripts/migrate.mjs";
import { PSEUDO_MODULES, loadCatalog, templatePath } from "../skills/project-bootstrap/scripts/catalog.mjs";
import { syncLabels } from "../skills/project-bootstrap/assets/modules/github/templates/scripts/sync-labels.mjs";
import { formatReport, isGhWrite, parseArgs, parseFormLabels, realExec, runAudit } from "../skills/project-bootstrap/scripts/audit.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const scaffold = path.join(root, "skills", "project-bootstrap", "scripts", "scaffold.mjs");
const modulesRoot = path.join(root, "skills", "project-bootstrap", "assets", "modules");
const manifest = loadCatalog(modulesRoot);
// modèle d'un fichier généré, retrouvé dans le module qui le déclare (dans le plugin ou dans une copie)
const templateIn = (skillDir, rel, lang = "fr") => {
  const entry = loadCatalog(path.join(skillDir, "assets", "modules")).files.find((f) => f.path === rel);
  if (!entry) throw new Error(`aucun module ne déclare ${rel}`);
  return templatePath(entry, lang);
};
const realSkill = path.join(root, "skills", "project-bootstrap");
const tplFile = (rel, lang = "fr") => templateIn(realSkill, rel, lang);
// retire un fichier du catalogue d'une copie du plugin (entrée du descripteur et modèle)
const dropFile = (skillDir, rel) => {
  for (const name of readdirSync(path.join(skillDir, "assets", "modules"))) {
    const mj = path.join(skillDir, "assets", "modules", name, "module.json");
    const data = JSON.parse(readFileSync(mj, "utf8"));
    if (!(data.files ?? []).some((f) => f.path === rel)) continue;
    data.files = data.files.filter((f) => f.path !== rel);
    writeFileSync(mj, JSON.stringify(data, null, 2));
    for (const tree of ["templates", "templates.en"]) rmSync(path.join(skillDir, "assets", "modules", name, tree, ...rel.split("/")), { force: true });
    return;
  }
  throw new Error(`aucun module ne déclare ${rel}`);
};
// ajoute un fichier (descripteur et modèle) à un module d'une copie du plugin
const addFile = (skillDir, moduleName, rel, content) => {
  const dir = path.join(skillDir, "assets", "modules", moduleName);
  const mj = path.join(dir, "module.json");
  const data = JSON.parse(readFileSync(mj, "utf8"));
  data.files = [...(data.files ?? []), { path: rel }];
  writeFileSync(mj, JSON.stringify(data, null, 2));
  mkdirSync(path.dirname(path.join(dir, "templates", ...rel.split("/"))), { recursive: true });
  writeFileSync(path.join(dir, "templates", ...rel.split("/")), content);
};
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
  const active = new Set(["core", ...c.modules, ...(c.modules.includes("agent-profiles") ? [] : ["legacy-agents"])]);
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

// module dependabot (opt-in)
{
  const without = run({ ...base, visibility: "private", modules: ["github"] });
  check("dependabot absent : pas de .github/dependabot.yml", without.res.status === 0 && !walk(without.out).some((f) => f.endsWith("dependabot.yml")));
  const withIt = run({ ...base, visibility: "private", modules: ["github", "dependabot"] });
  const file = path.join(withIt.out, ".github", "dependabot.yml");
  const text = withIt.res.status === 0 ? readFileSync(file, "utf8") : "";
  check("dependabot : fichier généré et consigné au manifeste", withIt.res.status === 0 && Object.keys(JSON.parse(readFileSync(path.join(withIt.out, ".bootstrap", "manifest.json"), "utf8")).files).includes(".github/dependabot.yml"));
  check("dependabot : contenu attendu", ['package-ecosystem: "github-actions"', '- "/"', '- "/.github/actions/*"', "default-days: 14", 'prefix: "ci"', 'include: "scope"', '- "chore"', '- "*"'].every((s) => text.includes(s)), text);
  check("dependabot : aucun résidu de modèle", !/\{\{|@@/.test(text));
  check("dependabot sans github refusé", run({ ...base, visibility: "private", modules: ["dependabot"] }).res.status === 1);
  const titleCheck = (title) => spawnSync(process.execPath, [path.join(withIt.out, "scripts", "check-pr-title.mjs")], { env: { ...process.env, PR_TITLE: title }, encoding: "utf8" }).status;
  check("dependabot : titre ci(deps) accepté par check-pr-title", titleCheck("ci(deps): bump the actions group with 2 updates") === 0);
  check("dependabot : titre groupé réel accepté par check-pr-title", titleCheck("ci(deps): bump the actions group across 1 directory with 2 updates") === 0);

  // exception de traçabilité présente avec le module, absente sans
  const trace = [".claude/agents/traceability-checker.md", "docs/workflow.md", "docs/architecture/adrs/ARCH-005-conventions-de-branches-commits-et-versionnement.md"];
  const full = run({ ...base, visibility: "private", modules: ["claude", "github", "archgate", "openspec", "dependabot"] });
  const plain = run({ ...base, visibility: "private", modules: ["claude", "github", "archgate", "openspec"] });
  check("dependabot : exception de traçabilité dans workflow.md, ARCH-005 et traceability-checker", trace.every((f) => /dependabot\//.test(readFileSync(path.join(full.out, f), "utf8"))));
  check("sans dependabot : aucun de ces fichiers ne mentionne Dependabot", trace.every((f) => !/dependabot/i.test(readFileSync(path.join(plain.out, f), "utf8"))));

  // ajout du module à un projet existant : seul dependabot.yml est créé
  const added = run({ ...base, visibility: "private", modules: ["github", "dependabot"] }, [], without.out);
  check("ajout de dependabot à un projet existant : seul .github/dependabot.yml créé", added.res.status === 0 && added.report.created.length === 1 && added.report.created[0] === ".github/dependabot.yml" && added.report.conflicts.length === 0, JSON.stringify(added.report));
}

// modes d'installation des CLI (cliInstall)
{
  const mods = ["claude", "github", "openspec", "archgate", "githooks"];
  const gen = (extra, modules = mods, vis = "private") => run({ ...base, visibility: vis, modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const tree = (r) => Object.fromEntries(walk(r.out).filter((f) => !f.includes(`${path.sep}.bootstrap${path.sep}base`)).map((f) => [path.relative(r.out, f).split(path.sep).join("/"), readFileSync(f, "utf8")]));

  const bad = gen({ cliInstall: "docker" });
  check("cliInstall invalide refusé (code 1, valeurs permises nommées)", bad.res.status === 1 && /global, user, local/.test(bad.res.stderr), bad.res.stderr);
  const noCli = gen({ cliInstall: "local" }, ["claude", "github"]);
  check("cliInstall local sans openspec ni archgate refusé (code 1)", noCli.res.status === 1 && /openspec ou archgate/.test(noCli.res.stderr));

  const glob = gen({});
  const globExplicit = gen({ cliInstall: "global" });
  const tg = tree(glob);
  const te = tree(globExplicit);
  const man = (r) => JSON.parse(txt(r, ".bootstrap/manifest.json"));
  check("cliInstall absent : clé non écrite au manifeste, sortie identique au mode global explicite", man(glob).config.cliInstall === undefined && man(globExplicit).config.cliInstall === "global" && Object.keys(tg).every((f) => f === ".bootstrap/manifest.json" || tg[f] === te[f]));

  const user = gen({ cliInstall: "user" });
  const tu = tree(user);
  const differ = Object.keys({ ...tg, ...tu }).filter((f) => tg[f] !== tu[f]).sort();
  check("mode user : seuls docs/workflow.md et le manifeste diffèrent du mode global", differ.join(",") === ".bootstrap/manifest.json,docs/workflow.md", differ.join(","));
  check("mode user : workflow.md avec --prefix ~/.local, note Windows, sans sudo", /npm install -g --prefix ~\/\.local @fission-ai\/openspec@1\.0\.0/.test(txt(user, "docs/workflow.md")) && /équivaut au mode global/.test(txt(user, "docs/workflow.md")) && !/sudo`?\s*[a-z]/i.test(txt(user, "docs/workflow.md").replace(/Pas de `sudo`/g, "")));
  check("mode user : ci.yml garde npm install -g, aucun package.json", /npm install -g/.test(txt(user, ".github/workflows/ci.yml")) && !existsSync(path.join(user.out, "package.json")));

  for (const [label, vis] of [["privé", "private"], ["public", "public"]]) {
    const loc = gen({ cliInstall: "local" }, mods, vis);
    check(`mode local (${label}) : génération réussie`, loc.res.status === 0, loc.res.stderr);
    const pkg = JSON.parse(txt(loc, "package.json"));
    check(`mode local (${label}) : package.json privé, sans name, versions exactes, script claude`, pkg.private === true && pkg.name === undefined && pkg.scripts.claude === "claude" && pkg.devDependencies["@fission-ai/openspec"] === "1.0.0" && pkg.devDependencies.archgate === "0.1.0");
    const ciText = txt(loc, ".github/workflows/ci.yml");
    check(`mode local (${label}) : ci.yml avec npm ci, cache npm, GITHUB_PATH (bash), sans npm install -g ni version en env`, /npm ci/.test(ciText) && /cache: npm/.test(ciText) && /GITHUB_PATH/.test(ciText) && /shell: bash\n\s+run: echo "\$GITHUB_WORKSPACE\/node_modules\/\.bin"/.test(ciText) && !/npm install -g/.test(ciText) && !/OPENSPEC_VERSION|ARCHGATE_VERSION/.test(ciText) && /OPENSPEC_TELEMETRY: "0"/.test(ciText), ciText);
    check(`mode local (${label}) : .gitignore avec node_modules/`, /^node_modules\/$/m.test(txt(loc, ".gitignore")));
    const hook = txt(loc, ".claude/hooks/quality-gate.mjs");
    check(`mode local (${label}) : quality-gate avec node_modules/.bin, path.delimiter, clé PATH insensible à la casse, chemin depuis import.meta.url`, /node_modules/.test(hook) && /path\.delimiter/.test(hook) && /toUpperCase\(\) === "PATH"/.test(hook) && /import\.meta\.url/.test(hook));
    const wf = txt(loc, "docs/workflow.md");
    check(`mode local (${label}) : workflow.md avec npm ci et npm run claude, sans npm install -g`, /npm ci/.test(wf) && /npm run claude/.test(wf) && /npx/.test(wf) && !/npm install -g/.test(wf));
    check(`mode local (${label}) : package.json consigné au manifeste, relance idempotente`, Boolean(man(loc).files["package.json"]) && run({ ...base, visibility: vis, modules: mods, cliInstall: "local" }, [], loc.out).report.created.length === 0);
  }
  {
    // hook SessionStart du mode local (#104)
    const loc = gen({ cliInstall: "local" }, mods);
    const sess = JSON.parse(txt(loc, ".claude/settings.json")).hooks?.SessionStart;
    check("mode local : settings.json déclare le hook SessionStart session-path.mjs", sess?.[0]?.hooks?.[0]?.command === "node" && /session-path\.mjs$/.test(sess[0].hooks[0].args[0]), JSON.stringify(sess));
    check("mode local : session-path.mjs généré, absent en modes global et user", existsSync(path.join(loc.out, ".claude/hooks/session-path.mjs")) && !existsSync(path.join(glob.out, ".claude/hooks/session-path.mjs")) && !existsSync(path.join(user.out, ".claude/hooks/session-path.mjs")) && !JSON.parse(txt(glob, ".claude/settings.json")).hooks.SessionStart && !JSON.parse(txt(user, ".claude/settings.json")).hooks.SessionStart);
    // exécution : projet dont le chemin contient une espace et une apostrophe
    const proj = path.join(mkdtempSync(path.join(tmpdir(), "pb-sess-")), "it's here");
    mkdirSync(path.join(proj, ".claude", "hooks"), { recursive: true });
    cpSync(path.join(loc.out, ".claude/hooks/session-path.mjs"), path.join(proj, ".claude/hooks/session-path.mjs"));
    const envFile = path.join(proj, "env.sh");
    writeFileSync(envFile, "export A=1\n");
    const hookRun = (env) => spawnSync(process.execPath, [path.join(proj, ".claude/hooks/session-path.mjs")], { encoding: "utf8", env });
    const r1 = hookRun({ ...process.env, CLAUDE_ENV_FILE: envFile });
    const written = readFileSync(envFile, "utf8");
    check("session-path.mjs : code 0, ajoute une ligne export PATH sans écraser l'existant", r1.status === 0 && written.startsWith("export A=1\n") && /^export PATH='.*node_modules\/\.bin':"\$PATH"$/m.test(written) && !/\\/.test(written.split("\n")[1].replace(/'\\''/g, "")), written);
    check("session-path.mjs : l'apostrophe du chemin est échappée ('\\'')", /it'\\''s here/.test(written), written);
    const noVar = { ...process.env };
    delete noVar.CLAUDE_ENV_FILE;
    const r2 = hookRun(noVar);
    check("session-path.mjs : sans CLAUDE_ENV_FILE, code 0 et rien d'écrit", r2.status === 0 && r2.stdout === "" && readFileSync(envFile, "utf8") === written);
    const r3 = hookRun({ ...process.env, CLAUDE_ENV_FILE: path.join(proj, "absent", "env.sh") });
    check("session-path.mjs : écriture impossible, code 0", r3.status === 0, r3.stderr);
    const posix = (p) => (process.platform === "win32" ? p.replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase()).replace(/\\/g, "/") : p);
    const en = gen({ cliInstall: "local", docLanguage: "en" }, mods);
    check("mode local en anglais : session-path.mjs généré, commentaires anglais", /SessionStart hook/.test(txt(en, ".claude/hooks/session-path.mjs")) && !/[àâçéèêëîïôùûü]/i.test(txt(en, ".claude/hooks/session-path.mjs")));
    rmSync(path.join(loc.out, ".claude/hooks/session-path.mjs"));
    const again = run({ ...base, visibility: "private", modules: mods, cliInstall: "local" }, ["--update"], loc.out);
    check("--update d'un projet local sans le hook : session-path.mjs recréé, un seul SessionStart", existsSync(path.join(loc.out, ".claude/hooks/session-path.mjs")) && JSON.parse(txt(loc, ".claude/settings.json")).hooks.SessionStart.length === 1, JSON.stringify(again.report ?? again));
    const sh = spawnSync("bash", ["-c", '. "$F"; printf %s "$PATH"'], { encoding: "utf8", env: { ...process.env, F: posix(envFile) } });
    if (sh.error) console.log("skip session-path.mjs : bash indisponible pour relire la ligne");
    else check("session-path.mjs : la ligne écrite est du Bash valide qui met le dossier en tête du PATH", sh.status === 0 && sh.stdout.startsWith(posix(path.join(realpathSync(proj), "node_modules", ".bin")) + ":"), sh.stdout.slice(0, 200) + sh.stderr);
  }
  check("mode global : hook sans node_modules, workflow.md et ci.yml avec npm install -g", !/node_modules/.test(txt(glob, ".claude/hooks/quality-gate.mjs")) && /npm install -g/.test(txt(glob, ".github/workflows/ci.yml")) && !existsSync(path.join(glob.out, "package.json")));

  const only = gen({ cliInstall: "local" }, ["claude", "github", "archgate"]);
  const pkgOnly = JSON.parse(txt(only, "package.json"));
  const ciOnly = txt(only, ".github/workflows/ci.yml");
  check("mode local avec archgate seul : devDependencies d'archgate seulement, ci.yml sans bloc env", Object.keys(pkgOnly.devDependencies).join() === "archgate" && !/^env:/m.test(ciOnly) && !/OPENSPEC/.test(ciOnly), ciOnly.slice(0, 300));
  const openOnly = gen({ cliInstall: "local" }, ["claude", "github", "openspec"]);
  check("mode local avec openspec seul : env avec OPENSPEC_TELEMETRY seulement", /^env:\n\s+OPENSPEC_TELEMETRY: "0"\n/m.test(txt(openOnly, ".github/workflows/ci.yml")) && Object.keys(JSON.parse(txt(openOnly, "package.json")).devDependencies).join() === "@fission-ai/openspec");

  // package.json existant : conservé, signalé
  const pre = mkdtempSync(path.join(tmpdir(), "pb-pkg-"));
  writeFileSync(path.join(pre, "package.json"), '{"name":"app","version":"1.0.0"}\n');
  const kept = run({ ...base, visibility: "private", modules: mods, cliInstall: "local" }, [], pre);
  check("mode local : package.json existant conservé et signalé (kept)", kept.res.status === 0 && kept.report.kept.includes("package.json") && readFileSync(path.join(pre, "package.json"), "utf8") === '{"name":"app","version":"1.0.0"}\n');
  const detect = spawnSync(process.execPath, [scaffold, "--detect", "--target", pre], { encoding: "utf8" });
  check("--detect expose packageJson", JSON.parse(detect.stdout).packageJson === true);

  // mise à jour : le mode est rejoué depuis le manifeste
  const upd = spawnSync(process.execPath, [scaffold, "--update", "--target", pre], { encoding: "utf8" });
  check("--update rejoue le mode local du manifeste (aucun fichier créé, aucun conflit)", upd.status === 0 && JSON.parse(upd.stdout).created.length === 0 && JSON.parse(upd.stdout).conflicts.length === 0, upd.stdout + upd.stderr);

  // validation du catalogue : `when` ne cite que des modules ou pseudo-modules connus
  const catDir = mkdtempSync(path.join(tmpdir(), "pb-cat-"));
  cpSync(modulesRoot, catDir, { recursive: true });
  const claudeJson = path.join(catDir, "claude", "module.json");
  const claude = JSON.parse(readFileSync(claudeJson, "utf8"));
  claude.files[0].when = ["inconnu"];
  writeFileSync(claudeJson, JSON.stringify(claude));
  const badCat = run({ ...base, visibility: "private", modules: [] }, ["--catalog", catDir]);
  check("catalogue : `when` avec un module inconnu refusé (code 1, descripteur nommé)", badCat.res.status === 1 && /module inconnu inconnu/.test(badCat.res.stderr) && /claude[/\\]module\.json/.test(badCat.res.stderr), badCat.res.stderr);
}

// langue de la documentation (docLanguage) : génération, héritage à la mise à jour
{
  const mods = ["claude", "github", "openspec", "archgate", "arc42", "release", "githooks"];
  const noFr = { docLanguageName: undefined, actionsCreditNote: undefined };
  const gen = (extra, vis = "private", modules = mods) => run({ ...base, ...noFr, visibility: vis, modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const tree = (r) => Object.fromEntries(walk(r.out).filter((f) => !f.includes(`${path.sep}.bootstrap${path.sep}base`)).map((f) => [path.relative(r.out, f).split(path.sep).join("/"), readFileSync(f, "utf8")]));
  const man = (r) => JSON.parse(txt(r, ".bootstrap/manifest.json"));

  const fr = gen({});
  const frExplicit = gen({ docLanguage: "fr" });
  check("docLanguage absent : français, clé non écrite au manifeste, sortie identique à fr explicite", man(fr).config.docLanguage === undefined && man(frExplicit).config.docLanguage === "fr" && Object.entries(tree(fr)).every(([f, c]) => f === ".bootstrap/manifest.json" || tree(frExplicit)[f] === c));
  const bad = gen({ docLanguage: "de" });
  check("docLanguage indisponible refusé (code 1, langues disponibles nommées)", bad.res.status === 1 && /de.*indisponible/.test(bad.res.stderr) && /en, fr/.test(bad.res.stderr), bad.res.stderr);

  const en = gen({ docLanguage: "en" });
  check("docLanguage en : génération réussie, consigné au manifeste", en.res.status === 0 && man(en).config.docLanguage === "en", en.res.stderr);
  check("anglais : CLAUDE.md, workflow, ADR et arc42 en anglais, libellé de langue English", /English: identifiers/.test(txt(en, "CLAUDE.md")) && /^- English: documentation/m.test(txt(en, "CLAUDE.md")) && /Repository workflow/.test(txt(en, "docs/workflow.md")) && /^## Status$/m.test(txt(en, "docs/architecture/adrs/ARCH-003-emplacement-et-format-des-adr.md")) && /^# 1\. Introduction and goals/.test(txt(en, "docs/architecture/arc42/01-introduction-et-objectifs.md")));
  const adr4 = txt(en, "docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md");
  check("anglais : paramètres localisés (libellé private, systèmes de la CI, crédit Actions)", /The repository is private\./.test(adr4) && /`ubuntu-latest` only/.test(adr4) && /see the Actions billing page/.test(adr4), adr4.slice(0, 600));
  check("anglais : aucun résidu de français dans la sortie générée (lettres accentuées)", !Object.entries(tree(en)).some(([f, c]) => f !== ".bootstrap/manifest.json" && /[àâäéèêëîïôöùûüç]/i.test(c) && !/^docs\/architecture\/adrs\/.*\.md$/.test(f + "x")), Object.entries(tree(en)).filter(([f, c]) => f !== ".bootstrap/manifest.json" && /[àâäéèêëîïôöùûüç]/i.test(c)).map(([f]) => f).join(", "));
  const enFiles = Object.keys(tree(en)).sort().join();
  check("même arborescence en français et en anglais", enFiles === Object.keys(tree(fr)).sort().join());
  const again = gen({ docLanguage: "en" });
  check("anglais : deux générations identiques", Object.entries(tree(en)).every(([f, c]) => tree(again)[f] === c));
  const full = gen({ docLanguage: "en" }, "public", allModules);
  const fullFr = gen({}, "public", allModules);
  check("anglais, tous les modules, public : mêmes chemins que le français, génération réussie", full.res.status === 0 && Object.keys(tree(full)).sort().join() === Object.keys(tree(fullFr)).sort().join());
  const named = gen({ docLanguage: "en", docLanguageName: "English (US)", actionsCreditNote: "12 USD" });
  check("docLanguageName et actionsCreditNote explicites l'emportent sur les défauts de la langue", /^- English \(US\): documentation/m.test(txt(named, "CLAUDE.md")) && /12 USD/.test(txt(named, "docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md")));

  // mise à jour : la langue (et le mode) du manifeste sont rejoués ; une configuration sans la clé ne les change pas
  const upd = spawnSync(process.execPath, [scaffold, "--update", "--target", en.out], { encoding: "utf8" });
  check("--update rejoue la langue du manifeste (aucun fichier créé, mis à jour ni en conflit)", upd.status === 0 && JSON.parse(upd.stdout).created.length === 0 && JSON.parse(upd.stdout).updated.length === 0 && JSON.parse(upd.stdout).conflicts.length === 0, upd.stdout + upd.stderr);
  const cfgNoLang = path.join(mkdtempSync(path.join(tmpdir(), "pb-cfg-")), "bootstrap.json");
  writeFileSync(cfgNoLang, JSON.stringify({ ...base, ...noFr, visibility: "private", modules: mods }));
  const upd2 = spawnSync(process.execPath, [scaffold, "--update", "--config", cfgNoLang, "--target", en.out], { encoding: "utf8" });
  check("--update --config sans docLanguage : la langue du manifeste est conservée (aucun fichier remplacé)", upd2.status === 0 && JSON.parse(upd2.stdout).updated.length === 0 && man(en).config.docLanguage === "en" && /^## Status$/m.test(txt(en, "docs/architecture/adrs/ARCH-003-emplacement-et-format-des-adr.md")), upd2.stdout + upd2.stderr);
  const loc = gen({ cliInstall: "local" });
  const cfgNoMode = path.join(mkdtempSync(path.join(tmpdir(), "pb-cfg-")), "bootstrap.json");
  writeFileSync(cfgNoMode, JSON.stringify({ ...base, ...noFr, visibility: "private", modules: mods }));
  const upd3 = spawnSync(process.execPath, [scaffold, "--update", "--config", cfgNoMode, "--target", loc.out], { encoding: "utf8" });
  check("--update --config sans cliInstall : le mode du manifeste est conservé", upd3.status === 0 && man(loc).config.cliInstall === "local" && JSON.parse(upd3.stdout).updated.length === 0, upd3.stdout + upd3.stderr);
  const det = JSON.parse(spawnSync(process.execPath, [scaffold, "--detect", "--target", en.out], { encoding: "utf8" }).stdout);
  check("--detect expose les langues disponibles et celles du manifeste", det.languages.join() === "en,fr" && det.manifest.docLanguage === "en" && det.manifest.cliInstall === "global", JSON.stringify(det));
}

// parité entre les modèles français et anglais (ARCH-008)
{
  const readLf = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const ACCENT = /[àâäéèêëîïôöùûüç]/i;
  const markers = (t) => t.split("\n").map((l) => /@@(module:[\w|-]+|end)/.exec(l)?.[1]).filter(Boolean);
  const params = (t) => [...new Set(t.match(/\{\{[A-Z0-9_]+\}\}/g) ?? [])].sort();
  // retire chaînes et commentaires d'un script, garde le reste (littéraux de regex compris) et le contenu des ${…} d'un gabarit
  function codeSkeleton(src, { regex = true } = {}) {
    let out = "";
    let i = 0;
    const n = src.length;
    const template = () => {
      i++;
      out += "`";
      while (i < n && src[i] !== "`") {
        if (src[i] === "\\") i += 2;
        else if (src[i] === "$" && src[i + 1] === "{") {
          i += 2;
          let depth = 1;
          let inner = "";
          while (i < n && depth > 0) {
            if (src[i] === "{") depth++;
            if (src[i] === "}") depth--;
            if (depth > 0) inner += src[i];
            i++;
          }
          out += "${" + codeSkeleton(inner, { regex }) + "}";
        } else i++;
      }
      i++;
      out += "`";
    };
    while (i < n) {
      const c = src[i];
      if (c === "/" && src[i + 1] === "/") while (i < n && src[i] !== "\n") i++;
      else if (c === "/" && src[i + 1] === "*") {
        i += 2;
        while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
        i += 2;
      } else if (c === '"' || c === "'") {
        const q = c;
        i++;
        while (i < n && src[i] !== q) i += src[i] === "\\" ? 2 : 1;
        i++;
        out += q + q;
      } else if (c === "`") template();
      else if (c === "/" && /[(,=:!&|?{};\n]\s*$/.test(out) && src[i + 1] !== " ") {
        // littéraux de regex : conservés (ou retirés pour les fichiers dont le vocabulaire suit la langue)
        let j = i + 1;
        let inClass = false;
        while (j < n && (src[j] !== "/" || inClass)) {
          if (src[j] === "\\") j++;
          else if (src[j] === "[") inClass = true;
          else if (src[j] === "]") inClass = false;
          j++;
        }
        j++;
        while (/[a-z]/.test(src[j] ?? "")) j++;
        out += regex ? src.slice(i, j) : "/R/";
        i = j;
      } else {
        out += c;
        i++;
      }
    }
    return out.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
  }
  const yamlSkeleton = (t) =>
    t.split("\n").filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/^(\s*(?:- )?(?:name|description|label|placeholder): ).*$/, "$1").replace(/"[^"]*"/g, '""').replace(/\s+#.*$/, "").trimEnd()).join("\n");
  const jsonSkeleton = (t) => JSON.stringify(JSON.parse(t), (k, v) => (k === "description" ? "" : v));
  const headings = (t) => {
    let fence = false;
    return t.split("\n").filter((l) => (/^```/.test(l) ? ((fence = !fence), false) : !fence && /^#{1,6} /.test(l))).length;
  };
  // renvoie la liste des écarts de parité entre un modèle français et sa version anglaise (null = pas de version anglaise)
  function parity(file, fr, en) {
    const issues = [];
    if (en === null) return ACCENT.test(fr) ? [`${file} : modèle sans version anglaise mais avec des lettres accentuées`] : issues;
    if (markers(fr).join() !== markers(en).join()) issues.push(`${file} : marqueurs @@module/@@end différents`);
    if (params(fr).join() !== params(en).join()) issues.push(`${file} : paramètres {{…}} différents`);
    if (/\.(mjs|ts)$/.test(file) || file === ".githooks/pre-push") {
      const opts = { regex: !/\.rules\.ts$/.test(file) };
      if (codeSkeleton(fr, opts) !== codeSkeleton(en, opts)) issues.push(`${file} : squelette de code différent`);
    } else if (/\.ya?ml$/.test(file)) {
      if (yamlSkeleton(fr) !== yamlSkeleton(en)) issues.push(`${file} : structure YAML différente`);
    } else if (/\.json$/.test(file)) {
      if (jsonSkeleton(fr) !== jsonSkeleton(en)) issues.push(`${file} : structure JSON différente`);
    } else if (/\.md$/.test(file) && headings(fr) !== headings(en)) issues.push(`${file} : nombre de titres différent`);
    return issues;
  }

  const frFiles = manifest.files.map((f) => f.path);
  const enFiles = manifest.files.filter((f) => templatePath(f, "en") !== templatePath(f, "fr")).map((f) => f.path);
  const frOf = (rel) => readLf(templatePath(manifest.files.find((f) => f.path === rel), "fr"));
  const enOf = (rel) => readLf(templatePath(manifest.files.find((f) => f.path === rel), "en"));
  // une version localisée sans modèle de référence dans son module est refusée par le chargeur
  const orphanCopy = mkdtempSync(path.join(tmpdir(), "pb-orphan-"));
  cpSync(modulesRoot, orphanCopy, { recursive: true });
  mkdirSync(path.join(orphanCopy, "github", "templates.en"), { recursive: true });
  writeFileSync(path.join(orphanCopy, "github", "templates.en", "ORPHELIN.md"), "x\n");
  let orphanError = "";
  try {
    loadCatalog(orphanCopy);
  } catch (err) {
    orphanError = err.message;
  }
  check("aucun modèle anglais sans équivalent français : refusé par le chargeur, fichier nommé", /ORPHELIN\.md/.test(orphanError) && /sans modèle de référence/.test(orphanError), orphanError);
  const issues = frFiles.flatMap((f) => parity(f, frOf(f), enFiles.includes(f) ? enOf(f) : null));
  check("parité des modèles : marqueurs, paramètres, squelette de code, structure, titres, accents", issues.length === 0, issues.join(" | "));
  check("des modèles anglais existent (le test de parité n'est pas vide)", enFiles.length >= 30, String(enFiles.length));

  // le test de parité détecte bien chaque sorte d'écart
  const frWf = frOf("docs/workflow.md");
  const enWf = enOf("docs/workflow.md");
  check("parité : marqueur perdu -> écart", parity("docs/workflow.md", frWf, enWf.replace("@@module:projects\n", "")).some((i) => /marqueurs/.test(i)));
  check("parité : paramètre perdu -> écart", parity("docs/workflow.md", frWf, enWf.replace("{{CI_BLOCKING_NOTE}}", "x")).some((i) => /paramètres/.test(i)));
  const frHook = frOf(".claude/hooks/read-only-bash.mjs");
  const enHook = enOf(".claude/hooks/read-only-bash.mjs");
  check("parité : code modifié dans un hook -> écart", parity(".claude/hooks/read-only-bash.mjs", frHook, enHook.replace("process.exit(2)", "process.exit(0)")).some((i) => /squelette/.test(i)));
  check("parité : regex de la liste blanche modifiée dans un hook -> écart", parity(".claude/hooks/read-only-bash.mjs", frHook, enHook.replace("(validate|show|list|status)", "(validate|show|list|status|archive)")).some((i) => /squelette/.test(i)));
  check("parité : chaîne ou commentaire traduit -> pas d'écart", parity(".claude/hooks/read-only-bash.mjs", frHook, enHook.replace("// closed character set", "// jeu fermé")).length === 0);
  check("parité : modèle sans version anglaise avec une lettre accentuée -> écart", parity("x.md", "voilà", null).length === 1 && parity("x.md", "plain", null).length === 0);
  check("parité : YAML dont la structure change -> écart", parity("a.yml", "name: A\nbody:\n  - x: 1\n", "name: B\nbody:\n  - x: 1\n  - y: 2\n").length === 1 && parity("a.yml", "name: A\nbody:\n  - x: 1\n", "name: B\nbody:\n  - x: 1\n").length === 0);
}

// catalogue de modules : dossiers auto-décrits, chargeur, liste, module de démonstration (ARCH-010)
{
  const copy = () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pb-mod-"));
    cpSync(modulesRoot, dir, { recursive: true });
    return dir;
  };
  const rewrite = (dir, name, mutate) => {
    const f = path.join(dir, name, "module.json");
    const data = JSON.parse(readFileSync(f, "utf8"));
    mutate(data);
    writeFileSync(f, JSON.stringify(data, null, 2));
  };
  const problem = (dir) => {
    try {
      loadCatalog(dir);
      return "";
    } catch (err) {
      return err.message;
    }
  };
  const refused = (label, prepare, pattern) => {
    const dir = copy();
    prepare(dir);
    const msg = problem(dir);
    check(`chargeur : ${label}`, pattern.test(msg), msg || "(accepté)");
  };

  // catalogue réel
  const names = Object.keys(manifest.modules);
  check("catalogue réel : 15 modules dont core, chacun avec une description", names.length === 15 && names[0] === "core" && names.every((n) => manifest.modules[n].description.length > 10));
  check("catalogue réel : fichiers triés par chemin, propriétaire en tête de la condition de génération", manifest.files.every((f, i, a) => i === 0 || a[i - 1].path < f.path) && manifest.files.every((f) => f.when[0] === f.module));
  check("catalogue réel : langues disponibles fournies par core (en)", manifest.languages.join() === "en");
  const adrOwner = (rel) => manifest.files.find((f) => f.path === rel);
  check("propriété : ADR d'outillage dans archgate avec le module concerné en when, formulaire d'ADR dans github", ["ARCH-001-documentation-d-architecture-arc42-et-adr.md", "ARCH-002-workflow-spec-driven-avec-openspec.md", "ARCH-004-github-comme-forge-avec-actions-et-releases.md", "ARCH-005-conventions-de-branches-commits-et-versionnement.md"].every((n) => adrOwner(`docs/architecture/adrs/${n}`)?.module === "archgate") && adrOwner(".github/ISSUE_TEMPLATE/architecture-decision.yml").module === "github" && adrOwner(".github/ISSUE_TEMPLATE/architecture-decision.yml").when.join() === "github,archgate");
  check("condition de génération : openspec + claude, sans agent-profiles, pour spec-reviewer", adrOwner(".claude/agents/spec-reviewer.md").when.join() === "openspec,claude,legacy-agents");

  // refus du chargeur : chaque cause nomme le fichier fautif
  refused("descripteur illisible", (d) => writeFileSync(path.join(d, "github", "module.json"), "{ pas du json"), /github[/\\]module\.json.*illisible/);
  refused("clé inconnue", (d) => rewrite(d, "github", (m) => (m.surprise = 1)), /clé inconnue « surprise »/);
  refused("description absente", (d) => rewrite(d, "github", (m) => delete m.description), /« description » est obligatoire/);
  refused("requires vers un module inconnu", (d) => rewrite(d, "github", (m) => (m.requires = ["zzz"])), /« requires » cite le module inconnu zzz/);
  refused("pseudo-module dans requires", (d) => rewrite(d, "github", (m) => (m.requires = ["cli-local"])), /« requires » cite le module inconnu cli-local/);
  refused("conflicts avec soi-même", (d) => rewrite(d, "github", (m) => (m.conflicts = ["github"])), /ne peut pas être incompatible avec github/);
  refused("conflicts avec un module requis", (d) => rewrite(d, "release", (m) => (m.conflicts = ["github"])), /ne peut pas être incompatible avec github/);
  refused("modèle manquant", (d) => rewrite(d, "github", (m) => m.files.push({ path: "NOUVEAU.md" })), /modèle manquant.*NOUVEAU\.md/);
  refused("modèle non déclaré", (d) => writeFileSync(path.join(d, "github", "templates", "ORPHELIN.md"), "x\n"), /ORPHELIN\.md.*non déclaré/);
  refused("chemin déclaré par deux modules", (d) => rewrite(d, "release", (m) => m.files.push({ path: ".github/labels.json" })), /Chemin déclaré deux fois : \.github\/labels\.json \(modules github et release\)/);
  refused("chemins qui ne diffèrent que par la casse", (d) => rewrite(d, "release", (m) => m.files.push({ path: "CLAUDE.MD" })), /ne diffèrent que par la casse/);
  refused("module core absent", (d) => rmSync(path.join(d, "core"), { recursive: true }), /module « core » est absent/);
  refused("when vers un module inconnu", (d) => rewrite(d, "github", (m) => (m.files[0].when = ["zzz"])), /« when » cite le module inconnu zzz/);
  refused("merge invalide", (d) => rewrite(d, "github", (m) => (m.files[0].merge = "magie")), /« merge » doit valoir/);
  for (const reserved of [".claude/settings.json", "package.json", ".bootstrap/manifest.json", ".bootstrap/base/x.base", ".bootstrap/local/state.json", ".git/config"]) {
    refused(`chemin réservé au générateur ${reserved}`, (d) => rewrite(d, "github", (m) => m.files.push({ path: reserved })), /chemin réservé au générateur/);
  }
  for (const [label, p] of [["« .. »", "a/../b.md"], ["absolu", "/etc/x"], ["antislash", "a\\b.md"], ["nom réservé Windows", "aux/x.md"], ["deux-points", "a:b.md"], ["point final", "dossier./x.md"]]) {
    refused(`chemin invalide (${label})`, (d) => rewrite(d, "github", (m) => m.files.push({ path: p })), /refusé/);
  }
  refused("numéro d'ADR utilisé deux fois", (d) => {
    rewrite(d, "release", (m) => m.files.push({ path: "docs/architecture/adrs/ARCH-002-autre.md" }));
    mkdirSync(path.join(d, "release", "templates", "docs", "architecture", "adrs"), { recursive: true });
    writeFileSync(path.join(d, "release", "templates", "docs", "architecture", "adrs", "ARCH-002-autre.md"), "x\n");
  }, /Numéro d'ADR ARCH-002 utilisé par deux fichiers/);
  refused("dossier nommé comme un pseudo-module", (d) => {
    mkdirSync(path.join(d, "cli-local"));
    writeFileSync(path.join(d, "cli-local", "module.json"), JSON.stringify({ description: "x" }));
  }, /« cli-local » est un pseudo-module/);
  refused("nom de dossier invalide", (d) => {
    mkdirSync(path.join(d, "Mon Module"));
    writeFileSync(path.join(d, "Mon Module", "module.json"), JSON.stringify({ description: "x" }));
  }, /nom de module invalide/);
  refused("langue absente de core", (d) => {
    mkdirSync(path.join(d, "github", "templates.de"), { recursive: true });
    writeFileSync(path.join(d, "github", "templates.de", "x.md"), "x\n");
  }, /langue de n'est pas fournie par le module core/);
  refused("templates.fr interdit", (d) => mkdirSync(path.join(d, "github", "templates.fr")), /templates\.fr.*interdit/);
  refused("version localisée sans modèle de référence", (d) => writeFileSync(path.join(d, "github", "templates.en", "ORPHELIN.md"), "x\n"), /sans modèle de référence/);
  {
    // lien symbolique : jamais suivi (sauf si le système refuse d'en créer)
    const d = copy();
    let made = true;
    try {
      symlinkSync(path.join(d, "github", "templates", "scripts"), path.join(d, "github", "templates", "alias"), "dir");
    } catch {
      made = false;
    }
    if (made) check("chargeur : lien symbolique dans un dossier de modèles refusé", /lien symbolique refusé/.test(problem(d)), problem(d));
    else console.log("skip chargeur : lien symbolique (création refusée par le système)");
  }
  {
    const d = copy();
    rewrite(d, "github", (m) => (m.files[0].when = ["github", "github", "cli-local"]));
    const cat = loadCatalog(d);
    const entry = cat.files.find((f) => f.path === JSON.parse(readFileSync(path.join(d, "github", "module.json"), "utf8")).files[0].path);
    check("chargeur : when peut citer un pseudo-module, le module propriétaire (toléré) et un doublon", entry.when.join() === "github,cli-local");
  }

  // --list-modules et --catalog
  const list = spawnSync(process.execPath, [scaffold, "--list-modules"], { encoding: "utf8" });
  const listed = JSON.parse(list.stdout);
  check("--list-modules : sans --target, JSON des 15 modules avec leurs champs et les langues", list.status === 0 && listed.modules.length === 15 && listed.modules.find((m) => m.name === "release").requires.join() === "github" && listed.modules.find((m) => m.name === "dependabot").default === false && listed.languages.join() === "fr,en", list.stderr);
  const table = spawnSync(process.execPath, [scaffold, "--list-modules", "--format", "table"], { encoding: "utf8" });
  const apQuestions = listed.modules.find((m) => m.name === "agent-profiles")?.questions ?? [];
  check("--list-modules : agent-profiles déclare les questions de phase 0 sur mainAgent et sur profiles (défaut non / aucun), listées aussi dans le tableau", apQuestions.length === 3 && /regulatedDomain/.test(apQuestions[2]) && /Défaut : non/.test(apQuestions[2]) && /mainAgent/.test(apQuestions[0]) && /Défaut : non/.test(apQuestions[0]) && /profiles/.test(apQuestions[1]) && /Défaut : aucun/.test(apQuestions[1]) && /project-lead/.test(table.stdout.split("\n").find((l) => l.startsWith("| `agent-profiles`")) ?? ""));
  check("--list-modules --format table : tableau markdown avec les questions de phase 0", table.status === 0 && /^\| Module \| Apporte \| Requiert \| Incompatible avec \| Par défaut \| Questions de phase 0 \|/.test(table.stdout) && table.stdout.split("\n").filter((l) => l.startsWith("| `")).length === 15);
  const badCatalog = spawnSync(process.execPath, [scaffold, "--list-modules", "--catalog", path.join(mkdtempSync(path.join(tmpdir(), "pb-vide-")), "rien")], { encoding: "utf8" });
  check("--catalog invalide : code 1 et message", badCatalog.status === 1 && /Catalogue introuvable/.test(badCatalog.stderr));
  const brokenDir = copy();
  writeFileSync(path.join(brokenDir, "github", "module.json"), "{");
  const detectBroken = spawnSync(process.execPath, [scaffold, "--detect", "--target", mkdtempSync(path.join(tmpdir(), "pb-det-")), "--catalog", brokenDir], { encoding: "utf8" });
  check("--detect avec un catalogue invalide : code 1 (le catalogue est validé avant toute commande)", detectBroken.status === 1 && /illisible/.test(detectBroken.stderr));

  // module de démonstration : un dossier, rien d'autre
  const plugin = mkdtempSync(path.join(tmpdir(), "pb-demo-"));
  cpSync(path.join(root, "skills"), path.join(plugin, "skills"), { recursive: true });
  cpSync(path.join(root, ".claude-plugin"), path.join(plugin, ".claude-plugin"), { recursive: true });
  const digest = (dir) =>
    Object.fromEntries(walk(dir).map((f) => [path.relative(dir, f).split(path.sep).join("/"), createHash("sha256").update(readFileSync(f)).digest("hex")]));
  const before = digest(path.join(plugin, "skills"));
  const demo = path.join(plugin, "skills", "project-bootstrap", "assets", "modules", "demo");
  mkdirSync(path.join(demo, "templates", "docs"), { recursive: true });
  mkdirSync(path.join(demo, "templates.en", "docs"), { recursive: true });
  mkdirSync(path.join(demo, "tests"), { recursive: true });
  writeFileSync(path.join(demo, "module.json"), JSON.stringify({ description: "Module de démonstration", requires: [], default: false, questions: ["Quel nom pour la démo ?"], files: [{ path: "docs/DEMO.md", when: ["claude"] }] }, null, 2));
  writeFileSync(path.join(demo, "templates", "docs", "DEMO.md"), "# Démo de {{PROJECT_NAME}}\n");
  writeFileSync(path.join(demo, "templates.en", "docs", "DEMO.md"), "# Demo of {{PROJECT_NAME}}\n");
  writeFileSync(path.join(demo, "tests", "demo.test.mjs"), 'console.log("démo ok");\n');
  const after = digest(path.join(plugin, "skills"));
  const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
  check("module de démonstration : seul son dossier est ajouté au plugin", changed.length > 0 && changed.every((k) => k.startsWith("project-bootstrap/assets/modules/demo/")), changed.join(", "));
  const demoScaffold = path.join(plugin, "skills", "project-bootstrap", "scripts", "scaffold.mjs");
  const demoList = JSON.parse(spawnSync(process.execPath, [demoScaffold, "--list-modules"], { encoding: "utf8" }).stdout);
  const demoModule = demoList.modules.find((m) => m.name === "demo");
  check("module de démonstration : listé avec sa description et ses questions", demoModule?.questions.join() === "Quel nom pour la démo ?" && demoModule.files === 1 && /\| `demo` \|/.test(spawnSync(process.execPath, [demoScaffold, "--list-modules", "--format", "table"], { encoding: "utf8" }).stdout));
  const gen = (modules, extra = {}) => {
    const cfgDir = mkdtempSync(path.join(tmpdir(), "pb-demo-cfg-"));
    const cfgFile = path.join(cfgDir, "bootstrap.json");
    writeFileSync(cfgFile, JSON.stringify({ ...base, ...extra, visibility: "private", modules }));
    const out = path.join(cfgDir, "projet");
    const res = spawnSync(process.execPath, [demoScaffold, "--config", cfgFile, "--target", out], { encoding: "utf8" });
    return { res, out };
  };
  const g1 = gen(["claude", "demo"]);
  check("module de démonstration : ses fichiers sont générés quand il est choisi avec claude", g1.res.status === 0 && readFileSync(path.join(g1.out, "docs", "DEMO.md"), "utf8") === "# Démo de Test\n");
  const g2 = gen(["demo"]);
  check("module de démonstration : sans claude (when), son fichier n'est pas généré", g2.res.status === 0 && !existsSync(path.join(g2.out, "docs", "DEMO.md")));
  const g3 = gen(["claude", "demo"], { docLanguage: "en" });
  check("module de démonstration : version localisée utilisée en anglais", readFileSync(path.join(g3.out, "docs", "DEMO.md"), "utf8") === "# Demo of Test\n");
  const runner = path.join(root, "tests", "modules.test.mjs");
  const ok = spawnSync(process.execPath, [runner, "--root", plugin], { encoding: "utf8" });
  check("tests de module : le test du module de démonstration est lancé et passe", ok.status === 0 && /ok +module demo : demo\.test\.mjs/.test(ok.stdout), ok.stdout + ok.stderr);
  writeFileSync(path.join(demo, "tests", "demo.test.mjs"), "process.exit(3);\n");
  const ko = spawnSync(process.execPath, [runner, "--root", plugin], { encoding: "utf8" });
  check("tests de module : un test en échec fait échouer le lanceur en nommant le module", ko.status === 1 && /FAIL module demo : demo\.test\.mjs/.test(ko.stdout) && /demo\/demo\.test\.mjs/.test(ko.stdout));
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
    const dir = mkdtempSync(path.join(tmpdir(), "pb-cat-"));
    for (const [name, def] of Object.entries({ core: { requires: [] }, ...modules })) {
      mkdirSync(path.join(dir, name));
      writeFileSync(path.join(dir, name, "module.json"), JSON.stringify({ description: `module ${name}`, ...def }));
    }
    return dir;
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
    const wf = templateIn(skill, "docs/workflow.md");
    writeFileSync(wf, readFileSync(wf, "utf8") + "\nNouvelle section v9.1.\n");
    const claudeMd = templateIn(skill, "CLAUDE.md");
    writeFileSync(claudeMd, readFileSync(claudeMd, "utf8") + "\nRègle ajoutée en v9.1.\n");
    dropFile(skill, ".gitattributes");
    addFile(skill, "core", "NOTES.md", "# Notes\n");
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
      const f = templateIn(skill, rel);
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
    const f = templateIn(skill, ".bootstrap/checks.json");
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
    const tpl = (rel) => readFileSync(tplFile(rel), "utf8");
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
    const noGh = spawnSync(process.execPath, [tplFile("scripts/sync-labels.mjs")], { encoding: "utf8", env: { ...process.env, PATH: "", Path: "" } });
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
    const a3 = mkProject();
    const mf3 = JSON.parse(read(a3, ".bootstrap/manifest.json"));
    mf3.modules = [...new Set([...mf3.modules, "dependabot"])];
    mf3.config.actions.checkout.sha = "1".repeat(40);
    writeFileSync(path.join(a3, ".bootstrap", "manifest.json"), JSON.stringify(mf3, null, 2));
    check("audit avec dependabot : SHA des workflows différent du manifeste -> pas d'écart", by(await audit(a3), "actions-epinglees")?.statut === "ok");
    const rel3 = path.join(a3, ".github", "workflows", "release.yml");
    writeFileSync(rel3, readFileSync(rel3, "utf8") + "\n      - uses: actions/checkout@" + "0".repeat(40) + "\n");
    check("audit avec dependabot : SHA différent entre ci.yml et release.yml -> écart", by(await audit(a3), "actions-epinglees")?.statut === "ecart");

    // --- mode d'installation local : versions dans package.json, CLI dans node_modules/.bin
    const mkLocal = () => {
      const dir = path.join(mkdir("pb-audit-local-"), "projet");
      run(cfg(MODS, { cliInstall: "local" }), [], dir);
      return dir;
    };
    const vers = { openspecVersion: "1.0.0", archgateVersion: "0.1.0" };
    const aL = mkLocal();
    check("audit local : versions lues dans package.json -> aucun écart de version", by(await audit(aL, vers), "version-openspec")?.statut === "ok" && by(await audit(aL, vers), "version-archgate")?.statut === "ok");
    const seenEnv = [];
    const fl = fake(aL, vers);
    await runAudit({ target: aL, exec: (cmd, args, opts) => (["openspec", "archgate"].includes(cmd) && seenEnv.push(opts?.env), fl.exec(cmd, args, opts)) });
    const binDir = path.join(aL, "node_modules", ".bin");
    check("audit local : PATH des CLI préfixé par node_modules/.bin du projet", seenEnv.length > 0 && seenEnv.every((e) => Object.values(e ?? {}).some((v) => String(v).startsWith(binDir + path.delimiter))));
    const pkgL = JSON.parse(read(aL, "package.json"));
    pkgL.devDependencies["@fission-ai/openspec"] = "2.0.0";
    writeFileSync(path.join(aL, "package.json"), JSON.stringify(pkgL));
    const rVer = await audit(aL, vers);
    check("audit local : version de package.json différente -> écart avec --save-exact", by(rVer, "version-openspec")?.statut === "ecart" && /package\.json/.test(by(rVer, "version-openspec").message) && /--save-dev --save-exact @fission-ai\/openspec@/.test(by(rVer, "version-openspec").correction));
    delete pkgL.devDependencies.archgate;
    writeFileSync(path.join(aL, "package.json"), JSON.stringify(pkgL));
    const rMiss = await audit(aL, vers);
    check("audit local : devDependency absente -> écart", by(rMiss, "version-archgate")?.statut === "ecart" && /devDependencies/.test(by(rMiss, "version-archgate").message));
    const aU = path.join(mkdir("pb-audit-user-"), "projet");
    run(cfg(MODS, { cliInstall: "user" }), [], aU);
    const rUser = await audit(aU, { openspecVersion: "9.9.9" });
    check("audit user : version différente -> correction avec --prefix ~/.local", by(rUser, "version-openspec")?.statut === "ecart" && /npm install -g --prefix ~\/\.local /.test(by(rUser, "version-openspec").correction));

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
    // mainAgent consigné au manifeste (#35) : l'agent attendu est project-lead
    const mainAgentProject = (settings, local) => {
      const dir = mkProject();
      const manifestFile = path.join(dir, ".bootstrap", "manifest.json");
      const manifestJson = JSON.parse(readFileSync(manifestFile, "utf8"));
      manifestJson.config = { ...(manifestJson.config ?? {}), mainAgent: "project-lead" };
      writeFileSync(manifestFile, JSON.stringify(manifestJson, null, 2));
      mkdirSync(path.join(dir, ".claude"), { recursive: true });
      if (settings !== undefined) writeFileSync(path.join(dir, ".claude", "settings.json"), JSON.stringify(settings));
      if (local !== undefined) writeFileSync(path.join(dir, ".claude", "settings.local.json"), JSON.stringify(local));
      return dir;
    };
    const am1 = by(await audit(mainAgentProject({ agent: "project-lead" })), "agent-impose");
    check("audit : mainAgent consigné et settings.json cohérent -> ok qui nomme l'agent principal", am1?.statut === "ok" && /project-lead \(mainAgent\)/.test(am1.message), JSON.stringify(am1));
    const am2 = by(await audit(mainAgentProject({})), "agent-impose");
    check("audit : mainAgent consigné mais settings.json sans agent -> écart avec la correction", am2?.statut === "ecart" && /scaffold\.mjs --update/.test(am2.correction), JSON.stringify(am2));
    const am3 = by(await audit(mainAgentProject({ agent: "mon-agent" })), "agent-impose");
    check("audit : mainAgent consigné mais un autre agent déclaré par le projet -> écart", am3?.statut === "ecart" && /mon-agent/.test(am3.message) && /mainAgent à null/.test(am3.correction), JSON.stringify(am3));
    const am4 = by(await audit(mainAgentProject({ agent: "project-lead" }, { agent: "perso" })), "agent-impose");
    check("audit : un agent personnel dans settings.local.json qui annule mainAgent -> écart", am4?.statut === "ecart" && /settings\.local\.json/.test(am4.message), JSON.stringify(am4));
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
    const wL = await audit(aL, { ...vers, gh: ghAuth("'gist', 'project', 'repo'") }, { workstation: true, home });
    check("audit local --workstation : node_modules/.bin absent -> écart npm ci", by(wL, "poste-npm")?.statut === "ecart" && by(wL, "poste-npm").correction === "npm ci");
    mkdirSync(binDir, { recursive: true });
    for (const c of ["openspec", "archgate"]) writeFileSync(path.join(binDir, c), "");
    check("audit local --workstation : CLI présentes -> ok", by(await audit(aL, { ...vers, gh: ghAuth("'gist', 'project', 'repo'") }, { workstation: true, home }), "poste-npm")?.statut === "ok");
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
      const f = templateIn(skill, ACTION);
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
      const f = templateIn(skill, CI);
      writeFileSync(f, readFileSync(f, "utf8").replace(/ {6}# Chaîne d'outils[^\n]*\n {6}- name: Chaîne d'outils du projet[^\n]*\n {8}uses: \.\/\.github\/actions\/project-setup\n/, oldComment));
      dropFile(skill, ACTION);
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
// agents en lecture seule : chaque commande citée dans leur modèle doit passer le hook read-only-bash.mjs (modèles français et anglais)
for (const dirName of ["templates", "templates.en"]) {
  const lang = dirName === "templates" ? "fr" : "en";
  const hook = tplFile(".claude/hooks/read-only-bash.mjs", lang);
  const agentFiles = manifest.files.filter((f) => f.path.startsWith(".claude/agents/")).map((f) => [path.basename(f.path), templatePath(f, lang)]);
  const verdict = (command) =>
    spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_input: { command } }), encoding: "utf8" }).status;
  check(`hook lecture seule (${dirName}) : commande autorisée acceptée`, verdict("git log main..HEAD --oneline") === 0);
  check(`hook lecture seule (${dirName}) : caractère % refusé`, verdict("git log main..HEAD --format=%s") === 2);
  check(`hook lecture seule (${dirName}) : commande hors liste et option git d'écriture refusées`, verdict("rm -rf x") === 2 && verdict("git diff --output=x") === 2);
  for (const [file, agentPath] of agentFiles) {
    const text = readFileSync(agentPath, "utf8");
    if (!text.includes("read-only-bash.mjs")) continue;
    const refused = [];
    for (const line of text.split("\n")) {
      if (/pas d[eu' ]|n'exécute aucune|\bRun no\b/i.test(line)) continue; // consigne d'interdiction, pas une commande à lancer
      for (const [, cmd] of line.matchAll(/`((?:git|gh|openspec|archgate) [^`]+)`/g)) {
        const command = cmd.replace(/<([^>]+)>/g, "$1").replace(/ N\b/g, " 1");
        if (verdict(command) !== 0) refused.push(command);
      }
    }
    check(`${dirName}/${file} : commandes citées acceptées par le hook`, refused.length === 0, refused.join(" | "));
  }
  // restrict-path et check-pr-title : mêmes codes de sortie dans toutes les langues
  const restrict = tplFile(".claude/hooks/restrict-path.mjs", lang);
  const rp = (file) => spawnSync(process.execPath, [restrict, "docs/architecture/arc42/"], { input: JSON.stringify({ tool_input: { file_path: file }, cwd: root }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } }).status;
  check(`restrict-path (${dirName}) : écriture dans le préfixe autorisée, hors préfixe refusée`, rp(path.join(root, "docs", "architecture", "arc42", "01.md")) === 0 && rp(path.join(root, "README.md")) === 2);
  const titleScript = tplFile("scripts/check-pr-title.mjs", lang);
  const title = (v) => spawnSync(process.execPath, [titleScript], { env: { ...process.env, PR_TITLE: v }, encoding: "utf8" }).status;
  check(`check-pr-title (${dirName}) : titre valide accepté, titre invalide refusé`, title("feat(x): add y") === 0 && title("add y") === 1);
}
// sync-labels anglais : mêmes appels gh que le français
{
  const enSync = await import("../skills/project-bootstrap/assets/modules/github/templates.en/scripts/sync-labels.mjs");
  const calls = [];
  const gh = (args) => (calls.push(args.join(" ")), args[0] === "label" && args[1] === "list" ? JSON.stringify([{ name: "Bug" }]) : "");
  const r = enSync.syncLabels({ labels: [{ name: "bug", color: "d73a4a", description: "d", native: true }, { name: "chore", color: "c5def5", description: "d" }], gh });
  check("sync-labels (templates.en) : label natif existant ignoré, label du plugin créé", r.skipped.join() === "bug" && r.created.join() === "chore" && calls.some((c) => c.startsWith("label create chore")), JSON.stringify(r));
}

// module agent-profiles (#33) : profils, déclaration du hook, références conditionnelles
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const front = (text) => text.match(/^---\n([\s\S]*?)\n---/)[1];
  const tools = (text) => /^tools: (.*)$/m.exec(front(text))[1].split(",").map((t) => t.trim());
  const full = ["claude", "github", "openspec", "archgate", "arc42", "agent-profiles"];

  const r = gen(full);
  check("agent-profiles : génération réussie", r.res.status === 0, r.res.stderr);
  for (const name of ["architect", "qa-engineer"]) {
    const text = txt(r, `.claude/agents/${name}.md`);
    check(`agent-profiles : ${name} sans hooks de frontmatter, nom du fichier = name`, !/^hooks:/m.test(front(text)) && new RegExp(`^name: ${name}$`, "m").test(front(text)));
  }
  check("agent-profiles : architect et qa-engineer ont Skill sans Agent (ils lancent des skills, aucun agent)", ["architect", "qa-engineer"].every((n) => tools(txt(r, `.claude/agents/${n}.md`)).includes("Skill") && !tools(txt(r, `.claude/agents/${n}.md`)).includes("Agent")));
  const guardText = txt(r, ".claude/hooks/profile-guard.mjs");
  check("agent-profiles : la table du hook ne liste plus d'agent lançable, seulement les skills de architect et de qa-engineer, identique en anglais", (guardText.match(/agents: \["/g) ?? []).length === 1 && /skills: \["archgate:adr-author", "adr-options-comparison", "arc42-update"\]/.test(guardText) && /skills: \["spec-review", "pr-readiness-review"\]/.test(guardText) && /skills: \["spec-review", "pr-readiness-review"\]/.test(txt(gen(full, { docLanguage: "en" }), ".claude/hooks/profile-guard.mjs")) && (txt(gen(full, { docLanguage: "en" }), ".claude/hooks/profile-guard.mjs").match(/agents: \["/g) ?? []).length === 1);
  check("agent-profiles : architect et qa-engineer disposent de Write et Edit (bornés par le hook)", ["architect", "qa-engineer"].every((n) => ["Write", "Edit"].every((t) => tools(txt(r, `.claude/agents/${n}.md`)).includes(t))));
  const settings = JSON.parse(txt(r, ".claude/settings.json"));
  const pre = settings.hooks?.PreToolUse ?? [];
  check("agent-profiles : settings.json déclare le hook PreToolUse de profile-guard.mjs, sans clé agent", pre.length === 2 && pre[0].matcher === "Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task|Skill" && pre[1].matcher === "mcp__.*" && pre.every((e) => e.hooks[0].command === "node" && /profile-guard\.mjs$/.test(e.hooks[0].args[0])) && settings.agent === undefined, JSON.stringify(pre));
  check("agent-profiles : read-only-bash.mjs présent (le hook y délègue)", existsSync(path.join(r.out, ".claude/hooks/read-only-bash.mjs")));
  const q = txt(r, ".claude/agents/qa-engineer.md");
  const a = txt(r, ".claude/agents/architect.md");
  check("agent-profiles : références Archgate, OpenSpec, GitHub et arc42 présentes avec leurs modules, skills citées, sans les anciens agents", /archgate review-context --base --run-checks/.test(q) && /skill `spec-review`/.test(q) && /skill `pr-readiness-review`/.test(q) && /openspec show/.test(q) && /gh pr diff/.test(q) && /skill `adr-options-comparison`/.test(a) && /skill `arc42-update`/.test(a) && !/architecture-explorer|arc42-keeper|spec-reviewer|traceability-checker/.test(q + a));
  check("agent-profiles : le skill onboard n'est cité nulle part", !/onboard/.test(q + a));
  check("agent-profiles : la règle « qui écrit ne relit pas » figure dans les deux profils, en français et en anglais", /Qui écrit ne relit pas/.test(q) && /Qui écrit ne relit pas/.test(a) && /Whoever writes does not review/.test(txt(gen(full, { docLanguage: "en" }), ".claude/agents/qa-engineer.md")) && /Whoever writes does not review/.test(txt(gen(full, { docLanguage: "en" }), ".claude/agents/architect.md")));

  const bare = gen(["claude", "agent-profiles"]);
  const bq = txt(bare, ".claude/agents/qa-engineer.md");
  const ba = txt(bare, ".claude/agents/architect.md");
  check("agent-profiles : sans archgate, openspec, github ni arc42, aucune référence à ces modules", !/archgate|openspec|gh pr|arc42|critères × options|traçabilité/i.test(bq + ba), bq + ba);

  const without = gen(["claude", "github"]);
  check("agent-profiles : absent, ni profils, ni hook, ni déclaration", !existsSync(path.join(without.out, ".claude/agents/architect.md")) && !existsSync(path.join(without.out, ".claude/hooks/profile-guard.mjs")) && !JSON.parse(txt(without, ".claude/settings.json")).hooks.PreToolUse);

  const en = gen(full, { docLanguage: "en" });
  check("agent-profiles : profils anglais avec les mêmes outils que les profils français", ["architect", "qa-engineer"].every((n) => tools(txt(en, `.claude/agents/${n}.md`)).join() === tools(txt(r, `.claude/agents/${n}.md`)).join()) && /Whoever writes does not review/.test(txt(en, ".claude/agents/architect.md")));

  const existing = gen(["claude", "github"]);
  const settingsPath = path.join(existing.out, ".claude/settings.json");
  const own = JSON.parse(readFileSync(settingsPath, "utf8"));
  own.hooks.PreToolUse = [{ matcher: "Bash", hooks: [{ type: "command", command: "node", args: ["mon-hook.mjs"] }] }];
  writeFileSync(settingsPath, JSON.stringify(own, null, 2));
  const added = run({ ...base, visibility: "private", modules: ["claude", "github", "agent-profiles"] }, ["--update"], existing.out);
  const merged = JSON.parse(readFileSync(settingsPath, "utf8")).hooks.PreToolUse;
  check("agent-profiles : un hook PreToolUse du projet subsiste à côté de celui de profile-guard.mjs", merged.some((h) => h.hooks[0].args[0] === "mon-hook.mjs") && merged.some((h) => /profile-guard\.mjs$/.test(h.hooks[0].args[0])), `${JSON.stringify(merged)} ${JSON.stringify(added.report ?? added)}`);
}

// project-lead et mainAgent (#35)
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const full = ["claude", "github", "openspec", "archgate", "arc42", "agent-profiles"];

  const r = gen(full);
  const lead = txt(r, ".claude/agents/project-lead.md");
  const fm = lead.match(/^---\n([\s\S]*?)\n---/)[1];
  check("project-lead : généré avec agent-profiles, sans tools ni hooks de frontmatter (agent principal), nom du fichier = name", r.res.status === 0 && /^name: project-lead$/m.test(fm) && !/^tools:/m.test(fm) && /^disallowedTools: Write, Edit, MultiEdit, NotebookEdit$/m.test(fm) && !/^hooks:/m.test(fm));
  check("project-lead : consigne de délégation, brief borné, échelle à cinq niveaux, qui écrit ne relit pas", /Déléguer/.test(lead) && /Brief borné/.test(lead) && /objectif, fichiers de référence, critères de fin, contraintes, non-objectifs/.test(lead) && (lead.match(/^\| [1-5] \|/gm) ?? []).length === 5 && /Qui écrit ne relit pas/.test(lead));
  check("project-lead : explore, update et lecture de l'avancement depuis le disque (openspec)", /\/opsx:explore/.test(lead) && /\/opsx:update/.test(lead) && /openspec status --json/.test(lead));
  check("project-lead : briefings d'ADR, ADR bloquants (archgate)", /archgate review-context --base/.test(lead) && /bloquants/.test(lead));
  check("project-lead : orchestrateur, délègue le code à developer et les specs à business-analyst ou à developer, ne les écrit pas lui-même", /`developer`/.test(lead) && /business-analyst/.test(lead) && /ne produis ni code ni spec/.test(lead) && !/sinon écris-les toi-même/.test(lead) && /disallowedTools: Write, Edit, MultiEdit, NotebookEdit/.test(fm));
  check("project-lead : lessons-learned lancé par lui sans archgate:reviewer (archgate-plugin), arc42 mis à jour par architect (arc42)", /archgate:lessons-learned/.test(txt(gen([...full, "archgate-plugin"]), ".claude/agents/project-lead.md")) && !/archgate:reviewer/.test(txt(gen([...full, "archgate-plugin"]), ".claude/agents/project-lead.md")) && !/archgate:reviewer/.test(txt(gen([...full, "archgate-plugin"]), ".claude/agents/qa-engineer.md")) && /architect` met arc42 à jour/.test(lead) && !/lessons-learned/.test(lead));
  check("project-lead : écritures visibles soumises à l'accord de l'utilisateur (github), demandes des profils traitées", /gh issue create/.test(lead) && /gh pr merge/.test(lead) && /accord de l'utilisateur/.test(lead) && /ce que le hook leur refuse/.test(lead));
  {
    const guard = txt(r, ".claude/hooks/profile-guard.mjs");
    const entry = guard.slice(guard.indexOf('"project-lead": {'), guard.indexOf("\n  },", guard.indexOf('"project-lead": {')));
    check("project-lead : dans la table du hook, sans écriture, avec agents nommés et skills ouverts, sans general-purpose", /write: \[\]/.test(entry) && /skillsOpen: true/.test(entry) && /namedAgents: \[/.test(entry) && !/general-purpose|"project-lead"\]/.test(entry.slice(entry.indexOf("agents:"))) && !/"second-opinion"/.test(entry.slice(entry.indexOf("namedAgents:"))), entry);
    check("project-lead : le texte dit que le hook le borne et qu'il ne lance pas /opsx:apply, /opsx:archive ni /opsx:sync, en français et en anglais", !/aucun hook ne te borne|no hook bounds you/.test(lead + txt(gen(full, { docLanguage: "en" }), ".claude/agents/project-lead.md")) && /le hook de bornage refuse toute écriture/.test(lead) && /ni `\/opsx:archive`/.test(lead) && /the bounding hook refuses every write/.test(txt(gen(full, { docLanguage: "en" }), ".claude/agents/project-lead.md")) && /nor `\/opsx:sync`/.test(txt(gen(full, { docLanguage: "en" }), ".claude/agents/project-lead.md")));
  }
  const bare = txt(gen(["claude", "agent-profiles"]), ".claude/agents/project-lead.md");
  check("project-lead : sans archgate, openspec, github ni arc42, aucune référence à ces modules", !/archgate|openspec|opsx|gh |arc42|spec-reviewer|architecture-explorer/i.test(bare), bare);
  const en = txt(gen(full, { docLanguage: "en" }), ".claude/agents/project-lead.md");
  check("project-lead : version anglaise sans ligne tools (agent principal)", !/^tools:/m.test(en.match(/^---\n([\s\S]*?)\n---/)[1]) && /gh issue create/.test(en) && !/archgate:reviewer/.test(txt(gen([...full, "archgate-plugin"], { docLanguage: "en" }), ".claude/agents/project-lead.md")));
  check("project-lead : version anglaise (consigne de délégation, échelle, règle de relecture)", /Delegate/.test(en) && /Arbitration ladder/.test(en) && /Whoever writes does not review/.test(en) && (en.match(/^\| [1-5] \|/gm) ?? []).length === 5);

  // mainAgent
  const settingsOf = (res) => JSON.parse(txt(res, ".claude/settings.json"));
  check("mainAgent absent : aucune clé agent dans settings.json, aucune clé au manifeste", settingsOf(r).agent === undefined && JSON.parse(txt(r, ".bootstrap/manifest.json")).config.mainAgent === undefined);
  const on = gen(full, { mainAgent: "project-lead" });
  check("mainAgent project-lead : agent project-lead dans settings.json, consigné au manifeste", on.res.status === 0 && settingsOf(on).agent === "project-lead" && JSON.parse(txt(on, ".bootstrap/manifest.json")).config.mainAgent === "project-lead", on.res.stderr);
  const noModule = gen(["claude", "github"], { mainAgent: "project-lead" });
  check("mainAgent sans agent-profiles refusé (code 1, aucun fichier écrit)", noModule.res.status === 1 && /mainAgent exige le module agent-profiles/.test(noModule.res.stderr) && !existsSync(path.join(noModule.out, ".claude/settings.json")), noModule.res.stderr);
  const bad = gen(full, { mainAgent: "autre" });
  check("mainAgent invalide refusé en nommant la valeur permise", bad.res.status === 1 && /mainAgent doit valoir project-lead/.test(bad.res.stderr), bad.res.stderr);
  const upd = run({ ...base, visibility: "private", modules: full }, ["--update"], on.out);
  check("--update sans mainAgent dans la configuration : la valeur du manifeste est conservée", upd.res.status === 0 && settingsOf(on).agent === "project-lead" && JSON.parse(txt(on, ".bootstrap/manifest.json")).config.mainAgent === "project-lead", upd.res.stderr);
  // désactivation explicite : null n'est ni hérité ni consigné, et permet de retirer le module
  const off = run({ ...base, visibility: "private", modules: full, mainAgent: null }, ["--update"], on.out);
  check("mainAgent null : désactive la clé (ni héritée ni consignée), code 0", off.res.status === 0 && JSON.parse(txt(on, ".bootstrap/manifest.json")).config.mainAgent === undefined, off.res.stderr);
  const removed = run({ ...base, visibility: "private", modules: ["claude", "github"], mainAgent: null }, ["--update"], on.out);
  check("retrait du module agent-profiles avec mainAgent null : accepté", removed.res.status === 0, removed.res.stderr);
  // un agent déjà déclaré par le projet est conservé et signalé
  const own = gen(["claude", "github"]);
  const ownSettings = path.join(own.out, ".claude/settings.json");
  const ownJson = JSON.parse(readFileSync(ownSettings, "utf8"));
  ownJson.agent = "mon-agent";
  writeFileSync(ownSettings, JSON.stringify(ownJson, null, 2));
  const adopt = run({ ...base, visibility: "private", modules: full, mainAgent: "project-lead" }, ["--update"], own.out);
  check("mainAgent avec un agent déjà déclaré : clé conservée, avertissement dans le rapport", adopt.res.status === 0 && JSON.parse(readFileSync(ownSettings, "utf8")).agent === "mon-agent" && (adopt.report?.warnings ?? []).some((w) => /mon-agent/.test(w)), JSON.stringify(adopt.report?.warnings ?? adopt.report));
  const withArchgatePlugin = gen([...full, "archgate-plugin"], { mainAgent: "project-lead" });
  check("mainAgent avec archgate-plugin : combinaison acceptée, sans conflit", withArchgatePlugin.res.status === 0 && settingsOf(withArchgatePlugin).agent === "project-lead", withArchgatePlugin.res.stderr);
}

// dossier temporaire des suites (#117) : supprimé à la sortie, conservé avec KEEP_TMP
{
  const probe = path.join(root, "tests", "tmp-root.mjs").replace(/\\/g, "/");
  const script = `import "file:///${probe}"; import { mkdtempSync, writeFileSync } from "node:fs"; import { tmpdir } from "node:os"; import path from "node:path";
const d = mkdtempSync(path.join(tmpdir(), "pb-sonde-")); writeFileSync(path.join(d, "x"), "x"); console.log("RACINE=" + process.env.PB_TMP_ROOT + "|DIR=" + d);`;
  const probeRun = (env) => {
    const res = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, ...env, PB_TMP_ROOT: "" } });
    const m = /RACINE=(.*)\|DIR=(.*)/.exec(res.stdout) ?? [];
    return { status: res.status, root: m[1], dir: m[2], out: res.stdout };
  };
  const plain = probeRun({});
  check("dossier temporaire : le dossier créé par une suite est sous la racine de l'exécution, supprimé à la sortie", plain.status === 0 && plain.dir?.startsWith(plain.root) && !existsSync(plain.root) && !existsSync(plain.dir), plain.out);
  const kept = probeRun({ KEEP_TMP: "1" });
  check("dossier temporaire : KEEP_TMP conserve les dossiers et affiche la racine", kept.status === 0 && existsSync(kept.dir) && kept.out.includes("KEEP_TMP") && kept.out.includes(kept.root), kept.out);
  if (kept.root && existsSync(kept.root)) rmSync(kept.root, { recursive: true, force: true });
  check("dossier temporaire : cette exécution crée ses dossiers sous sa propre racine", process.env.PB_TMP_ROOT && tmpdir() === process.env.PB_TMP_ROOT, tmpdir());
}

// profils optionnels (#34) : clé profiles
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const front = (text) => text.match(/^---\n([\s\S]*?)\n---/)[1];
  const tools = (text) => /^tools: (.*)$/m.exec(front(text))[1].split(",").map((t) => t.trim());
  const full = ["claude", "github", "openspec", "archgate", "arc42", "agent-profiles"];
  const all = ["business-analyst", "product-owner"];
  const has = (r, name) => existsSync(path.join(r.out, ".claude/agents", name + ".md"));

  const none = gen(full);
  check("profiles absent : aucun profil optionnel, developer généré, aucune clé au manifeste", all.every((n) => !has(none, n)) && has(none, "developer") && JSON.parse(txt(none, ".bootstrap/manifest.json")).config.profiles === undefined);
  const three = gen(full, { profiles: ["product-owner", "developer", "business-analyst", "developer"] });
  check("profiles : developer listé est ignoré avec un avertissement, les deux profils optionnels sont consignés triés sans doublon", three.res.status === 0 && all.every((n) => has(three, n)) && has(three, "developer") && JSON.parse(txt(three, ".bootstrap/manifest.json")).config.profiles.join() === all.join() && (three.report?.warnings ?? []).some((w) => /profiles contient developer/.test(w)), three.res.stderr);
  const onlyDev = gen(full, { profiles: ["scout"] });
  check("profiles : seuls les profils listés sont générés en plus de developer", has(onlyDev, "scout") && has(onlyDev, "developer") && !has(onlyDev, "product-owner") && !has(onlyDev, "business-analyst"));
  for (const n of all) {
    const text = txt(three, `.claude/agents/${n}.md`);
    check(`profil ${n} : nom = fichier, sans hooks de frontmatter, sans Agent`, new RegExp(`^name: ${n}$`, "m").test(front(text)) && !/^hooks:/m.test(front(text)) && !tools(text).includes("Agent"));
  }
  check("developer : outils d'écriture et Bash, sans Skill", ["Write", "Edit", "Bash"].every((t) => tools(txt(three, ".claude/agents/developer.md")).includes(t)) && !tools(txt(three, ".claude/agents/developer.md")).includes("Skill"));
  check("product-owner : lecture seule (ni Write ni Edit)", !tools(txt(three, ".claude/agents/product-owner.md")).some((t) => ["Write", "Edit"].includes(t)));
  check("business-analyst : Skill et outils d'écriture, bornés au dossier des changements", tools(txt(three, ".claude/agents/business-analyst.md")).includes("Skill") && /write: \["openspec\/changes\/"\]/.test(txt(three, ".claude/hooks/profile-guard.mjs")));
  check("qui écrit ne relit pas : présent dans les trois profils optionnels, en français et en anglais", all.every((n) => /Qui écrit ne relit pas/.test(txt(three, `.claude/agents/${n}.md`))) && all.every((n) => /Whoever writes does not review/.test(txt(gen(full, { profiles: all, docLanguage: "en" }), `.claude/agents/${n}.md`))));
  const bare = gen(["claude", "agent-profiles"], { profiles: ["product-owner"] });
  check("profils optionnels sans archgate, openspec, github ni arc42 : aucune référence à ces modules", ["product-owner", "developer"].every((n) => !/archgate|openspec|opsx|gh |arc42|spec-reviewer/i.test(txt(bare, `.claude/agents/${n}.md`))), txt(bare, ".claude/agents/developer.md"));
  check("project-lead : délègue à developer, à business-analyst quand il existe, sans consigne d'écrire lui-même", /business-analyst/.test(txt(three, ".claude/agents/project-lead.md")) && !/sinon écris-les toi-même/.test(txt(three, ".claude/agents/project-lead.md")));

  // refus
  const bad = gen(full, { profiles: ["profil-inexistant"] });
  check("profiles : nom inconnu refusé (code 1, noms permis)", bad.res.status === 1 && /profiles doit être une liste de noms parmi/.test(bad.res.stderr), bad.res.stderr);
  const notList = gen(full, { profiles: "developer" });
  check("profiles : une chaîne au lieu d'une liste refusée", notList.res.status === 1, notList.res.stderr);
  const noModule = gen(["claude", "github"], { profiles: ["developer"] });
  check("profiles sans agent-profiles refusé (code 1, aucun fichier écrit)", noModule.res.status === 1 && /profiles exige le module agent-profiles/.test(noModule.res.stderr) && !existsSync(path.join(noModule.out, ".claude/settings.json")), noModule.res.stderr);
  const baNoOpenspec = gen(["claude", "agent-profiles"], { profiles: ["business-analyst"] });
  check("business-analyst sans openspec refusé", baNoOpenspec.res.status === 1 && /business-analyst exige le module openspec/.test(baNoOpenspec.res.stderr), baNoOpenspec.res.stderr);

  // --update : héritage, désactivation
  const upd = run({ ...base, visibility: "private", modules: full }, ["--update"], three.out);
  check("--update sans profiles dans la configuration : la liste du manifeste est conservée", upd.res.status === 0 && all.every((n) => has(three, n)) && JSON.parse(txt(three, ".bootstrap/manifest.json")).config.profiles.join() === all.join(), upd.res.stderr);
  const off = run({ ...base, visibility: "private", modules: full, profiles: [] }, ["--update"], three.out);
  check("profiles [] : désactive la clé (ni héritée ni consignée), les fichiers sont retirés du manifeste", off.res.status === 0 && JSON.parse(txt(three, ".bootstrap/manifest.json")).config.profiles === undefined && (off.report?.retired ?? []).length === 2 && !(off.report?.retired ?? []).some((f) => /developer\.md/.test(f)), JSON.stringify(off.report?.retired));
  check("profiles [] : les fichiers de profils restent sur le disque (signalés, jamais supprimés)", all.every((n) => has(three, n)));
  const viaNull = run({ ...base, visibility: "private", modules: full, profiles: null }, ["--update"], onlyDev.out);
  check("profiles null : désactive la clé comme []", viaNull.res.status === 0 && JSON.parse(txt(onlyDev, ".bootstrap/manifest.json")).config.profiles === undefined, viaNull.res.stderr);
  const baInherited = gen(full, { profiles: ["business-analyst"] });
  const dropOpenspec = run({ ...base, visibility: "private", modules: ["claude", "github", "agent-profiles"] }, ["--update"], baInherited.out);
  check("--update qui retire openspec alors que business-analyst est hérité : échec (code 1)", dropOpenspec.res.status === 1 && /business-analyst exige le module openspec/.test(dropOpenspec.res.stderr), dropOpenspec.res.stderr);
  const dropModule = run({ ...base, visibility: "private", modules: ["claude", "github", "openspec"] }, ["--update"], baInherited.out);
  check("--update qui retire agent-profiles alors que profiles est hérité : échec (code 1)", dropModule.res.status === 1 && /profiles exige le module agent-profiles/.test(dropModule.res.stderr), dropModule.res.stderr);
  const keepHook = gen(full, { profiles: ["scout"], keep: [".claude/hooks/profile-guard.mjs"] });
  check("hook conservé par keep : avertissement dans le rapport", keepHook.res.status === 0 && (keepHook.report?.warnings ?? []).some((w) => /profile-guard\.mjs est dans keep/.test(w)), JSON.stringify(keepHook.report?.warnings));
  check("developer, product-owner et business-analyst : la table du hook borne developer par une liste d'exclusion sans lister src/", /writeExcept: \[/.test(txt(three, ".claude/hooks/profile-guard.mjs")) && !/writeExcept: \[[^\]]*"src\//.test(txt(three, ".claude/hooks/profile-guard.mjs")));
  check("developer : consigne de ne rien publier et de ne cocher que les tâches", /ne publies rien/.test(txt(three, ".claude/agents/developer.md")) && /tu ne modifies pas ses autres fichiers/.test(txt(three, ".claude/agents/developer.md")));
  const removed = run({ ...base, visibility: "private", modules: ["claude", "github"], profiles: [] }, ["--update"], onlyDev.out);
  check("retrait du module agent-profiles avec profiles [] : accepté", removed.res.status === 0, removed.res.stderr);
}

// skills de projet des profils, developer par défaut, project-lead orchestrateur (#138)
{
  const gen = (modules, extra = {}, extraArgs = [], target) => run({ ...base, visibility: "private", modules, ...extra }, extraArgs, target);
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const has = (r, rel) => existsSync(path.join(r.out, ...rel.split("/")));
  const full = ["claude", "github", "openspec", "archgate", "arc42", "agent-profiles"];
  const names = ["adr-options-comparison", "arc42-update", "spec-review", "pr-readiness-review"];
  const skill = (n) => `.claude/skills/${n}/SKILL.md`;
  const front = (t) => /^---\n([\s\S]*?)\n---/.exec(t)?.[1] ?? "";
  const contents = {
    fr: { "adr-options-comparison": [/au moins deux options/, /non vérifié/, /tableau critères × options/], "arc42-update": [/sections impactées/, /section 9/, /N'invente rien/], "spec-review": [/bloquant/, /scénarios manquants/], "pr-readiness-review": [/Conventional Commits/, /tableau maillon/] },
    en: { "adr-options-comparison": [/at least two options/, /not verified/, /criteria × options table/], "arc42-update": [/impacted sections/, /section 9/, /Invent nothing/], "spec-review": [/blocking/, /missing scenarios/], "pr-readiness-review": [/Conventional Commits/, /link \/ status/] },
  };
  for (const [tag, lang] of [["fr", {}], ["en", { docLanguage: "en" }]]) {
    const r = gen([...full, "dependabot"], lang);
    check(`skills de profils (${tag}) : les quatre skills sont générées`, r.res.status === 0 && names.every((n) => has(r, skill(n))), r.res.stderr);
    check(`skills de profils (${tag}) : name = dossier, description qui nomme le profil, ni context, hooks, allowed-tools ni Agent`, names.every((n) => { const t = txt(r, skill(n)); const f = front(t); return new RegExp(`^name: ${n}$`, "m").test(f) && /^description: .*(`architect`|`qa-engineer`)\.$/m.test(f) && !/^(context|hooks|allowed-tools):/m.test(f) && !/\bAgent\b/.test(t); }));
    check(`skills de profils (${tag}) : méthodes conservées`, names.every((n) => contents[tag][n].every((re) => re.test(txt(r, skill(n))))), names.filter((n) => !contents[tag][n].every((re) => re.test(txt(r, skill(n))))).join(", "));
    check(`skills de profils (${tag}) : pr-readiness-review sans commande gh d'écriture, avec l'exception Dependabot`, !/gh (issue|pr) (create|merge|edit|comment|close)|gh release/.test(txt(r, skill("pr-readiness-review"))) && /dependabot\//.test(txt(r, skill("pr-readiness-review"))));
    const q = txt(r, ".claude/agents/qa-engineer.md");
    const a = txt(r, ".claude/agents/architect.md");
    check(`profils (${tag}) : qa-engineer cite spec-review et pr-readiness-review, architect cite adr-options-comparison et arc42-update, sans champ skills`, /spec-review/.test(q) && /pr-readiness-review/.test(q) && /adr-options-comparison/.test(a) && /arc42-update/.test(a) && !/^skills:/m.test(front(q) + front(a)));
  }
  const noGithub = gen(["claude", "openspec", "archgate", "arc42", "agent-profiles"]);
  check("skills de profils : sans github, pas de pr-readiness-review ni dans qa-engineer ; les trois autres selon leurs modules", !has(noGithub, skill("pr-readiness-review")) && ["adr-options-comparison", "arc42-update", "spec-review"].every((n) => has(noGithub, skill(n))) && !/pr-readiness-review/.test(txt(noGithub, ".claude/agents/qa-engineer.md")));
  const noOpenspec = gen(["claude", "github", "agent-profiles"]);
  check("skills de profils : sans openspec, archgate ni arc42, seule pr-readiness-review ; qa-engineer et architect ne citent que ce qui existe", ["adr-options-comparison", "arc42-update", "spec-review"].every((n) => !has(noOpenspec, skill(n))) && has(noOpenspec, skill("pr-readiness-review")) && !/spec-review/.test(txt(noOpenspec, ".claude/agents/qa-engineer.md")) && !/adr-options-comparison|arc42-update/.test(txt(noOpenspec, ".claude/agents/architect.md")));
  const legacy = gen(full.filter((m) => m !== "agent-profiles"));
  check("skills de profils : sans agent-profiles, aucune skill n'est générée", legacy.res.status === 0 && names.every((n) => !has(legacy, skill(n))));
  check("project-lead : archive lui-même (openspec archive), confie /opsx:apply à developer, nomme les fichiers de gouvernance et le worktree", ["fr", "en"].every((lang) => { const t = txt(gen(full, lang === "en" ? { docLanguage: "en" } : {}), ".claude/agents/project-lead.md"); return /openspec archive <id> --yes/.test(t) && /\/opsx:apply/.test(t) && /CLAUDE\.md/.test(t) && /worktree/.test(t); }));
  const dv = txt(gen(full), ".claude/agents/developer.md");
  check("developer : généré par défaut, rédige et valide le changement OpenSpec sans business-analyst", /openspec new change/.test(dv) && /openspec validate <id> --strict/.test(dv) && /n'écris que dans `openspec\/changes\/<id>\/`/.test(dv));
  const wf = txt(gen(full), "docs/workflow.md");
  check("workflow.md : les quatre skills, la ligne developer sans clé profiles, l'orchestrateur et sa règle doublée", names.every((n) => wf.includes(n)) && /\| `developer` \|/.test(wf) && /ne produit ni code ni spec/.test(wf) && /disallowedTools/.test(wf) && /Qui exécute/.test(wf));
  check("workflow.md : sans agent-profiles, aucune skill ni ligne Qui exécute", names.every((n) => !txt(legacy, "docs/workflow.md").includes("`" + n + "`")) && !/Qui exécute/.test(txt(legacy, "docs/workflow.md")));

  // developer hérité du manifeste : retiré avec un avertissement, developer.md conservé
  const old = gen(full, { profiles: ["scout"] });
  const mpath = path.join(old.out, ".bootstrap", "manifest.json");
  const mf = JSON.parse(readFileSync(mpath, "utf8"));
  mf.config.profiles = ["developer", "scout"];
  writeFileSync(mpath, JSON.stringify(mf, null, 2));
  const inh = run({ ...base, visibility: "private", modules: full }, ["--update"], old.out);
  check("developer hérité d'un manifeste : avertissement, manifeste sans developer, developer.md conservé", inh.res.status === 0 && (inh.report?.warnings ?? []).some((w) => /profiles contient developer/.test(w)) && JSON.parse(readFileSync(mpath, "utf8")).config.profiles.join() === "scout" && has(old, ".claude/agents/developer.md"), inh.res.stderr);

  // projet dont settings.json ne porte que la première entrée PreToolUse (généré avant l'entrée mcp__.*) : --update ajoute la seconde, la première reste identique, les hooks du projet subsistent
  {
    // un projet généré avant l'entrée mcp__.* : base et manifeste portent la version à une seule entrée
    const oldProject = (withHook) => {
      const proj = gen(full);
      const sp = path.join(proj.out, ".claude", "settings.json");
      const generated = JSON.parse(readFileSync(sp, "utf8"));
      const first = generated.hooks.PreToolUse[0];
      const old = structuredClone(generated);
      old.hooks.PreToolUse = [first];
      const oldText = JSON.stringify(old, null, 2) + "\n";
      writeFileSync(path.join(proj.out, ".bootstrap", "base", ".claude", "settings.json.base"), oldText);
      const mp = path.join(proj.out, ".bootstrap", "manifest.json");
      const man = JSON.parse(readFileSync(mp, "utf8"));
      man.files[".claude/settings.json"].generated = createHash("sha256").update(oldText).digest("hex");
      man.files[".claude/settings.json"].sha256 = man.files[".claude/settings.json"].generated;
      writeFileSync(mp, JSON.stringify(man, null, 2));
      const current = structuredClone(old);
      if (withHook) current.hooks.PreToolUse.push({ matcher: "Bash", hooks: [{ type: "command", command: "node", args: ["hook-du-projet.mjs"] }] });
      writeFileSync(sp, JSON.stringify(current, null, 2) + "\n");
      const upd = run({ ...base, visibility: "private", modules: full }, ["--update"], proj.out);
      return { upd, first, after: JSON.parse(readFileSync(sp, "utf8")).hooks.PreToolUse };
    };
    const plain = oldProject(false);
    check("--update d'un settings.json à une entrée PreToolUse : la seconde entrée mcp__.* est ajoutée, la première reste identique", plain.upd.res.status === 0 && plain.after.length === 2 && JSON.stringify(plain.after[0]) === JSON.stringify(plain.first) && plain.after[1].matcher === "mcp__.*", JSON.stringify(plain.after).slice(0, 400));
    const custom = oldProject(true);
    check("--update d'un settings.json à une entrée et un hook du projet : hook du projet conservé, entrée mcp__.* ajoutée une seule fois", custom.upd.res.status === 0 && JSON.stringify(custom.after[0]) === JSON.stringify(custom.first) && custom.after.some((e) => e.hooks[0].args[0] === "hook-du-projet.mjs") && custom.after.filter((e) => e.matcher === "mcp__.*").length === 1, JSON.stringify(custom.after).slice(0, 500));
  }

  // projet généré avant ce changement : --update ajoute developer.md et les skills, ne retire rien d'agent-profiles ; profil modifié et fichier hors manifeste
  const prev = gen(full);
  const m2 = JSON.parse(readFileSync(path.join(prev.out, ".bootstrap", "manifest.json"), "utf8"));
  const newFiles = [".claude/agents/developer.md", ...names.map(skill)];
  for (const rel of newFiles) {
    rmSync(path.join(prev.out, ...rel.split("/")), { force: true });
    rmSync(path.join(prev.out, ".bootstrap", "base", ...rel.split("/")) + ".base", { force: true });
    delete m2.files?.[rel];
  }
  writeFileSync(path.join(prev.out, ".bootstrap", "manifest.json"), JSON.stringify(m2, null, 2));
  const archPath = path.join(prev.out, ".claude", "agents", "architect.md");
  writeFileSync(archPath, readFileSync(archPath, "utf8") + "\nLigne du projet.\n");
  mkdirSync(path.join(prev.out, ".claude", "skills", "spec-review"), { recursive: true });
  writeFileSync(path.join(prev.out, ".claude", "skills", "spec-review", "SKILL.md"), "Version du projet\n");
  const upd = run({ ...base, visibility: "private", modules: full }, ["--update"], prev.out);
  const created = [".claude/agents/developer.md", ...names.filter((n) => n !== "spec-review").map(skill)];
  check("--update d'un projet antérieur : developer.md et les skills créés, rien d'agent-profiles retiré, le fichier hors manifeste signalé en conflit", upd.res.status === 3 && (upd.report?.conflicts ?? []).some((c) => /skills\/spec-review\/SKILL\.md/.test(typeof c === "string" ? c : c.path ?? JSON.stringify(c))) && created.every((rel) => has(prev, rel)) && !(upd.report?.retired ?? []).some((f) => /\.claude\/(agents|skills)\//.test(f)), JSON.stringify({ s: upd.res.status, miss: created.filter((rel) => !has(prev, rel)), conflicts: upd.report?.conflicts }).slice(0, 600));
  check("--update d'un projet antérieur : profil modifié fusionné sans perte, fichier hors manifeste conservé", /Ligne du projet\./.test(readFileSync(archPath, "utf8")) && readFileSync(path.join(prev.out, ".claude", "skills", "spec-review", "SKILL.md"), "utf8") === "Version du projet\n");

  // aucun bloc @@module: ne cite un nom inconnu (module ou pseudo-module)
  const known = new Set([...Object.keys(manifest.modules), ...PSEUDO_MODULES]);
  const unknown = [];
  const walkDir = (dir) => {
    for (const name of readdirSync(dir)) {
      const full2 = path.join(dir, name);
      if (statSync(full2).isDirectory()) { walkDir(full2); continue; }
      let text;
      try { text = readFileSync(full2, "utf8"); } catch { continue; }
      for (const m of text.matchAll(/@@module:([^\s]+)/g)) for (const n of m[1].split("|")) if (!known.has(n)) unknown.push(`${path.relative(modulesRoot, full2)} : ${n}`);
    }
  };
  walkDir(modulesRoot);
  check("modèles : aucun bloc @@module: ne cite un nom inconnu", unknown.length === 0, unknown.slice(0, 5).join(" ; "));
}

// module advisor (#36, #126) : activation par la clé advisor, consigne portée par les profils sonnet et haiku
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const mods = ["claude", "github", "openspec", "archgate", "agent-profiles", "advisor"];
  const all = ["business-analyst", "developer", "product-owner"];
  const profileText = (r, n) => txt(r, `.claude/agents/${n}.md`);
  const on = gen(mods, { advisor: true, profiles: all });
  const noKey = gen(mods, { profiles: all });
  const wf = txt(on, "docs/workflow.md");

  check("advisor: true : les trois profils sonnet portent la consigne (décide d'appeler, rien ne l'impose, repli sans advisor)", on.res.status === 0 && all.every((n) => /consulte l'advisor/.test(profileText(on, n)) && /rien ne l'impose/.test(profileText(on, n)) && /poursuis sans lui/.test(profileText(on, n))), on.res.stderr);
  check("advisor: true : architect, qa-engineer et project-lead (pas de section) ne mentionnent pas l'advisor", ["architect", "qa-engineer", "project-lead"].every((n) => !/advisor/i.test(profileText(on, n))));
  check("advisor: true : docs/workflow.md ajoute l'étape avec /advisor, le coût, les plateformes et les variables qui le désactivent", /\*\*Advisor\*\*/.test(wf) && /\/advisor <modèle>/.test(wf) && /au moins aussi capable/.test(wf) && /Ne pas définir `DISABLE_TELEMETRY`/.test(wf) && /DO_NOT_TRACK/.test(wf) && /CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC/.test(wf) && /Bedrock/.test(wf) && /\/advisor` sans argument/.test(wf) && /chaque sous-agent en hérite/.test(wf) && !/sans signal/.test(wf) && !/2\.1\.260/.test(wf));
  const noKeyText = all.map((n) => profileText(noKey, n)).join("\n") + txt(noKey, "docs/workflow.md") + profileText(noKey, "project-lead");
  check("module advisor sans la clé : ni consigne, ni étape, ni mention de l'advisor", noKey.res.status === 0 && !/advisor/i.test(noKeyText) && !/DISABLE_TELEMETRY/.test(noKeyText));
  const noModule = gen(mods.filter((m) => m !== "advisor"), { profiles: all });
  check("sans le module advisor : aucune mention, project-lead complet", !/advisor/i.test(all.map((n) => profileText(noModule, n)).join("\n") + txt(noModule, "docs/workflow.md")) && (profileText(noModule, "project-lead").match(/^\| [1-5] \|/gm) ?? []).length === 5);

  // règle de cohérence : consigne présente exactement dans les profils dont le modèle est sonnet ou haiku
  const agentsDir = path.join(root, "skills", "project-bootstrap", "assets", "modules", "agent-profiles");
  for (const tpl of ["templates", "templates.en"]) {
    const dir = path.join(agentsDir, tpl, ".claude", "agents");
    const rows = readdirSync(dir).map((f) => {
      const text = readFileSync(path.join(dir, f), "utf8");
      return { f, model: /^model: (\S+)$/m.exec(text)?.[1] ?? "", block: /@@module:advisor-on/.test(text) };
    });
    check(`cohérence modèle et consigne (${tpl}) : le bloc advisor-on est dans tout profil sonnet ou haiku, dans aucun autre`, rows.every((r) => r.block === /sonnet|haiku/.test(r.model)), JSON.stringify(rows.filter((r) => r.block !== /sonnet|haiku/.test(r.model))));
  }

  // clé advisor : valeurs, dépendance, héritage, désactivation
  const bad = gen(mods, { advisor: "oui" });
  check("advisor : une valeur autre que true ou null est refusée (code 1)", bad.res.status === 1 && /advisor doit valoir true/.test(bad.res.stderr), bad.res.stderr);
  const noMod = gen(mods.filter((m) => m !== "advisor"), { advisor: true });
  check("advisor: true sans le module advisor refusé (code 1, aucun fichier écrit)", noMod.res.status === 1 && /advisor exige le module advisor/.test(noMod.res.stderr) && !existsSync(path.join(noMod.out, ".claude/settings.json")), noMod.res.stderr);
  check("advisor: true consigné au manifeste ; absent sinon", JSON.parse(txt(on, ".bootstrap/manifest.json")).config.advisor === true && JSON.parse(txt(noKey, ".bootstrap/manifest.json")).config.advisor === undefined);
  const upd = run({ ...base, visibility: "private", modules: mods, profiles: all }, ["--update"], on.out);
  check("--update sans advisor dans la configuration : la clé du manifeste est conservée et la consigne reste", upd.res.status === 0 && JSON.parse(txt(on, ".bootstrap/manifest.json")).config.advisor === true && /consulte l'advisor/.test(profileText(on, "developer")), upd.res.stderr);
  const off = run({ ...base, visibility: "private", modules: mods, profiles: all, advisor: null }, ["--update"], on.out);
  check("advisor: null : désactive la clé (ni héritée ni consignée), la consigne est retirée des profils", off.res.status === 0 && JSON.parse(txt(on, ".bootstrap/manifest.json")).config.advisor === undefined && !/advisor/i.test(profileText(on, "developer")), off.res.stderr);
  const noProfile = gen(mods, { advisor: true });
  check("advisor: true sans profil optionnel : l'étape du Nouveau poste est générée, developer porte la consigne, aucun avertissement", noProfile.res.status === 0 && /\*\*Advisor\*\*/.test(txt(noProfile, "docs/workflow.md")) && /consulte l'advisor/.test(txt(noProfile, ".claude/agents/developer.md")) && !(noProfile.report?.warnings ?? []).some((w) => /advisor: true/.test(w)), JSON.stringify(noProfile.report?.warnings));
  check("advisor: true avec des profils : aucun avertissement", !(on.report?.warnings ?? []).some((w) => /advisor: true/.test(w)));
  const offFalse = gen(mods, { advisor: false });
  check("advisor: false équivaut à null", offFalse.res.status === 0 && JSON.parse(txt(offFalse, ".bootstrap/manifest.json")).config.advisor === undefined);
  const dropModule = run({ ...base, visibility: "private", modules: mods.filter((m) => m !== "advisor"), profiles: all }, ["--update"], gen(mods, { advisor: true, profiles: all }).out);
  check("--update qui retire le module advisor alors que la clé est héritée : échec (code 1)", dropModule.res.status === 1 && /advisor exige le module advisor/.test(dropModule.res.stderr), dropModule.res.stderr);

  // aucun réglage écrit, quels que soient les modules
  check("advisor : aucun réglage écrit (pas de advisorModel ni de variable d'environnement dans settings.json)", !/advisorModel|DISABLE_TELEMETRY|"env"/.test(txt(on, ".claude/settings.json")));
  const everyModule = gen([...mods, "arc42", "agent-teams", "githooks", "release", "projects", "dependabot"], { cliInstall: "local", advisor: true, profiles: all });
  const forbidden = /["']?(DISABLE_TELEMETRY|DO_NOT_TRACK|DISABLE_GROWTHBOOK|CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC|CLAUDE_CODE_DISABLE_ADVISOR_TOOL|ANTHROPIC_BASE_URL|CLAUDE_CODE_SUBAGENT_MODEL|advisorModel)["']?\s*[:=]/;
  const agentTeamsFlag = /["']?CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS["']?\s*[:=]/;
  const definesTelemetry = walk(everyModule.out).filter((f) => !f.includes(`${path.sep}.bootstrap${path.sep}base`) && (forbidden.test(readFileSync(f, "utf8")) || (!f.endsWith(`docs${path.sep}workflow.md`) && agentTeamsFlag.test(readFileSync(f, "utf8")))));
  check("advisor : avec tous les modules, aucun fichier généré ne définit DISABLE_TELEMETRY, DO_NOT_TRACK, DISABLE_GROWTHBOOK, CLAUDE_CODE_DISABLE_*, ni advisorModel", everyModule.res.status === 0 && definesTelemetry.length === 0, `${everyModule.res.stderr} ${definesTelemetry.join(", ")}`);
  const noParent = gen(["claude", "advisor"]);
  check("advisor sans agent-profiles refusé (code 1)", noParent.res.status === 1 && /advisor requiert agent-profiles/.test(noParent.res.stderr), noParent.res.stderr);

  // anglais
  const en = gen(mods, { advisor: true, profiles: all, docLanguage: "en" });
  check("advisor : version anglaise (consigne des profils et étape du Nouveau poste)", all.every((n) => /consult the advisor/.test(profileText(en, n)) && /nothing forces it/.test(profileText(en, n))) && /Do not set `DISABLE_TELEMETRY`/.test(txt(en, "docs/workflow.md")));
  const enNo = gen(mods, { profiles: all, docLanguage: "en" });
  check("sans la clé, en anglais : aucune mention de l'advisor ni de DISABLE_TELEMETRY", !/advisor/i.test(all.map((n) => profileText(enNo, n)).join("\n") + txt(enNo, "docs/workflow.md")) && !/DISABLE_TELEMETRY/.test(txt(enNo, "docs/workflow.md")));

  // catalogue
  const listedNow = JSON.parse(spawnSync(process.execPath, [scaffold, "--list-modules"], { encoding: "utf8" }).stdout);
  const adv = listedNow.modules.find((m) => m.name === "advisor");
  check("advisor : listé par défaut non, avec la question de phase 0 (clé advisor, défaut non) et une description expérimentale, payante, réglage utilisateur", adv && adv.default === false && adv.requires.join() === "agent-profiles" && adv.questions.length === 1 && /clé advisor/.test(adv.questions[0]) && /Défaut : non/.test(adv.questions[0]) && /expérimentale et payante/.test(adv.description) && /réglage utilisateur/.test(adv.description), JSON.stringify(adv));
}

// frontmatter des agents générés (#37) : champs documentés, effort, maxTurns, nommage
{
  const KNOWN = ["name", "description", "tools", "disallowedTools", "model", "permissionMode", "maxTurns", "autoCompactWindow", "skills", "mcpServers", "hooks", "memory", "background", "omitClaudeMd", "effort", "isolation", "color", "initialPrompt", "experimental"];
  const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
  // Retourne la liste des défauts d'un fichier d'agent (nom de fichier et texte fournis).
  const validateAgent = (file, text) => {
    const problems = [];
    if (!/^[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(file)) problems.push(`${file} : nom de fichier non conforme (minuscules, chiffres, tirets)`);
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!m) return [...problems, `${file} : frontmatter absent`];
    const top = new Map();
    for (const line of m[1].split(/\r?\n/)) {
      const k = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
      if (k) top.set(k[1], k[2].trim());
    }
    for (const k of top.keys()) if (!KNOWN.includes(k)) problems.push(`${file} : champ inconnu ${k}`);
    if (top.has("effort") && !EFFORTS.includes(top.get("effort"))) problems.push(`${file} : effort invalide ${top.get("effort")}`);
    if (top.has("maxTurns") && !/^[1-9][0-9]*$/.test(top.get("maxTurns"))) problems.push(`${file} : maxTurns invalide ${top.get("maxTurns")}`);
    if (top.get("name") !== file.replace(/\.md$/, "")) problems.push(`${file} : name (${top.get("name")}) différent du nom de fichier`);
    return problems;
  };
  const ok = "---\nname: developer\ndescription: x\nhooks:\n  PreToolUse:\n    - matcher: \"Bash\"\n      hooks:\n        - type: command\n          command: node x\n---\ncorps\n";
  check("frontmatter agents : champ inconnu (effrot) refusé en nommant le champ", validateAgent("developer.md", "---\nname: developer\ndescription: x\neffrot: high\n---\n").some((p) => /champ inconnu effrot/.test(p)));
  check("frontmatter agents : clés imbriquées de hooks acceptées", validateAgent("developer.md", ok).length === 0, validateAgent("developer.md", ok).join(";"));
  check("frontmatter agents : nom de fichier Developer.md et qa_engineer.md refusés", validateAgent("Developer.md", ok.replace("developer", "Developer")).some((p) => /nom de fichier non conforme/.test(p)) && validateAgent("qa_engineer.md", ok).some((p) => /nom de fichier non conforme/.test(p)));
  check("frontmatter agents : name différent du fichier refusé", validateAgent("developer.md", ok.replace("name: developer", "name: dev")).some((p) => /différent du nom de fichier/.test(p)));
  check("frontmatter agents : effort inconnu et maxTurns non entier ou nul refusés", validateAgent("developer.md", ok.replace("description: x", "description: x\neffort: huge")).some((p) => /effort invalide/.test(p)) && ["0", "-3", "4.5", "abc"].every((v) => validateAgent("developer.md", ok.replace("description: x", `description: x\nmaxTurns: ${v}`)).some((p) => /maxTurns invalide/.test(p))));

  const PROFILES = ["acceptance-tester", "business-analyst", "compliance-reviewer", "developer", "devops-engineer", "product-owner", "scout", "second-opinion"];
  const DOMAIN = { regulatedDomain: "RGPD, paiement" };
  const TABLE = {
    architect: ["opus", "high", "40"], "qa-engineer": ["opus", "high", "40"], "spec-reviewer": ["opus", "high", "30"], "architecture-explorer": ["opus", "high", "40"],
    developer: ["sonnet", "high", "60"], "business-analyst": ["sonnet", "high", "40"], "product-owner": ["sonnet", "medium", "20"], "arc42-keeper": ["sonnet", "medium", "30"], "traceability-checker": ["sonnet", "medium", "25"], "acceptance-tester": ["sonnet", "medium", "25"], scout: ["haiku", "medium", "20"], "second-opinion": ["opus", "high", "30"], "compliance-reviewer": ["opus", "high", "30"], "devops-engineer": ["sonnet", "medium", "25"],
  };
  const field = (text, k) => new RegExp(`^${k}: (\\S+)\\r?$`, "m").exec(text)?.[1];
  const withKeys = { effort: "max", model: "haiku", maxTurns: 1 };
  for (const lang of [{}, { docLanguage: "en" }]) {
    const tag = lang.docLanguage ?? "fr";
    const g = run({ ...base, visibility: "private", modules: allModules, profiles: PROFILES, ...DOMAIN, ...lang });
    const agentsDir = path.join(g.out, ".claude", "agents");
    const files = g.res.status === 0 ? readdirSync(agentsDir).filter((f) => f.endsWith(".md")) : [];
    const problems = files.flatMap((f) => validateAgent(f, readFileSync(path.join(agentsDir, f), "utf8")));
    check(`frontmatter agents (${tag}) : tous les agents générés sont conformes (${files.length} fichiers)`, g.res.status === 0 && files.length >= 10 && problems.length === 0, g.res.stderr + problems.join("; "));
    const wrong = Object.entries(TABLE).filter(([n]) => existsSync(path.join(agentsDir, `${n}.md`))).filter(([n, v]) => { const t = readFileSync(path.join(agentsDir, `${n}.md`), "utf8"); return [field(t, "model"), field(t, "effort"), field(t, "maxTurns")].join() !== v.join(); }).map(([n]) => n);
    check(`frontmatter agents (${tag}) : valeurs de départ de la table pour les agents générés avec agent-profiles`, g.res.status === 0 && wrong.length === 0, wrong.join(", "));
    const legacy = run({ ...base, visibility: "private", modules: allModules.filter((m) => m !== "agent-profiles" && m !== "advisor"), ...lang });
    const legacyDir = path.join(legacy.out, ".claude", "agents");
    const legacyWrong = ["spec-reviewer", "architecture-explorer", "arc42-keeper", "traceability-checker"].filter((n) => { const t = readFileSync(path.join(legacyDir, `${n}.md`), "utf8"); return [field(t, "model"), field(t, "effort"), field(t, "maxTurns")].join() !== TABLE[n].join(); });
    check(`frontmatter agents (${tag}) : valeurs de départ des quatre agents historiques sans agent-profiles`, legacy.res.status === 0 && legacyWrong.length === 0, legacyWrong.join(", "));
    const lead = readFileSync(path.join(agentsDir, "project-lead.md"), "utf8");
    check(`frontmatter agents (${tag}) : project-lead sans model, effort ni maxTurns`, !/^(model|effort|maxTurns):/m.test(lead));
    const ignored = run({ ...base, visibility: "private", modules: allModules, profiles: PROFILES, ...DOMAIN, ...lang, ...withKeys });
    check(`frontmatter agents (${tag}) : les clés effort, model et maxTurns de la configuration n'ont aucun effet`, ignored.res.status === 0 && files.every((f) => readFileSync(path.join(ignored.out, ".claude", "agents", f), "utf8") === readFileSync(path.join(agentsDir, f), "utf8")), ignored.res.stderr);
  }
}

// profils optionnels du lot 2a (#34) : acceptance-tester, scout, second-opinion
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const has = (r, n) => existsSync(path.join(r.out, ".claude/agents", n + ".md"));
  const front = (t) => /^---\r?\n([\s\S]*?)\r?\n---/.exec(t)?.[1] ?? "";
  const toolsOf = (t) => (/^tools: (.*)$/m.exec(front(t))?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const NEW = ["acceptance-tester", "scout", "second-opinion"];
  const mods = ["claude", "github", "openspec", "archgate", "agent-profiles", "advisor"];

  const only = gen(mods, { profiles: ["second-opinion", "scout", "acceptance-tester"] });
  check("lot 2a : les trois profils sont générés sur choix, consignés triés au manifeste", only.res.status === 0 && NEW.every((n) => has(only, n)) && JSON.parse(txt(only, ".bootstrap/manifest.json")).config.profiles.join() === NEW.join(), only.res.stderr);
  const none = gen(mods);
  check("lot 2a : absents sans la clé profiles", NEW.every((n) => !has(none, n)));
  const one = gen(mods, { profiles: ["scout"] });
  check("lot 2a : seul le profil listé est généré", has(one, "scout") && !has(one, "acceptance-tester") && !has(one, "second-opinion"));

  for (const n of NEW) {
    const t = txt(only, `.claude/agents/${n}.md`);
    check(`profil ${n} : nom = fichier, sans hooks, sans Write, Edit, Agent ni Skill`, new RegExp(`^name: ${n}$`, "m").test(front(t)) && !/^hooks:/m.test(front(t)) && !toolsOf(t).some((x) => ["Write", "Edit", "Agent", "Skill"].includes(x)));
    check(`profil ${n} : qui écrit ne relit pas, en français et en anglais`, /Qui écrit ne relit pas/.test(t) && /Whoever writes does not review/.test(txt(gen(mods, { profiles: NEW, docLanguage: "en" }), `.claude/agents/${n}.md`)));
  }
  check("second-opinion : ni Bash (lecture web et dépôt seulement)", !toolsOf(txt(only, ".claude/agents/second-opinion.md")).includes("Bash") && ["WebSearch", "WebFetch"].every((x) => toolsOf(txt(only, ".claude/agents/second-opinion.md")).includes(x)));
  check("acceptance-tester et scout : Read, Glob, Grep et Bash", ["acceptance-tester", "scout"].every((n) => ["Read", "Glob", "Grep", "Bash"].every((x) => toolsOf(txt(only, `.claude/agents/${n}.md`)).includes(x))));
  check("second-opinion : brief neutre, préférence écartée et signalée, lancement en sous-agent", /écarte-les et signale-le/.test(txt(only, ".claude/agents/second-opinion.md")) && /sous-agent/.test(txt(only, ".claude/agents/second-opinion.md")));
  check("acceptance-tester : ne lit pas le code, preuves par gh et openspec, pas de lanceur de tests", /Ne lis pas le code source/.test(txt(only, ".claude/agents/acceptance-tester.md")) && /gh pr checks/.test(txt(only, ".claude/agents/acceptance-tester.md")) && /openspec validate/.test(txt(only, ".claude/agents/acceptance-tester.md")) && /ne lances pas de lanceur de tests/.test(txt(only, ".claude/agents/acceptance-tester.md")));
  const bare = gen(["claude", "agent-profiles"], { profiles: NEW });
  check("lot 2a sans github, openspec ni archgate : aucune référence à ces modules, critères pris dans le brief", NEW.every((n) => !/archgate|openspec|opsx|gh |arc42|spec-reviewer/i.test(txt(bare, `.claude/agents/${n}.md`))) && /critères d'acceptation dans le brief/.test(txt(bare, ".claude/agents/acceptance-tester.md")));

  // table du hook
  const guard = txt(only, ".claude/hooks/profile-guard.mjs");
  check("lot 2a : entrées de la table du hook (écriture vide)", NEW.every((n) => new RegExp(`"?${n}"?: \\{ write: \\[\\], shell: \\[\\], agents: \\[\\], skills: \\[\\] \\}`).test(guard)));

  // project-lead
  const lead = txt(only, ".claude/agents/project-lead.md");
  check("project-lead : délègue au lot 2a s'il existe, brief neutre en sous-agent, recette et contre-avis dans le parcours", /`scout` pour l'exploration/.test(lead) && /`acceptance-tester` pour la recette/.test(lead) && /brief neutre/.test(lead) && /jamais en équipe/.test(lead) && /recette d'`acceptance-tester`/.test(lead) && /contre-avis de `second-opinion`/.test(lead));
  const leadEn = txt(gen(mods, { profiles: NEW, docLanguage: "en" }), ".claude/agents/project-lead.md");
  check("project-lead (en) : même délégation", /`scout` for factual exploration/.test(leadEn) && /neutral brief/.test(leadEn) && /never in a team/.test(leadEn) && /counter-opinion from `second-opinion`/.test(leadEn));

  // advisor : consigne dans acceptance-tester et scout (sonnet, haiku), pas dans second-opinion (opus)
  const adv = gen(mods, { advisor: true, profiles: NEW });
  check("advisor : acceptance-tester et scout portent la consigne, second-opinion non", ["acceptance-tester", "scout"].every((n) => /consulte l'advisor/.test(txt(adv, `.claude/agents/${n}.md`))) && !/advisor/i.test(txt(adv, ".claude/agents/second-opinion.md")), adv.res.stderr);
  const advOnly = gen(mods, { advisor: true, profiles: ["second-opinion"] });
  check("advisor : aucun avertissement quand seul second-opinion est choisi (developer porte la consigne)", advOnly.res.status === 0 && !(advOnly.report?.warnings ?? []).some((w) => /advisor: true/.test(w)) && /consulte l'advisor/.test(txt(advOnly, ".claude/agents/developer.md")), JSON.stringify(advOnly.report?.warnings));
  const advScout = gen(mods, { advisor: true, profiles: ["scout"] });
  check("advisor : pas d'avertissement avec scout", !(advScout.report?.warnings ?? []).some((w) => /advisor: true sans profil/.test(w)));

  // catalogue : question de phase 0 aux six noms
  const listed = JSON.parse(spawnSync(process.execPath, [scaffold, "--list-modules"], { encoding: "utf8" }).stdout);
  const ap = listed.modules.find((m) => m.name === "agent-profiles");
  check("agent-profiles : la question de phase 0 cite les huit profils", ap && ["acceptance-tester", "scout", "second-opinion", "business-analyst", "developer", "product-owner", "devops-engineer", "compliance-reviewer"].every((n) => ap.questions.some((q) => q.includes(n))), JSON.stringify(ap?.questions));
}

// profils du lot 2b (#34) : devops-engineer, compliance-reviewer et la clé regulatedDomain
{
  const gen = (modules, extra = {}, vis = "private") => run({ ...base, visibility: vis, modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const has = (r, n) => existsSync(path.join(r.out, ".claude/agents", n + ".md"));
  const front = (t) => /^---\r?\n([\s\S]*?)\r?\n---/.exec(t)?.[1] ?? "";
  const toolsOf = (t) => (/^tools: (.*)$/m.exec(front(t))?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const mods = ["claude", "github", "release", "openspec", "archgate", "agent-profiles", "advisor"];
  const DOM = "RGPD, paiement (UE)";
  const manifestOf = (r) => JSON.parse(txt(r, ".bootstrap/manifest.json")).config;

  // génération sur choix
  const both = gen(mods, { profiles: ["devops-engineer", "compliance-reviewer"], regulatedDomain: DOM });
  check("lot 2b : les deux profils sont générés sur choix, la clé et la liste sont consignées au manifeste", both.res.status === 0 && has(both, "devops-engineer") && has(both, "compliance-reviewer") && manifestOf(both).regulatedDomain === DOM && manifestOf(both).profiles.join() === "compliance-reviewer,devops-engineer", both.res.stderr);
  const devOnly = gen(mods, { profiles: ["devops-engineer"] });
  check("lot 2b : devops-engineer seul n'exige pas de domaine", devOnly.res.status === 0 && has(devOnly, "devops-engineer") && !has(devOnly, "compliance-reviewer") && manifestOf(devOnly).regulatedDomain === undefined, devOnly.res.stderr);

  // dépendance
  const noDomain = gen(mods, { profiles: ["compliance-reviewer"] });
  check("compliance-reviewer sans regulatedDomain refusé (code 1, clé nommée, aucun fichier)", noDomain.res.status === 1 && /compliance-reviewer exige la clé regulatedDomain/.test(noDomain.res.stderr) && !existsSync(path.join(noDomain.out, ".claude")), noDomain.res.stderr);

  // valeurs de regulatedDomain
  const valid = ["RGPD", "RGPD, paiement", "Santé (HDS)", "Statut des travailleurs / emploi", "L'accès & l’audit", "a", "x".repeat(120), "Données personnelles".normalize("NFD"), "  RGPD  "];
  const invalid = ["", "   ", "--", "...", "x".repeat(121), "a\nb", "a\tb", 'a"b', "a{b", "a}b", "a`b", "a@@b", "a@b", "a b", "a|b", "a$b", "<x>", "a b", "a%b"];
  const okAll = valid.every((v) => gen(mods, { profiles: ["compliance-reviewer"], regulatedDomain: v }).res.status === 0);
  check("regulatedDomain : valeurs valides acceptées (accents, NFD, parenthèses, longueur 120, espaces de bord retirés)", okAll);
  const badOnes = invalid.filter((v) => gen(mods, { profiles: ["compliance-reviewer"], regulatedDomain: v }).res.status !== 1);
  check("regulatedDomain : valeurs invalides refusées (vide, espaces seuls, ponctuation seule, 121, retour à la ligne, tabulation, guillemet, accolades, accent grave, @, séparateur U+2028, espace insécable, tube, dollar, chevrons, pourcent)", badOnes.length === 0, JSON.stringify(badOnes));
  const nonText = [false, 12, ["RGPD"], true, {}].filter((v) => gen(mods, { profiles: ["compliance-reviewer"], regulatedDomain: v }).res.status !== 1);
  check("regulatedDomain : false, nombre, booléen, liste et objet refusés", nonText.length === 0, JSON.stringify(nonText));
  const trimmed = gen(mods, { profiles: ["compliance-reviewer"], regulatedDomain: "  RGPD  " });
  const nfd = gen(mods, { profiles: ["compliance-reviewer"], regulatedDomain: "Données".normalize("NFD") });
  check("regulatedDomain : espaces de bord retirés, texte normalisé NFC au manifeste", manifestOf(trimmed).regulatedDomain === "RGPD" && manifestOf(nfd).regulatedDomain === "Données");
  const noModule = gen(["claude", "github"], { regulatedDomain: "RGPD" });
  check("regulatedDomain sans le module agent-profiles refusée (code 1)", noModule.res.status === 1 && /regulatedDomain exige le module agent-profiles/.test(noModule.res.stderr), noModule.res.stderr);

  // emplacement de l'injection
  const reviewer = txt(both, ".claude/agents/compliance-reviewer.md");
  const inFront = front(reviewer).includes("RGPD");
  const elsewhere = walk(both.out).filter((f) => !f.includes(`${path.sep}.bootstrap${path.sep}`) && !f.endsWith(`compliance-reviewer.md`) && readFileSync(f, "utf8").includes(DOM));
  check("regulatedDomain : le domaine figure dans le corps de compliance-reviewer, ni dans son frontmatter ni dans un autre fichier généré", reviewer.includes(`Domaine déclaré à la mise en place du projet : ${DOM}.`) && !inFront && elsewhere.length === 0, elsewhere.join(", "));
  check("compliance-reviewer : sources par constat, hypothèses distinguées, ne remplace pas un juriste", /ne rends pas d'avis juridique/.test(reviewer) && /Chaque constat cite sa source/.test(reviewer) && /hypothèse à faire confirmer/.test(reviewer) && /Tu ne remplaces pas un juriste/.test(reviewer));

  // cycle de vie
  const upd = run({ ...base, visibility: "private", modules: mods, profiles: ["compliance-reviewer"] }, ["--update"], both.out);
  check("--update sans regulatedDomain : la valeur du manifeste est conservée, le profil reste généré", upd.res.status === 0 && manifestOf(both).regulatedDomain === DOM && has(both, "compliance-reviewer"), upd.res.stderr);
  const off = run({ ...base, visibility: "private", modules: mods, profiles: ["compliance-reviewer"], regulatedDomain: null }, ["--update"], both.out);
  check("regulatedDomain: null avec compliance-reviewer hérité : refusé (code 1)", off.res.status === 1 && /compliance-reviewer exige la clé regulatedDomain/.test(off.res.stderr), off.res.stderr);
  const dev = gen(mods, { profiles: ["devops-engineer"], regulatedDomain: "RGPD" });
  const offDev = run({ ...base, visibility: "private", modules: mods, profiles: ["devops-engineer"], regulatedDomain: null }, ["--update"], dev.out);
  check("regulatedDomain: null sans compliance-reviewer : la clé quitte le manifeste", dev.res.status === 0 && offDev.res.status === 0 && manifestOf(dev).regulatedDomain === undefined, offDev.res.stderr);
  const removed = run({ ...base, visibility: "private", modules: ["claude", "github"], profiles: [] }, ["--update"], both.out);
  check("--update qui retire agent-profiles alors que regulatedDomain est héritée : échec (code 1)", removed.res.status === 1 && /regulatedDomain exige le module agent-profiles/.test(removed.res.stderr), removed.res.stderr);
  const removedOk = run({ ...base, visibility: "private", modules: ["claude", "github"], profiles: [], regulatedDomain: null }, ["--update"], both.out);
  check("avec regulatedDomain: null en plus : le retrait réussit", removedOk.res.status === 0, removedOk.res.stderr);

  // avertissements
  const warnDom = gen(mods, { profiles: ["devops-engineer"], regulatedDomain: "RGPD" });
  check("regulatedDomain sans compliance-reviewer : sans effet, avertissement du rapport", warnDom.res.status === 0 && !has(warnDom, "compliance-reviewer") && (warnDom.report?.warnings ?? []).some((w) => /regulatedDomain sans le profil compliance-reviewer/.test(w)), JSON.stringify(warnDom.report?.warnings));
  check("avec le profil : pas d'avertissement sur regulatedDomain", !(both.report?.warnings ?? []).some((w) => /regulatedDomain/.test(w)));
  const advOpus = gen(mods, { advisor: true, profiles: ["compliance-reviewer"], regulatedDomain: "RGPD" });
  check("advisor avec compliance-reviewer seul (opus) : aucun avertissement, compliance-reviewer sans consigne", advOpus.res.status === 0 && !(advOpus.report?.warnings ?? []).some((w) => /advisor: true/.test(w)) && !/advisor/i.test(txt(advOpus, ".claude/agents/compliance-reviewer.md")), JSON.stringify(advOpus.report?.warnings));
  const advDev = gen(mods, { advisor: true, profiles: ["devops-engineer"] });
  check("advisor avec devops-engineer : pas d'avertissement, consigne présente ; compliance-reviewer sans consigne", !(advDev.report?.warnings ?? []).some((w) => /advisor: true sans profil/.test(w)) && /consulte l'advisor/.test(txt(advDev, ".claude/agents/devops-engineer.md")) && !/advisor/i.test(reviewer));

  // outils et droits
  for (const n of ["devops-engineer", "compliance-reviewer"]) {
    const t = txt(both, `.claude/agents/${n}.md`);
    check(`profil ${n} : Read, Glob, Grep et Bash, sans Write, Edit, Agent ni Skill`, ["Read", "Glob", "Grep", "Bash"].every((x) => toolsOf(t).includes(x)) && !toolsOf(t).some((x) => ["Write", "Edit", "Agent", "Skill"].includes(x)) && !/^hooks:/m.test(front(t)));
    check(`profil ${n} : entrée de la table du hook sans droit`, new RegExp(`"${n}": \\{ write: \\[\\], shell: \\[\\], agents: \\[\\], skills: \\[\\] \\}`).test(txt(both, ".claude/hooks/profile-guard.mjs")));
    check(`profil ${n} : qui écrit ne relit pas, en français et en anglais`, /Qui écrit ne relit pas/.test(t) && /Whoever writes does not review/.test(txt(gen(mods, { profiles: ["devops-engineer", "compliance-reviewer"], regulatedDomain: DOM, docLanguage: "en" }), `.claude/agents/${n}.md`)));
  }

  // modules absents
  const bare = gen(["claude", "agent-profiles"], { profiles: ["devops-engineer", "compliance-reviewer"], regulatedDomain: "RGPD" });
  check("lot 2b sans github, release, openspec ni archgate : aucune référence à ces modules", ["devops-engineer", "compliance-reviewer"].every((n) => !/archgate|openspec|opsx|gh |release-please|arc42|spec-reviewer/i.test(txt(bare, `.claude/agents/${n}.md`))), txt(bare, ".claude/agents/devops-engineer.md"));
  const devPart = txt(gen(["claude", "github", "agent-profiles"], { profiles: ["devops-engineer"] }), ".claude/agents/devops-engineer.md");
  check("devops-engineer avec github seul : CI lue, pas de release ni d'openspec", /gh pr checks/.test(devPart) && !/release-please|gh release/.test(devPart) && !/openspec|archgate/.test(devPart));

  // commandes des modèles : acceptées par le hook en lecture seule (le jeu de caractères refuse %, les guillemets, les tubes)
  const readOnly = path.join(root, "skills", "project-bootstrap", "assets", "modules", "claude", "templates", ".claude", "hooks", "read-only-bash.mjs");
  const bad2 = [];
  for (const tpl of ["templates", "templates.en"]) {
    for (const n of ["devops-engineer", "compliance-reviewer"]) {
      const text = readFileSync(path.join(root, "skills", "project-bootstrap", "assets", "modules", "agent-profiles", tpl, ".claude", "agents", `${n}.md`), "utf8");
      for (const m of text.matchAll(/`((?:gh|git|openspec|archgate) [^`]*)`/g)) {
        const cmd = m[1].replace(/<[^>]+>/g, "1");
        const r = spawnSync(process.execPath, [readOnly], { input: JSON.stringify({ tool_name: "Bash", tool_input: { command: cmd } }), encoding: "utf8" });
        if (r.status !== 0) bad2.push(`${tpl}/${n} : ${cmd}`);
      }
    }
  }
  check("lot 2b : toutes les commandes citées dans les modèles sont acceptées par read-only-bash.mjs", bad2.length === 0, bad2.join(" ; "));

  // project-lead
  const lead = txt(both, ".claude/agents/project-lead.md");
  check("project-lead : délègue à devops-engineer et compliance-reviewer s'ils existent, traçabilité gardée par qa-engineer", /`devops-engineer` pour lire la CI et la livraison/.test(lead) && /`compliance-reviewer` pour la relecture réglementaire/.test(lead) && /reste à `qa-engineer`/.test(lead));
  const leadEn = txt(gen(mods, { profiles: ["devops-engineer", "compliance-reviewer"], regulatedDomain: DOM, docLanguage: "en" }), ".claude/agents/project-lead.md");
  check("project-lead (en) : même délégation", /`devops-engineer` to read CI and delivery/.test(leadEn) && /`compliance-reviewer` for the regulatory review/.test(leadEn));

  // anglais
  const en = gen(mods, { profiles: ["devops-engineer", "compliance-reviewer"], regulatedDomain: "GDPR, payment", docLanguage: "en" });
  check("compliance-reviewer (en) : domaine dans le corps, ne remplace pas un juriste", /Domain declared when the project was set up: GDPR, payment\./.test(txt(en, ".claude/agents/compliance-reviewer.md")) && /do not replace a lawyer/.test(txt(en, ".claude/agents/compliance-reviewer.md")));
}

// docs/workflow.md : qui fait quoi, échelle d'arbitrage, double encodage, commandes OpenSpec (#38)
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const section = (t, titles) => {
    const m = new RegExp(`^## (?:${titles})\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(t);
    return m ? m[1] : null;
  };
  const rows = (s) => (s ?? "").split("\n").filter((l) => l.startsWith("| ") && !/^\| (Agent|Règle|Rule) /.test(l));
  const cells = (l) => l.slice(1, -1).split("|").map((c) => c.trim());
  const ALL = ["product-owner", "developer", "business-analyst", "acceptance-tester", "scout", "second-opinion", "devops-engineer", "compliance-reviewer"];
  const full = ["claude", "github", "release", "openspec", "archgate", "arc42", "githooks", "agent-profiles"];
  const configs = [
    ["tous les profils", full, { profiles: ALL, regulatedDomain: "RGPD" }],
    ["aucun profil", full, {}],
    ["agent-profiles seul", ["claude", "agent-profiles"], {}],
  ];
  for (const lang of ["fr", "en"]) {
    const T = lang === "fr"
      ? { who: "Qui fait quoi", scale: "Échelle d'arbitrage", dbl: "Double encodage des règles", rules: "Règles", only: "consigne seulement" }
      : { who: "Who does what", scale: "Arbitration ladder", dbl: "Double encoding of the rules", rules: "Rules", only: "instruction only" };
    for (const [label, mods, extra] of configs) {
      const r = gen(mods, { ...extra, docLanguage: lang });
      const wf = txt(r, "docs/workflow.md");
      const names = rows(section(wf, T.who)).map((l) => /^`([\w-]+)`$/.exec(cells(l)[0])?.[1]).sort();
      const files = readdirSync(path.join(r.out, ".claude", "agents")).map((f) => f.replace(/\.md$/, "")).sort();
      check(`workflow.md (${lang}, ${label}) : un agent généré = une ligne de la table`, r.res.status === 0 && names.join() === files.join(), `${names} / ${files}`);
      const lead = txt(r, ".claude/agents/project-lead.md");
      const ladder = (t) => t.split("\n").filter((l) => /^\| [1-5] \|/.test(l));
      check(`workflow.md (${lang}, ${label}) : échelle d'arbitrage identique à project-lead`, ladder(wf).length === 5 && ladder(wf).join("\n") === ladder(lead).join("\n"));
      check(`workflow.md (${lang}, ${label}) : journal des décisions`, section(wf, lang === "fr" ? "Journal des décisions" : "Decision log") !== null && /ADR/.test(section(wf, lang === "fr" ? "Journal des décisions" : "Decision log")) === mods.includes("archgate"));
      const dbl = section(wf, T.dbl);
      check(`workflow.md (${lang}, ${label}) : table de double encodage, garde-fou existant ou « ${T.only} »`, dbl !== null && rows(dbl).length > 0 && rows(dbl).every((l) => {
        const guard = cells(l)[1];
        const refs = [...guard.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]).filter((p) => /\/|\.\w+$/.test(p));
        return refs.every((p) => existsSync(path.join(r.out, ...p.split("/")))) && (refs.length > 0 || guard.includes(T.only));
      }), rows(dbl).join("\n"));
      const claudeMd = section(txt(r, "CLAUDE.md"), T.rules) ?? "";
      const table = rows(dbl).map((l) => cells(l)[0]).join("\n");
      const missing = claudeMd.split("\n").filter((l) => l.startsWith("- ")).filter((l) => !table.includes(l.slice(2, 32)));
      check(`workflow.md (${lang}, ${label}) : chaque règle de CLAUDE.md a sa ligne`, missing.length === 0, missing.join(" ; "));
      check(`workflow.md (${lang}, ${label}) : commandes OpenSpec documentées`, /\/opsx:(explore|update|sync)|skip_specs/.test(wf) === mods.includes("openspec") && (!mods.includes("openspec") || (/\/opsx:explore/.test(wf) && /\/opsx:update/.test(wf) && /\/opsx:sync/.test(wf) && /skip_specs: true/.test(wf))));
    }
    const noOpen = txt(gen(["claude", "github"], { docLanguage: lang }), "docs/workflow.md");
    check(`workflow.md (${lang}) : sans openspec, ni explore, ni update, ni sync, ni skip_specs`, !/\/opsx:(explore|update|sync)|skip_specs/.test(noOpen));
    const arch = gen(["claude", "archgate"], { docLanguage: lang });
    const rulesD = rows(section(txt(arch, "docs/workflow.md"), T.dbl)).map(cells).find((c) => c[0].includes("rules.d.ts"));
    check(`workflow.md (${lang}) : archgate sans agent-profiles : rules.d.ts en « ${T.only} » sans fichier cité`, rulesD && rulesD[1].includes(T.only) && !/`/.test(rulesD[1]));
    const scoutOnly = gen(full, { profiles: ["scout"], docLanguage: lang });
    const scoutRows = rows(section(txt(scoutOnly, "docs/workflow.md"), T.who)).map((l) => cells(l)[0]);
    check(`workflow.md (${lang}) : seul le profil choisi a sa ligne`, scoutRows.includes("`scout`") && scoutRows.includes("`developer`") && !scoutRows.includes("`product-owner`"));
    const noProf = txt(gen(["claude", "github", "openspec"], { docLanguage: lang }), "docs/workflow.md");
    check(`workflow.md (${lang}) : sans agent-profiles, ni qui fait quoi, ni échelle, ni journal`, section(noProf, T.who) === null && section(noProf, T.scale) === null);
  }
  const coreOnly = txt(gen([]), "docs/workflow.md");
  check("workflow.md : core seul, pas de table de double encodage", section(coreOnly, "Double encodage des règles") === null);
}

// persistance après compaction : échelle dans CLAUDE.md, aucune règle à paths, module compact-recall, SKILL.md (#39)
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const settingsOf = (r) => JSON.parse(txt(r, ".claude/settings.json"));
  const ladder = (t) => t.split("\n").filter((l) => /^\| [1-5] \|/.test(l));
  const full = ["claude", "github", "release", "openspec", "archgate", "arc42", "githooks", "agent-profiles", "compact-recall"];
  const ALL = ["product-owner", "developer", "business-analyst", "acceptance-tester", "scout", "second-opinion", "devops-engineer", "compliance-reviewer"];

  const all = gen(full, { profiles: ALL, regulatedDomain: "RGPD" });
  const files = walk(all.out).map((f) => path.relative(all.out, f).split(path.sep).join("/"));
  const rulesWithPaths = files.filter((f) => /^\.claude\/rules\//.test(f) && /^paths:/m.test(readFileSync(path.join(all.out, ...f.split("/")), "utf8")));
  check("compaction : aucune règle à paths: ni CLAUDE.md de sous-dossier dans les fichiers générés", all.res.status === 0 && rulesWithPaths.length === 0 && files.filter((f) => /(^|\/)CLAUDE\.md$/.test(f)).join() === "CLAUDE.md", `${rulesWithPaths} ${files.filter((f) => /CLAUDE\.md$/.test(f))}`);

  for (const lang of ["fr", "en"]) {
    const r = gen(full, { docLanguage: lang });
    const md = txt(r, "CLAUDE.md");
    check(`compaction (${lang}) : échelle de CLAUDE.md égale à celle de project-lead, hors de ## Règles`, ladder(md).length === 5 && ladder(md).join("\n") === ladder(txt(r, ".claude/agents/project-lead.md")).join("\n") && !/## (Règles|Rules)[\s\S]*\| 1 \|/.test(md.split(/^## (?:Arbitrage|Arbitration)$/m)[0]) && /profile-guard\.mjs/.test(md.split(/^## (?:Arbitrage|Arbitration)$/m)[1] ?? ""));
    check(`compaction (${lang}) : la règle gh d'écriture reste dans ## Règles`, /gh` (commands that write|qui écrivent)/.test((md.split(/^## (?:Règles|Rules)$/m)[1] ?? "").split(/^## /m)[0]));
    const noProf = txt(gen(["claude", "github", "openspec"], { docLanguage: lang }), "CLAUDE.md");
    check(`compaction (${lang}) : sans agent-profiles, pas d'échelle dans CLAUDE.md`, ladder(noProf).length === 0 && !/^## (Arbitrage|Arbitration)$/m.test(noProf));
  }

  // module compact-recall
  const hookDecl = (r) => (settingsOf(r).hooks?.SessionStart ?? []).map((e) => `${e.matcher ?? ""}|${e.hooks.map((h) => h.args.join(" ")).join()}`);
  const on = gen(["claude", "compact-recall"]);
  check("compact-recall : hook généré et SessionStart à matcher compact déclaré", on.res.status === 0 && existsSync(path.join(on.out, ".claude/hooks/compact-recall.mjs")) && hookDecl(on).join() === "compact|${CLAUDE_PROJECT_DIR}/.claude/hooks/compact-recall.mjs", hookDecl(on).join());
  const onLocal = gen(["claude", "openspec", "compact-recall"], { cliInstall: "local" });
  check("compact-recall : mode local, session-path.mjs reste la première entrée SessionStart", hookDecl(onLocal).length === 2 && /session-path\.mjs$/.test(hookDecl(onLocal)[0]) && /^compact\|.*compact-recall\.mjs$/.test(hookDecl(onLocal)[1]), hookDecl(onLocal).join());
  const off = gen(["claude"]);
  check("compact-recall : module absent, ni fichier ni déclaration", !existsSync(path.join(off.out, ".claude/hooks/compact-recall.mjs")) && !/compact/.test(txt(off, ".claude/settings.json")));
  const offGlobal = gen(["claude", "openspec"], { cliInstall: "global" });
  check("compact-recall : mode global sans le module, aucun SessionStart", !("SessionStart" in (settingsOf(offGlobal).hooks ?? {})));
  const onEn = gen(["claude", "compact-recall"], { docLanguage: "en" });
  check("compact-recall (en) : hook en anglais", /Context compacted/.test(txt(onEn, ".claude/hooks/compact-recall.mjs")) && /Context compacted|reread/.test(txt(onEn, ".claude/hooks/compact-recall.mjs")));

  // SKILL.md du plugin : la compaction ne garde que le début d'un skill
  const skill = readFileSync(path.join(root, "skills", "project-bootstrap", "SKILL.md"), "utf8");
  check("SKILL.md : [STOP] avant 3 000 caractères, reprise avant 12 000, accord pour les actions GitHub avant 15 000", skill.indexOf("[STOP]") > -1 && skill.indexOf("[STOP]") < 3000 && skill.indexOf("## Reprise et journal des effets") > -1 && skill.indexOf("## Reprise et journal des effets") < 12000 && skill.indexOf("Demande l'accord avant chaque action globale ou GitHub") > -1 && skill.indexOf("Demande l'accord avant chaque action globale ou GitHub") < 15000, `${skill.indexOf("[STOP]")} ${skill.indexOf("## Reprise")} ${skill.indexOf("Demande l'accord")}`);
}

// les profils absorbent les agents historiques (#110, ARCH-016)
{
  const gen = (modules, extra = {}) => run({ ...base, visibility: "private", modules, ...extra });
  const txt = (r, rel) => readFileSync(path.join(r.out, ...rel.split("/")), "utf8");
  const OLD = [".claude/agents/architecture-explorer.md", ".claude/agents/arc42-keeper.md", ".claude/agents/spec-reviewer.md", ".claude/agents/traceability-checker.md", ".claude/hooks/restrict-path.mjs"];
  const mods = ["claude", "github", "release", "openspec", "archgate", "arc42", "githooks", "dependabot"];
  const ALL = ["product-owner", "developer", "business-analyst", "acceptance-tester", "scout", "second-opinion", "devops-engineer", "compliance-reviewer"];

  for (const lang of ["fr", "en"]) {
    const withProf = gen([...mods, "agent-profiles"], { profiles: ALL, regulatedDomain: "RGPD", docLanguage: lang });
    const files = walk(withProf.out).map((f) => path.relative(withProf.out, f).split(path.sep).join("/"));
    check(`absorption (${lang}) : avec agent-profiles, les cinq fichiers historiques ne sont pas générés`, withProf.res.status === 0 && OLD.every((f) => !files.includes(f)), OLD.filter((f) => files.includes(f)).join());
    const orphans = files.filter((f) => !f.startsWith(".bootstrap/") && /architecture-explorer|arc42-keeper|spec-reviewer|traceability-checker|restrict-path/.test(readFileSync(path.join(withProf.out, ...f.split("/")), "utf8")));
    check(`absorption (${lang}) : aucun nom orphelin dans les fichiers générés (settings.json compris)`, orphans.length === 0, orphans.join());
    const noProf = gen(mods, { docLanguage: lang });
    const noFiles = walk(noProf.out).map((f) => path.relative(noProf.out, f).split(path.sep).join("/"));
    check(`absorption (${lang}) : sans agent-profiles, les cinq fichiers sont générés comme avant`, noProf.res.status === 0 && OLD.every((f) => noFiles.includes(f)));
    const wf = txt(noProf, "docs/workflow.md");
    check(`absorption (${lang}) : sans agent-profiles, workflow.md et les ADR nomment les agents`, /architecture-explorer/.test(wf) && /spec-reviewer/.test(wf) && /traceability-checker/.test(wf) && /arc42-keeper/.test(wf) && /arc42-keeper|spec-reviewer/.test(txt(noProf, "docs/architecture/adrs/ARCH-002-workflow-spec-driven-avec-openspec.md")));
    const wfP = txt(withProf, "docs/workflow.md");
    check(`absorption (${lang}) : avec agent-profiles, workflow.md et les ADR nomment les profils`, /`qa-engineer`/.test(wfP) && /`architect`/.test(wfP) && /`qa-engineer`/.test(txt(withProf, "docs/architecture/adrs/ARCH-002-workflow-spec-driven-avec-openspec.md")) && /`architect`/.test(txt(withProf, "docs/architecture/adrs/ARCH-001-documentation-d-architecture-arc42-et-adr.md")));
    const qa = txt(withProf, ".claude/agents/qa-engineer.md");
    const prr = txt(withProf, ".claude/skills/pr-readiness-review/SKILL.md");
    check(`absorption (${lang}) : qa-engineer lance spec-review et pr-readiness-review, qui portent la revue de spec, le contrôle de la PR et l'exception Dependabot`, /openspec show/.test(qa) && /spec-review/.test(qa) && /pr-readiness-review/.test(qa) && /dependabot\//.test(prr) && /git branch --show-current/.test(prr) && /gh pr checks/.test(prr));
    check(`absorption (${lang}) : devops-engineer renvoie la traçabilité à qa-engineer`, /`qa-engineer`/.test(txt(withProf, ".claude/agents/devops-engineer.md")) && /`qa-engineer`/.test(txt(withProf, ".claude/agents/project-lead.md")));
  }

  // les commandes citées dans qa-engineer et architect sont acceptées par le hook en lecture seule
  const readOnly = path.join(root, "skills", "project-bootstrap", "assets", "modules", "claude", "templates", ".claude", "hooks", "read-only-bash.mjs");
  const refused = [];
  for (const tpl of ["templates", "templates.en"]) {
    for (const n of ["qa-engineer"]) {
      const text = readFileSync(path.join(root, "skills", "project-bootstrap", "assets", "modules", "agent-profiles", tpl, ".claude", "agents", `${n}.md`), "utf8");
      for (const m of text.matchAll(/`((?:gh|git|openspec|archgate) [^`]*)`/g)) {
        const cmd = m[1].replace(/<[^>]+>/g, "1");
        if (/^archgate review-context|^archgate check|^node /.test(cmd)) continue;
        const r = spawnSync(process.execPath, [readOnly], { input: JSON.stringify({ tool_name: "Bash", tool_input: { command: cmd } }), encoding: "utf8" });
        if (r.status !== 0) refused.push(`${tpl}/${n} : ${cmd}`);
      }
    }
  }
  check("absorption : les commandes de qa-engineer sont acceptées par read-only-bash.mjs", refused.length === 0, refused.join(" ; "));

  // migration 0003
  const legacyProject = (alsoUpdate) => {
    const r = gen(mods);
    const mp = path.join(r.out, ".bootstrap", "manifest.json");
    const manifest = JSON.parse(readFileSync(mp, "utf8"));
    manifest.modules = [...manifest.modules, "agent-profiles"];
    if (alsoUpdate) for (const f of OLD) delete manifest.files[f];
    writeFileSync(mp, JSON.stringify(manifest, null, 2) + "\n");
    return r.out;
  };
  const exists = (out, rel) => existsSync(path.join(out, ...rel.split("/")));
  const migrate = (out, apply) => runMigrations({ target: out, apply });
  const ours = (list) => list.filter((m) => m.id === "0003-absorb-legacy-agents")[0];

  let out = legacyProject(false);
  let res = ours(await migrate(out, false));
  check("migration 0003 : simulation, cinq actions et rien de modifié", res.actions.length === 5 && OLD.every((f) => exists(out, f)) && res.applied === false);
  res = ours(await migrate(out, true));
  const after = JSON.parse(readFileSync(path.join(out, ".bootstrap", "manifest.json"), "utf8"));
  check("migration 0003 : fichiers intacts, copies de base et entrées du manifeste retirés, migration consignée", res.applied && OLD.every((f) => !exists(out, f) && !exists(out, `.bootstrap/base/${f}.base`) && after.files[f] === undefined) && after.migrations.includes("0003-absorb-legacy-agents"));
  check("migration 0003 : idempotente, rien à faire au second passage", ours(await migrate(out, true)) === undefined);

  out = legacyProject(true);
  res = ours(await migrate(out, true));
  check("migration 0003 : après scaffold --update (entrées du manifeste déjà retirées), les fichiers intacts sont retirés d'après leur copie de base", res.applied && OLD.every((f) => !exists(out, f)));

  out = legacyProject(false);
  writeFileSync(path.join(out, ".claude/agents/spec-reviewer.md"), txt({ out }, ".claude/agents/spec-reviewer.md") + "\nconsigne du projet\n");
  rmSync(path.join(out, ".bootstrap/base/.claude/agents/traceability-checker.md.base"));
  res = ours(await migrate(out, true));
  check("migration 0003 : fichier modifié ou sans copie de base conservé avec une note, les autres retirés", res.applied && exists(out, ".claude/agents/spec-reviewer.md") && exists(out, ".claude/agents/traceability-checker.md") && !exists(out, ".claude/agents/arc42-keeper.md") && res.notes.length === 2 && res.notes.some((n) => /spec-reviewer.*modifié/.test(n)) && res.notes.some((n) => /traceability-checker.*copie de base/.test(n)), JSON.stringify(res.notes));

  out = legacyProject(false);
  for (const f of OLD) writeFileSync(path.join(out, ...f.split("/")), txt({ out }, f) + "\nlocal\n");
  res = ours(await migrate(out, true));
  check("migration 0003 : tout modifié, notes seules, non consignée", res.applied === false && res.actions.length === 0 && res.notes.length === 5 && !JSON.parse(readFileSync(path.join(out, ".bootstrap", "manifest.json"), "utf8")).migrations?.includes("0003-absorb-legacy-agents"));

  out = legacyProject(false);
  writeFileSync(path.join(out, ".claude/agents/autre.md"), "---\nname: autre\n---\nutilise restrict-path.mjs\n");
  res = ours(await migrate(out, true));
  check("migration 0003 : restrict-path.mjs conservé quand un autre fichier de .claude le cite", exists(out, ".claude/hooks/restrict-path.mjs") && !exists(out, ".claude/agents/arc42-keeper.md") && res.notes.some((n) => /restrict-path.*autre\.md/.test(n)), JSON.stringify(res.notes));

  const without = gen(mods);
  check("migration 0003 : non proposée sans agent-profiles", ours(await migrate(without.out, false)) === undefined);

  // projet sans dépôt GitHub : la migration de fichiers ne demande pas de dépôt (migrate.mjs en ligne de commande)
  out = legacyProject(false);
  const cli = spawnSync(process.execPath, [path.join(root, "skills", "project-bootstrap", "scripts", "migrate.mjs"), "--target", out], { encoding: "utf8" });
  check("migrate.mjs : sans remote GitHub, les migrations de forge sont ignorées avec une note et la migration 0003 est proposée", cli.status === 0 && /0003-absorb-legacy-agents/.test(cli.stdout) && /dépôt GitHub introuvable/.test(cli.stdout), cli.stderr + cli.stdout.slice(0, 300));
}

console.log(failed ? `\n${failed} échec(s)` : "\nTous les tests passent");
process.exit(failed ? 1 : 0);
