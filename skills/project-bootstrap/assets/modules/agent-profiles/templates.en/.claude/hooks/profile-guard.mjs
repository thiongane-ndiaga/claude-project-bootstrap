#!/usr/bin/env node
// Single PreToolUse hook for agent profiles: bounds each profile's writes and shell according to agent_type.
// Subagent: agent_type is the profile name. Teammate: agent_type is the teammate name, which must carry its profile's name.
// An agent missing from PROFILES (main agent, other agent) is not bounded. Exit 2 = refusal (stderr is sent back to Claude).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// write: prefixes (relative to the project root) where the profile may write.
// shell: commands allowed on top of read-only-bash.mjs's read-only set (patterns anchored on the whole command).
const PROFILES = {
  architect: {
    write: ["docs/architecture/"],
    // title: letters, digits, spaces and simple punctuation only (no quote, parenthesis or substitution: PowerShell evaluates parentheses)
    shell: [/^archgate adr create --title "[\p{L}\p{N} ,.:'’_-]+" --domain [a-z0-9-]+$/u, /^archgate adr domain list$/],
  },
  "qa-engineer": {
    write: ["tests/", "test/"],
    shell: [
      /^node \.claude[\\/]hooks[\\/]quality-gate\.mjs$/,
      /^node \.bootstrap[\\/]run-checks\.mjs$/,
      /^archgate review-context( --(staged|run-checks|verbose|strict|base( [\w./-]+)?|domain [\w-]+))*$/,
    ],
  },
};

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const profile = Object.hasOwn(PROFILES, event.agent_type ?? "") ? PROFILES[event.agent_type] : undefined;
if (!profile) process.exit(0);

const deny = (reason) => {
  process.stderr.write(`Profile ${event.agent_type}: ${reason}\n`);
  process.exit(2);
};
const toolInput = event.tool_input ?? {};

// For a profile in the table, any internal error is a refusal: exit code 1 would let the tool run.
try {
  if (WRITE_TOOLS.has(event.tool_name)) {
    const target = toolInput.file_path ?? toolInput.notebook_path;
    if (!target) deny("write path missing");
    const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
    if (!root) deny("project root unknown");
    const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
    if (!profile.write.some((prefix) => rel.startsWith(prefix))) {
      deny(`write refused: ${rel} is outside ${profile.write.join(", ")}`);
    }
  } else if (SHELL_TOOLS.has(event.tool_name)) {
    const command = String(toolInput.command ?? "").trim();
    if (!profile.shell.some((re) => re.test(command))) {
      const readOnly = path.join(path.dirname(fileURLToPath(import.meta.url)), "read-only-bash.mjs");
      const res = spawnSync(process.execPath, [readOnly], { input: raw, encoding: "utf8" });
      if (res.status !== 0) deny(res.stderr.trim() || `command refused "${command}"`);
    }
  }
} catch (err) {
  deny(`internal hook error (${err.message})`);
}
process.exit(0);
