#!/usr/bin/env node
// Single PreToolUse hook for agent profiles: bounds each profile's writes, shell, agents and skills according to agent_type.
// Subagent: agent_type is the profile name. Teammate: agent_type is the teammate name, which must carry its profile's name.
// An agent missing from PROFILES (session without an `agent` setting, other agent) is not bounded. Exit 2 = refusal (stderr is sent back to Claude).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// write: prefixes (relative to the project root) where the profile may write.
// shell: commands allowed on top of read-only-bash.mjs's read-only set (patterns anchored on the whole command).
// agents, skills: agents (subagent_type) and skills the profile may launch itself; everything else is refused. A launched agent escapes this table
// (its agent_type is its own): list only agents already bounded by their own frontmatter and without the Agent tool.
// writeExcept: the profile writes everywhere except under these entries (folder ending with "/", otherwise exact file), case-insensitively; shellOpen: unbounded shell.
// namedAgents: types the profile may launch with a name equal to the type (teammate named like its profile); skillsOpen: unbounded skills;
// shellHint: sentence appended to a shell refusal.
// project-lead's gh pilot commands: issue or PR write verb, tokens from read-only-bash.mjs's closed set,
// a straight-quoted string only as the value of --title, -t or --subject (no $, backtick or quote: no substitution),
// --body-file and -F with a relative path without "..", dangerous options refused.
const GH_VERBS = new Set(["create", "comment", "edit", "close", "reopen", "merge", "ready"]);
const GH_DENIED_LONG = new Set(["--admin", "--web", "--repo", "--delete-last", "--body", "--editor"]);
const GH_DENIED_SHORT = new Set(["w", "R", "b", "e"]);
const GH_TITLES = new Set(["--title", "-t", "--subject"]);
const GH_WORD = /^[\w./:@^~=,#+-]+$/;
const GH_QUOTED = /^"[\p{L}\p{N} ,.:'’()_/#-]+"$/u;
const GH_PATH = /^[\w.][\w./-]*$/;
function ghPilot(command) {
  if (/[\r\n\u2028\u2029]/.test(command)) return false;
  const tokens = command.match(/"[^"]*"|\S+/gu) ?? [];
  if (tokens[0] !== "gh" || !["issue", "pr"].includes(tokens[1]) || !GH_VERBS.has(tokens[2])) return false;
  const relativePath = (value) => GH_PATH.test(value) && !value.split("/").includes("..");
  let previous = "";
  for (const token of tokens.slice(3)) {
    if (token.startsWith('"')) {
      if (!GH_QUOTED.test(token) || !GH_TITLES.has(previous)) return false;
    } else {
      if (!GH_WORD.test(token)) return false;
      if (token.startsWith("--")) {
        const [name, value] = token.split(/=(.*)/s);
        if (GH_DENIED_LONG.has(name)) return false;
        if (name === "--body-file" && value !== undefined && !relativePath(value)) return false;
      } else if (token.startsWith("-") && token !== "-") {
        if (!/^-[A-Za-z]$/.test(token) || GH_DENIED_SHORT.has(token[1])) return false;
      } else if (token === "-") {
        return false;
      } else if ((previous === "--body-file" || previous === "-F") && !relativePath(token)) {
        return false;
      }
    }
    previous = token;
  }
  return true;
}

// MCP tools: allowed to a profile of the table when the name's final part (after the last "__") is a read name with no write word,
// or when the full name is in the entry's mcpAllow. Closed by default: a read tool with an unusual name goes into mcpAllow.
// Isolated-context skills: their tools carry agent_type "general-purpose", outside the table. The hook refuses a skill whose header declares
// "context: fork" (project, user configuration, installed plugins). Not found: allowed; file present but unreadable: refusal.
const MCP_READ_START = /^(get|list|search|read|find|fetch|view|describe|show|check)(_|$)/;
const MCP_READ_END = /_(read|get|list|search)$/;
const WRITE_WORDS = new Set(["create", "update", "delete", "remove", "write", "set", "add", "edit", "modify", "replace", "insert", "send", "post", "put", "patch", "merge", "mark", "move", "upload", "publish", "run", "exec", "execute", "mutate", "mutation", "trigger", "cancel", "dismiss", "assign", "approve", "apply", "commit", "push", "or", "query"]);
function mcpRead(tool) {
  const cut = tool.lastIndexOf("__");
  const name = cut >= 6 ? tool.slice(cut + 2) : "";
  if (!name || name.split("_").some((word) => WRITE_WORDS.has(word.toLowerCase()))) return false;
  return MCP_READ_START.test(name) || MCP_READ_END.test(name);
}

const SKILL_NAME = /^[\w-][\w.-]*(:[\w-][\w.-]*)?$/;
const FORK = /^context:\s*["']?fork["']?\s*(#.*)?$/m;
function declaresFork(file) {
  if (!existsSync(file)) return false;
  const head = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, "utf8"));
  return head ? FORK.test(head[1]) : false;
}
function pluginDirs(plugin, config) {
  const dirs = new Set();
  const registry = path.join(config, "plugins", "installed_plugins.json");
  if (existsSync(registry)) {
    for (const [key, installs] of Object.entries(JSON.parse(readFileSync(registry, "utf8")).plugins ?? {})) {
      if (key.split("@")[0] === plugin) for (const install of installs) if (install?.installPath) dirs.add(install.installPath);
    }
  }
  const cache = path.join(config, "plugins", "cache");
  if (existsSync(cache)) {
    for (const market of readdirSync(cache)) {
      const dir = path.join(cache, market, plugin);
      if (existsSync(dir)) for (const version of readdirSync(dir)) dirs.add(path.join(dir, version));
    }
  }
  return [...dirs];
}
function forkedSkill(name, root) {
  const config = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  const [first, second] = name.split(":");
  const files =
    second === undefined
      ? [path.join(root, ".claude", "skills", first, "SKILL.md"), path.join(root, ".claude", "commands", first + ".md"), path.join(config, "skills", first, "SKILL.md"), path.join(config, "commands", first + ".md")]
      : [
          path.join(root, ".claude", "commands", first, second + ".md"),
          path.join(config, "commands", first, second + ".md"),
          ...pluginDirs(first, config).flatMap((dir) => [path.join(dir, "skills", second, "SKILL.md"), path.join(dir, "commands", second + ".md")]),
        ];
  return files.some(declaresFork);
}

