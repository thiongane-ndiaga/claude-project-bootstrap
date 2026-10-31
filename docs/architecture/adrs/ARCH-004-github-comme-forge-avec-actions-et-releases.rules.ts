/// <reference path="../rules.d.ts" />

const REQUIRED = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/feature.yml",
  ".github/ISSUE_TEMPLATE/bug.yml",
  ".github/ISSUE_TEMPLATE/architecture-decision.yml",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
];

export default {
  rules: {
    "github-templates-present": {
      description: "Templates d'issues, de PR et workflows présents",
      async check(ctx) {
        for (const path of REQUIRED) {
          if ((await ctx.glob(path)).length === 0) ctx.report.violation({ message: `Fichier requis absent : ${path}` });
        }
      },
    },
    "actions-pinned-to-sha": {
      description: "Chaque action est épinglée sur un SHA de commit complet",
      async check(ctx) {
        for (const match of await ctx.grepFiles(/^\s*-?\s*uses:\s*(\S+)/, ".github/workflows/*.yml")) {
          const ref = /uses:\s*(\S+)/.exec(match.content)?.[1] ?? "";
          if (!/@[0-9a-f]{40}$/.test(ref)) {
            ctx.report.violation({ message: `Action non épinglée sur un SHA : ${ref}`, file: match.file, line: match.line });
          }
        }
      },
    },
  },
} satisfies RuleSet;
