"use client";
import type { Deal } from "@/data/deals";
import type { Brief, Usage } from "@/lib/schemas";
import { fmt$, usageCost } from "@/lib/cost";
import { CATEGORY_BY_ID } from "@/data/categories";
import { useState } from "react";
import { CATEGORY_ICON, Icon, type IconName } from "./Icon";
import { Tabs } from "./ui";

const SEV = {
  high: { label: "High", cls: "bg-risk-soft text-risk" },
  med: { label: "Med", cls: "bg-slow-soft text-slow" },
  low: { label: "Low", cls: "bg-paper text-ink-3" },
};

// progress: how many follow-ups per category have been shown on this call.
export function BriefPanel({ deal, data, loading, onRegenerate, live, progress }: { deal: Deal; data?: { brief: Brief; usage: Usage; mode: string }; loading: boolean; onRegenerate: () => void; live: boolean; progress: Record<string, number> }) {
  const [tab, setTab] = useState<"risks" | "wants">("risks");
  const [full, setFull] = useState(false);
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
        {/* What's on the line for the recruiter */}
        <div className="ml-auto text-right shrink-0" title="Placement fee at stake">
          <div className="num text-sm font-semibold">${Math.round(deal.fee / 1000)}k</div>
          <div className="text-[11px] text-ink-3">fee at stake</div>
        </div>
      </div>

      {loading && !data && (
        <div className="py-8 flex items-center justify-center gap-2 text-ink-3">
          <Icon name="loader" size={14} className="spin" /> Reading the deal…
        </div>
      )}

      {data && (
        <div className="mt-4 space-y-5">
          {/* How much of the corpus went into this one brief */}
          {data.brief.drewOn && (
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <Icon name="layers" size={13} className="text-fast" />
              <span>
                Built from <span className="num font-semibold text-ink">{data.brief.drewOn.deals.toLocaleString()}</span> similar past deals and{" "}
                <span className="num font-semibold text-ink">{data.brief.drewOn.files}</span> playbook files
              </span>
            </div>
          )}

          {/* Summary: two lines, expand on demand */}
          <div>
            <p className={`text-ink-2 leading-relaxed ${full ? "" : "line-clamp-2"}`}>{data.brief.summary}</p>
            <button onClick={() => setFull((f) => !f)} className="mt-1 text-xs text-ink-3 hover:text-ink">{full ? "Show less" : "Read more"}</button>
          </div>

          {/* One view at a time instead of everything stacked */}
          <div className="space-y-3">
            <Tabs
              tabs={[
                { id: "risks", label: "Risks", count: data.brief.riskSignals.length },
                { id: "wants", label: "Motivations", count: data.brief.motivations.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === "risks" ? (
              <ul key="risks" className="rise space-y-2.5">
                {data.brief.riskSignals.map((r) => (
                  <li key={r.signal} className="group flex items-start gap-2" title={r.evidence}>
                    <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${r.severity === "high" ? "bg-risk" : r.severity === "med" ? "bg-slow" : "bg-ink-3"}`} aria-label={SEV[r.severity].label} />
                    <span className="min-w-0">
                      <span className="font-medium">{r.signal}</span>
                      <span className="block text-xs text-ink-3 line-clamp-1 group-hover:line-clamp-none">{r.evidence}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul key="wants" className="rise space-y-1.5 text-ink-2">
                {data.brief.motivations.map((m) => (
                  <li key={m} className="flex gap-2"><Icon name="heart" size={12} className="mt-1 text-fast" />{m}</li>
                ))}
              </ul>
            )}
          </div>

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
