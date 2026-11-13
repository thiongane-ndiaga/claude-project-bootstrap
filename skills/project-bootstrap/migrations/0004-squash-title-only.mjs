// Migration hors fichiers : le commit de squash ne garde que le titre de la PR. Avec le message par défaut des commits de la branche,
// un « Closes #N » écrit dans un commit se retrouve dans le commit de squash, puis dans la PR de release-please : GitHub la compte alors
// comme une seconde PR qui ferme l'issue, et le workflow du Project remet la carte en « In Progress ».
// La commande vise le dépôt reçu (repos/<repo>), jamais celui du dossier courant.
export const id = "0004-squash-title-only";
export const title = "Régler le squash sur le titre de la PR seul (aucun Closes #N copié dans le commit)";
export const modules = ["github"];
export const needsForge = true;

const COMMAND_ARGS = ["-X", "PATCH"];

// gh(args) exécute la commande gh et renvoie sa sortie standard ; repo = « propriétaire/nom ».
// Renvoie la liste des actions à mener ; vide si le réglage est déjà bon (la migration est idempotente) ; { actions, notes } si le squash est désactivé.
export function plan({ gh, repo }) {
  const current = JSON.parse(gh(["api", `repos/${repo}`]));
  // le squash désactivé est signalé : les commits arrivent alors sur main tels quels, `Closes #N` compris
  if (current.allow_squash_merge === false) return { actions: [], notes: ["squash désactivé : le workflow impose le squash merge (le réglage du titre n'a pas d'effet)"] };
  // champs absents de la réponse (jeton aux droits insuffisants) : non vérifiable, pas un faux écart
  if (current.squash_merge_commit_title === undefined || current.squash_merge_commit_message === undefined) throw new Error(`réglage de squash illisible pour ${repo} (droits insuffisants ?)`);
  if (current.squash_merge_commit_title === "PR_TITLE" && current.squash_merge_commit_message === "BLANK") return [];
  const args = ["api", ...COMMAND_ARGS, `repos/${repo}`, "-f", "squash_merge_commit_title=PR_TITLE", "-f", "squash_merge_commit_message=BLANK"];
  return [
    {
      description: `Régler le squash de ${repo} sur le titre de la PR seul (actuellement : titre ${current.squash_merge_commit_title ?? "?"}, message ${current.squash_merge_commit_message ?? "?"}) — réglage visible côté GitHub`,
      command: `gh api -X PATCH repos/${repo} -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK`,
      run: () => gh(args),
    },
  ];
}
