# Sonar analysis

The `sonar` job in `.github/workflows/ci.yml` analyzes the code with `SonarSource/sonarqube-scan-action` (pinned to a SHA). It stays **inactive until the `SONAR_TOKEN` secret exists**: the job then succeeds without analysis and a notice says so. It never fails CI because of the quality gate.

@@module:sonar-cloud
Chosen service: **SonarCloud**.
@@end
@@module:sonar-server
Chosen service: **self-hosted SonarQube server**. The analysis only runs on pushes to `main`: branch and pull request analysis is reserved to the server's commercial editions.
@@end

## Manual steps

The plugin writes no secret and creates no account: these steps are yours.

@@module:sonar-cloud
1. Create the organization and the project on SonarCloud (import the GitHub repository).
2. Turn off the project's automatic analysis (Administration, analysis method): it rejects the analysis launched by CI. Check the Sonar documentation for your plan; private repositories depend on the SonarCloud plan.
@@end
@@module:sonar-server
1. Create the project on your SonarQube server.
2. Create the repository variable `SONAR_HOST_URL` (Settings, Secrets and variables, Actions, Variables) with the server URL, reachable from GitHub runners.
@@end
3. Generate an analysis token in Sonar.
4. Create the repository secret `SONAR_TOKEN` with that token (`gh secret set SONAR_TOKEN`, or Settings, Secrets and variables, Actions).
@@module:sonar-cloud
5. Fill in `sonar-project.properties`: `sonar.projectKey` and `sonar.organization`, then the project's own exclusions. Without `sonar.projectKey` the analysis fails as soon as the secret exists.
@@end
@@module:sonar-server
5. Fill in `sonar-project.properties`: `sonar.projectKey`, then the project's own exclusions. Without `sonar.projectKey` the analysis fails as soon as the secret exists.
@@end
6. With the `dependabot` module: its pull requests cannot read Actions secrets. To analyze them, also add `SONAR_TOKEN` to the Dependabot secrets.

## Quality gate

By default the job does not depend on the quality gate. For a red gate to fail the job, add `sonar.qualitygate.wait=true` to `sonar-project.properties`. To block merging, require in the `main` protection either the `sonar` check (once the property is set) or the context the Sonar application publishes on the pull request: the audit classes it as "another application, not comparable".

## Limits

- The action's behavior has not been checked by any real trial against SonarCloud or a server: the plugin only tests generation.
- Fork and Dependabot pull requests cannot read secrets: they are not analyzed.
- The action does not suit every language: Maven, Gradle and .NET need a dedicated scanner, C and C++ a build wrapper, Java compiled files (`sonar.java.binaries`). That is the project's concern.
- No coverage report is available: the `sonar` job is separate from the `checks` job.
- The `Jenkinsfile` of the `jenkins` module has no Sonar step.
@@module:sonar-cloud
- Switching from SonarCloud to a server (`sonar` key set to `server`) updates `ci.yml` but not `sonar-project.properties`: remove `sonar.organization` by hand.
@@end
