/// <reference path="../rules.d.ts" />

const ADR_DIR = "docs/architecture/adrs";
const STATUSES = ["Proposed", "Accepted", "Rejected", "Superseded", "Obsolete"];

function frontmatter(content: string): Record<string, string> | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

export default {
  rules: {
    "adr-format": {
      description: "ADR file name, frontmatter and status",
      async check(ctx) {
        const files = await ctx.glob(`${ADR_DIR}/*.md`);
        const rulesFiles = new Set(await ctx.glob(`${ADR_DIR}/*.rules.ts`));
        for (const file of files) {
          const name = file.slice(ADR_DIR.length + 1);
          const naming = /^([A-Z]+-\d{3})-[a-z0-9-]+\.md$/.exec(name);
          if (!naming) {
            ctx.report.violation({ message: "Expected name: <PREFIX>-NNN-<slug>.md", file });
            continue;
          }
          const content = await ctx.readFile(file);
          const fm = frontmatter(content);
          if (!fm) {
            ctx.report.violation({ message: "YAML frontmatter missing", file, line: 1 });
            continue;
          }
          if (fm.id !== naming[1]) ctx.report.violation({ message: `id '${fm.id}' differs from ${naming[1]}`, file });
          if (!fm.title) ctx.report.violation({ message: "title missing", file });
          if (!fm.domain) ctx.report.violation({ message: "domain missing", file });
          const hasRules = rulesFiles.has(file.replace(/\.md$/, ".rules.ts"));
          if ((fm.rules === "true") !== hasRules) {
            ctx.report.violation({ message: `rules: ${fm.rules} while the .rules.ts ${hasRules ? "exists" : "does not exist"}`, file });
          }
          const status = /^## Status\s*\r?\n\s*\r?\n?(\S+)/m.exec(content)?.[1]?.replace(/[—.,].*$/, "");
          if (!status || !STATUSES.includes(status)) {
            ctx.report.violation({ message: `Section '## Status' missing or value not in: ${STATUSES.join(", ")}`, file });
          }
        }
      },
    },
    "adr-location": {
      description: "No ADR in the default location .archgate/adrs/",
      async check(ctx) {
        for (const file of await ctx.glob(".archgate/adrs/*.md")) {
          ctx.report.violation({ message: `ADR outside ${ADR_DIR}/`, file });
        }
      },
    },
  },
} satisfies RuleSet;
