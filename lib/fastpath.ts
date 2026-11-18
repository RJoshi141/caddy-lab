// The live path. No network, no model call. Keyword prefilter first,
// embedding classifier second (when the in-browser model is warm).
import { CATEGORIES, CATEGORY_BY_ID } from "@/data/categories";
import playbook from "@/data/playbook-index.json";
import type { Brief, Evidence, Rung } from "@/lib/schemas";
import { FASTPATH } from "@/lib/config";

export type Classification = {
  categoryId: string | null;
  confidence: number;
  signals: string[];
  method: "keywords" | "embedding" | "none";
};

export function keywordClassify(text: string): Classification {
  let best: Classification = { categoryId: null, confidence: 0, signals: [], method: "none" };
  let bestScore = 0;
  for (const c of CATEGORIES) {
    const hits = c.signals.filter((s) => s.pattern.test(text));
    const score = hits.reduce((sum, s) => sum + (s.weight ?? 1), 0);
    if (score > bestScore) {
      bestScore = score;
      // 1 strong hit clears the bar, 2+ is confident. Capped so it never reads as certain.
      best = { categoryId: c.id, confidence: Math.min(0.92, 0.3 + 0.22 * score), signals: hits.map((h) => h.name), method: "keywords" };
    }
  }
  return best.confidence >= FASTPATH.minConfidence ? best : { categoryId: null, confidence: best.confidence, signals: [], method: "none" };
}

export type Suggestion = {
  id: string;
  lineIndex: number;
  categoryId: string;
  question: string;
  why: string;
  matchedSignals: string[]; // from the live line
  briefSignals: string[]; // what the brief predicted
  playbookRef: string;
  rung: number; // 0-based rung on the ladder
  source: "brief" | "playbook"; // brief = deal specific, playbook = generic fallback
  evidence?: Evidence;
  method: Classification["method"];
  confidence: number;
  latencyMs: number;
  refined?: { question: string; reason: string; swapped: boolean; latencyMs: number; playbookRef?: string; evidence?: Evidence };
};

const PLAYBOOK = playbook as { file: string; title: string; category: string; ladder: string[] }[];

// Walks the ladder: brief rungs first (deal specific), then generic playbook rungs.
export function rungFor(brief: Brief | null, categoryId: string, rung: number): (Rung & { source: Suggestion["source"] }) | null {
  const briefLadder = brief?.ladders[categoryId] ?? [];
  if (rung < briefLadder.length) return { ...briefLadder[rung], source: "brief" };
  const primary = CATEGORY_BY_ID[categoryId]?.playbook[0];
  const doc = PLAYBOOK.find((d) => d.file === primary);
  const q = doc?.ladder[rung - briefLadder.length];
  if (!doc || !q) return null;
  return { question: q, why: "Generic playbook rung. The brief had nothing deal specific left here.", signals: [], playbookRef: doc.file, source: "playbook" };
}
