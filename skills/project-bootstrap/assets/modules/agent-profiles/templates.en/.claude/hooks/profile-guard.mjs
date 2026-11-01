#!/usr/bin/env node
// Single PreToolUse hook for agent profiles: bounds each profile's writes, shell, agents and skills according to agent_type.
// Subagent: agent_type is the profile name. Teammate: agent_type is the teammate name, which must carry its profile's name.
// An agent missing from PROFILES (main agent, other agent) is not bounded. Exit 2 = refusal (stderr is sent back to Claude).
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// write: prefixes (relative to the project root) where the profile may write.
// shell: commands allowed on top of read-only-bash.mjs's read-only set (patterns anchored on the whole command).
// agents, skills: agents (subagent_type) and skills the profile may launch itself; everything else is refused. A launched agent escapes this table
// (its agent_type is its own): list only agents already bounded by their own frontmatter and without the Agent tool.
// writeExcept: the profile writes everywhere except under these entries (folder ending with "/", otherwise exact file), case-insensitively; shellOpen: unbounded shell.
const PROFILES = {
  architect: {
    write: ["docs/architecture/"],
    agents: ["architecture-explorer", "arc42-keeper"],
    skills: ["archgate:adr-author"],
    // title: letters, digits, spaces and simple punctuation only (no quote, parenthesis or substitution: PowerShell evaluates parentheses)
    shell: [/^archgate adr create --title "[\p{L}\p{N} ,.:'’_-]+" --domain [a-z0-9-]+$/u, /^archgate adr domain list$/],
  },
  "qa-engineer": {
    write: ["tests/", "test/"],
    agents: ["spec-reviewer"],
    skills: [],
    shell: [
      /^node \.claude[\\/]hooks[\\/]quality-gate\.mjs$/,
      /^node \.bootstrap[\\/]run-checks\.mjs$/,
      /^archgate review-context( --(staged|run-checks|verbose|strict|base( [\w./-]+)?|domain [\w-]+))*$/,
    ],
  },
  "product-owner": { write: [], shell: [], agents: [], skills: [] },
  // developer: the stack is not chosen, so there are no allowed write folders; governance folders are off limits.
  // Its shell is unbounded (build, tests): it can write to those folders from the command line, the bounding is a safeguard.
  developer: { writeExcept: [".archgate/", ".bootstrap/", ".claude/", ".git/", ".githooks/", ".github/", ".release-please-manifest.json", "agents.md", "claude.md", "docs/architecture/", "docs/workflow.md", "openspec/changes/archive/", "openspec/config.yaml", "openspec/config.yml", "openspec/schemas/", "openspec/specs/", "release-please-config.json"], shellOpen: true, agents: [], skills: [] },
  "business-analyst": {
    write: ["openspec/changes/"],
    shell: [/^openspec new change "?[a-z0-9-]+"?$/, /^openspec instructions "?[a-z-]+"? --change "?[a-z0-9-]+"?( --json)?$/, /^openspec context( --json)?$/],
    agents: [],
    skills: ["openspec-propose", "openspec-update-change", "opsx:propose", "opsx:update"],
  },
  // Agents the profiles may launch: their bounds are repeated here so they do not depend on their frontmatter hook (inactive for a teammate).
  // Without agents or skills lists, they launch nothing.
  "arc42-keeper": { write: ["docs/architecture/arc42/"], shell: [] },
  "spec-reviewer": { write: [], shell: [] },
  "architecture-explorer": { write: [], shell: [] },
};

// Real path: the longest existing ancestor is resolved (links, junctions, 8.3 short names, real case), then the rest of the path.
function realTarget(absolute) {
  let head = absolute;
  const tail = [];
  while (!existsSync(head)) {
    const parent = path.dirname(head);
    if (parent === head) break;
    tail.unshift(path.basename(head));
    head = parent;
  }
  return path.join(realpathSync.native(head), ...tail);
}

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const AGENT_TOOLS = new Set(["Agent", "Task"]);

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
    const rel = path.relative(realpathSync.native(root), realTarget(path.resolve(event.cwd ?? root, target))).split(path.sep).join("/");
    const segments = rel.split("/");
    if (segments.some((seg) => seg.includes(":"))) deny(`path refused (":" character in ${rel})`);
    if (profile.writeExcept) {
      // Windows ignores trailing dots and spaces in a segment: compare the normalized form
      const norm = segments.map((seg) => seg.replace(/[. ]+$/, "")).join("/").toLowerCase();
      if (rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)) deny(`write refused: ${rel} is outside the project`);
      const blocked = profile.writeExcept.find((entry) => (entry.endsWith("/") ? norm.startsWith(entry.toLowerCase()) : norm === entry.toLowerCase()));
      if (blocked) deny(`write refused: ${rel} is under ${blocked} (governance folder or file)`);
    } else if (!profile.write.some((prefix) => rel.startsWith(prefix))) {
      deny(`write refused: ${rel} is outside ${profile.write.join(", ")}`);
    }
  } else if (AGENT_TOOLS.has(event.tool_name)) {
    const type = toolInput.subagent_type ?? "general-purpose";
    if (toolInput.name || toolInput.team_name) deny("named agent refused (a named agent is a teammate, which the frontmatter hook does not bound)");
    if (!(profile.agents ?? []).includes(type)) deny(`agent "${type}" not allowed (allowed: ${(profile.agents ?? []).join(", ") || "none"})`);
  } else if (event.tool_name === "Skill") {
    const skill = String(toolInput.skill ?? "");
    if (!(profile.skills ?? []).includes(skill)) deny(`skill "${skill}" not allowed`);
  } else if (SHELL_TOOLS.has(event.tool_name)) {
    const command = String(toolInput.command ?? "").trim();
    if (!profile.shellOpen && !profile.shell.some((re) => re.test(command))) {
      const readOnly = path.join(path.dirname(fileURLToPath(import.meta.url)), "read-only-bash.mjs");
      const res = spawnSync(process.execPath, [readOnly], { input: raw, encoding: "utf8" });
      if (res.status !== 0) deny(res.stderr.trim() || `command refused "${command}"`);
    }
  }
} catch (err) {
  deny(`internal hook error (${err.message})`);
}
process.exit(0);
