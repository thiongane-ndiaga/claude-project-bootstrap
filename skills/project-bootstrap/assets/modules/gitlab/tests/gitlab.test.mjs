#!/usr/bin/env node
// Tests du module gitlab (#25) : fichiers, exclusivité, dépendances, script commun, ADR, workflow, documentation, audit et reprise.
// Lancé par tests/modules.test.mjs ou seul : node gitlab.test.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = process.env.PLUGIN_ROOT ?? path.join(here, "..", "..", "..", "..", "..", "..");
const scripts = path.join(pluginRoot, "skills", "project-bootstrap", "scripts");
const scaffold = path.join(scripts, "scaffold.mjs");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
};

const pin = (c) => ({ tag: "v1.0.0", sha: c.repeat(40) });
const base = {
  projectName: "Essai",
  description: "Projet d'essai.",
  versions: { openspec: "1.2.3", archgate: "4.5.6", node: "24" },
  actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c"), sonarScan: pin("d") },
  actionsCreditNote: "essai",
  visibility: "private",
};
const GL = ["claude", "gitlab", "jenkins", "openspec", "archgate", "githooks"];

function run(config, target) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-gitlab-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify({ ...base, ...config }));
  const out = target ?? path.join(dir, "out");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out], { encoding: "utf8" });
  const read = (rel) => readFileSync(path.join(out, ...rel.split("/")), "utf8");
  const has = (rel) => existsSync(path.join(out, ...rel.split("/")));
  return { res, read, has, out };
}
// marqueurs de module et paramètres {{NOM}} restants (les expressions ${{ … }} de GitHub Actions n'en sont pas)
// « ci.yml » de GitHub Actions, sans compter « .gitlab-ci.yml »
const ciYml = (t) => /(^|[^-a-z])ci\.yml/.test(t);
const unresolved = (t) => t.includes("@@") || /\{\{[A-Z0-9_]+\}\}/.test(t);

// --- fichiers, exclusivité, dépendances
const on = run({ modules: GL });
check("gitlab : génération réussie avec jenkins", on.res.status === 0, on.res.stderr.slice(0, 200));
const wanted = [".gitlab/merge_request_templates/Default.md", ".gitlab/issue_templates/feature.md", ".gitlab/issue_templates/bug.md", ".gitlab/issue_templates/architecture-decision.md", "docs/gitlab.md", "docs/jenkins.md", "Jenkinsfile", "scripts/check-pr-title.mjs", "scripts/jenkins-setup.sh"];
const forbidden = [".gitlab-ci.yml", ".github/workflows/ci.yml", ".github/pull_request_template.md", ".github/labels.json", "scripts/sync-labels.mjs", ".github/ISSUE_TEMPLATE/feature.yml", ".github/actions/project-setup/action.yml"];
check("gitlab : gabarits, documentation, Jenkinsfile et script du titre présents", wanted.every((f) => on.has(f)), wanted.filter((f) => !on.has(f)).join(", "));
check("gitlab : aucun .gitlab-ci.yml ni fichier de la forge GitHub", forbidden.every((f) => !on.has(f)), forbidden.filter((f) => on.has(f)).join(", "));
check("gitlab : sans archgate, pas de gabarit d'issue de décision", !run({ modules: ["claude", "gitlab"] }).has(".gitlab/issue_templates/architecture-decision.md"));
check("gitlab avec github : refusé, code 2 (incompatibles)", run({ modules: ["claude", "github", "gitlab"] }).res.status === 2);
for (const m of ["release", "projects", "dependabot"]) {
  const r = run({ modules: ["claude", "gitlab", m] });
  check(`gitlab avec ${m} : refusé, code 1 (le module requiert github)`, r.res.status === 1 && r.res.stderr.includes("github"), `${r.res.status} ${r.res.stderr.slice(0, 120)}`);
}
check("jenkins sans github ni gitlab : refusé, code 1 (l'un de github, gitlab)", (() => { const r = run({ modules: ["claude", "jenkins"] }); return r.res.status === 1 && r.res.stderr.includes("github, gitlab"); })());
check("jenkins avec github : accepté", run({ modules: ["claude", "github", "jenkins"] }).res.status === 0);
check("gitlab sans jenkins : accepté (aucune CI), le script du titre est généré", (() => { const r = run({ modules: ["claude", "gitlab"] }); return r.res.status === 0 && r.has("scripts/check-pr-title.mjs") && !r.has("Jenkinsfile"); })());

