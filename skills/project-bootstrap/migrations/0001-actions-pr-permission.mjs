// Migration hors fichiers : release-please ouvre ses PR avec le jeton des Actions, ce que GitHub interdit par défaut
// (« GitHub Actions is not permitted to create or approve pull requests »). Le réglage se règle côté dépôt.
export const id = "0001-actions-pr-permission";
export const title = "Autoriser les GitHub Actions à créer des PR (release-please)";
export const modules = ["release"];

// gh(args) exécute la commande gh et renvoie sa sortie standard ; repo = « propriétaire/nom ».
// Renvoie la liste des actions à mener ; vide si le réglage est déjà bon (la migration est idempotente).
export function plan({ gh, repo }) {
  const current = JSON.parse(gh(["api", `repos/${repo}/actions/permissions/workflow`]));
  if (current.can_approve_pull_request_reviews === true) return [];
  return [
    {
      description: `Autoriser les Actions à créer et approuver des PR sur ${repo} (réglage visible côté GitHub)`,
      command: `gh api -X PUT repos/${repo}/actions/permissions/workflow -F can_approve_pull_request_reviews=true -f default_workflow_permissions=${current.default_workflow_permissions ?? "read"}`,
      run: () =>
        gh(["api", "-X", "PUT", `repos/${repo}/actions/permissions/workflow`, "-F", "can_approve_pull_request_reviews=true", "-f", `default_workflow_permissions=${current.default_workflow_permissions ?? "read"}`]),
    },
  ];
}
