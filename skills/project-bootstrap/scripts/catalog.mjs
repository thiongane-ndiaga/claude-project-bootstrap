// Catalogue des modules : chaque module est un dossier assets/modules/<nom>/ qui se décrit lui-même (ARCH-010).
//   module.json        description (obligatoire), requires, default, conflicts, questions, files
//   templates/         modèles de référence (français), rangés par chemin de destination
//   templates.<lang>/  version localisée des seuls modèles qui ont du texte
//   tests/*.test.mjs   tests propres au module (lancés par tests/modules.test.mjs)
// Une entrée de `files` : { path, when?, merge?, owned? }. Le module qui la déclare en est propriétaire et doit être
// choisi ; `when` ne liste que les modules SUPPLÉMENTAIRES nécessaires (le catalogue assemblé expose la condition complète).
// loadCatalog() découvre les dossiers, valide les descripteurs et assemble { modules, files, languages }.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export class CatalogError extends Error {
  constructor(problems) {
    super(problems.join("\n"));
    this.problems = problems;
  }
}

// pseudo-modules calculés par scaffold.mjs : autorisés seulement dans `when`, jamais des dossiers
export const PSEUDO_MODULES = ["visibility-private", "visibility-public", "stack-chosen", "stack-open", "cli-npm-global", "cli-default", "cli-user", "cli-local"];
// chemins écrits par le générateur ou par state.mjs : aucun module ne peut les déclarer
export const RESERVED_PATHS = [".claude/settings.json", "package.json", ".bootstrap/manifest.json"];
export const RESERVED_PREFIXES = [".bootstrap/base/", ".bootstrap/local/", ".git/"];
const MODULE_KEYS = ["description", "requires", "default", "conflicts", "questions", "files"];
const FILE_KEYS = ["path", "when", "merge", "owned"];
const MERGES = ["lines", "json"];
const NAME = /^[a-z][a-z0-9-]*$/;
const LANG = /^templates\.([a-z][\w-]*)$/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const ADR_FILE = /^docs\/architecture\/adrs\/([A-Z]+-\d{3})-[^/]+\.md$/;

const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === "string" && x.length > 0);

// chemin de destination : relatif, séparateur « / », sans « .. », sans nom ou caractère interdit sous Windows
function pathProblem(p) {
  if (typeof p !== "string" || p.length === 0) return "chemin vide";
  if (p.includes("\\") || p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return "chemin absolu ou avec antislash";
  for (const seg of p.split("/")) {
    if (seg === "" || seg === "." || seg === "..") return "segment vide, « . » ou « .. »";
    if (/[<>:"|?*\u0000-\u001f]/.test(seg)) return `caractère interdit dans « ${seg} »`;
    if (/[. ]$/.test(seg)) return `« ${seg} » se termine par un point ou une espace`;
    if (WINDOWS_RESERVED.test(seg)) return `« ${seg} » est un nom réservé sous Windows`;
  }
  if (RESERVED_PATHS.includes(p) || RESERVED_PREFIXES.some((x) => p.startsWith(x))) return "chemin réservé au générateur";
  return null;
}

// fichiers d'un dossier (chemins relatifs avec « / ») ; un lien symbolique est un problème, jamais suivi
function listFiles(dir, problems, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isSymbolicLink()) {
      problems.push(`${path.join(dir, e.name)} : lien symbolique refusé`);
      return [];
    }
    return e.isDirectory() ? listFiles(path.join(dir, e.name), problems, `${prefix}${e.name}/`) : [`${prefix}${e.name}`];
  });
}

