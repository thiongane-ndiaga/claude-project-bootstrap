#!/usr/bin/env node
// Génère les fichiers d'outillage d'un projet à partir des modèles du skill.
// Usage : node scaffold.mjs --config <bootstrap.json> --target <dossier> [--dry-run] [--diff] [--catalog <dossier>]
//         node scaffold.mjs --list-modules [--format table]   (catalogue des modules, lu dans leurs descripteurs)
//         node scaffold.mjs --detect --target <dossier>     (état du dépôt : existant, déjà bootstrappé)
// Écrit .bootstrap/manifest.json (modules, version du plugin, empreinte de chaque fichier généré).
// N'écrase jamais un fichier modifié : les conflits sont listés (diff avec --diff), à résoudre à la main.
// Un fichier resté tel que généré est remplacé par le modèle actuel ; .gitignore, .gitattributes et
// .claude/settings.json sont fusionnés avec l'existant ; config.keep liste les fichiers à ne pas toucher.
// --catalog : dossier de modules alternatif (tests) ; par défaut assets/modules/ (un dossier par module : module.json, templates/).
// Codes de sortie : 0 succès ; 1 configuration ou catalogue invalide ; 2 modules incompatibles ; 3 fichiers en conflit.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogError, PSEUDO_MODULES, describeModules, loadCatalog, modulesTable, templatePath } from "./catalog.mjs";
import { mergeJson, mergeLines, mergeThreeWay } from "./merge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "..", "assets");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []),
);
const catalogDir = typeof args.catalog === "string" ? path.resolve(args.catalog) : path.join(assets, "modules");
let manifest;
try {
  manifest = loadCatalog(catalogDir);
} catch (err) {
  if (!(err instanceof CatalogError)) throw err;
  console.error(err.message);
  process.exit(1);
}
if (args["list-modules"] === true) {
  console.log(args.format === "table" ? modulesTable(manifest) : JSON.stringify({ modules: describeModules(manifest), languages: ["fr", ...manifest.languages] }, null, 2));
  process.exit(0);
}
if (!args.target || (!args.config && args.detect !== true && args.update !== true)) {
  console.error(
    "Usage : node scaffold.mjs --config <bootstrap.json> --target <dossier> [--dry-run] [--diff] [--adopt] [--catalog <dossier>]\n" +
      "        node scaffold.mjs --update --target <dossier> [--dry-run] [--diff] [--adopt]   (configuration lue dans le manifeste)\n" +
      "        node scaffold.mjs --detect --target <dossier>\n" +
      "        node scaffold.mjs --list-modules [--format table]",
  );
  process.exit(1);
}
const target = path.resolve(args.target);
// langues disponibles : « fr » et chaque dossier templates.<code> rencontré dans un module (« templates.fr » est refusé par le chargeur)
const languageDirs = () => manifest.languages;

