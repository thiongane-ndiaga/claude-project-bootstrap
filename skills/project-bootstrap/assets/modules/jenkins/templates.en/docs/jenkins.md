# Jenkins

The `Jenkinsfile` at the root **complements** `.github/workflows/ci.yml`: it replays the same checks on an existing Jenkins server. It does not replace it; `ci.yml` remains the reference CI.

Stages, in the order of `ci.yml`: Node check, PR title (pull requests only), tooling CLI installation, `openspec validate`, `archgate check`, project toolchain (`scripts/jenkins-setup.sh`), then `node .bootstrap/run-checks.mjs`.

## Manual steps

The plugin can neither install nor configure Jenkins. To do once:

1. Have a Jenkins server and a **Linux or macOS** agent with Node ≥ 20.19, git and an `sh` shell.
2. Install the **GitHub Branch Source** plugin (it reports the build status to GitHub).
3. Create a **multibranch** job (or a GitHub organization) that points at the repository and reads the `Jenkinsfile` at the root.
4. Add GitHub **credentials** (token or GitHub App) to the job.
5. Configure the GitHub **webhook** to the Jenkins server.
6. Set the **fork PR trust** in GitHub Branch Source ("Trust: From users with Admin or Write permission"): otherwise a fork PR can run its own `Jenkinsfile` on the agent, with the job's credentials.
7. Add the job's status context to the **required checks** of the `main` branch protection (its name depends on the job configuration).
8. Validate the file with Jenkins' **declarative linter** before enabling the job.
9. Install the stack toolchain on the agent or in `scripts/jenkins-setup.sh` (project file, never overwritten by a plugin update).

@@module:visibility-private
Private repository: a private repository on GitHub Free has no branch protection, so step 7 is impossible. Do not merge a PR whose Jenkins job is red.
@@end
@@module:cli-local
`local` CLI mode: the `Jenkinsfile` runs `npm ci`. Commit `package-lock.json` (without it, `npm ci` fails); a pre-existing `package.json` is kept by the plugin, without the `devDependencies`: add them by hand.
@@end

## Limits

- Complements `ci.yml`, does not replace it; an existing `Jenkinsfile` is never overwritten (conflict to resolve by hand).
- `agent any` can land on a Windows agent where `sh` fails: set an agent label in the `Jenkinsfile`.
- `ciOs` of `.bootstrap/checks.json` is ignored: a single agent.
- The git history can be shallow depending on the GitHub Branch Source configuration, whereas `ci.yml` fetches the full history.
- Editing the PR title does not always rerun the job.
- The CLIs are installed in the workspace's `.ci-tools`, without touching the agent's npm prefix.
- No plugin test runs the `Jenkinsfile`; the `forge-protection` audit may report the Jenkins context as missing among the workflow jobs, and the audit does not check the `Jenkinsfile` versions.
