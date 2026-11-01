#!/usr/bin/env node
// Vérifie qu'un titre de PR suit Conventional Commits (il devient le commit de squash). Titre lu dans PR_TITLE.
const title = process.env.PR_TITLE ?? "";
const pattern = /^(feat|fix|docs|chore|refactor|test|ci|build|perf|style|revert)(\([a-z0-9-]+\))?!?: \S.*$/;

if (!pattern.test(title)) {
  console.error(`Titre de PR invalide : "${title}"\nAttendu : <type>(<scope>)?: <description>, ex. "feat(import): accept monthly rent lines"`);
  process.exit(1);
}
console.log(`Titre de PR conforme : ${title}`);
