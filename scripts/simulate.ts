// Dry run of both scenarios through the fast path, keywords only.
// Prints which line fires which category and rung, and whether a canned
// refinement exists for it. Run: npx tsx scripts/simulate.ts
import { SCENARIOS } from "@/data/transcripts";
import { MOCK_BRIEFS } from "@/data/mock/briefs";
import { MOCK_REFINEMENTS } from "@/data/mock/refinements";
import { keywordClassify } from "@/lib/fastpath";
import { initialEngine, step } from "@/lib/engine";

for (const sc of SCENARIOS) {
  console.log(`\n== ${sc.title}`);
  let st = initialEngine();
  sc.lines.forEach((l, i) => {
    const t0 = performance.now();
    const c = l.speaker === "candidate" ? keywordClassify(l.text) : { categoryId: null, confidence: 0, signals: [], method: "none" as const };
    const r = step(st, i, l.speaker, c, MOCK_BRIEFS[sc.dealId].brief, performance.now() - t0);
    st = r.state;
    const tag = r.suggestion
      ? `-> ${r.suggestion.categoryId}#${r.suggestion.rung} (${r.suggestion.source})${MOCK_REFINEMENTS[`${sc.dealId}:${r.suggestion.categoryId}:${r.suggestion.rung}`] ? " [refine]" : ""}`
      : c.categoryId ? `   (${c.categoryId}, held)` : "";
    console.log(`${String(i).padStart(2)} ${l.speaker[0]} ${l.text.slice(0, 60).padEnd(60)} ${tag}`);
  });
}
