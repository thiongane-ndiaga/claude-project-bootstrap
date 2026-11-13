#!/usr/bin/env node
// Checks that the Jira key appears in the PR title or the branch name. Title read from PR_TITLE, branch from HEAD_REF:
// both come from the environment and are never interpolated into a shell. See docs/jira.md.
const title = process.env.PR_TITLE ?? "";
const branch = process.env.HEAD_REF ?? "";
const KEY = "{{JIRA_KEY_RE}}";
const EXAMPLE = "{{JIRA_KEY_EXAMPLE}}";

// branches opened by tools (Dependabot, release-please): no ticket
if (/^(dependabot\/|release-please--)/.test(branch)) {
  console.log(`Tool branch, Jira key not required: ${branch}`);
  process.exit(0);
}

// the key is a whole word: XABC-12 is not ABC-12
const keyRe = new RegExp("(^|[^A-Za-z0-9])" + KEY + "-[0-9]+(?![0-9A-Za-z])");
if (!keyRe.test(title) && !keyRe.test(branch)) {
  console.error(`Jira key missing from the title and the branch.\nTitle: "${title}"\nBranch: "${branch}"\nExpected: a key shaped like ${EXAMPLE} in the title description (not in the scope), e.g. "feat(import): ${EXAMPLE} accept monthly rent lines", or in the branch, e.g. "feat/${EXAMPLE}-import". A branch cannot be renamed on an open PR: open a new PR.`);
  process.exit(1);
}

// @@module:jira-source
// Jira source: the branch starts with <type>/<KEY-N>-
const branchRe = new RegExp("^[a-z]+/" + KEY + "-[0-9]+-");
if (branch && !branchRe.test(branch)) {
  console.error(`Invalid branch "${branch}" with Jira as the source of the need.\nExpected: <type>/${EXAMPLE}-<slug>, e.g. "feat/${EXAMPLE}-import" (uppercase key). A branch cannot be renamed on an open PR: open a new PR.`);
  process.exit(1);
}
// @@end

console.log(`Jira key present (title: "${title}", branch: "${branch}")`);
