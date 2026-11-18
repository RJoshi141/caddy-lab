"use client";
// The cost story in three beats: where the thinking happens, what a call hour
// costs each way, and what that means at scale. Everything else is in Details.
import { useEffect, useState } from "react";
import { useSession } from "@/app/session";
import { CALL_DEFAULTS, CORPUS, MODELS, NAIVE_OPTIONS, SOURCES, type ModelId } from "@/lib/config";
import { caddyPerHour, corpusPassCost, fmt$, naivePerHour, usageCost, type Assumptions, type TokenSizes } from "@/lib/cost";
import { MOCK_BRIEFS } from "@/data/mock/briefs";
import { SCENARIOS } from "@/data/transcripts";
import { Icon, type IconName } from "@/components/Icon";
import { Disclosure, Switch, Tabs, useTween } from "@/components/ui";

const SCENARIO = SCENARIOS[0]; // same call as the demo on the Call tab

export default function CostPage() {
  const session = useSession();
  const [sizes, setSizes] = useState<{ mode: string; sizes: TokenSizes } | null>(null);
  const [a, setA] = useState<Assumptions>({ ...CALL_DEFAULTS, naiveCaching: false });
  const [naiveModel, setNaiveModel] = useState<ModelId>(MODELS.naive);
  const [scale, setScale] = useState({ recruiters: 1000, hoursPerDay: 3, days: 21 });

  useEffect(() => {
    fetch("/api/tokens", { method: "POST", headers: session.headers(), body: JSON.stringify({ scenarioId: SCENARIO.id }) })
      .then((r) => r.json())
      .then(setSizes);
  }, [session.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const dealId = SCENARIO.dealId;
  const briefUsage = session.briefs[dealId]?.mode === "live" ? session.briefs[dealId].usage : MOCK_BRIEFS[dealId].usage;

  const naive = sizes ? naivePerHour(sizes.sizes, a, naiveModel) : null;
  const caddy = sizes ? caddyPerHour(sizes.sizes, a, briefUsage, MODELS.refine) : null;
  const naiveShown = useTween(naive?.total ?? 0);
  const caddyShown = useTween(caddy?.total ?? 0);
  const ratioShown = useTween(naive && caddy ? naive.total / caddy.total : 0);
  const hoursPerMonth = scale.recruiters * scale.hoursPerDay * scale.days;
  const corpus = corpusPassCost();

  if (!sizes || !naive || !caddy) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-ink-3">
        <Icon name="loader" size={16} className="spin" /> Counting tokens…
      </div>
    );
  }

  const modelName = (m: string) => (m.includes("opus") ? "Opus" : "Sonnet");
  const live = session.spend.filter((s) => !s.mock);
  const steps: { when: string; icon: IconName; what: string; cost: string; refs: number[] }[] = [
    { when: "Once, overnight", icon: "layers", what: `Read all ${CORPUS.deals.toLocaleString()} deals and ${CORPUS.docs.toLocaleString()} docs`, cost: `~$${Math.round(corpus.total)} once`, refs: [3, 5] },
    { when: "Before each call", icon: "clipboard", what: "Write this deal's brief", cost: `${fmt$(caddy.brief / (60 / a.callMinutes))} a call`, refs: [1] },
    { when: "During the call", icon: "zap", what: "Look up, sharpen only on pushback", cost: `${fmt$(caddy.refine)} an hour`, refs: [1, 2, 6] },
    { when: "After the call", icon: "trend", what: "Outcomes feed back in", cost: "$0", refs: [] },
  ];

  return (
    <div className="max-w-[1180px] mx-auto space-y-6">
      <header className="pt-2">
        <h1 className="display text-3xl font-semibold">Spend on the corpus once, not on every line.</h1>
      </header>

      {/* Where the thinking happens: a timeline, not a table */}
      <section className="panel px-6 py-5" aria-label="Where the thinking happens">
        <ol className="grid gap-5 md:grid-cols-4 relative">
          {steps.map((st, i) => (
            <li key={st.when} className="relative">
              {/* Connector to the next step */}
              {i < steps.length - 1 && <span aria-hidden="true" className="hidden md:block absolute left-10 -right-3 top-4 h-px bg-line" />}
              <span className="relative z-[1] grid place-items-center w-8 h-8 rounded-full bg-fast-soft text-fast ring-4 ring-card">
                <Icon name={st.icon} size={14} />
              </span>
              <div className="mt-3 text-sm font-semibold">{st.when}</div>
              <div className="text-sm text-ink-3 leading-snug">{st.what}</div>
              <div className="num text-sm font-semibold text-fast mt-1.5">{st.cost}<Refs ids={st.refs} /></div>
            </li>
          ))}
        </ol>
      </section>

      {/* One comparison, one bar, two levers */}
      <section className="panel overflow-hidden" aria-label="Cost per call hour">
        <div className="grid md:grid-cols-2">
          <div className="p-7">
            <div className="text-sm text-ink-3">{modelName(naiveModel)} on every line</div>
            <div className="num text-5xl font-semibold mt-2">{fmt$(naiveShown)}<Refs ids={[1, 4, 6]} big /></div>
            <div className="text-sm text-ink-3 mt-1">per call hour · {naive.calls} big-model calls</div>
          </div>
          <div className="p-7 md:border-l border-t md:border-t-0 border-line">
            <div className="flex items-center gap-2 text-sm text-fast">
              Caddy Lab
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fast-soft font-medium">
                <span className="num">{ratioShown.toFixed(0)}x</span> cheaper
              </span>
            </div>
            <div className="num text-5xl font-semibold mt-2 text-fast">{fmt$(caddyShown)}<Refs ids={[1, 2, 4, 6]} big /></div>
            <div className="text-sm text-ink-3 mt-1">per call hour · 1 brief + {caddy.calls} small-model calls</div>
          </div>
        </div>

        {/* The bar is the argument: same scale, so the gap is the point */}
        <div className="px-7 pb-6 space-y-2">
          <div className="h-2 rounded-full bg-ink/80 transition-[width] duration-500" style={{ width: "100%" }} />
          <div className="h-2 rounded-full bg-fast transition-[width] duration-500" style={{ width: `${Math.max(0.8, (caddy.total / naive.total) * 100)}%` }} />
        </div>

        <div className="px-7 py-4 border-t border-line bg-paper/60 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Switch checked={a.naiveCaching} onChange={(v) => setA({ ...a, naiveCaching: v })} label="Give naive prompt caching too" />
          <div className="w-40">
            <Tabs tabs={NAIVE_OPTIONS.map((m) => ({ id: m, label: modelName(m) }))} value={naiveModel as (typeof NAIVE_OPTIONS)[number]} onChange={(v) => setNaiveModel(v)} />
          </div>
          <span className="ml-auto text-xs text-ink-3">
            {sizes.mode === "counted" ? "Token sizes counted by the API" : "Mock mode: token sizes estimated"}
          </span>
        </div>
      </section>

      {/* At scale, as one sentence */}
      <p className="text-center text-ink-2 py-2">
        At {scale.recruiters.toLocaleString()} recruiters on {scale.hoursPerDay} call hours a day, that&apos;s{" "}
        <span className="num font-semibold text-ink">{fmt$(naive.total * hoursPerMonth)}</span> a month, or{" "}
        <span className="num font-semibold text-fast">{fmt$(caddy.total * hoursPerMonth)}</span>.
      </p>

      {/* Sources: every number above links here */}
      <section aria-labelledby="sources-title" className="px-1">
        <h2 id="sources-title" className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Sources</h2>
        <ol className="grid gap-x-8 gap-y-3 md:grid-cols-2 text-sm">
          {SOURCES.map((src) => (
            <li key={src.id} id={`src-${src.id}`} className="flex gap-3 scroll-mt-24 target:bg-fast-soft/60 rounded-lg -mx-2 px-2 py-1 transition-colors">
              <span className="num text-xs text-ink-3 pt-0.5 w-4 shrink-0">{src.id}</span>
              <span className="min-w-0">
                <span className="font-medium">{src.title}.</span> <span className="text-ink-2">{src.detail}</span>
                <span className="block text-xs text-ink-3 mt-0.5">
                  {"url" in src ? (
                    <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-line underline-offset-2 hover:text-ink">
                      {src.from} <Icon name="external" size={10} />
                    </a>
                  ) : (
                    src.from
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Everything else */}
      <div className="panel px-5 py-2">
        <Disclosure title="Details" icon="info" className="py-2">
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6 pt-3 pb-3 text-sm">
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Assumptions</h3>
              <Num label="Call length (minutes)" value={a.callMinutes} step={5} onChange={(v) => setA({ ...a, callMinutes: v })} />
              <Num label="Utterances per hour" value={a.utterancesPerHour} step={10} onChange={(v) => setA({ ...a, utterancesPerHour: v })} />
              <Num label="Share that trigger a refinement" value={a.pushbackShare} step={0.05} onChange={(v) => setA({ ...a, pushbackShare: v })} />
              <Num label="Recruiters on calls" value={scale.recruiters} step={100} onChange={(v) => setScale({ ...scale, recruiters: v })} />
              <Num label="Call hours per day" value={scale.hoursPerDay} step={1} onChange={(v) => setScale({ ...scale, hoursPerDay: v })} />
              <Num label="Working days" value={scale.days} step={1} onChange={(v) => setScale({ ...scale, days: v })} />
            </div>
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Where each hour goes</h3>
                <Split label="Naive" parts={[["Playbook + deal, resent every line", naive.prefixCost], ["Growing transcript", naive.transcriptCost], ["Output", naive.outputCost]]} />
                <Split label="Caddy Lab" parts={[["Brief", caddy.brief], ["Haiku, cached prefix", caddy.refine], ["Fast path", 0]]} />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Token sizes</h3>
                <p className="num text-xs text-ink-2">
                  naive prefix {sizes.sizes.naivePrefix.toLocaleString()} · per line {sizes.sizes.tokensPerLine} · refine prefix {sizes.sizes.refinePrefix.toLocaleString()} · refine tail {sizes.sizes.refineTail}
                </p>
              </div>
              <p className="text-xs text-ink-3">
                This session: {session.spend.length} API results, {live.length} live, <span className="num">{fmt$(live.reduce((t, s) => t + usageCost(s.usage), 0))}</span> real spend.
              </p>
            </div>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}

function Num({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-ink-2">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="num w-24 px-2 py-1 rounded-lg border border-line bg-paper text-right" />
    </label>
  );
}

function Split({ label, parts }: { label: string; parts: [string, number][] }) {
  return (
    <div className="mb-3">
      <div className="text-ink-2 mb-1">{label}</div>
      <ul className="space-y-0.5 text-xs text-ink-3">
        {parts.map(([k, v]) => (
          <li key={k} className="flex justify-between"><span>{k}</span><span className="num">{fmt$(v)}</span></li>
        ))}
      </ul>
    </div>
  );
}

// Footnote markers that jump to the Sources list.
function Refs({ ids, big }: { ids: number[]; big?: boolean }) {
  if (!ids.length) return null;
  return (
    <sup className={`${big ? "text-xs ml-1" : "text-[10px] ml-0.5"} font-normal text-ink-3`}>
      {ids.map((id, i) => (
        <span key={id}>
          <a href={`#src-${id}`} className="hover:text-fast">{id}</a>
          {i < ids.length - 1 ? "," : ""}
        </span>
      ))}
    </sup>
  );
}