// --- manifeste du projet (.bootstrap/manifest.json) et version du plugin en cours d'exécution ---
const MANIFEST = ".bootstrap/manifest.json";
const manifestPath = path.join(target, ...MANIFEST.split("/"));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const readText = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
let pluginVersion = "unknown";
try {
  pluginVersion = JSON.parse(readFileSync(path.join(here, "..", "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version;
} catch {
  // plugin lancé hors de son arborescence : version inconnue
}
let previous = null;
if (existsSync(manifestPath)) {
  try {
    previous = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    if (args.detect !== true) {
      console.error(`${MANIFEST} illisible : corrige-le ou supprime-le avant de relancer`);
      process.exit(1);
    }
  }
}

// --- détection : le dépôt cible existe-t-il, est-il déjà bootstrappé ? (aucune écriture) ---
if (args.detect === true) {
  const has = (p) => existsSync(path.join(target, ...p.split("/")));
  let recorded = null;
  if (has(".bootstrap/manifest.json")) {
    recorded = previous
      ? { plugin: previous.plugin, modules: previous.modules, docLanguage: previous.config?.docLanguage ?? "fr", cliInstall: previous.config?.cliInstall ?? "global", files: Object.keys(previous.files ?? {}).length, migrations: previous.migrations ?? [] }
      : { error: "manifeste illisible" };
  }
  console.log(
    JSON.stringify(
      {
        target,
        exists: existsSync(target),
        git: has(".git"),
        bootstrapped: recorded !== null,
        manifest: recorded,
        pluginVersion,
        languages: ["fr", ...languageDirs()].sort(),
        updateAvailable: previous?.plugin?.version !== undefined && previous.plugin.version !== pluginVersion,
        claude: has(".claude"),
        packageJson: has("package.json"),
        resumable: has(".bootstrap/local/state.json"),
        ci: has(".github/workflows") ? readdirSync(path.join(target, ".github", "workflows")).sort() : [],
        sharedFiles: [".gitignore", ".gitattributes", "CLAUDE.md", ".claude/settings.json"].filter(has),
        topLevel: existsSync(target) ? readdirSync(target).filter((n) => n !== ".git").sort() : [],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// --update : la configuration est celle du manifeste (--config la remplace, par exemple pour relever des versions épinglées)
if (args.update === true && !previous && !args.config) {
  console.error(`--update exige ${MANIFEST} (projet sans manifeste : utilise --config avec --adopt)`);
  process.exit(1);
}
const config = typeof args.config === "string" ? JSON.parse(readFileSync(args.config, "utf8")) : previous?.config;
// date de génération figée au manifeste : sans elle, {{DATE}} change chaque jour et le modèle paraît modifié
config.date = config.date ?? previous?.config?.date ?? new Date().toISOString().slice(0, 10);
// langue de la documentation et mode d'installation des CLI : hérités du manifeste quand --config ne les redéfinit pas
// (une configuration sans la clé ne fait changer ni la langue ni le mode)
for (const key of ["docLanguage", "cliInstall"]) if (config[key] === undefined && previous?.config?.[key] !== undefined) config[key] = previous.config[key];
const dryRun = args["dry-run"] === true;

// --- modules sélectionnés et dépendances ---
const selected = new Set(["core", ...(config.modules ?? [])]);
const errors = [];
for (const m of selected) {
  const def = manifest.modules[m];
  if (!def) errors.push(`Module inconnu : ${m}`);
  else for (const r of def.requires) if (!selected.has(r)) errors.push(`Le module ${m} requiert ${r}`);
}
if (!["private", "public"].includes(config.visibility)) errors.push("visibility doit valoir private ou public");
const availableLanguages = ["fr", ...languageDirs()].sort();
const docLanguage = config.docLanguage ?? "fr";
if (!availableLanguages.includes(docLanguage)) errors.push(`docLanguage ${JSON.stringify(docLanguage)} indisponible : langues disponibles ${availableLanguages.join(", ")}`);
const CLI_MODES = ["global", "user", "local"];
if (config.cliInstall !== undefined && !CLI_MODES.includes(config.cliInstall)) errors.push(`cliInstall doit valoir ${CLI_MODES.join(", ")} (reçu : ${JSON.stringify(config.cliInstall)})`);
if (config.cliInstall === "local" && !selected.has("openspec") && !selected.has("archgate")) errors.push("cliInstall local exige le module openspec ou archgate (rien à installer en local sinon)");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
// incompatibilités : la déclaration d'un seul des deux modules suffit
const incompatible = new Set();
for (const m of selected) {
  for (const c of manifest.modules[m].conflicts ?? []) if (selected.has(c)) incompatible.add([m, c].sort().join(" / "));
}
if (incompatible.size) {
  console.error([...incompatible].map((p) => `Modules incompatibles : ${p}`).join("\n"));
  process.exit(2);
}
// pseudo-modules utilisés par les blocs conditionnels
const cliMode = config.cliInstall ?? "global";
const active = new Set([...selected, `visibility-${config.visibility}`, config.stack ? "stack-chosen" : "stack-open", ...(cliMode === "local" ? ["cli-local"] : ["cli-npm-global"]), ...(cliMode === "user" ? ["cli-user"] : []), ...(cliMode === "global" ? ["cli-default"] : [])]);

// --- paramètres ---
const ref = (a) => (a ? `${a.sha} # ${a.tag}` : undefined);
const isPublic = config.visibility === "public";
// valeurs de paramètres qui portent du texte, par langue de documentation
const LANG_PARAMS = {
  fr: {
    DOC_LANGUAGE_NAME: "Français",
    VISIBILITY_LABEL: isPublic ? "public" : "privé",
    CI_OS_TEXT: isPublic ? "`ubuntu-latest` et `windows-latest` (gratuits en public)" : "`ubuntu-latest` uniquement (crédit Actions limité en privé)",
    CI_BLOCKING_NOTE: isPublic ? "oui si la protection de `main` exige le check" : "non : un dépôt privé sur GitHub Free n'a pas de protection de branche ; ne pas merger une PR rouge",
    ACTIONS_CREDIT_NOTE: "voir la page de facturation Actions",
  },
  en: {
    DOC_LANGUAGE_NAME: "English",
    VISIBILITY_LABEL: isPublic ? "public" : "private",
    CI_OS_TEXT: isPublic ? "`ubuntu-latest` and `windows-latest` (free for public repositories)" : "`ubuntu-latest` only (limited Actions credit for private repositories)",
    CI_BLOCKING_NOTE: isPublic ? "yes if the `main` protection requires the check" : "no: a private repository on GitHub Free has no branch protection; do not merge a red PR",
    ACTIONS_CREDIT_NOTE: "see the Actions billing page",
  },
};
const langParams = LANG_PARAMS[docLanguage] ?? LANG_PARAMS.fr;
const params = {
  PROJECT_NAME: config.projectName,
  PROJECT_DESCRIPTION: config.description,
  STACK: config.stack,
  DOC_LANGUAGE_NAME: config.docLanguageName ?? langParams.DOC_LANGUAGE_NAME,
  DATE: config.date ?? new Date().toISOString().slice(0, 10),
  VISIBILITY_LABEL: langParams.VISIBILITY_LABEL,
  OPENSPEC_VERSION: config.versions?.openspec,
  ARCHGATE_VERSION: config.versions?.archgate,
  NODE_VERSION: config.versions?.node ?? "24",
  CHECKOUT_REF: ref(config.actions?.checkout),
  SETUP_NODE_REF: ref(config.actions?.setupNode),
  RELEASE_PLEASE_REF: ref(config.actions?.releasePlease),
  CI_OS_JSON: isPublic ? '["ubuntu-latest", "windows-latest"]' : '["ubuntu-latest"]',
  CI_OS_TEXT: langParams.CI_OS_TEXT,
  CI_BLOCKING_NOTE: langParams.CI_BLOCKING_NOTE,
  ACTIONS_CREDIT_NOTE: config.actionsCreditNote ?? langParams.ACTIONS_CREDIT_NOTE,
};

// --- blocs conditionnels : lignes contenant @@module:a|b ... @@end (imbriquables) ---
function applyBlocks(text, file) {
  const out = [];
  const stack = [];
  for (const line of text.split("\n")) {
    const open = /@@module:([\w|-]+)/.exec(line);
    if (open) {
      stack.push(open[1].split("|").some((m) => active.has(m)));
      continue;
    }
    if (/@@end\b/.test(line)) {
      if (!stack.length) throw new Error(`${file} : @@end sans @@module`);
      stack.pop();
      continue;
    }
    if (stack.every(Boolean)) out.push(line);
  }
  if (stack.length) throw new Error(`${file} : @@module non fermé`);
  return out.join("\n");
}

function applyParams(text, file) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) throw new Error(`${file} : paramètre {{${key}}} non renseigné`);
    return params[key];
  });
}

// --- .claude/settings.json construit selon les modules (le JSON n'admet pas de blocs) ---
function buildSettings() {
  const both = (rule) => [`Bash(${rule})`, `PowerShell(${rule})`];
  const allow = [];
  const ask = [];
  for (const g of ["git status *", "git diff *", "git log *", "git show *", "git branch --show-current", "git rev-parse *", "git ls-files *"]) allow.push(...both(g));
  if (active.has("openspec")) {
    allow.push(...both("openspec *"));
    for (const c of ["openspec install *", "openspec feedback *", "openspec config *"]) ask.push(...both(c));
  }
  if (active.has("archgate")) {
    allow.push(...both("archgate *"));
    for (const c of ["archgate login *", "archgate upgrade *", "archgate plugin *", "archgate telemetry *"]) ask.push(...both(c));
  }
  allow.push(...both("node .claude/hooks/quality-gate.mjs"));
  if (active.has("github")) {
    for (const g of ["auth status", "repo view", "issue list", "issue view", "pr list", "pr view", "pr diff", "pr checks", "run list", "run view", "release list", "release view", "label list"]) allow.push(...both(`gh ${g} *`));
    if (active.has("projects")) for (const g of ["project list", "project view", "project item-list"]) allow.push(...both(`gh ${g} *`));
  }
  const settings = { $schema: "https://json.schemastore.org/claude-code-settings.json", permissions: { allow, ask } };
  settings.hooks = {
    TaskCompleted: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/quality-gate.mjs"] }] }],
  };
  if (active.has("agent-profiles")) settings.hooks.PreToolUse = [{ matcher: "Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task|Skill", hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/profile-guard.mjs"] }] }];
  if (active.has("cli-local")) settings.hooks.SessionStart = [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/session-path.mjs"] }] }];
  return JSON.stringify(settings, null, 2) + "\n";
}

// --- package.json du mode local : construit en code (le JSON n'admet pas de blocs), propre au projet ---
function buildPackageJson() {
  const devDependencies = {};
  for (const [mod, pkg] of [["openspec", "@fission-ai/openspec"], ["archgate", "archgate"]]) {
    if (!active.has(mod)) continue;
    const version = config.versions?.[mod];
    if (!version) throw new Error(`package.json : version de ${mod} non renseignée (versions.${mod})`);
    devDependencies[pkg] = version;
  }
  return JSON.stringify({ private: true, scripts: { claude: "claude" }, devDependencies }, null, 2) + "\n";
}

// --- génération ---
const outputs = [];
try {
  for (const entry of manifest.files) {
    const { path: rel, when, merge, owned } = entry;
    if (!when.every((m) => active.has(m))) continue;
    // langue autre que « fr » : version de templates.<code> du module si elle existe, sinon son modèle de référence
    const raw = readFileSync(templatePath(entry, docLanguage), "utf8").replace(/\r\n/g, "\n");
    outputs.push({ rel, merge, owned, content: applyParams(applyBlocks(raw, rel), rel) });
  }
} catch (err) {
  // rien n'est écrit tant que tous les modèles ne sont pas résolus
  console.error(err.message);
  process.exit(1);
}
if (active.has("claude")) outputs.push({ rel: ".claude/settings.json", merge: "json", content: buildSettings() });
if (active.has("cli-local")) {
  try {
    outputs.push({ rel: "package.json", owned: true, content: buildPackageJson() });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function diffText(currentPath, proposed) {
  const tmp = path.join(mkdtempSync(path.join(tmpdir(), "pb-diff-")), "propose");
  writeFileSync(tmp, proposed);
  const res = spawnSync("git", ["diff", "--no-index", "--no-color", "--", currentPath, tmp], { encoding: "utf8" });
  return res.error ? "(git requis pour afficher le diff)" : res.stdout;
}

// Chaque entrée du manifeste : { sha256 (fichier tel qu'écrit), generated (empreinte du contenu produit par le modèle), status }.
// status : created (fichier du modèle) | merged (fusionné avec l'existant) | kept (géré par le projet) | adopted (existant repris tel quel).
//
// Règles, dans l'ordre, pour chaque fichier du modèle :
//   listé dans config.keep ou « owned » dans le catalogue (créé s'il est absent) -> conservé tel quel, jamais touché ;
//   absent                            -> créé ;
//   identique au modèle               -> rien ;
//   resté tel que généré              -> remplacé par le modèle actuel (l'empreinte du manifeste le prouve) ;
//   modèle inchangé depuis la génération -> rien : la personnalisation du projet n'est pas un conflit (« customized ») ;
//   base valide (.bootstrap/base)     -> fusion à trois voies base / projet / modèle (git merge-file) : sans conflit,
//                                        écrite et consignée « reconciled » ; avec conflit, rien n'est écrit (proposition dans diffs) ;
//   fichier partagé (merge)           -> fusionné avec l'existant ;
//   --adopt                           -> repris tel quel, consigné « adopted » (le modèle actuel devient la référence) ;
//   sinon                             -> conflit signalé (diff avec --diff), jamais d'écrasement.
const keep = new Set(config.keep ?? []);
const files = { ...(previous?.files ?? {}) };
const report = {
  target,
  modules: [...selected],
  bootstrapped: previous !== null,
  fromVersion: previous?.plugin?.version ?? null,
  toVersion: pluginVersion,
  created: [],
  updated: [],
  merged: [],
  identical: [],
  reconciled: [],
  customized: [],
  adopted: [],
  kept: [],
  retired: [],
  baseInvalid: [],
  conflicts: [],
};
const diffs = {};
const put = (dest, text) => {
  if (dryRun) return;
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, text);
};
// base de fusion (ARCH-006) : ce que le plugin a produit, en LF, suffixe neutre pour les outils du projet.
// Écrite seulement si elle manque ou diffère ; jamais pour un fichier fusionné par lignes/JSON, owned ou keep.
const baseFile = (rel) => path.join(target, ".bootstrap", "base", ...rel.split("/")) + ".base";
const ensureBase = (rel, content) => {
  const file = baseFile(rel);
  if (!existsSync(file) || readText(file) !== content) put(file, content);
};

for (const { rel, content, merge, owned } of outputs) {
  const dest = path.join(target, ...rel.split("/"));
  const generated = sha256(content);
  const before = previous?.files?.[rel];
  const base = (text) => {
    if (!merge && !owned) ensureBase(rel, text);
  };
  if (keep.has(rel) || (owned && existsSync(dest))) {
    report.kept.push(rel);
    if (existsSync(dest)) files[rel] = { sha256: sha256(readText(dest)), generated, status: "kept" };
    continue;
  }
  if (!existsSync(dest)) {
    put(dest, content);
    base(content);
    report.created.push(rel);
    files[rel] = { sha256: generated, generated, status: owned ? "kept" : "created" };
    continue;
  }
  const current = readText(dest);
  if (current === content) {
    base(content);
    report.identical.push(rel);
    files[rel] = { sha256: generated, generated, status: before?.status === "merged" ? "merged" : "created" };
    continue;
  }
  if (before?.status === "created" && sha256(current) === before.sha256) {
    put(dest, content);
    base(content);
    report.updated.push(rel);
    files[rel] = { sha256: generated, generated, status: "created" };
    continue;
  }
  if (before && before.status !== "kept" && before.generated === generated) {
    base(content);
    report.customized.push(rel);
    continue;
  }
  // fusion à trois voies : base valide (empreinte du manifeste), fichier modifié, modèle changé
  let proposal = null;
  if (before && before.status !== "kept" && !merge && !owned && existsSync(baseFile(rel))) {
    const old = readText(baseFile(rel));
    if (sha256(old) !== before.generated) report.baseInvalid.push(rel);
    else {
      const res = mergeThreeWay(current, old, content);
      if (res.status === "clean") {
        if (res.text === current) report.identical.push(rel);
        else {
          const raw = readFileSync(dest, "utf8");
          put(dest, raw.includes("\r\n") ? res.text.replace(/\n/g, "\r\n") : res.text);
          report.reconciled.push(rel);
        }
        base(content);
        files[rel] = { sha256: sha256(res.text), generated, status: "reconciled" };
        continue;
      }
      if (res.status === "conflict") proposal = res.text;
    }
  }
  if (merge) {
    const merged = merge === "lines" ? mergeLines(current, content) : mergeJson(current, content);
    if (merged !== null) {
      if (merged === current) report.identical.push(rel);
      else {
        put(dest, merged);
        report.merged.push(rel);
      }
      files[rel] = { sha256: sha256(merged), generated, status: "merged" };
      continue;
    }
  }
  if (args.adopt === true) {
    base(content);
    report.adopted.push(rel);
    files[rel] = { sha256: sha256(current), generated, status: "adopted" };
    continue;
  }
  report.conflicts.push(rel);
  if (args.diff === true) diffs[rel] = proposal ?? diffText(dest, content);
}

// fichiers suivis par le manifeste que le modèle ne produit plus : signalés, jamais supprimés
const produced = new Set(outputs.map((o) => o.rel));
for (const rel of Object.keys(previous?.files ?? {})) if (!produced.has(rel)) report.retired.push(rel);

const manifestOut =
  JSON.stringify(
    {
      schema: 1,
      plugin: { name: "project-bootstrap", version: pluginVersion },
      modules: [...selected],
      config,
      files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
      migrations: previous?.migrations ?? [],
    },
    null,
    2,
  ) + "\n";
const manifestCurrent = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8").replace(/\r\n/g, "\n") : null;
if (manifestCurrent !== manifestOut) {
  put(manifestPath, manifestOut);
  report.manifest = manifestCurrent === null ? "created" : "updated";
}
if (Object.keys(diffs).length) report.diffs = diffs;
console.log(JSON.stringify(report, null, 2));
process.exit(report.conflicts.length ? 3 : 0);
