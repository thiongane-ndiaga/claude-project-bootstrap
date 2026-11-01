#!/usr/bin/env node
// SessionStart hook (local install mode): puts node_modules/.bin in front of the session's Bash tool PATH,
// so that a plain `claude` finds openspec and archgate. CLAUDE_ENV_FILE is read as Bash shell code.
// Never blocks startup: without CLAUDE_ENV_FILE, or when the write fails, exit 0.
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envFile = process.env.CLAUDE_ENV_FILE;
if (envFile) {
  try {
    let bin = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", ".bin");
    // Git Bash on Windows: C:\a\b -> /c/a/b
    if (process.platform === "win32") bin = bin.replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase()).replace(/\\/g, "/");
    appendFileSync(envFile, `export PATH='${bin.replace(/'/g, "'\\''")}':"$PATH"\n`);
  } catch {
    // intentionally ignored
  }
}
process.exit(0);