export function loadCatalog(modulesDir) {
  const problems = [];
  if (!existsSync(modulesDir) || !statSync(modulesDir).isDirectory()) throw new CatalogError([`Catalogue introuvable : ${modulesDir}`]);
  const names = [];
  for (const e of readdirSync(modulesDir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("_")) continue; // dossiers ignorés (outillage, brouillons)
    if (e.isSymbolicLink()) problems.push(`${path.join(modulesDir, e.name)} : lien symbolique refusé`);
    else if (e.isDirectory()) names.push(e.name);
  }
  names.sort();
  // core d'abord, puis l'ordre alphabétique : ordre déterministe
  const ordered = names.includes("core") ? ["core", ...names.filter((n) => n !== "core")] : names;
  if (!names.includes("core")) problems.push(`Catalogue invalide : le module « core » est absent de ${modulesDir}`);

  const raw = {};
  for (const name of ordered) {
    const dir = path.join(modulesDir, name);
    const file = path.join(dir, "module.json");
    if (!NAME.test(name)) problems.push(`${dir} : nom de module invalide (minuscules, chiffres et tirets)`);
    if (PSEUDO_MODULES.includes(name)) problems.push(`${dir} : « ${name} » est un pseudo-module, pas un nom de module`);
    if (!existsSync(file)) {
      problems.push(`${dir} : module.json manquant`);
      continue;
    }
    if (lstatSync(file).isSymbolicLink()) {
      problems.push(`${file} : lien symbolique refusé`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      problems.push(`${file} : JSON illisible (${err.message})`);
      continue;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      problems.push(`${file} : un objet est attendu`);
      continue;
    }
    for (const k of Object.keys(data)) if (!MODULE_KEYS.includes(k)) problems.push(`${file} : clé inconnue « ${k} » (clés : ${MODULE_KEYS.join(", ")})`);
    if (typeof data.description !== "string" || !data.description.trim()) problems.push(`${file} : « description » est obligatoire`);
    for (const k of ["requires", "conflicts", "questions"]) if (data[k] !== undefined && !isStringArray(data[k])) problems.push(`${file} : « ${k} » doit être un tableau de textes`);
    if (data.default !== undefined && typeof data.default !== "boolean") problems.push(`${file} : « default » doit être un booléen`);
    if (data.files !== undefined && !Array.isArray(data.files)) problems.push(`${file} : « files » doit être un tableau`);
    raw[name] = { data, dir, file };
  }

  const known = new Set(ordered);
  const modules = {};
  const files = [];
  const owners = new Map();
  const lowerPaths = new Map();
  const adrIds = new Map();
  for (const name of ordered) {
    const entry = raw[name];
    if (!entry) continue;
    const { data, dir, file } = entry;
    const requires = data.requires ?? [];
    const conflicts = data.conflicts ?? [];
    for (const r of requires) if (!known.has(r)) problems.push(`${file} : « requires » cite le module inconnu ${r}`);
    for (const c of conflicts) {
      if (!known.has(c)) problems.push(`${file} : « conflicts » cite le module inconnu ${c}`);
      else if (c === name || requires.includes(c)) problems.push(`${file} : ${name} ne peut pas être incompatible avec ${c}`);
    }
    modules[name] = { requires, default: data.default === true, description: data.description ?? "", ...(conflicts.length ? { conflicts } : {}), ...(data.questions?.length ? { questions: data.questions } : {}), dir };

    const declared = new Set();
    for (const [i, f] of (Array.isArray(data.files) ? data.files : []).entries()) {
      const at = `${file} : files[${i}]`;
      if (!f || typeof f !== "object" || Array.isArray(f)) {
        problems.push(`${at} : un objet est attendu`);
        continue;
      }
      for (const k of Object.keys(f)) if (!FILE_KEYS.includes(k)) problems.push(`${at} : clé inconnue « ${k} » (clés : ${FILE_KEYS.join(", ")})`);
      const bad = pathProblem(f.path);
      if (bad) {
        problems.push(`${at} : chemin ${JSON.stringify(f.path)} refusé (${bad})`);
        continue;
      }
      if (f.when !== undefined && !isStringArray(f.when)) problems.push(`${at} (${f.path}) : « when » doit être un tableau de textes`);
      for (const w of isStringArray(f.when) ? f.when : []) if (!known.has(w) && !PSEUDO_MODULES.includes(w)) problems.push(`${at} (${f.path}) : « when » cite le module inconnu ${w}`);
      if (f.merge !== undefined && !MERGES.includes(f.merge)) problems.push(`${at} (${f.path}) : « merge » doit valoir ${MERGES.join(" ou ")}`);
      if (f.owned !== undefined && typeof f.owned !== "boolean") problems.push(`${at} (${f.path}) : « owned » doit être un booléen`);
      if (owners.has(f.path)) problems.push(`Chemin déclaré deux fois : ${f.path} (modules ${owners.get(f.path)} et ${name})`);
      else if (lowerPaths.has(f.path.toLowerCase())) problems.push(`Chemins qui ne diffèrent que par la casse : ${lowerPaths.get(f.path.toLowerCase())} et ${f.path} (modules ${owners.get(lowerPaths.get(f.path.toLowerCase()))} et ${name})`);
      owners.set(f.path, name);
      lowerPaths.set(f.path.toLowerCase(), f.path);
      declared.add(f.path);
      const adr = ADR_FILE.exec(f.path);
      if (adr) {
        if (adrIds.has(adr[1]) && adrIds.get(adr[1]) !== f.path) problems.push(`Numéro d'ADR ${adr[1]} utilisé par deux fichiers : ${adrIds.get(adr[1])} et ${f.path}`);
        adrIds.set(adr[1], f.path);
      }
      const template = path.join(dir, "templates", ...f.path.split("/"));
      if (!existsSync(template)) problems.push(`${at} : modèle manquant ${template}`);
      else if (lstatSync(template).isSymbolicLink()) problems.push(`${template} : lien symbolique refusé`);
      // citer le module propriétaire dans `when` est toléré, un doublon aussi
      const extra = [...new Set(isStringArray(f.when) ? f.when.filter((w) => w !== name) : [])];
      files.push({ path: f.path, when: [name, ...extra], ...(f.merge ? { merge: f.merge } : {}), ...(f.owned ? { owned: true } : {}), module: name, dir });
    }

    // modèles non déclarés
    if (existsSync(path.join(dir, "templates"))) {
      for (const t of listFiles(path.join(dir, "templates"), problems)) if (!declared.has(t)) problems.push(`${path.join(dir, "templates", t)} : modèle non déclaré dans ${file}`);
    }
  }

  // langues : disponibles si `core` a le dossier ; un module qui en a un que `core` n'a pas est refusé (langue inutilisable)
  const languagesOf = (name) => {
    const dir = path.join(modulesDir, name);
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() && LANG.test(e.name) ? [LANG.exec(e.name)[1]] : []));
  };
  const languages = new Set(names.includes("core") ? languagesOf("core").filter((l) => l !== "fr") : []);
  for (const name of ordered) {
    const dir = path.join(modulesDir, name);
    for (const lang of languagesOf(name)) {
      if (lang === "fr") {
        problems.push(`${path.join(dir, "templates.fr")} : « templates.fr » est interdit (le français est le dossier templates/)`);
        continue;
      }
      if (!languages.has(lang)) problems.push(`${path.join(dir, `templates.${lang}`)} : la langue ${lang} n'est pas fournie par le module core (langue indisponible)`);
      for (const t of listFiles(path.join(dir, `templates.${lang}`), problems)) {
        if (!existsSync(path.join(dir, "templates", ...t.split("/")))) problems.push(`${path.join(dir, `templates.${lang}`, t)} : version localisée sans modèle de référence dans ${path.join(dir, "templates")}`);
      }
    }
  }

  if (problems.length) throw new CatalogError(problems);
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { modules, files, languages: [...languages].sort() };
}

