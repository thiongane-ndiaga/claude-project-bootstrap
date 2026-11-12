#!/usr/bin/env node
// Tests du module sonar (#22) : génération, job inactif sans jeton, modes cloud et serveur, épinglage, héritage par --update.
// Lancé par tests/modules.test.mjs ou seul : node sonar.test.mjs
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
const base = {
  projectName: "Essai",
  description: "Projet d'essai.",
  versions: { openspec: "1.2.3", archgate: "4.5.6", node: "24" },
  actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c"), sonarScan: pin("d") },
  actionsCreditNote: "essai",
  visibility: "private",
  modules: ["claude", "github", "sonar"],
};

function run(config, { target, args = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-sonar-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify(config));
  const out = target ?? path.join(dir, "out");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out, ...args], { encoding: "utf8" });
  const read = (rel) => readFileSync(path.join(out, ...rel.split("/")), "utf8");
  const has = (rel) => existsSync(path.join(out, ...rel.split("/")));
  return { res, read, has, out };
}
const update = (target, extra = {}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-sonar-upd-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify({ ...base, ...extra }));
  return spawnSync(process.execPath, [scaffold, "--update", "--target", target, "--config", cfg], { encoding: "utf8" });
};
// marqueurs de module et paramètres {{NOM}} restants (les expressions ${{ … }} de GitHub Actions n'en sont pas)
const unresolved = (t) => t.includes("@@") || /\{\{[A-Z0-9_]+\}\}/.test(t);
const manifestOf = (g) => JSON.parse(g.read(".bootstrap/manifest.json"));

// module actif, absent, refus sans github
const on = run(base);
const off = run({ ...base, modules: ["claude", "github"] });
check("sonar : génération réussie, fichiers et job présents", on.res.status === 0 && on.has("sonar-project.properties") && on.has("docs/sonar.md") && /^ {2}sonar:$/m.test(on.read(".github/workflows/ci.yml")), on.res.stderr.slice(0, 200));
check("sonar : sans le module, ni fichiers ni job", off.res.status === 0 && !off.has("sonar-project.properties") && !off.has("docs/sonar.md") && !/sonar/i.test(off.read(".github/workflows/ci.yml")));
check("sonar : refusé sans github (code 1)", run({ ...base, modules: ["claude", "sonar"] }).res.status === 1);

