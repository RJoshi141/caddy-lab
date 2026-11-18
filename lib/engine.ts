// Pure ladder logic, no React, so it's easy to test.
// Rule: a category climbs one rung only when it comes up again AFTER the
// recruiter has spoken. That's the "they asked, it came back, dig deeper" moment.
import type { Brief } from "@/lib/schemas";
import { rungFor, type Classification, type Suggestion } from "@/lib/fastpath";

export type EngineState = {
  ladder: Record<string, { rung: number; lastIdx: number }>;
  lastRecruiterIdx: number;
};

export const initialEngine = (): EngineState => ({ ladder: {}, lastRecruiterIdx: -1 });

export function step(
  s: EngineState,
  idx: number,
  speaker: "recruiter" | "candidate",
  c: Classification,
  brief: Brief | null,
  latencyMs: number
): { state: EngineState; suggestion: Suggestion | null } {
  if (speaker === "recruiter") return { state: { ...s, lastRecruiterIdx: idx }, suggestion: null };
  if (!c.categoryId) return { state: s, suggestion: null };

  const prev = s.ladder[c.categoryId];
  // Same topic, recruiter hasn't responded yet: leave the card alone.
  if (prev && s.lastRecruiterIdx < prev.lastIdx) {
    return { state: { ...s, ladder: { ...s.ladder, [c.categoryId]: { ...prev, lastIdx: idx } } }, suggestion: null };
  }
  const rung = prev ? prev.rung + 1 : 0;
  const r = rungFor(brief, c.categoryId, rung);
  if (!r) return { state: s, suggestion: null }; // ladder exhausted, stay quiet

  return {
    state: { ...s, ladder: { ...s.ladder, [c.categoryId]: { rung, lastIdx: idx } } },
    suggestion: {
      id: `${idx}-${c.categoryId}-${rung}`,
      lineIndex: idx,
      categoryId: c.categoryId,
      question: r.question,
      why: r.why,
      matchedSignals: c.signals,
      briefSignals: r.signals,
      playbookRef: r.playbookRef,
      rung,
      source: r.source,
      evidence: r.evidence,
      method: c.method,
      confidence: c.confidence,
      latencyMs,
    },
  };
}
