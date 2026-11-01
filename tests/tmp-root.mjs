// Dossier temporaire propre à une exécution de suite : à importer en premier dans chaque suite de tests.
// Redirige TMPDIR, TEMP et TMP (donc os.tmpdir(), pour ce processus et ses enfants) vers un dossier jetable
// supprimé à la sortie, y compris sur échec. KEEP_TMP=1 le conserve et affiche son chemin.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

if (!process.env.PB_TMP_ROOT) {
  const root = mkdtempSync(path.join(tmpdir(), "pb-run-"));
  process.env.PB_TMP_ROOT = root;
  process.env.TMPDIR = process.env.TEMP = process.env.TMP = root;
  if (process.env.KEEP_TMP) {
    console.log(`KEEP_TMP : dossiers temporaires conservés dans ${root}`);
  } else {
    process.on("exit", () => {
      try {
        rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch {
        // dossier verrouillé : il reste dans le dossier temporaire du système
      }
    });
  }
}
