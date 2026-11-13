#!/usr/bin/env node
// Tests du module jira (#23) : génération, clés, héritage, script de contrôle exécuté, variantes des modèles selon la source du besoin.
// Lancé par tests/modules.test.mjs ou seul : node jira.test.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = process.env.PLUGIN_ROOT ?? path.join(here, "..", "..", "..", "..", "..", "..");
const scaffold = path.join(pluginRoot, "skills", "project-bootstrap", "scripts", "scaffold.mjs");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
};

const pin = (c) => ({ tag: "v1.0.0", sha: c.repeat(40) });
const MODS = ["claude", "github", "openspec", "archgate"];
const base = {
  projectName: "Essai",
  description: "Projet d'essai.",
  versions: { openspec: "1.2.3", archgate: "4.5.6", node: "24" },
  actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c"), sonarScan: pin("d") },
  actionsCreditNote: "essai",
  visibility: "private",
  modules: [...MODS, "jira"],
};

function run(config, target) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-jira-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify(config));
  const out = target ?? path.join(dir, "out");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out], { encoding: "utf8" });
  const read = (rel) => readFileSync(path.join(out, ...rel.split("/")), "utf8");
  const has = (rel) => existsSync(path.join(out, ...rel.split("/")));
  return { res, read, has, out };
}
const update = (target, extra = {}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-jira-upd-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify({ ...base, ...extra }));
  return spawnSync(process.execPath, [scaffold, "--update", "--target", target, "--config", cfg], { encoding: "utf8" });
};
const manifestOf = (g) => JSON.parse(g.read(".bootstrap/manifest.json"));
// marqueurs de module et paramètres {{NOM}} restants (les expressions ${{ … }} de GitHub Actions n'en sont pas)
const unresolved = (t) => t.includes("@@") || /\{\{[A-Z0-9_]+\}\}/.test(t);

// --- module actif, absent, refus
const on = run(base);
const off = run({ ...base, modules: MODS });
check("jira : génération réussie, script, documentation et étape du job pr-title présents", on.res.status === 0 && on.has("scripts/check-jira-key.mjs") && on.has("docs/jira.md") && on.read(".github/workflows/ci.yml").includes("node scripts/check-jira-key.mjs"), on.res.stderr.slice(0, 200));
check("jira : sans le module, ni fichiers ni mention (workflow, CLAUDE.md, ci.yml, gabarit de PR, formulaires)", off.res.status === 0 && !off.has("scripts/check-jira-key.mjs") && !off.has("docs/jira.md") && ![".github/workflows/ci.yml", ".github/pull_request_template.md", ".github/ISSUE_TEMPLATE/feature.yml", "docs/workflow.md", "CLAUDE.md"].some((f) => /jira/i.test(off.read(f))));
check("jira : sans le module, le gabarit de PR garde Closes # et l'id <issue>-<slug>", off.read(".github/pull_request_template.md").includes("Closes #") && off.read(".github/pull_request_template.md").includes("<issue>-<slug>") && !off.read(".github/pull_request_template.md").includes("Refs"));
check("jira : refusé sans github (code 1)", run({ ...base, modules: ["claude", "jira"] }).res.status === 1);

// --- clés
for (const bad of ["abc", "A", "ABCDEFGHIJK", "AB_C", 12, ""]) check(`jira : clé de projet ${JSON.stringify(bad)} refusée (code 1)`, run({ ...base, jira: bad }).res.status === 1);
check("jira : jiraSource invalide refusée (code 1)", run({ ...base, jiraSource: "autre" }).res.status === 1);
check("jira : clé jira sans le module refusée (code 1)", run({ ...base, modules: MODS, jira: "ABC" }).res.status === 1);
check("jira : jiraSource sans le module refusée (code 1)", run({ ...base, modules: MODS, jiraSource: "jira" }).res.status === 1);
const defaults = run(base);
check("jira : sans clés, rien n'est consigné au manifeste", manifestOf(defaults).config.jira === undefined && manifestOf(defaults).config.jiraSource === undefined);
const explicit = run({ ...base, jira: "ABC", jiraSource: "github" });
check("jira : une valeur donnée, même github, est consignée", manifestOf(explicit).config.jira === "ABC" && manifestOf(explicit).config.jiraSource === "github");

