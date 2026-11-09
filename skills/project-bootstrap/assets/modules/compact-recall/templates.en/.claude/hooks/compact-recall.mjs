#!/usr/bin/env node
// SessionStart hook (matcher compact): after a compaction, writes to standard output a reminder read from disk
// (current branch, OpenSpec changes in progress with their done tasks). Claude Code adds this output to the context.
// No CLI except git; never blocks the session: any error is ignored and the exit code is 0.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_CHANGES = 10;
// Project root: two folders above .claude/hooks, whatever the current folder.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lines = ["Context compacted: reread CLAUDE.md (rules, arbitration ladder) and docs/workflow.md before carrying on."];

try {
  const git = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  const branch = (git.stdout ?? "").trim();
  if (git.status === 0 && branch) lines.push(`Branch: ${branch}`);
} catch {
  // deliberately ignored
}

try {
  const dir = path.join(root, "openspec", "changes");
  if (existsSync(dir)) {
    const changes = [];
    for (const name of readdirSync(dir).sort()) {
      if (name === "archive" || !statSync(path.join(dir, name)).isDirectory()) continue;
      const tasks = path.join(dir, name, "tasks.md");
      if (!existsSync(tasks)) continue;
      const text = readFileSync(tasks, "utf8").replace(/\r\n?/g, "\n");
      const done = (text.match(/^\s*- \[[xX]\]/gm) ?? []).length;
      const open = (text.match(/^\s*- \[ \]/gm) ?? []).length;
      changes.push(`- ${name}: ${done}/${done + open} tasks done`);
    }
    if (changes.length) {
      lines.push("OpenSpec changes in progress:", ...changes.slice(0, MAX_CHANGES));
      if (changes.length > MAX_CHANGES) lines.push(`- … ${changes.length - MAX_CHANGES} more`);
    }
  }
} catch {
  // deliberately ignored
}

process.stdout.write(lines.join("\n") + "\n");
process.exit(0);