for (const lang of ["fr", "en"]) {
  const g = run({ ...base, docLanguage: lang });
  const ci = g.read(".github/workflows/ci.yml");
  check(`sonar (${lang}) : étape d'analyse conditionnée au jeton et à l'événement, notice sans jeton`, ci.includes("if: env.SONAR_TOKEN != '' && github.event.action != 'edited'") && ci.includes("if: env.SONAR_TOKEN == ''") && ci.includes("::notice::"));
  check(`sonar (${lang}) : secret lu dans l'environnement du job, checkout complet, ubuntu-latest, délai`, ci.includes("SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}") && ci.includes("fetch-depth: 0") && /sonar:\n {4}runs-on: ubuntu-latest\n {4}timeout-minutes: 15/.test(ci));
  check(`sonar (${lang}) : action épinglée sur un SHA, jamais un tag mobile`, ci.includes(`SonarSource/sonarqube-scan-action@${"d".repeat(40)} # v1.0.0`) && !/sonarqube-scan-action@v/.test(ci));
  check(`sonar (${lang}) : le message de la notice est en bloc littéral (YAML valide)`, /run: \|\n\s+echo "::notice::/.test(ci));
  check(`sonar (${lang}) : aucun marqueur ni paramètre non résolu`, ![ci, g.read("sonar-project.properties"), g.read("docs/sonar.md")].some(unresolved));
  const props = g.read("sonar-project.properties");
  check(`sonar (${lang}) : propriétés avec sources, exclusions des dossiers du plugin, organisation prévue, sans qualitygate.wait`, props.includes("sonar.sources=.") && /sonar\.exclusions=.*\.claude/.test(props) && props.includes("sonar.organization") && !props.includes("qualitygate.wait=") && !ci.includes("qualitygate"));
  check(`sonar (${lang}) : cloud par défaut, pas de SONAR_HOST_URL, clé non consignée`, !ci.includes("SONAR_HOST_URL") && manifestOf(g).config.sonar === undefined);
  const d = g.read("docs/sonar.md");
  const needles = ["SONAR_TOKEN", "sonar-project.properties", "sonar.projectKey", "sonar.organization", "sonar.qualitygate.wait", "dependabot", "Jenkinsfile", "sonar.java.binaries"];
  check(`sonar (${lang}) : docs/sonar.md liste les étapes et les limites (cloud)`, needles.every((n) => d.includes(n)) && !d.includes("SONAR_HOST_URL"), needles.filter((n) => !d.includes(n)).join(", "));
}

// mode serveur
const srv = run({ ...base, sonar: "server" });
const srvCi = srv.read(".github/workflows/ci.yml");
check("sonar server : SONAR_HOST_URL exporté depuis la variable de dépôt, analyse du push seulement", srv.res.status === 0 && srvCi.includes("SONAR_HOST_URL: ${{ vars.SONAR_HOST_URL }}") && srvCi.includes("if: env.SONAR_TOKEN != '' && github.event_name == 'push'") && !srvCi.includes("github.event.action != 'edited'"));
check("sonar server : propriétés sans organisation, documentation avec SONAR_HOST_URL, clé consignée", !srv.read("sonar-project.properties").includes("sonar.organization") && srv.read("docs/sonar.md").includes("SONAR_HOST_URL") && !srv.read("docs/sonar.md").includes("sonar.organization") && manifestOf(srv).config.sonar === "server");

// refus : valeur invalide, clé sans le module, épinglage manquant
check("sonar : valeur invalide refusée (code 1)", run({ ...base, sonar: "autre" }).res.status === 1);
check("sonar : clé sonar sans le module refusée (code 1)", run({ ...base, modules: ["claude", "github"], sonar: "server" }).res.status === 1);
const noPin = run({ ...base, actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c") } });
check("sonar : épinglage de l'action absent -> échec", noPin.res.status !== 0, noPin.res.stderr.slice(0, 200));

// --update : héritage de la clé, retrait, propriétés du projet
const upd = update(srv.out);
check("sonar : --update sans la clé hérite du mode serveur", upd.status === 0 && srv.read(".github/workflows/ci.yml").includes("SONAR_HOST_URL") && manifestOf(srv).config.sonar === "server", upd.stderr.slice(0, 200));
writeFileSync(path.join(srv.out, "sonar-project.properties"), "sonar.projectKey=mon_projet\n");
const upd2 = update(srv.out, { sonar: "server" });
check("sonar : --update laisse sonar-project.properties du projet intact", upd2.status === 0 && srv.read("sonar-project.properties") === "sonar.projectKey=mon_projet\n", upd2.stderr.slice(0, 200));
const rm = update(srv.out, { modules: ["claude", "github"] });
check("sonar : --update qui retire le module alors que la clé est héritée échoue (code 1)", rm.status === 1, `${rm.status} ${rm.stderr.slice(0, 160)}`);
const rmNull = update(srv.out, { modules: ["claude", "github"], sonar: null });
check("sonar : --update avec sonar: null retire le module et la clé", rmNull.status === 0 && manifestOf(srv).config.sonar === undefined, `${rmNull.status} ${rmNull.stderr.slice(0, 160)}`);

// fichier existant divergent à la première génération
const target = mkdtempSync(path.join(tmpdir(), "pb-sonar-existing-"));
writeFileSync(path.join(target, "sonar-project.properties"), "sonar.projectKey=deja_la\n");
const conflict = run(base, { target });
check("sonar : propriétés existantes divergentes conservées (fichier du projet, code 0)", conflict.res.status === 0 && readFileSync(path.join(target, "sonar-project.properties"), "utf8") === "sonar.projectKey=deja_la\n", `${conflict.res.status} ${conflict.res.stderr.slice(0, 160)}`);

if (failures) {
  console.log(`\n${failures} vérification(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests du module sonar passent");
