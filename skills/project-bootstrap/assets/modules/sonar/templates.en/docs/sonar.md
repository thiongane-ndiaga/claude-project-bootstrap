# Sonar analysis

@@module:github
The `sonar` job in `.github/workflows/ci.yml` analyzes the code with `SonarSource/sonarqube-scan-action` (pinned to a SHA). It stays **inactive until the `SONAR_TOKEN` secret exists**: the job then succeeds without analysis and a notice says so. It never fails CI because of the quality gate.
@@end
@@module:gitlab
The `Sonar` stage of the `Jenkinsfile` analyzes the code with `sonar-scanner`. It stays **inactive until the `SONAR_ENABLED` environment variable is set to `true`**: the stage is then skipped. It never fails CI because of the quality gate.
@@end

@@module:sonar-cloud
Chosen service: **SonarCloud**.
@@end
@@module:sonar-server
@@module:github
Chosen service: **self-hosted SonarQube server**. The analysis only runs on pushes to `main`: branch and pull request analysis is reserved to the server's commercial editions.
@@end
@@module:gitlab
Chosen service: **self-hosted SonarQube server**. The analysis only runs on the `main` branch: branch and pull request analysis is reserved to the server's commercial editions.
@@end
@@end

## Manual steps

The plugin writes no secret and creates no account: these steps are yours.

@@module:sonar-cloud
@@module:github
1. Create the organization and the project on SonarCloud (import the GitHub repository).
@@end
@@module:gitlab
1. Create the organization and the project on SonarCloud (import the GitLab repository, possible for GitLab.com; a self-hosted GitLab needs a project created by hand).
@@end
2. Turn off the project's automatic analysis (Administration, analysis method): it rejects the analysis launched by CI. Check the Sonar documentation for your plan; private repositories depend on the SonarCloud plan.
@@end
@@module:sonar-server
1. Create the project on your SonarQube server.
@@module:github
2. Create the repository variable `SONAR_HOST_URL` (Settings, Secrets and variables, Actions, Variables) with the server URL, reachable from GitHub runners.
@@end
@@module:gitlab
2. Set the `SONAR_HOST_URL` environment variable (server URL, reachable from the agent) in Jenkins' global properties or the project folder's.
@@end
@@end
3. Generate an analysis token in Sonar.
@@module:github
4. Create the repository secret `SONAR_TOKEN` with that token (`gh secret set SONAR_TOKEN`, or Settings, Secrets and variables, Actions).
@@end
@@module:gitlab
4. Create the Jenkins credential `SONAR_TOKEN` ("secret text" type) with that token, then set the `SONAR_ENABLED` environment variable to `true` (Jenkins global properties or the project folder's): without it the `Sonar` stage is skipped.
@@end
@@module:sonar-cloud
@@module:github
5. Fill in `sonar-project.properties`: `sonar.projectKey` and `sonar.organization`, then the project's own exclusions. Without `sonar.projectKey` the analysis fails as soon as the secret exists.
@@end
@@module:gitlab
5. Fill in `sonar-project.properties`: `sonar.projectKey` and `sonar.organization`, then the project's own exclusions. Without `sonar.projectKey` the analysis fails as soon as `SONAR_ENABLED` is set.
@@end
@@end
@@module:sonar-server
@@module:github
5. Fill in `sonar-project.properties`: `sonar.projectKey`, then the project's own exclusions. Without `sonar.projectKey` the analysis fails as soon as the secret exists.
@@end
@@module:gitlab
5. Fill in `sonar-project.properties`: `sonar.projectKey`, then the project's own exclusions. Without `sonar.projectKey` the analysis fails as soon as `SONAR_ENABLED` is set.
@@end
@@end
@@module:github
6. With the `dependabot` module: its pull requests cannot read Actions secrets. To analyze them, also add `SONAR_TOKEN` to the Dependabot secrets.
@@end
@@module:gitlab
6. Install `sonar-scanner` on the Jenkins agent: the stage calls it by name.
@@end

## Quality gate

@@module:github
By default the job does not depend on the quality gate. For a red gate to fail the job, add `sonar.qualitygate.wait=true` to `sonar-project.properties`. To block merging, require in the `main` protection either the `sonar` check (once the property is set) or the context the Sonar application publishes on the pull request: the audit classes it as "another application, not comparable".
@@end
@@module:gitlab
By default the stage does not depend on the quality gate. For a red gate to fail the stage, hence the build, add `sonar.qualitygate.wait=true` to `sonar-project.properties`; with "Pipelines must succeed" (see `docs/gitlab.md`), merging is then blocked.
@@end

## Limits

@@module:github
- The action's behavior has not been checked by any real trial against SonarCloud or a server: the plugin only tests generation.
@@end
@@module:gitlab
- The behavior of `sonar-scanner` has not been checked by any real trial against SonarCloud or a server: the plugin only tests generation.
@@end
@@module:github
- Fork and Dependabot pull requests cannot read secrets: they are not analyzed.
@@end
@@module:gitlab
- Fork merge requests are not analyzed: the `Sonar` stage excludes them (`CHANGE_FORK`) so the token is not exposed to fork code.
@@end
@@module:github
- The action does not suit every language: Maven, Gradle and .NET need a dedicated scanner, C and C++ a build wrapper, Java compiled files (`sonar.java.binaries`). That is the project's concern.
@@end
@@module:gitlab
- `sonar-scanner` does not suit every language: Maven, Gradle and .NET need a dedicated scanner, C and C++ a build wrapper, Java compiled files (`sonar.java.binaries`). That is the project's concern.
@@end
@@module:github
- No coverage report is available: the `sonar` job is separate from the `checks` job.
@@end
@@module:gitlab
- No coverage report is imported.
@@end
@@module:github
- The `Jenkinsfile` of the `jenkins` module has no Sonar step.
@@end
@@module:gitlab
- The pipeline's 10-minute timeout also covers the analysis: raise it in the `Jenkinsfile` if needed.
- The clone history can be shallow depending on GitLab Branch Source, whereas Sonar expects the full history.
- In `cloud` mode, a branch with an open merge request can be analyzed twice (branch build and MR build), depending on GitLab Branch Source's discovery strategy.
@@end
@@module:sonar-cloud
@@module:github
- Switching from SonarCloud to a server (`sonar` key set to `server`) updates `ci.yml` but not `sonar-project.properties`: remove `sonar.organization` by hand.
@@end
@@module:gitlab
- Switching from SonarCloud to a server (`sonar` key set to `server`) updates the `Jenkinsfile` but not `sonar-project.properties`: remove `sonar.organization` by hand.
@@end
@@end
