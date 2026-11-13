#!/usr/bin/env node
// Vérifie que la clé Jira figure dans le titre de la PR ou le nom de la branche. Titre lu dans PR_TITLE, branche dans HEAD_REF :
// les deux viennent de l'environnement et ne sont jamais interpolés dans un shell. Voir docs/jira.md.
const title = process.env.PR_TITLE ?? "";
const branch = process.env.HEAD_REF ?? "";
const KEY = "{{JIRA_KEY_RE}}";
const EXAMPLE = "{{JIRA_KEY_EXAMPLE}}";

// branches ouvertes par les outils (Dependabot, release-please) : pas de ticket
if (/^(dependabot\/|release-please--)/.test(branch)) {
  console.log(`Branche d'outil, clé Jira non exigée : ${branch}`);
  process.exit(0);
}

// la clé est un mot entier : XABC-12 ne vaut pas ABC-12
const keyRe = new RegExp("(^|[^A-Za-z0-9])" + KEY + "-[0-9]+(?![0-9A-Za-z])");
if (!keyRe.test(title) && !keyRe.test(branch)) {
  console.error(`Clé Jira absente du titre et de la branche.\nTitre : "${title}"\nBranche : "${branch}"\nAttendu : une clé de la forme ${EXAMPLE} dans la description du titre (pas dans le scope), ex. "feat(import): ${EXAMPLE} accept monthly rent lines", ou dans la branche, ex. "feat/${EXAMPLE}-import". Une branche ne se renomme pas sur une PR ouverte : ouvrir une nouvelle PR.`);
  process.exit(1);
}

// @@module:jira-source
// source Jira : la branche commence par <type>/<CLE-N>-
const branchRe = new RegExp("^[a-z]+/" + KEY + "-[0-9]+-");
if (branch && !branchRe.test(branch)) {
  console.error(`Branche "${branch}" invalide avec Jira comme source du besoin.\nAttendu : <type>/${EXAMPLE}-<slug>, ex. "feat/${EXAMPLE}-import" (clé en majuscules). Une branche ne se renomme pas sur une PR ouverte : ouvrir une nouvelle PR.`);
  process.exit(1);
}
// @@end

console.log(`Clé Jira présente (titre : "${title}", branche : "${branch}")`);