// --- héritage, retrait
const jsrc = run({ ...base, jira: "ABC", jiraSource: "jira" });
check("jira : mode jira généré", jsrc.res.status === 0 && manifestOf(jsrc).config.jiraSource === "jira", jsrc.res.stderr.slice(0, 200));
const inherit = update(jsrc.out);
check("jira : --update sans les clés hérite du mode jira et de la clé de projet", inherit.status === 0 && manifestOf(jsrc).config.jiraSource === "jira" && manifestOf(jsrc).config.jira === "ABC" && jsrc.read(".github/pull_request_template.md").includes("Refs"), inherit.stderr.slice(0, 200));
const rmModule = update(jsrc.out, { modules: MODS });
check("jira : --update qui retire le module alors que les clés sont héritées échoue (code 1)", rmModule.status === 1, `${rmModule.status} ${rmModule.stderr.slice(0, 160)}`);
const rmNull = update(jsrc.out, { modules: MODS, jira: null, jiraSource: null });
check("jira : --update avec jira et jiraSource à null retire le module et les clés", rmNull.status === 0 && manifestOf(jsrc).config.jira === undefined && manifestOf(jsrc).config.jiraSource === undefined, `${rmNull.status} ${rmNull.stderr.slice(0, 160)}`);
const back = run({ ...base, jira: "ABC", jiraSource: "jira" });
const nullSource = update(back.out, { jiraSource: null });
check("jira : jiraSource à null repasse en mode github sans le consigner", nullSource.status === 0 && manifestOf(back).config.jiraSource === undefined && back.read(".github/pull_request_template.md").includes("Closes #"), `${nullSource.status} ${nullSource.stderr.slice(0, 160)}`);

// --- script de contrôle exécuté
const checkKey = (g, title, branch) => spawnSync(process.execPath, [path.join(g.out, "scripts", "check-jira-key.mjs")], { encoding: "utf8", env: { ...process.env, PR_TITLE: title, ...(branch === undefined ? {} : { HEAD_REF: branch }) } });
const gh = run({ ...base, jira: "ABC" });
check("script github : clé dans la branche seule -> ok", checkKey(gh, "feat: add import", "feat/ABC-12-import").status === 0);
check("script github : clé dans le titre seul -> ok", checkKey(gh, "feat(import): ABC-12 accept lines", "feat/12-import").status === 0);
const missing = checkKey(gh, "feat: add import", "feat/12-import");
check("script github : clé absente -> échec avec un exemple et la description du titre", missing.status === 1 && missing.stderr.includes("ABC-123") && missing.stderr.includes("description"), missing.stderr);
check("script github : autre projet (XYZ-1) refusé", checkKey(gh, "feat: XYZ-1 add", "feat/XYZ-1-add").status === 1);
check("script github : mot plus long (XABC-12) refusé", checkKey(gh, "feat: XABC-12 add", "feat/XABC-12-add").status === 1);
check("script github : branches dependabot/ et release-please-- exemptées", checkKey(gh, "ci(deps): bump x", "dependabot/github_actions/x").status === 0 && checkKey(gh, "chore(main): release 1.0.0", "release-please--branches--main").status === 0);
check("script github : HEAD_REF vide (exécution locale), clé dans le titre -> ok", checkKey(gh, "feat: ABC-1 add", undefined).status === 0 && checkKey(gh, "feat: add", undefined).status === 1);
check("script github : le titre n'est jamais exécuté (métacaractères du shell)", checkKey(gh, "feat: ABC-1 $(touch pwned) `id`", "feat/ABC-1-x").status === 0);
const generic = run({ ...base });
check("script sans clé de projet : toute clé XXX-N est acceptée (limite documentée)", checkKey(generic, "feat: XYZ-9 add", "feat/XYZ-9-add").status === 0 && checkKey(generic, "feat: add", "feat/add").status === 1 && generic.read("docs/jira.md").includes("UTF-8"));
const js = run({ ...base, jira: "ABC", jiraSource: "jira" });
check("script jira : branche <type>/<CLE-N>-<slug> -> ok", checkKey(js, "feat: add import", "feat/ABC-12-import").status === 0);
check("script jira : clé dans le titre mais branche sans clé -> échec", checkKey(js, "feat: ABC-12 add", "feat/import").status === 1);
check("script jira : clé en minuscules dans la branche -> échec", checkKey(js, "feat: ABC-12 add", "feat/abc-12-import").status === 1);
check("script jira : exemptions conservées", checkKey(js, "ci(deps): bump", "dependabot/npm/x").status === 0);

