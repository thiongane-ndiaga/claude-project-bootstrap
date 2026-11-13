# GitLab

The `gitlab` module makes GitLab the **code host**. It generates neither `.gitlab-ci.yml` nor any `.github/` file: CI is the `Jenkinsfile` of the `jenkins` module, and releases are not automatic. It provides the merge request template (`.gitlab/merge_request_templates/Default.md`) and the issue templates (`.gitlab/issue_templates/`).

@@module:jenkins
CI is the `Jenkinsfile` (see `docs/jenkins.md`).
@@end
@@module:openspec
OpenSpec changes follow the same path as with a GitHub issue: the id is `<issue>-<slug>`.
@@end

## Manual steps

The plugin writes nothing to GitLab: these steps are yours.

1. Create the GitLab project and push the repository to it.
2. Protect the `main` branch (Settings, Repository, Protected branches) and, with Jenkins, require "Pipelines must succeed" in the merge settings.
3. Set the merge method to **squash** with the MR title as the message: this is why the title is checked (`scripts/check-pr-title.mjs`), since the squash commit is the title.
4. Create the `bug`, `enhancement` and `adr` labels (Manage, Labels): the issue templates apply them with quick actions (`/label`), which ignore a missing label.
5. With Jenkins: project access token and webhook, see `docs/jenkins.md`.

## Reading table

Generated texts say "PR" and `gh`; with GitLab they read as follows.

| Text | Read as |
|---|---|
| PR, pull request | MR, merge request |
| `Closes #N` | `Closes #N` (same syntax: GitLab closes the issue on merge) |
| `gh pr view`, `gh pr checks` | `glab mr view`, `glab ci status` |
| `gh issue view`, `gh issue create` | `glab issue view`, `glab issue create` |
| issue forms | `.gitlab/issue_templates/` templates |
| `ARCH-004-github-comme-forge-…` | the forge ADR: the file name stays, the content describes GitLab |

The `jiraSource` key set to `github` means the forge's issues, here GitLab's.

## Limits

- Without the `jenkins` module the project has no CI: nothing calls `check-pr-title.mjs`.
- No automatic release, no project board, no Dependabot: those modules are reserved to GitHub.
- Agent profiles have no GitLab variant: their `gh` steps (PR, CI, issue) are absent, and `pr-readiness-review` is not generated.
- A draft MR (title prefixed `Draft:`) fails the title check.
- No real trial with a GitLab instance or Jenkins: the plugin only tests generation.
