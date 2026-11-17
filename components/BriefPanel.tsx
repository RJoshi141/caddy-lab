"use client";
import type { Deal } from "@/data/deals";
import type { Brief, Usage } from "@/lib/schemas";
import { fmt$, usageCost } from "@/lib/cost";
import { CATEGORY_BY_ID } from "@/data/categories";

const sev = { high: "text-risk", med: "text-slow", low: "text-ink-3" };

export function BriefPanel({ deal, data, loading, onRegenerate, live }: { deal: Deal; data?: { brief: Brief; usage: Usage; mode: string }; loading: boolean; onRegenerate: () => void; live: boolean }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4 text-sm">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="font-semibold">Pre-call brief</h2>
        <span className="text-xs text-ink-3">Sonnet, once per deal</span>
        {live && (
          <button onClick={onRegenerate} disabled={loading} className="ml-auto text-xs underline text-ink-2">
            {loading ? "generating…" : "regenerate"}
          </button>
        )}
      </div>
      <div className="text-xs text-ink-3 mb-3">
        {deal.candidate.name} · {deal.job.title} at {deal.client.name}
      </div>

      {loading && !data && <div className="text-ink-3 py-6">Reading the deal…</div>}
      {data && (
        <div className="space-y-3">
          <p className="text-ink-2">{data.brief.summary}</p>
          <div>
            <div className="text-xs text-ink-3 mb-1">Risk signals</div>
            <ul className="space-y-1">
              {data.brief.riskSignals.map((r) => (
                <li key={r.signal}>
                  <span className={`font-medium ${sev[r.severity]}`}>{r.signal}</span> <span className="text-ink-3">{r.evidence}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs text-ink-3 mb-1">Ladders pre-built</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.brief.ladders).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5 rounded bg-fast-soft text-fast text-xs">
                  {CATEGORY_BY_ID[k]?.label ?? k} · {v.length}
                </span>
              ))}
            </div>
          </div>
          <div className="text-xs text-ink-3 num pt-2 border-t border-line">
            {data.usage.input_tokens.toLocaleString()} in / {data.usage.output_tokens.toLocaleString()} out · {fmt$(usageCost(data.usage))} · {data.mode}
          </div>
        </div>
      )}
    </section>
  );
}