const QUALITY_GATE = /^node \.claude[\\/]hooks[\\/]quality-gate\.mjs$/;
const RUN_CHECKS = /^node \.bootstrap[\\/]run-checks\.mjs$/;
const REVIEW_CONTEXT = /^archgate review-context( --(staged|run-checks|verbose|strict|base( [\w./-]+)?|domain [\w-]+))*$/;

const PROFILES = {
  architect: {
    write: ["docs/architecture/"],
    agents: [],
    skills: ["archgate:adr-author", "adr-options-comparison", "arc42-update"],
    // title: letters, digits, spaces and simple punctuation only (no quote, parenthesis or substitution: PowerShell evaluates parentheses)
    shell: [/^archgate adr create --title "[\p{L}\p{N} ,.:'’_-]+" --domain [a-z0-9-]+$/u, /^archgate adr domain list$/],
  },
  "qa-engineer": {
    write: ["tests/", "test/"],
    agents: [],
    skills: ["spec-review", "pr-readiness-review"],
    shell: [
      QUALITY_GATE,
      RUN_CHECKS,
      REVIEW_CONTEXT,
    ],
  },
  "product-owner": { write: [], shell: [], agents: [], skills: [] },
  // read-only profiles of batch 2a; the second-opinion entry also bounds a teammate of that name launched with another agent type
  "acceptance-tester": { write: [], shell: [], agents: [], skills: [] },
  scout: { write: [], shell: [], agents: [], skills: [] },
  "second-opinion": { write: [], shell: [], agents: [], skills: [] },
  // read-only profiles of batch 2b
  "devops-engineer": { write: [], shell: [], agents: [], skills: [] },
  "compliance-reviewer": { write: [], shell: [], agents: [], skills: [] },
  // developer: the stack is not chosen, so there are no allowed write folders; governance folders are off limits.
  // Its shell is unbounded (build, tests): it can write to those folders from the command line, the bounding is a safeguard.
  developer: { writeExcept: [".archgate/", ".bootstrap/", ".claude/", ".git/", ".githooks/", ".github/", ".release-please-manifest.json", "agents.md", "claude.md", "docs/architecture/", "docs/workflow.md", "openspec/changes/archive/", "openspec/config.yaml", "openspec/config.yml", "openspec/schemas/", "openspec/specs/", "release-please-config.json"], shellOpen: true, agents: [], skills: [] },
  "business-analyst": {
    write: ["openspec/changes/"],
    shell: [/^openspec new change "?[a-z0-9-]+"?$/, /^openspec instructions "?[a-z-]+"? --change "?[a-z0-9-]+"?( --json)?$/, /^openspec context( --json)?$/],
    agents: [],
    skills: ["openspec-propose", "openspec-update-change", "opsx:propose", "opsx:update"],
  },
  // project-lead (main agent with mainAgent): does not write; it pilots (archive, checks, issues and PRs) and launches the profiles.
  "project-lead": {
    write: [],
    shell: [/^openspec archive [a-z0-9-]+ --yes$/, QUALITY_GATE, RUN_CHECKS, REVIEW_CONTEXT, /^archgate session-context( --max-entries \d+)?$/, ghPilot],
    shellHint: "Delegate this command to developer or ask the user.",
    agents: ["architect", "qa-engineer", "developer", "business-analyst", "product-owner", "acceptance-tester", "scout", "second-opinion", "devops-engineer", "compliance-reviewer"],
    namedAgents: ["architect", "qa-engineer", "developer", "business-analyst", "product-owner", "acceptance-tester", "scout", "devops-engineer", "compliance-reviewer"],
    skills: [],
    skillsOpen: true,
    mcpAllow: [],
  },
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
    if ((toolInput.name || toolInput.team_name) && !((profile.namedAgents ?? []).includes(type) && toolInput.name === type)) deny("named agent refused (the name must equal the subagent_type of a namedAgents type)");
    if (!(profile.agents ?? []).includes(type)) deny(`agent "${type}" not allowed (allowed: ${(profile.agents ?? []).join(", ") || "none"})`);
  } else if (event.tool_name === "Skill") {
    const skill = String(toolInput.skill ?? "");
    if (!profile.skillsOpen && !(profile.skills ?? []).includes(skill)) deny(`skill "${skill}" not allowed`);
    const name = skill.trim().replace(/^\//, "");
    if (!SKILL_NAME.test(name)) deny(`invalid skill name "${skill}"`);
    const projectRoot = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
    if (!projectRoot) deny("project root unknown");
    if (forkedSkill(name, projectRoot)) deny(`skill "${skill}" with isolated context (context: fork) refused: its tools would escape the table`);
  } else if (String(event.tool_name ?? "").startsWith("mcp__")) {
    const tool = String(event.tool_name);
    if (!mcpRead(tool) && !(profile.mcpAllow ?? []).includes(tool)) deny(`MCP tool "${tool}" not classified as read: ask the user or add it to mcpAllow in .claude/hooks/profile-guard.mjs${/github/i.test(tool) ? "; for GitHub, use gh issue or gh pr" : ""}`);
  } else if (SHELL_TOOLS.has(event.tool_name)) {
    const command = String(toolInput.command ?? "").trim();
    if (!profile.shellOpen && !profile.shell.some((match) => (typeof match === "function" ? match(command) : match.test(command)))) {
      const readOnly = path.join(path.dirname(fileURLToPath(import.meta.url)), "read-only-bash.mjs");
      const res = spawnSync(process.execPath, [readOnly], { input: raw, encoding: "utf8" });
      if (res.status !== 0) deny((res.stderr.trim() || `command refused "${command}"`) + (profile.shellHint ? " " + profile.shellHint : ""));
    }
  }
} catch (err) {
  deny(`internal hook error (${err.message})`);
}
process.exit(0);