// --- script du titre identique à celui de github, dans les deux langues
for (const lang of ["fr", "en"]) {
  const gl = run({ modules: ["claude", "gitlab"], docLanguage: lang });
  const gh = run({ modules: ["claude", "github"], docLanguage: lang });
  check(`titre (${lang}) : check-pr-title.mjs identique avec gitlab et avec github`, gl.read("scripts/check-pr-title.mjs") === gh.read("scripts/check-pr-title.mjs"));
}

// --- ADR de forge et workflow
const adr = on.read("docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md");
check("ARCH-004 généré avec gitlab : GitLab et Jenkins, rules: false, ni release-please ni ci.yml, aucune règle exécutable", adr.includes("GitLab") && adr.includes("Jenkinsfile") && adr.includes("rules: false") && !adr.includes("release-please") && !ciYml(adr) && !on.has("docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.rules.ts"));
const ghAdr = run({ modules: ["claude", "github", "archgate"] });
check("ARCH-004 généré avec github : GitHub, rules: true et fichier de règles", ghAdr.read("docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md").includes("rules: true") && ghAdr.has("docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.rules.ts"));
check("ARCH-005 généré avec gitlab : la vérification du titre passe par le Jenkinsfile", on.read("docs/architecture/adrs/ARCH-005-conventions-de-branches-commits-et-versionnement.md").includes("Jenkinsfile") && !on.read("docs/architecture/adrs/ARCH-005-conventions-de-branches-commits-et-versionnement.md").includes("`ci.yml`"));
const wf = on.read("docs/workflow.md");
const cm = on.read("CLAUDE.md");
check("workflow.md et CLAUDE.md avec gitlab : issue, MR avec Closes #N, titre contrôlé, sans .github ni ci.yml", wf.includes("**issue** = le besoin") && wf.includes("**PR + CI** = la validation") && wf.includes("Closes #N") && wf.includes("scripts/check-pr-title.mjs") && wf.includes("scripts/jenkins-setup.sh") && !wf.includes(".github") && !ciYml(wf) && cm.includes("issue GitLab") && cm.includes("Closes #<issue>") && !cm.includes("issue GitHub"), [".github", "ci.yml"].filter((n) => (n === "ci.yml" ? ciYml(wf) : wf.includes(n))).join(", "));
check("workflow.md avec gitlab : pas de commande gh d'écriture ni d'installation de gh", !wf.includes("`gh`") && !wf.includes("gh auth"));
const mr = on.read(".gitlab/merge_request_templates/Default.md");
check("gabarit de MR avec gitlab, openspec, archgate : Closes #, changement OpenSpec, ADR", mr.includes("Closes #") && mr.includes("## Changement OpenSpec") && mr.includes("## ADR") && mr.includes("archgate check"));
check("gabarit de MR sans openspec ni archgate : ni changement OpenSpec ni ADR", (() => { const m = run({ modules: ["claude", "gitlab"] }).read(".gitlab/merge_request_templates/Default.md"); return m.includes("Closes #") && !m.includes("OpenSpec") && !m.includes("## ADR"); })());
const gh = run({ modules: ["claude", "github", "jenkins", "openspec", "archgate"] });
check("jenkins avec github : documentation GitHub inchangée (Branch Source, ci.yml)", gh.read("docs/jenkins.md").includes("GitHub Branch Source") && gh.read("docs/jenkins.md").includes("ci.yml") && gh.read("Jenkinsfile").includes(".github/workflows/ci.yml"));

