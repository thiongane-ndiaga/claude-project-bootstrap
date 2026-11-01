#!/usr/bin/env node
// Hook PreToolUse des agents en lecture seule : n'autorise que des commandes Bash/PowerShell de lecture.
let input = "";
for await (const chunk of process.stdin) input += chunk;
const command = (JSON.parse(input).tool_input?.command ?? "").trim();

function deny(reason) {
  process.stderr.write(`Agent en lecture seule : commande refusée (${reason}) « ${command} »\n`);
  process.exit(2);
}

// jeu de caractères fermé : aucun séparateur, redirection, substitution, guillemet ni saut de ligne
if (!/^[\w ./:@^~=,#+-]+$/.test(command)) deny("caractère non autorisé");
const tokens = command.split(/ +/);

const readOnly = [
  /^openspec (validate|show|list|status)( |$)/,
  /^archgate (check|adr list|adr show)( |$)/,
  /^git (status|diff|log|show|rev-parse|ls-files|branch --show-current)( |$)/,
  /^gh (auth status|repo view|issue list|issue view|pr list|pr view|pr diff|pr checks|run list|run view|release list|release view|label list|project list|project view|project item-list)( |$)/,
];
if (!readOnly.some((re) => re.test(command))) deny("commande hors liste");

// options qui écrivent un fichier ou exécutent un programme, abréviations git comprises (--outp=…)
const abbreviates = (forbidden) => (t) => {
  const name = t.startsWith("--") ? t.slice(2).split("=")[0] : "";
  return name.length > 0 && forbidden.some((f) => f.startsWith(name));
};
if (tokens[0] === "git" && tokens.some(abbreviates(["output", "ext-diff", "textconv", "exec"]))) deny("option git interdite");
if (tokens[0] === "gh" && (tokens.includes("-w") || tokens.some(abbreviates(["web"])))) deny("option gh interdite");
