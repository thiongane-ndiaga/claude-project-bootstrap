# Jenkins

@@module:github
The `Jenkinsfile` at the root **complements** `.github/workflows/ci.yml`: it replays the same checks on an existing Jenkins server. It does not replace it; `ci.yml` remains the reference CI.
@@end
@@module:gitlab
The `Jenkinsfile` at the root is the **project's CI**: GitLab hosts the code, Jenkins runs the checks. No `.gitlab-ci.yml` is generated.
@@end

@@module:github
Stages, in the order of `ci.yml`: Node check, PR title (pull requests only), tooling CLI installation, `openspec validate`, `archgate check`, project toolchain (`scripts/jenkins-setup.sh`), then `node .bootstrap/run-checks.mjs`.
@@end
@@module:gitlab
Stages: Node check, merge request title (merge requests only), tooling CLI installation, `openspec validate`, `archgate check`, project toolchain (`scripts/jenkins-setup.sh`), then `node .bootstrap/run-checks.mjs`.
@@end

## Manual steps

The plugin can neither install nor configure Jenkins. To do once:

1. Have a Jenkins server and a **Linux or macOS** agent with Node ≥ 20.19, git and an `sh` shell.
@@module:github
2. Install the **GitHub Branch Source** plugin (it reports the build status to GitHub).
3. Create a **multibranch** job (or a GitHub organization) that points at the repository and reads the `Jenkinsfile` at the root.
4. Add GitHub **credentials** (token or GitHub App) to the job.
5. Configure the GitHub **webhook** to the Jenkins server.
6. Set the **fork PR trust** in GitHub Branch Source ("Trust: From users with Admin or Write permission"): otherwise a fork PR can run its own `Jenkinsfile` on the agent, with the job's credentials.
7. Add the job's status context to the **required checks** of the `main` branch protection (its name depends on the job configuration).
@@end
@@module:gitlab
2. Install the **GitLab Branch Source** plugin (it reports the build status to GitLab).
3. Create a **multibranch** job (or a GitLab organization folder) that points at the repository and reads the `Jenkinsfile` at the root.
4. Add a GitLab **access token** (`api` scope) as the job's credential.
5. Configure the GitLab **webhook** to the Jenkins server.
6. Set the **fork merge request trust** in GitLab Branch Source: otherwise a fork MR can run its own `Jenkinsfile` on the agent, with the job's credentials, including the Sonar token if any.
7. In the project's merge settings, require "Pipelines must succeed" (the status Jenkins reports) and protect the `main` branch.
@@end
8. Validate the file with Jenkins' **declarative linter** before enabling the job.
9. Install the stack toolchain on the agent or in `scripts/jenkins-setup.sh` (project file, never overwritten by a plugin update).

@@module:github
@@module:visibility-private
Private repository: a private repository on GitHub Free has no branch protection, so step 7 is impossible. Do not merge a PR whose Jenkins job is red.
@@end
@@end
@@module:cli-local
`local` CLI mode: the `Jenkinsfile` runs `npm ci`. Commit `package-lock.json` (without it, `npm ci` fails); a pre-existing `package.json` is kept by the plugin, without the `devDependencies`: add them by hand.
@@end

## Limits

@@module:github
- Complements `ci.yml`, does not replace it; an existing `Jenkinsfile` is never overwritten (conflict to resolve by hand).
@@end
@@module:gitlab
- An existing `Jenkinsfile` is never overwritten (conflict to resolve by hand).
@@end
- `agent any` can land on a Windows agent where `sh` fails: set an agent label in the `Jenkinsfile`.
- `ciOs` of `.bootstrap/checks.json` is ignored: a single agent.
@@module:github
- The git history can be shallow depending on the GitHub Branch Source configuration, whereas `ci.yml` fetches the full history.
@@end
@@module:gitlab
- The git history can be shallow depending on the GitLab Branch Source configuration.
@@end
- Editing the PR title does not always rerun the job.
- The CLIs are installed in the workspace's `.ci-tools`, without touching the agent's npm prefix.
@@module:github
- No plugin test runs the `Jenkinsfile`. The project audit (`forge-protection`) recognizes a required `continuous-integration/jenkins/…` context but cannot compare it with the workflow jobs, since the real name depends on the server; it does compare the CLI versions pinned in the `Jenkinsfile` with those of `ci.yml`.
@@end
@@module:gitlab
- No plugin test runs the `Jenkinsfile`. The project audit cannot compare the job's status context with a GitLab branch protection; it does compare the CLI versions pinned in the `Jenkinsfile` with those of the manifest.
@@end
