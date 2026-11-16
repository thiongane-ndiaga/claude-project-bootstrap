#!/usr/bin/env node
// Tests du module projects (#175) : workflow project-status.yml (présence, déclencheurs, droits, portée du jeton,
// conditions, scripts, noms exacts), documents générés alignés (docs/workflow.md, ARCH-004), héritage par --update.
// Le workflow n'est pas exécuté : ses scénarios d'exécution se vérifient à l'essai manuel.
// Lancé par tests/modules.test.mjs ou seul : node projects.test.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = process.env.PLUGIN_ROOT ?? path.join(here, "..", "..", "..", "..", "..", "..");
const scaffold = path.join(pluginRoot, "skills", "project-bootstrap", "scripts", "scaffold.mjs");
const templatesRoot = path.join(pluginRoot, "skills", "project-bootstrap", "assets", "modules", "projects");

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
  actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c") },
  actionsCreditNote: "essai",
  visibility: "private",
  modules: ["claude", "github", "projects"],
};

const WORKFLOW = ".github/workflows/project-status.yml";

function run(config, { args = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-projects-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify(config));
  const out = path.join(dir, "out");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out, ...args], { encoding: "utf8" });
  const has = (rel) => existsSync(path.join(out, ...rel.split("/")));
  // fichier absent : chaîne vide, pour que les vérifications échouent proprement
  const read = (rel) => (has(rel) ? readFileSync(path.join(out, ...rel.split("/")), "utf8").replace(/\r\n/g, "\n") : "");
  return { res, read, has, out };
}
const update = (target) => spawnSync(process.execPath, [scaffold, "--update", "--target", target], { encoding: "utf8" });
const created = (res) => {
  try {
    return JSON.parse(res.stdout).created;
  } catch {
    return null;
  }
};
const arch004 = (g) => {
  const dir = path.join(g.out, "docs", "architecture", "adrs");
  const file = existsSync(dir) ? readdirSync(dir).find((f) => /^ARCH-004-.*\.md$/.test(f)) : undefined;
  return file ? g.read(`docs/architecture/adrs/${file}`) : "";
};

