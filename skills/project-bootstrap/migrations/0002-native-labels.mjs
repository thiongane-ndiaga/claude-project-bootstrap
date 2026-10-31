// Migration hors fichiers : les labels préfixés `type:*` doublent ceux que la forge fournit (`bug`, `enhancement`).
// Pour chaque ancien label présent : créer le remplaçant s'il manque, le poser sur tous les éléments (issues et PR,
// ouverts ou fermés) qui portent l'ancien, puis seulement supprimer l'ancien. `needs-adr` n'est supprimé que s'il n'est posé nulle part.
// Toutes les commandes passent par l'API du dépôt reçu (repos/<repo>/…), jamais par le dépôt du dossier courant.
export const id = "0002-native-labels";
export const title = "Remplacer les labels type:* par les labels natifs de la forge";
export const modules = ["github"];

// color / description : valeurs de repli quand l'ancien label n'en a pas ; pour un natif, celles de GitHub.
const MAPPING = [
  { old: "type:bug", next: "bug", color: "d73a4a", description: "Something isn't working", native: true },
  { old: "type:feature", next: "enhancement", color: "a2eeef", description: "New feature or request", native: true },
  { old: "type:adr", next: "adr", color: "5319e7", description: "Décision d'architecture à trancher" },
  { old: "type:chore", next: "chore", color: "c5def5", description: "Outillage, configuration, maintenance" },
];
const OBSOLETE = "needs-adr";

const lines = (out) => out.split("\n").map((l) => l.trim()).filter(Boolean);

// gh(args) exécute la commande gh et renvoie sa sortie standard (lève une erreur en cas d'échec) ; repo = « propriétaire/nom ».
export function plan({ gh, repo }) {
  const base = `repos/${repo}`;
  const labels = lines(gh(["api", "--paginate", `${base}/labels?per_page=100`, "--jq", ".[] | [.name, .color, .description] | @json"])).map((l) => JSON.parse(l));
  const find = (name) => labels.find(([n]) => n.toLowerCase() === name.toLowerCase());
  // éléments (issues et PR, tous états) portant un label, avec leurs labels : liste complète, sans plafond
  const itemsWith = (label) =>
    lines(gh(["api", "--paginate", "-X", "GET", `${base}/issues`, "-f", `labels=${label}`, "-f", "state=all", "-f", "per_page=100", "--jq", ".[] | [.number, [.labels[].name]] | @json"])).map((l) => JSON.parse(l));

  const actions = [];
  const notes = [];
  for (const m of MAPPING) {
    const old = find(m.old);
    if (!old) continue;
    const items = itemsWith(old[0]);
    const todo = items.filter(([, names]) => !names.some((n) => n.toLowerCase() === m.next.toLowerCase())).map(([number]) => number);
    if (!find(m.next)) {
      // natif : valeurs de GitHub ; propre au plugin : celles de l'ancien label, à défaut les valeurs par défaut
      const color = m.native ? m.color : old[1] || m.color;
      const description = m.native ? m.description : old[2] || m.description;
      actions.push({
        description: `Créer le label « ${m.next} » sur ${repo}${m.native ? " (label natif absent)" : ""}`,
        command: `gh api -X POST ${base}/labels -f name=${m.next} -f color=${color} -f description=…`,
        run: () => gh(["api", "-X", "POST", `${base}/labels`, "-f", `name=${m.next}`, "-f", `color=${color}`, "-f", `description=${description}`]),
      });
    }
    if (todo.length > 0) {
      actions.push({
        description: `Poser « ${m.next} » sur ${todo.length} élément(s) (issues et PR) portant « ${old[0]} » sur ${repo}`,
        command: `gh api -X POST ${base}/issues/<n>/labels -f labels[]=${m.next}  (× ${todo.length})`,
        run: () => {
          for (const n of todo) gh(["api", "-X", "POST", `${base}/issues/${n}/labels`, "-f", `labels[]=${m.next}`]);
        },
      });
    }
    actions.push({
      description: `Supprimer l'ancien label « ${old[0]} » de ${repo} (le retire de ${items.length} élément(s) ; non réversible)`,
      command: `gh api -X DELETE ${base}/labels/${encodeURIComponent(old[0])}`,
      run: () => gh(["api", "-X", "DELETE", `${base}/labels/${encodeURIComponent(old[0])}`]),
    });
  }

  const obsolete = find(OBSOLETE);
  if (obsolete) {
    const used = itemsWith(obsolete[0]);
    if (used.length === 0) {
      actions.push({
        description: `Supprimer le label inutilisé « ${obsolete[0]} » de ${repo}`,
        command: `gh api -X DELETE ${base}/labels/${encodeURIComponent(obsolete[0])}`,
        run: () => gh(["api", "-X", "DELETE", `${base}/labels/${encodeURIComponent(obsolete[0])}`]),
      });
    } else {
      notes.push(`« ${obsolete[0]} » est posé sur ${used.length} élément(s) (issues ou PR) : conservé.`);
    }
  }
  return { actions, notes };
}
