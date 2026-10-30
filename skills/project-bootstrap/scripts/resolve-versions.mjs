#!/usr/bin/env node
// Choisit les versions à épingler : dernière version stable publiée depuis au moins N jours (défaut 14)
// pour les CLI npm et les actions GitHub, avec le SHA de commit de chaque action.
// Usage : node resolve-versions.mjs [--min-age-days 14]  → JSON sur stdout, à fusionner dans bootstrap.json
import { spawnSync } from "node:child_process";

const minAgeArg = process.argv.indexOf("--min-age-days");
const minAgeDays = minAgeArg > -1 ? Number(process.argv[minAgeArg + 1]) : 14;
const cutoff = Date.now() - minAgeDays * 86_400_000;
const stable = (v) => /^v?\d+\.\d+\.\d+$/.test(v);
// tri par numéro de version décroissant : une vieille branche majeure peut publier un correctif plus récent que la dernière majeure
const bySemverDesc = (a, b) => {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
};

function npmVersion(pkg) {
  const res = spawnSync(`npm view ${pkg} time --json`, { encoding: "utf8", shell: true });
  if (res.status !== 0) throw new Error(`npm view ${pkg} : ${res.stderr}`);
  const candidates = Object.entries(JSON.parse(res.stdout))
    .filter(([v, t]) => stable(v) && Date.parse(t) <= cutoff)
    .sort((a, b) => bySemverDesc(a[0], b[0]));
  if (!candidates.length) throw new Error(`${pkg} : aucune version stable de plus de ${minAgeDays} jours`);
  return { version: candidates[0][0], published: candidates[0][1] };
}

async function gh(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "project-bootstrap" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${path} : ${res.status}`);
  return res.json();
}

async function action(repo) {
  const releases = await gh(`/repos/${repo}/releases?per_page=30`);
  const rel = releases
    .filter((r) => !r.draft && !r.prerelease && stable(r.tag_name) && Date.parse(r.published_at) <= cutoff)
    .sort((a, b) => bySemverDesc(a.tag_name, b.tag_name))[0];
  if (!rel) throw new Error(`${repo} : aucune release stable de plus de ${minAgeDays} jours`);
  // SHA du commit (et non de l'objet tag annoté)
  const commit = await gh(`/repos/${repo}/commits/${rel.tag_name}`);
  return { tag: rel.tag_name, sha: commit.sha, published: rel.published_at };
}

const out = {
  minAgeDays,
  versions: { openspec: npmVersion("@fission-ai/openspec").version, archgate: npmVersion("archgate").version, node: "24" },
  actions: {
    checkout: await action("actions/checkout"),
    setupNode: await action("actions/setup-node"),
    releasePlease: await action("googleapis/release-please-action"),
  },
};
console.log(JSON.stringify(out, null, 2));
