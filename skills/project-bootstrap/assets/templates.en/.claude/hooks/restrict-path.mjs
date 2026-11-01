#!/usr/bin/env node
// PreToolUse hook: blocks Edit/Write outside the allowed prefixes passed as arguments (paths relative to the root).
import path from "node:path";

const allowed = process.argv.slice(2).map((p) => p.split(/[\\/]/).filter(Boolean).join("/") + "/");
let input = "";
for await (const chunk of process.stdin) input += chunk;

const { tool_input: toolInput = {}, cwd } = JSON.parse(input);
const root = process.env.CLAUDE_PROJECT_DIR ?? cwd;
const target = toolInput.file_path;
if (!target) process.exit(0);

const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
if (!allowed.some((prefix) => rel.startsWith(prefix))) {
  process.stderr.write(`Write refused: ${rel} is outside ${allowed.join(", ")}\n`);
  process.exit(2);
}
