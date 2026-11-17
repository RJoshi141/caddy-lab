// Cost math. Every input is either a real usage object from the API or a
// token count, plus the prices in config. Assumptions are passed in so the
// /cost page can let you edit them live.
import { PRICING, type ModelId } from "@/lib/config";
import type { Usage } from "@/lib/schemas";

const M = 1_000_000;

export function usageCost(u: Usage) {
  const p = PRICING[u.model as ModelId];
  if (!p) return 0;
  return (
    (u.input_tokens * p.input +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite5m +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      u.output_tokens * p.output) / M
  );
}

export type Assumptions = {
  utterancesPerHour: number;
  pushbackShare: number;
  naiveOutputTokens: number;
  refineOutputTokens: number;
  naiveCaching: boolean;
  callMinutes: number; // a brief per call, and the transcript resets per call
};

export type TokenSizes = {
  naivePrefix: number; // system + playbook + raw deal, sent every line
  tokensPerLine: number; // avg transcript line, the naive prompt grows by this
  refinePrefix: number; // cached: system + playbook + brief
  refineTail: number; // uncached: last few lines + current suggestion
};

// Naive: the big model on every line, with the whole transcript so far.
export function naivePerHour(t: TokenSizes, a: Assumptions, model: ModelId) {
  const p = PRICING[model];
  const n = a.utterancesPerHour;
  const callsPerHour = 60 / a.callMinutes;
  // Transcript grows linearly within a call, so the average line carries half of it.
  const avgTranscript = (t.tokensPerLine * (n / callsPerHour)) / 2;
  const prefixCost = a.naiveCaching
    ? (callsPerHour * t.naivePrefix * p.cacheWrite5m + (n - callsPerHour) * t.naivePrefix * p.cacheRead) / M
    : (n * t.naivePrefix * p.input) / M;
  const transcriptCost = (n * avgTranscript * p.input) / M;
  const outputCost = (n * a.naiveOutputTokens * p.output) / M;
  return { total: prefixCost + transcriptCost + outputCost, prefixCost, transcriptCost, outputCost, calls: n };
}

// Caddy Lab: brief once, fast path free, Haiku only on pushback lines.
export function caddyPerHour(t: TokenSizes, a: Assumptions, briefUsage: Usage, model: ModelId) {
  const p = PRICING[model];
  const calls = Math.round(a.utterancesPerHour * a.pushbackShare);
  const callsPerHour = 60 / a.callMinutes;
  const brief = usageCost(briefUsage) * callsPerHour; // one brief per call
  // First refine of each call writes the cache (the brief part differs per deal), the rest read it.
  const writes = Math.min(calls, callsPerHour);
  const refine =
    (writes * t.refinePrefix * p.cacheWrite5m +
      Math.max(0, calls - writes) * t.refinePrefix * p.cacheRead +
      calls * t.refineTail * p.input +
      calls * a.refineOutputTokens * p.output) / M;
  return { total: brief + refine, brief, refine, calls };
}

export const fmt$ = (x: number) => x >= 1000 ? `$${Math.round(x).toLocaleString("en-US")}` : (x < 0.01 ? `$${x.toFixed(4)}` : x < 1 ? `$${x.toFixed(3)}` : `$${x.toFixed(2)}`);
export const estTokens = (s: string) => Math.ceil(s.length / 4); // mock-mode estimate only
