/// <reference path="../rules.d.ts" />

const REQUIRED = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/feature.yml",
  ".github/ISSUE_TEMPLATE/bug.yml",
  ".github/ISSUE_TEMPLATE/architecture-decision.yml",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  // @@module:release
  ".github/workflows/release.yml",
  // @@end
];

export default {
  rules: {
    "github-templates-present": {
      description: "Issue and PR templates and workflows present",
      async check(ctx) {
        for (const path of REQUIRED) {
          if ((await ctx.glob(path)).length === 0) ctx.report.violation({ message: `Required file missing: ${path}` });
        }
      },
    },
    "actions-pinned-to-sha": {
      description: "Each external action is pinned to a full commit SHA (local ./… actions have no SHA)",
      async check(ctx) {
        for (const glob of [".github/workflows/*.yml", ".github/actions/**/*.yml"]) {
          for (const match of await ctx.grepFiles(/^\s*-?\s*uses:\s*(\S+)/, glob)) {
            const ref = /uses:\s*(\S+)/.exec(match.content)?.[1] ?? "";
            if (!ref.startsWith("./") && !/@[0-9a-f]{40}$/.test(ref)) {
              ctx.report.violation({ message: `Action not pinned to a SHA: ${ref}`, file: match.file, line: match.line });
            }
          }
        }
      },
    },
  },
} satisfies RuleSet;
