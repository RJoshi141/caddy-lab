"use client";
import type { Deal } from "@/data/deals";
import type { Brief, Usage } from "@/lib/schemas";
import { fmt$, usageCost } from "@/lib/cost";
import { CATEGORY_BY_ID } from "@/data/categories";
import { CATEGORY_ICON, Icon, type IconName } from "./Icon";

const SEV = {
  high: { label: "High", cls: "bg-risk-soft text-risk" },
  med: { label: "Med", cls: "bg-slow-soft text-slow" },
  low: { label: "Low", cls: "bg-paper text-ink-3" },
};

// progress: how many follow-ups per category have been shown on this call.
export function BriefPanel({ deal, data, loading, onRegenerate, live, progress }: { deal: Deal; data?: { brief: Brief; usage: Usage; mode: string }; loading: boolean; onRegenerate: () => void; live: boolean; progress: Record<string, number> }) {
  return (
    <section className="panel p-5 text-sm" aria-labelledby="brief-title">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-fast-soft text-fast"><Icon name="clipboard" size={14} /></span>
        <div className="min-w-0">
          <h2 id="brief-title" className="font-semibold leading-tight">Pre-call brief</h2>
          <p className="text-xs text-ink-3">Sonnet reads the deal once</p>
        </div>
        {live && (
          <button onClick={onRegenerate} disabled={loading} className="press ml-auto flex items-center gap-1 text-xs text-ink-2 px-2 py-1 rounded-lg hover:bg-paper">
            <Icon name="refresh" size={12} className={loading ? "spin" : ""} /> {loading ? "Generating" : "Regenerate"}
          </button>
        )}
      </div>

      {/* Who this call is with */}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-ink text-paper text-xs font-semibold">
          {deal.candidate.name.split(" ").map((p) => p[0]).join("")}
        </span>
        <div className="min-w-0">
          <div className="font-medium truncate">{deal.candidate.name}</div>
          <div className="text-xs text-ink-3 truncate">{deal.job.title} · {deal.client.name}</div>
        </div>
      </div>

      {loading && !data && (
        <div className="py-8 flex items-center justify-center gap-2 text-ink-3">
          <Icon name="loader" size={14} className="spin" /> Reading the deal…
        </div>
      )}

      {data && (
        <div className="mt-4 space-y-5">
          <p className="text-ink-2 leading-relaxed">{data.brief.summary}</p>

          <Block icon="alert" title="Risk signals">
            <ul className="space-y-2">
              {data.brief.riskSignals.map((r) => (
                <li key={r.signal} className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${SEV[r.severity].cls}`}>{SEV[r.severity].label}</span>
                  <span>
                    <span className="font-medium">{r.signal}</span>
                    <span className="block text-xs text-ink-3">{r.evidence}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          <Block icon="heart" title="Motivations">
            <ul className="space-y-1 text-ink-2">
              {data.brief.motivations.map((m) => (
                <li key={m} className="flex gap-2"><span className="text-fast">·</span>{m}</li>
              ))}
            </ul>
          </Block>

          <Block icon="layers" title="Follow-ups ready">
            <ul className="space-y-2">
              {Object.entries(data.brief.ladders).map(([k, v]) => {
                const used = Math.min(progress[k] ?? 0, v.length);
                return (
                  <li key={k} className="flex items-center gap-2">
                    <Icon name={CATEGORY_ICON[k] ?? "message"} size={13} className="text-fast" />
                    <span className="flex-1">{CATEGORY_BY_ID[k]?.label ?? k}</span>
                    <span className="flex gap-1" aria-label={`${used} of ${v.length} used`}>
                      {v.map((_, i) => (
                        <span key={i} className={`w-4 h-1.5 rounded-full transition-colors duration-300 ${i < used ? "bg-fast" : "bg-line"}`} />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Block>

          <div className="flex items-center gap-1.5 text-xs text-ink-3 num pt-3 border-t border-line">
            <Icon name="dollar" size={12} />
            {data.usage.input_tokens.toLocaleString()} in · {data.usage.output_tokens.toLocaleString()} out · {fmt$(usageCost(data.usage))}
            <span className="ml-auto">{data.mode}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Block({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
        <Icon name={icon} size={12} /> {title}
      </h3>
      {children}
    </div>
  );
}
