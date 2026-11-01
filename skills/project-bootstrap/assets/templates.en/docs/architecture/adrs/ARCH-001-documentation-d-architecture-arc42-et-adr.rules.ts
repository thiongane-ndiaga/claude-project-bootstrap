/// <reference path="../rules.d.ts" />

const SECTIONS_DIR = "docs/architecture/arc42";

export default {
  rules: {
    "arc42-twelve-sections": {
      description: "arc42 has exactly 12 sections numbered 01 to 12",
      async check(ctx) {
        const files = await ctx.glob(`${SECTIONS_DIR}/*.md`);
        for (let n = 1; n <= 12; n++) {
          const prefix = `${SECTIONS_DIR}/${String(n).padStart(2, "0")}-`;
          const matches = files.filter((f) => f.startsWith(prefix));
          if (matches.length !== 1) {
            ctx.report.violation({ message: `arc42 section ${n}: ${matches.length} file(s) ${prefix}*.md, 1 expected` });
          }
        }
      },
    },
    "arc42-numbered-title": {
      description: "Each arc42 section starts with a '# <n>. ' title",
      async check(ctx) {
        for (const file of await ctx.glob(`${SECTIONS_DIR}/*.md`)) {
          const n = Number(file.slice(SECTIONS_DIR.length + 1, SECTIONS_DIR.length + 3));
          const content = await ctx.readFile(file);
          if (!content.startsWith(`# ${n}. `)) {
            ctx.report.violation({ message: `The file must start with '# ${n}. '`, file, line: 1 });
          }
        }
      },
    },
    "arc42-section9-points-to-adrs": {
      description: "Section 9 links to docs/architecture/adrs/",
      async check(ctx) {
        const [file] = await ctx.glob(`${SECTIONS_DIR}/09-*.md`);
        if (file && !(await ctx.readFile(file)).includes("../adrs/")) {
          ctx.report.violation({ message: "Section 9 must point to ../adrs/", file });
        }
      },
    },
  },
} satisfies RuleSet;