// --- variantes des modèles selon la source du besoin
const ghPr = gh.read(".github/pull_request_template.md");
const jPr = js.read(".github/pull_request_template.md");
check("mode github : gabarit de PR avec Closes #, ligne Jira et id <issue>-<slug> ; formulaires avec le champ Clé Jira", ghPr.includes("Closes #") && ghPr.includes("Jira : ") && ghPr.includes("<issue>-<slug>") && ["feature", "bug", "architecture-decision"].every((f) => gh.read(`.github/ISSUE_TEMPLATE/${f}.yml`).includes("id: cle-jira")));
check("mode jira : gabarit de PR avec Refs ABC-123, sans Closes #, id <cle-n>-<slug> ; formulaires sans le champ", jPr.includes("Refs ABC-123") && !jPr.includes("Closes #") && jPr.includes("<cle-n>-<slug>") && !jPr.includes("<issue>") && !js.read(".github/ISSUE_TEMPLATE/feature.yml").includes("cle-jira"));
const jw = js.read("docs/workflow.md");
const jc = js.read("CLAUDE.md");
check("mode jira : workflow.md et CLAUDE.md parlent de ticket, de Refs et de la branche <type>/<CLE-N>-<slug>", jw.includes("Ticket: <CLE-N>") && jw.includes("Refs <CLE-N>") && jw.includes("scripts/check-jira-key.mjs") && !jw.includes("`Closes #N`") && jc.includes("<type>/<CLE-N>-<slug>") && jc.includes("Refs <CLE-N>") && jc.includes("docs/jira.md") && !jc.includes("Closes #"));
check("mode github : workflow.md et CLAUDE.md gardent Closes #N et Issue: #N", gh.read("docs/workflow.md").includes("`Closes #N`") && gh.read("docs/workflow.md").includes("Issue: #N") && gh.read("CLAUDE.md").includes("Closes #<issue>"));
const jAdr5 = js.read("docs/architecture/adrs/ARCH-005-conventions-de-branches-commits-et-versionnement.md");
const jAdr2 = js.read("docs/architecture/adrs/ARCH-002-workflow-spec-driven-avec-openspec.md");
check("mode jira : ARCH-002 et ARCH-005 générés posent la branche, l'id et l'en-tête Jira", jAdr5.includes("<type>/<CLE-N>-<slug>") && jAdr5.includes("Refs <CLE-N>") && jAdr2.includes("<cle-n>-<slug>") && jAdr2.includes("Ticket: <CLE-N>"));
const tc = js.read(".claude/agents/traceability-checker.md");
const sr = js.read(".claude/agents/spec-reviewer.md");
check("mode jira : traceability-checker vérifie Refs et Ticket, spec-reviewer ne lit pas le ticket par gh", tc.includes("Ticket: <CLE-N>") && tc.includes("Refs <CLE-N>") && !tc.includes("Closes #") && sr.includes("gh` ne lit pas Jira") && !sr.includes("gh issue view"));
check("mode github : spec-reviewer lit l'issue par gh issue view", gh.read(".claude/agents/spec-reviewer.md").includes("gh issue view N"));
const stepYaml = gh.read(".github/workflows/ci.yml");
check("ci.yml : étape Clé Jira avec !cancelled(), titre et branche passés par l'environnement", stepYaml.includes("if: ${{ !cancelled() }}") && stepYaml.includes("PR_TITLE: ${{ github.event.pull_request.title }}") && stepYaml.includes("HEAD_REF: ${{ github.head_ref }}") && !/run: .*\$\{\{/.test(stepYaml));

// --- documentation et marqueurs
for (const lang of ["fr", "en"]) {
  for (const [label, g] of [["github", run({ ...base, jira: "ABC", docLanguage: lang })], ["jira", run({ ...base, jira: "ABC", jiraSource: "jira", docLanguage: lang })]]) {
    const d = g.read("docs/jira.md");
    const needles = ["Autolink", "check-jira-key.mjs", "ABC-123", "projects", "Jenkinsfile", "UTF-8"];
    check(`jira docs (${lang}, ${label}) : étapes manuelles, nommage et limites`, g.res.status === 0 && needles.every((n) => d.includes(n)), needles.filter((n) => !d.includes(n)).join(", "));
    const table = lang === "fr" ? "Table de lecture" : "Reading table";
    check(`jira docs (${lang}, ${label}) : table de lecture ${label === "jira" ? "présente" : "absente"}`, d.includes(table) === (label === "jira"));
    const files = ["docs/jira.md", "scripts/check-jira-key.mjs", ".github/pull_request_template.md", "docs/workflow.md", "CLAUDE.md", ".github/workflows/ci.yml", ".claude/agents/traceability-checker.md"];
    check(`jira (${lang}, ${label}) : aucun marqueur ni paramètre non résolu`, !files.some((f) => unresolved(g.read(f))), files.filter((f) => unresolved(g.read(f))).join(", "));
  }
}

if (failures) {
  console.log(`\n${failures} vérification(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests du module jira passent");
