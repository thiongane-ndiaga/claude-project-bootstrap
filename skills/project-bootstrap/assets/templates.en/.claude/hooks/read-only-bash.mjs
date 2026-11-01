#!/usr/bin/env node
// PreToolUse hook of the read-only agents: only allows read Bash/PowerShell commands.
let input = "";
for await (const chunk of process.stdin) input += chunk;
const command = (JSON.parse(input).tool_input?.command ?? "").trim();

function deny(reason) {
  process.stderr.write(`Read-only agent: command refused (${reason}) "${command}"\n`);
  process.exit(2);
}

// closed character set: no separator, redirection, substitution, quote or line break
if (!/^[\w ./:@^~=,#+-]+$/.test(command)) deny("character not allowed");
const tokens = command.split(/ +/);

const readOnly = [
  /^openspec (validate|show|list|status)( |$)/,
  /^archgate (check|adr list|adr show)( |$)/,
  /^git (status|diff|log|show|rev-parse|ls-files|branch --show-current)( |$)/,
  /^gh (auth status|repo view|issue list|issue view|pr list|pr view|pr diff|pr checks|run list|run view|release list|release view|label list|project list|project view|project item-list)( |$)/,
];
if (!readOnly.some((re) => re.test(command))) deny("command not in the list");

// options that write a file or run a program, including git abbreviations (--outp=…)
const abbreviates = (forbidden) => (t) => {
  const name = t.startsWith("--") ? t.slice(2).split("=")[0] : "";
  return name.length > 0 && forbidden.some((f) => f.startsWith(name));
};
if (tokens[0] === "git" && tokens.some(abbreviates(["output", "ext-diff", "textconv", "exec"]))) deny("git option forbidden");
if (tokens[0] === "gh" && (tokens.includes("-w") || tokens.some(abbreviates(["web"])))) deny("gh option forbidden");
