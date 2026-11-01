#!/usr/bin/env node
// Checks that a PR title follows Conventional Commits (it becomes the squash commit). Title read from PR_TITLE.
const title = process.env.PR_TITLE ?? "";
const pattern = /^(feat|fix|docs|chore|refactor|test|ci|build|perf|style|revert)(\([a-z0-9-]+\))?!?: \S.*$/;

if (!pattern.test(title)) {
  console.error(`Invalid PR title: "${title}"\nExpected: <type>(<scope>)?: <description>, e.g. "feat(import): accept monthly rent lines"`);
  process.exit(1);
}
console.log(`PR title is compliant: ${title}`);