// chemin du modèle d'un fichier dans une langue (« fr » ou absente : la référence) : la version localisée du module si elle existe
export function templatePath(file, lang) {
  const rel = file.path.split("/");
  if (lang && lang !== "fr") {
    const localized = path.join(file.dir, `templates.${lang}`, ...rel);
    if (existsSync(localized)) return localized;
  }
  return path.join(file.dir, "templates", ...rel);
}

// liste lisible des modules (--list-modules)
export function describeModules(catalog) {
  return Object.entries(catalog.modules).map(([name, m]) => ({
    name,
    description: m.description,
    requires: m.requires,
    conflicts: m.conflicts ?? [],
    default: m.default,
    questions: m.questions ?? [],
    files: catalog.files.filter((f) => f.module === name).length,
  }));
}

export function modulesTable(catalog) {
  const rows = describeModules(catalog).map((m) => `| \`${m.name}\`${m.name === "core" ? " (toujours)" : ""} | ${m.description} | ${m.requires.join(", ") || "—"} | ${m.conflicts.join(", ") || "—"} | ${m.default ? "oui" : "non"} | ${m.questions.join(" ; ") || "—"} |`);
  return ["| Module | Apporte | Requiert | Incompatible avec | Par défaut | Questions de phase 0 |", "|---|---|---|---|---|---|", ...rows].join("\n");
}
