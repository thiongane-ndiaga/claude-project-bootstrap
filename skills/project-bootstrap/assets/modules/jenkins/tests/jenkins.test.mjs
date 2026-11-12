#!/usr/bin/env node
// Tests du module jenkins (#24) : script de vérification de Node exécuté, parité des commandes et des versions avec ci.yml.
// Lancé par tests/modules.test.mjs ou seul : node jenkins.test.mjs
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
  actions: { checkout: pin("a"), setupNode: pin("b"), releasePlease: pin("c") },
  actionsCreditNote: "essai",
  visibility: "private",
};

function generate(extra) {
  const dir = mkdtempSync(path.join(tmpdir(), "pb-jenkins-"));
  const cfg = path.join(dir, "bootstrap.json");
  writeFileSync(cfg, JSON.stringify({ ...base, ...extra }));
  const out = path.join(dir, "out");
  const res = spawnSync(process.execPath, [scaffold, "--config", cfg, "--target", out], { encoding: "utf8" });
  const read = (rel) => readFileSync(path.join(out, ...rel.split("/")), "utf8");
  return { res, read };
}

// script de l'étape Node : extrait du Jenkinsfile, exécuté avec une version simulée
function nodeScript(jenkinsfile) {
  const m = /node -e "([^\n]*)"\n/.exec(jenkinsfile);
  return m ? m[1] : null;
}
const runNode = (script, version) => spawnSync(process.execPath, ["-e", script.replaceAll("process.versions.node", JSON.stringify(version))], { encoding: "utf8" });

for (const lang of ["fr", "en"]) {
  const g = generate({ docLanguage: lang, modules: ["claude", "github", "openspec", "archgate", "jenkins"] });
  check(`jenkins (${lang}) : génération réussie`, g.res.status === 0, g.res.stderr.slice(0, 200));
  const jf = g.read("Jenkinsfile");
  const ci = g.read(".github/workflows/ci.yml");

  const script = nodeScript(jf);
  check(`jenkins (${lang}) : script de Node extrait, sans ?. ni ??`, script !== null && !/\?\.|\?\?/.test(script), String(script));
  if (script) {
    const old = runNode(script, "20.18.0");
    const exact = runNode(script, "20.19.0");
    const next = runNode(script, "22.1.0");
    const older = runNode(script, "18.20.0");
    check(`jenkins (${lang}) : Node 20.18.0 refusé, version dans le message`, old.status !== 0 && old.stderr.includes("20.18.0"), old.stderr);
    check(`jenkins (${lang}) : Node 18.20.0 refusé`, older.status !== 0, older.stderr);
    check(`jenkins (${lang}) : Node 20.19.0 et 22.1.0 acceptés`, exact.status === 0 && next.status === 0, exact.stderr + next.stderr);
  }
  check(`jenkins (${lang}) : absence de node signalée avant la comparaison`, /command -v node[^\n]*exit 1/.test(jf));

  // parité avec ci.yml : mêmes versions épinglées et mêmes commandes
  check(`jenkins (${lang}) : versions épinglées identiques à ci.yml`, ci.includes("OPENSPEC_VERSION: 1.2.3") && jf.includes("@fission-ai/openspec@1.2.3") && ci.includes("ARCHGATE_VERSION: 4.5.6") && jf.includes("archgate@4.5.6"));
  for (const cmd of ["openspec validate --all --strict --no-interactive", "node .bootstrap/run-checks.mjs", "node scripts/check-pr-title.mjs"]) {
    check(`jenkins (${lang}) : commande de ci.yml rejouée (${cmd})`, ci.includes(cmd) && jf.includes(cmd));
  }
  check(`jenkins (${lang}) : archgate check avec sortie console, écart admis avec --output github`, ci.includes("archgate check --output github") && jf.includes("archgate check --output console"));
  check(`jenkins (${lang}) : télémétrie OpenSpec coupée comme dans ci.yml`, ci.includes('OPENSPEC_TELEMETRY: "0"') && jf.includes("OPENSPEC_TELEMETRY = '0'"));

  // étapes dans l'ordre de ci.yml
  const names = [...jf.matchAll(/stage\((['"])(.*?)\1\)/g)].map((m) => m[2]);
  const expected = lang === "fr"
    ? ["Node", "Titre de PR", "CLI d'outillage", "OpenSpec validate", "Archgate check", "Chaîne d'outils du projet", "Commandes du projet"]
    : ["Node", "PR title", "Tooling CLIs", "OpenSpec validate", "Archgate check", "Project toolchain", "Project commands"];
  check(`jenkins (${lang}) : sept étapes dans l'ordre de ci.yml`, names.join("|") === expected.join("|"), names.join("|"));

  // titre de PR : CHANGE_TITLE seulement dans withEnv, jamais dans une chaîne sh
  const titleLines = jf.split("\n").filter((l) => l.includes("CHANGE_TITLE"));
  check(`jenkins (${lang}) : CHANGE_TITLE seulement dans withEnv`, titleLines.length === 1 && titleLines[0].includes("withEnv") && !/sh\b/.test(titleLines[0]), titleLines.join("|"));
  check(`jenkins (${lang}) : titre de PR limité aux pull requests`, /when \{ changeRequest\(\) \}/.test(jf));
  check(`jenkins (${lang}) : ni marqueur ni paramètre non résolu`, !/@@module|@@end|\{\{[A-Z0-9_]+\}\}/.test(jf));
  check(`jenkins (${lang}) : installation sans préfixe npm global de l'agent`, /npm install -g --prefix "\$WORKSPACE\/\.ci-tools"/.test(jf) && !/npm install -g "/.test(jf));
}

if (failures) {
  console.log(`\n${failures} vérification(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests du module jenkins passent");