// --- lecture textuelle du YAML (aucune dépendance : les blocs sont repérés par leur indentation)
const lines = (t) => t.split("\n");
const indentOf = (l) => /^ */.exec(l)[0].length;
// lignes du bloc qui suit une ligne d'ouverture (indentation strictement supérieure), ouverture exclue
function blockAfter(t, openRe) {
  const all = lines(t);
  const i = all.findIndex((l) => openRe.test(l));
  if (i < 0) return null;
  const base = indentOf(all[i]);
  const out = [];
  for (let j = i + 1; j < all.length; j++) {
    if (all[j].trim() !== "" && indentOf(all[j]) <= base) break;
    out.push(all[j]);
  }
  return out;
}
// blocs `run:` : { body, ok, from, to } ; ok vaut false quand le corps n'est pas reconnu (valeur vide, en-tête de scalaire inconnu)
const SCALAR_HEADER = /^\s*[|>][0-9]?[+-]?\s*$/;
function runBlocks(t) {
  const all = lines(t);
  const blocks = [];
  all.forEach((l, i) => {
    const m = /^(\s*)(?:- )?run:(.*)$/.exec(l);
    if (!m) return;
    if (SCALAR_HEADER.test(m[2])) {
      const body = [];
      for (let j = i + 1; j < all.length; j++) {
        if (all[j].trim() !== "" && indentOf(all[j]) <= m[1].length) break;
        body.push(all[j]);
      }
      blocks.push({ body: body.join("\n"), ok: true, from: i + 1, to: i + body.length });
    } else if (/^\s*[^\s|>&*!'"#]/.test(m[2])) blocks.push({ body: m[2], ok: true, from: i, to: i });
    else blocks.push({ body: "", ok: false, from: i, to: i });
  });
  return blocks;
}
// lignes où une expression ${{ … }} peut figurer : groupe de concurrence, condition (job ou étape), affectation d'une clé d'environnement
const EXPRESSION_LINE = [/^group: /, /^(?:- )?if: /, /^[A-Z][A-Z0-9_]*: \$\{\{ .* \}\}$/];
// problèmes de portée des expressions et des journaux d'un workflow (texte) : liste vide si le workflow est sain
function workflowProblems(t) {
  const problems = [];
  const all = lines(t);
  const blocks = runBlocks(t);
  const withRun = steps(t).filter((s) => /^\s+(?:- )?run:/m.test(s)).length;
  if (blocks.length !== withRun) problems.push(`${blocks.length} bloc(s) run trouvé(s) pour ${withRun} étape(s) avec run`);
  if (blocks.some((b) => !b.ok)) problems.push("corps de run non reconnu");
  const inScript = new Set();
  for (const b of blocks) for (let i = b.from; i <= b.to; i++) inScript.add(i);
  all.forEach((l, i) => {
    if (!l.includes("${{")) return;
    if (inScript.has(i)) problems.push(`expression dans un script (ligne ${i + 1})`);
    else if (!EXPRESSION_LINE.some((re) => re.test(l.trim()))) problems.push(`expression hors concurrency, if ou env (ligne ${i + 1})`);
  });
  if (blocks.some((b) => /\b(?:echo|printf|fail|fail_api|skip)\b[^\n]*\$\{?out\b|\$\{out/.test(b.body))) problems.push("réponse brute de l'API écrite dans le journal");
  return problems;
}
// étapes du job : texte de chaque élément de `steps:`
function steps(t) {
  const body = blockAfter(t, /^ {4}steps:\s*$/) ?? [];
  const out = [];
  for (const l of body) {
    if (/^ {6}- /.test(l)) out.push([l]);
    else if (out.length) out[out.length - 1].push(l);
  }
  return out.map((s) => s.join("\n"));
}
// condition du job (clé `if:` d'indentation 4, éventuellement sur plusieurs lignes)
function jobCondition(t) {
  const all = lines(t);
  const i = all.findIndex((l) => /^ {4}if:/.test(l));
  if (i < 0) return null;
  const out = [all[i]];
  for (let j = i + 1; j < all.length; j++) {
    if (all[j].trim() !== "" && indentOf(all[j]) <= 4) break;
    out.push(all[j]);
  }
  return out.join("\n");
}

const EXPECTED_TYPES = ["closed", "converted_to_draft", "opened", "ready_for_review", "reopened"];
// classification d'une réponse de gh par les motifs du case de gh_call (sous-chaînes) : liste des cas mal classés
const TOKEN_CASES = [
  ["gh: Bad credentials (HTTP 401)", true],
  ["HTTP 401: Bad credentials (https://api.github.com/graphql)", true],
  ["Your token has not been granted the required scopes to execute this query.", true],
  ["Resource not accessible by personal access token (HTTP 403)", true],
  ["gh: Could not resolve to a Repository with the name 'proprietaire/depot'. (repository)", true],
  ["gh: Could not resolve to an Issue with the number of 1403. (repository.issue)", false],
  ["gh: Could not resolve to an Issue with the number of 401. (repository.issue)", false],
  ["GraphQL: Could not resolve to a ProjectV2 with the number 403", false],
  ["GraphQL: Could not resolve to a ProjectV2 with the number 4010", false],
];
function tokenClassification(patterns) {
  const re = new RegExp(patterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
  return TOKEN_CASES.filter(([message, isToken]) => re.test(message) !== isToken).map(([message, isToken]) => `« ${message} » ${isToken ? "devrait être" : "ne devrait pas être"} classé jeton refusé`);
}
// préfixes de jeton GitHub : personnel (classique), OAuth, utilisateur vers serveur, serveur vers serveur, actualisation, fine-grained
const TOKEN_PREFIX = /(?:ghp|gho|ghu|ghs|ghr|github_pat)_/;
const VALUE_RE = /^\$\{\{ (?:secrets|vars)\.[A-Z_]+(?: \|\| github\.repository_owner)? \}\}$/;

// --- génération : présence, absence, refus
const on = run(base);
const off = run({ ...base, modules: ["claude", "github"] });
const jiraMode = run({ ...base, modules: ["claude", "github", "projects", "jira"], jiraSource: "jira" });
const jiraLinked = run({ ...base, modules: ["claude", "github", "projects", "jira"] });
const gitlab = run({ ...base, modules: ["claude", "gitlab", "projects"] });
check("projects : génération réussie, workflow présent avec github et projects", on.res.status === 0 && on.has(WORKFLOW), on.res.stderr.slice(0, 200));
check("projects : sans le module, aucun workflow", off.res.status === 0 && !off.has(WORKFLOW));
check("projects : avec jira et jiraSource jira, aucun workflow et génération réussie", jiraMode.res.status === 0 && !jiraMode.has(WORKFLOW), jiraMode.res.stderr.slice(0, 200));
check("projects : avec jira et issues GitHub comme source, workflow présent", jiraLinked.res.status === 0 && jiraLinked.has(WORKFLOW), jiraLinked.res.stderr.slice(0, 200));
check("projects : refusé avec gitlab (code 1), aucun workflow écrit", gitlab.res.status === 1 && !gitlab.has(WORKFLOW), `${gitlab.res.status}`);
const descriptor = JSON.parse(readFileSync(path.join(templatesRoot, "module.json"), "utf8"));
check("projects : module.json déclare le workflow avec when issue-source", JSON.stringify(descriptor.files) === JSON.stringify([{ path: WORKFLOW, when: ["issue-source"] }]), JSON.stringify(descriptor.files));

// --- contenu du workflow, dans les deux langues
const unresolved = (t) => t.includes("@@") || /\{\{[A-Z0-9_]+\}\}/.test(t);
for (const lang of ["fr", "en"]) {
  const g = run({ ...base, docLanguage: lang });
  const t = g.read(WORKFLOW);
  const tag = `projects (${lang})`;

  // déclencheurs
  const onBlock = blockAfter(t, /^on:\s*$/) ?? [];
  const events = onBlock.filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim().replace(/:.*$/, ""));
  const typesLine = onBlock.find((l) => /^\s+types:/.test(l)) ?? "";
  const types = (/\[(.*)\]/.exec(typesLine)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean).sort();
  check(`${tag} : déclencheurs exacts create et pull_request`, events.join() === "create,pull_request", events.join());
  check(`${tag} : pull_request avec exactement cinq types`, types.join() === EXPECTED_TYPES.join(), types.join());
  for (const event of ["push", "synchronize", "pull_request_target", "workflow_dispatch"]) {
    check(`${tag} : aucun événement ${event}`, !new RegExp(`\\b${event}\\b`).test(t));
  }

  // droits et concurrence
  check(`${tag} : permissions: {} au niveau du workflow, aucune autre permission`, /^permissions: \{\}\s*$/m.test(t) && (t.match(/permissions:/g) ?? []).length === 1);
  check(`${tag} : groupe de concurrence par branche, sans annulation`, t.includes("group: project-status-${{ github.head_ref || github.ref_name }}") && /^ {2}cancel-in-progress: false\s*$/m.test(t));

  // événements traités : condition de job sans secret
  const cond = jobCondition(t) ?? "";
  check(`${tag} : condition de job sur la branche créée et la PR non fusionnée`, /github\.event_name == 'create'/.test(cond) && /github\.ref_type == 'branch'/.test(cond) && /github\.event\.pull_request\.merged == false/.test(cond), cond);
  check(`${tag} : aucun secret dans la condition de job`, cond !== "" && !/secrets/.test(cond));

  // valeurs lues à l'exécution et portée
  const jobEnv = (blockAfter(t, /^ {4}env:\s*$/) ?? []).filter((l) => indentOf(l) === 6).map((l) => /^\s*([A-Z_]+):/.exec(l)?.[1]);
  for (const key of ["PROJECT_TOKEN", "PROJECT_NUMBER", "PROJECT_OWNER", "BRANCH"]) check(`${tag} : ${key} dans l'environnement du job`, jobEnv.includes(key), jobEnv.join());
  check(`${tag} : GH_TOKEN absent de l'environnement du job`, !jobEnv.includes("GH_TOKEN"));
  check(`${tag} : secrets.PROJECT_TOKEN, vars.PROJECT_NUMBER, vars.PROJECT_OWNER avec repli sur le propriétaire du dépôt`, t.includes("PROJECT_TOKEN: ${{ secrets.PROJECT_TOKEN }}") && t.includes("PROJECT_NUMBER: ${{ vars.PROJECT_NUMBER }}") && t.includes("PROJECT_OWNER: ${{ vars.PROJECT_OWNER || github.repository_owner }}"));
  const assigned = lines(t).map((l) => /^\s*(PROJECT_TOKEN|PROJECT_NUMBER|PROJECT_OWNER|GH_TOKEN): (.*)$/.exec(l)).filter(Boolean);
  check(`${tag} : chaque affectation de jeton ou de configuration est une expression secrets ou vars`, assigned.length >= 4 && assigned.every((m) => VALUE_RE.test(m[2].trim())), assigned.filter((m) => !VALUE_RE.test(m[2].trim())).map((m) => m[0].trim()).join(" ; "));

  // étapes : notice et mise à jour, conditions sur env, GH_TOKEN sur la seule mise à jour
  const all = steps(t);
  const notice = all.filter((s) => /^\s+- name:/.test(s) && /if: env\.PROJECT_TOKEN == '' \|\| env\.PROJECT_NUMBER == ''/.test(s));
  const apply = all.filter((s) => /if: env\.PROJECT_TOKEN != '' && env\.PROJECT_NUMBER != ''/.test(s));
  check(`${tag} : une étape de notice et une étape de mise à jour, conditionnées par env`, all.length === 2 && notice.length === 1 && apply.length === 1, `${all.length} étapes`);
  check(`${tag} : GH_TOKEN posé seulement sur l'étape de mise à jour`, apply.length === 1 && /^\s+GH_TOKEN: \$\{\{ secrets\.PROJECT_TOKEN \}\}\s*$/m.test(apply[0]) && (t.match(/GH_TOKEN:/g) ?? []).length === 1 && notice.length === 1 && !notice[0].includes("GH_TOKEN"));
  check(`${tag} : la notice nomme la valeur absente et l'étape de mise à jour ne lit pas d'expression`, notice.length === 1 && notice[0].includes("::notice::") && notice[0].includes("PROJECT_TOKEN") && notice[0].includes("PROJECT_NUMBER"));

  // scripts : aucune expression, aucun set -e, aucune action non épinglée
  const blocks = runBlocks(t);
  const flaws = workflowProblems(t);
  check(`${tag} : un bloc run par étape avec run, tous reconnus`, blocks.length === 2 && blocks.every((b) => b.ok), `${blocks.length} bloc(s)`);
  check(`${tag} : aucune expression dans un script, chaque expression sur une ligne concurrency, if ou env, aucune réponse brute de l'API dans le journal`, flaws.length === 0, flaws.join(" ; "));
  const uses = lines(t).filter((l) => /^\s*(?:- )?uses:/.test(l));
  check(`${tag} : aucune action, ou chaque action épinglée sur un SHA de quarante caractères`, uses.every((l) => /@[0-9a-f]{40}\b/.test(l)), uses.join(" ; "));
  check(`${tag} : aucun set -e, aucun item-edit, une seule mutation`, !/set -e/.test(t) && !t.includes("item-edit") && (t.match(/updateProjectV2ItemFieldValue/g) ?? []).length === 1);

  // cible et classement des erreurs
  const script = apply.length === 1 ? runBlocks(apply[0]).map((b) => b.body).join("\n") : "";
  check(`${tag} : cible lue par ^[a-z]+/([0-9]+)- avec exclusion de dependabot/ et release-please--`, script.includes("^[a-z]+/([0-9]+)-") && script.includes("dependabot/*") && script.includes("release-please--*"));
  const scopes = lang === "fr" ? "scopes project et repo" : "project and repo scopes";
  check(`${tag} : l'échec nomme PROJECT_TOKEN et ses scopes (« ${scopes} »)`, script.split("\n").some((l) => /^\s*fail "/.test(l) && l.includes("PROJECT_TOKEN") && l.includes(scopes)));
  // chaque appel de gh (api, project, pr) passe par gh_call, jamais directement
  const ghLines = script.split("\n").filter((l) => !/^\s*#/.test(l) && /\bgh (?:api|project|pr)\b/.test(l));
  check(`${tag} : chaque appel de gh passe par gh_call`, ghLines.length >= 5 && ghLines.every((l) => /^\s*gh_call gh /.test(l)), ghLines.filter((l) => !/^\s*gh_call gh /.test(l)).join(" | "));
  // classification du jeton : l'alternance du case de gh_call, convertie en expression régulière
  const alternation = script.split("\n").find((l) => /^\s*\*"[^"]+"\*(?:\|\*"[^"]+"\*)*\)\s*$/.test(l)) ?? "";
  const patterns = [...alternation.matchAll(/\*"([^"]+)"\*/g)].map((m) => m[1]);
  check(`${tag} : classification du jeton refusé : cas du jeton et cas qui n'en sont pas`, patterns.length > 0 && tokenClassification(patterns).length === 0, tokenClassification(patterns).join(" ; "));
  check(`${tag} : notice et échec classés par skip et fail, chaque appel de gh contrôlé`, /^\s*skip\(\)/m.test(script) && /^\s*fail\(\)/m.test(script) && script.includes("::notice::") && script.includes("::error::") && script.includes("Could not resolve to an Issue") && script.includes("Bad credentials"));

  // noms exacts
  for (const name of ["Status", "In Progress", "In Review", "Done"]) check(`${tag} : littéral ${name}`, t.includes(name));
  check(`${tag} : aucun marqueur ni paramètre non résolu`, !unresolved(t));
  check(`${tag} : aucun jeton réel ni préfixe de jeton`, !TOKEN_PREFIX.test(t));
}

// --- autocontrôle : les contrôles de portée détectent chaque altération
{
  const sample = on.read(WORKFLOW);
  const alter = (from, to) => {
    if (!sample.includes(from)) throw new Error(`autocontrôle : motif absent du modèle : ${from}`);
    return sample.replace(from, () => to);
  };
  const header = "        run: |\n          if [[";
  check("autocontrôle : le workflow généré n'a aucun problème de portée", sample !== "" && workflowProblems(sample).length === 0, workflowProblems(sample).join(" ; "));
  check("autocontrôle : expression dans le corps d'un script détectée", workflowProblems(alter('NUMBER="${BASH_REMATCH[1]}"', 'NUMBER="${{ github.head_ref }}"')).some((x) => /dans un script/.test(x)));
  check("autocontrôle : expression dans un run d'une ligne détectée", workflowProblems(alter(header, '        run: echo "${{ github.head_ref }}"\n          if [[')).some((x) => /dans un script/.test(x)));
  check("autocontrôle : corps de run non reconnu détecté", workflowProblems(alter(header, "        run:\n          if [[")).some((x) => /non reconnu/.test(x)));
  check("autocontrôle : en-tête de scalaire avec indicateur d'indentation reconnu", workflowProblems(alter(header, "        run: |2-\n          if [[")).length === 0);
  check("autocontrôle : expression hors concurrency, if et env détectée", workflowProblems(alter("      GH_REPO:", "      EXTRA: a ${{ github.head_ref }}\n      GH_REPO:")).some((x) => /hors concurrency/.test(x)));
  check("autocontrôle : réponse brute de l'API dans le journal détectée", workflowProblems(alter('PROJECT_ID="$out"', 'PROJECT_ID="$out"; echo "$out"')).some((x) => /journal/.test(x)));
  check("autocontrôle : chacun des six préfixes de jeton GitHub est détecté", ["ghp", "gho", "ghu", "ghs", "ghr", "github_pat"].every((x) => TOKEN_PREFIX.test(`${x}_x`)) && !TOKEN_PREFIX.test("GH_TOKEN: ${{ secrets.PROJECT_TOKEN }}"));
  const oldPatterns = ["Bad credentials", "401", "403", "scope", "expired", "Resource not accessible", "Could not resolve to a Repository"];
  const newPatterns = ["Bad credentials", "HTTP 401", "HTTP 403", "required scopes", "Resource not accessible", "Could not resolve to a Repository"];
  check("autocontrôle : la classification du jeton rejette les motifs nus 401, 403 et scope", tokenClassification(oldPatterns).some((x) => /1403/.test(x)) && tokenClassification(oldPatterns).some((x) => /number 403/.test(x)), tokenClassification(oldPatterns).join(" ; "));
  check("autocontrôle : la classification du jeton accepte les motifs précis", tokenClassification(newPatterns).length === 0, tokenClassification(newPatterns).join(" ; "));
}


// --- docs/workflow.md : statuts du Project
for (const lang of ["fr", "en"]) {
  const phrase = lang === "fr" ? "automatiques avec le secret, manuels sans" : "automatic with the secret, manual without";
  const manual = lang === "fr" ? "se règlent à la main" : "are set by hand";
  const g = run({ ...base, docLanguage: lang });
  const d = g.read("docs/workflow.md");
  check(`workflow.md (${lang}, issue-source) : phrase des statuts, secret PROJECT_TOKEN, branche sur GitHub et PR`, d.includes(phrase) && d.includes("PROJECT_TOKEN") && d.includes("PROJECT_NUMBER") && d.includes("*In Progress*") && d.includes("*In Review*") && (lang === "fr" ? d.includes("à la création de la branche sur GitHub") && d.includes("à l'ouverture de la PR") : d.includes("when the branch is created on GitHub") && d.includes("when the PR is opened")), d.slice(d.indexOf("Issue")).slice(0, 400));
  const j = run({ ...base, modules: ["claude", "github", "projects", "jira"], jiraSource: "jira", docLanguage: lang }).read("docs/workflow.md");
  check(`workflow.md (${lang}, jira) : statuts à la main, ni PROJECT_TOKEN ni auto-add`, j.includes(manual) && j.includes("*In Progress*") && !j.includes("PROJECT_TOKEN") && !j.includes("PROJECT_NUMBER") && !j.includes("auto-add"), j.slice(j.indexOf("Issue")).slice(0, 400));
  const o = run({ ...base, modules: ["claude", "github"], docLanguage: lang }).read("docs/workflow.md");
  check(`workflow.md (${lang}, sans projects) : ni In Progress, ni In Review, ni PROJECT_TOKEN`, !/In Progress|In Review|PROJECT_TOKEN|PROJECT_NUMBER/.test(o));
}

// --- ARCH-004 généré
for (const lang of ["fr", "en"]) {
  const mods = ["claude", "github", "projects", "archgate"];
  const withModule = arch004(run({ ...base, modules: mods, docLanguage: lang }));
  const without = arch004(run({ ...base, modules: ["claude", "github", "archgate"], docLanguage: lang }));
  const jira = arch004(run({ ...base, modules: [...mods, "jira"], jiraSource: "jira", docLanguage: lang }));
  const agreement = lang === "fr" ? "vaut accord explicite" : "counts as explicit agreement";
  check(`ARCH-004 (${lang}, avec projects) : project-status.yml, PROJECT_TOKEN optionnel dont la création vaut accord`, withModule.includes("project-status.yml") && withModule.includes("PROJECT_TOKEN") && withModule.includes("PROJECT_NUMBER") && withModule.includes(agreement), withModule.slice(withModule.indexOf("Projects")).slice(0, 400));
  check(`ARCH-004 (${lang}, sans projects) : ni PROJECT_TOKEN ni project-status.yml`, without !== "" && !without.includes("PROJECT_TOKEN") && !without.includes("project-status.yml"));
  check(`ARCH-004 (${lang}, jira) : ni PROJECT_TOKEN ni project-status.yml`, jira !== "" && !jira.includes("PROJECT_TOKEN") && !jira.includes("project-status.yml"));
}

// --- --update : un projet généré avant le workflow le reçoit, une fois
const old = run(base);
const manifestPath = path.join(old.out, ".bootstrap", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const hadEntry = WORKFLOW in manifest.files;
delete manifest.files[WORKFLOW];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
rmSync(path.join(old.out, ...WORKFLOW.split("/")), { force: true });
check("projects : le manifeste généré liste le workflow", hadEntry);
const first = update(old.out);
check("projects : --update recrée le workflow et le rapporte parmi les fichiers créés", first.status === 0 && old.has(WORKFLOW) && (created(first) ?? []).includes(WORKFLOW), `${first.status} ${first.stderr.slice(0, 160)}`);
check("projects : après --update, le manifeste liste le workflow", WORKFLOW in JSON.parse(readFileSync(manifestPath, "utf8")).files);
const before = old.read(WORKFLOW);
const second = update(old.out);
check("projects : un second --update ne change rien", second.status === 0 && (created(second) ?? ["?"]).length === 0 && old.read(WORKFLOW) === before, `${second.status} ${second.stderr.slice(0, 160)}`);

if (failures) {
  console.log(`\n${failures} vérification(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests du module projects passent");