// --- documentation et marqueurs, par langue
for (const lang of ["fr", "en"]) {
  const g = run({ modules: GL, docLanguage: lang });
  const d = g.read("docs/gitlab.md");
  const needles = ["squash", "Pipelines must succeed", "glab", "Draft", "docs/jenkins.md", "jiraSource", "ARCH-004", "release"];
  check(`gitlab docs (${lang}) : étapes manuelles, table de lecture et limites`, g.res.status === 0 && needles.every((n) => d.includes(n)), needles.filter((n) => !d.includes(n)).join(", "));
  const j = g.read("docs/jenkins.md");
  const jn = ["GitLab Branch Source", "webhook", "Pipelines must succeed", lang === "fr" ? "confiance des merge requests de fork" : "fork merge request trust"];
  check(`jenkins docs (${lang}) avec gitlab : variante GitLab, sans GitHub ni ci.yml`, jn.every((n) => j.includes(n)) && !j.includes("GitHub") && !ciYml(j) && !g.read("Jenkinsfile").includes("GitHub"), jn.filter((n) => !j.includes(n)).join(", "));
  const files = ["docs/gitlab.md", "docs/jenkins.md", "Jenkinsfile", "scripts/jenkins-setup.sh", "CLAUDE.md", "docs/workflow.md", ".gitlab/merge_request_templates/Default.md", ".gitlab/issue_templates/feature.md", ".claude/agents/spec-reviewer.md", ".claude/agents/architecture-explorer.md", "docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md", "docs/architecture/adrs/ARCH-005-conventions-de-branches-commits-et-versionnement.md"];
  check(`gitlab (${lang}) : aucun marqueur ni paramètre non résolu`, !files.some((f) => unresolved(g.read(f))), files.filter((f) => unresolved(g.read(f))).join(", "));
}

// --- audit sans GitHub : aucun appel à gh, versions lues dans le Jenkinsfile
const { runAudit } = await import(pathToFileURL(path.join(scripts, "audit.mjs")).href);
const calls = [];
const exec = (cmd, args = []) => { calls.push(`${cmd} ${args.join(" ")}`); return { status: 127, stdout: "", stderr: "", error: Object.assign(new Error("absent"), { code: "ENOENT" }) }; };
const audit = await runAudit({ target: on.out, forge: true, repo: "o/r", exec });
const forgeRes = audit.results.find((r) => r.id === "forge");
check("audit avec gitlab, --forge et --repo : contrôle de forge non vérifiable, aucun appel à gh", forgeRes?.statut === "non-verifiable" && !calls.some((c) => c.startsWith("gh ")) && !audit.results.some((r) => /^forge-/.test(r.id)), JSON.stringify(forgeRes) + calls.filter((c) => c.startsWith("gh ")).join("|"));
const okV = audit.results.find((r) => r.id === "version-openspec");
check("audit avec gitlab : version d'OpenSpec lue dans le Jenkinsfile sans ci.yml, cohérente avec le manifeste", okV?.statut === "ok", JSON.stringify(okV));
const jf = path.join(on.out, "Jenkinsfile");
const jtext = readFileSync(jf, "utf8");
writeFileSync(jf, jtext.replace(new RegExp("(@fission-ai/openspec@)[0-9][A-Za-z0-9.-]*"), "$19.9.9"));
const bad = (await runAudit({ target: on.out, exec })).results.find((r) => r.id === "version-openspec");
check("audit avec gitlab : version divergente dans le Jenkinsfile -> écart qui cite le Jenkinsfile", bad?.statut === "ecart" && bad.message.includes("Jenkinsfile 9.9.9"), JSON.stringify(bad));
writeFileSync(jf, jtext);

// --- reprise de session : étapes applicables selon la forge
const { STEPS, isApplicable } = await import(pathToFileURL(path.join(scripts, "state.mjs")).href);
const step = (id) => STEPS.find((s) => s.id === id);
const glMods = new Set(["core", "gitlab", "archgate"]);
const ghMods = new Set(["core", "github", "archgate"]);
check("reprise : avec gitlab, ADR et étape GitLab applicables, étape GitHub non", isApplicable(step("phase4-adr"), glMods) && isApplicable(step("phase2-gitlab"), glMods) && !isApplicable(step("phase2-github"), glMods));
check("reprise : avec github, ADR et étape GitHub applicables, étape GitLab non", isApplicable(step("phase4-adr"), ghMods) && isApplicable(step("phase2-github"), ghMods) && !isApplicable(step("phase2-gitlab"), ghMods));
check("reprise : sans archgate ou sans forge, l'acceptation des ADR n'est pas applicable", !isApplicable(step("phase4-adr"), new Set(["core", "gitlab"])) && !isApplicable(step("phase4-adr"), new Set(["core", "archgate"])));

if (failures) {
  console.log(`\n${failures} vérification(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests du module gitlab passent");
