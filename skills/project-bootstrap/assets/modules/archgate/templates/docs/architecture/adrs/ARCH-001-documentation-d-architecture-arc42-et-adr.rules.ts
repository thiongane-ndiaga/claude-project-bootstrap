/// <reference path="../rules.d.ts" />

const SECTIONS_DIR = "docs/architecture/arc42";

export default {
  rules: {
    "arc42-twelve-sections": {
      description: "arc42 compte exactement 12 sections numérotées 01 à 12",
      async check(ctx) {
        const files = await ctx.glob(`${SECTIONS_DIR}/*.md`);
        for (let n = 1; n <= 12; n++) {
          const prefix = `${SECTIONS_DIR}/${String(n).padStart(2, "0")}-`;
          const matches = files.filter((f) => f.startsWith(prefix));
          if (matches.length !== 1) {
            ctx.report.violation({ message: `Section arc42 ${n} : ${matches.length} fichier(s) ${prefix}*.md, 1 attendu` });
          }
        }
      },
    },
    "arc42-numbered-title": {
      description: "Chaque section arc42 commence par un titre '# <n>. '",
      async check(ctx) {
        for (const file of await ctx.glob(`${SECTIONS_DIR}/*.md`)) {
          const n = Number(file.slice(SECTIONS_DIR.length + 1, SECTIONS_DIR.length + 3));
          const content = await ctx.readFile(file);
          if (!content.startsWith(`# ${n}. `)) {
            ctx.report.violation({ message: `Le fichier doit commencer par '# ${n}. '`, file, line: 1 });
          }
        }
      },
    },
    "arc42-section9-points-to-adrs": {
      description: "La section 9 renvoie vers docs/architecture/adrs/",
      async check(ctx) {
        const [file] = await ctx.glob(`${SECTIONS_DIR}/09-*.md`);
        if (file && !(await ctx.readFile(file)).includes("../adrs/")) {
          ctx.report.violation({ message: "La section 9 doit pointer vers ../adrs/", file });
        }
      },
    },
  },
} satisfies RuleSet;
