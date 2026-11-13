# Jira

The `jira` module links the workflow to Jira: a ticket key (`{{JIRA_KEY_EXAMPLE}}`) appears in the branch or title of every PR, and `scripts/check-jira-key.mjs` checks it in the `pr-title` job of `ci.yml`. The plugin writes nothing to Jira.

@@module:issue-source
Source of the need: **GitHub issues**. The Jira key is an extra link: a "Jira key" field in the issue forms, a `Jira:` line in the PR template. Branch, OpenSpec id and `Closes #N` do not change.
@@end
@@module:jira-source
Source of the need: **Jira tickets**. They replace GitHub issues in the conventions: branch `<type>/{{JIRA_KEY_EXAMPLE}}-<slug>` (uppercase key), lowercase OpenSpec id (`abc-123-<slug>`: OpenSpec rejects uppercase), `Ticket: {{JIRA_KEY_EXAMPLE}}` header in `proposal.md`, `Refs {{JIRA_KEY_EXAMPLE}}` in the PR body instead of `Closes #N`.
@@end

## Naming

- The key goes in the **description** of the PR title, not in the scope: `feat(import): {{JIRA_KEY_EXAMPLE}} accept monthly rent lines` (the scope of `check-pr-title.mjs` only accepts `[a-z0-9-]`).
- A branch cannot be renamed on an open PR: on error, open a new PR.
- `dependabot/` and `release-please--` branches are exempt.

## Manual steps

The plugin writes nothing to Jira: these steps are yours.

1. Create the Jira project (or note its key).
2. Install the Jira Cloud for GitHub app and connect the repository (Jira web interface).
3. In the repository settings, add "Autolink references" (the key prefix followed by `-`, pointing to the Jira ticket URL) so keys are clickable in GitHub.
4. Close tickets in Jira (by hand, or with a Jira automation on merged PRs): `Refs` closes nothing.
5. The `projects` module duplicates a Jira board: you may turn it off.

## Limits

- No real trial with a Jira instance: the plugin only tests generation and the script.
- Without a project key (`jira`), the check accepts any `XXX-N` key, which lets false positives such as `UTF-8` or `SHA-256` through; set the project key.
- The `Jenkinsfile` of the `jenkins` module does not check the Jira key: only `ci.yml` does.
- The project key is 2 to 10 characters (uppercase letters and digits, no underscore).

@@module:jira-source
## Reading table: issue → ticket

Generated texts that say "issue" are read as follows when Jira is the source of the need.

| Text | Read as |
|---|---|
| issue, `#N` | Jira ticket, `{{JIRA_KEY_EXAMPLE}}` |
| `Closes #N` | `Refs {{JIRA_KEY_EXAMPLE}}` |
| `Issue: #N` (`proposal.md` header) | `Ticket: {{JIRA_KEY_EXAMPLE}}` |
| `<type>/<issue>-<slug>`, `<issue>-<slug>` | `<type>/{{JIRA_KEY_EXAMPLE}}-<slug>`, lowercase OpenSpec id |
| `gh issue view`, `gh issue list`, `gh issue create` | Jira: agents have no access, ask the user for the ticket text or copy it into `proposal.md` |
| "Architecture decision" form | Jira decision-type ticket |
| `product-owner` profile | opens no GitHub issue; the need is written in Jira |
@@end
