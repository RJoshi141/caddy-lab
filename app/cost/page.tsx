"use client";
// The hero screen. Two numbers up front, the levers right under them,
// and the working tucked away until someone asks.
import { useEffect, useState } from "react";
import { useSession } from "@/app/session";
import { CALL_DEFAULTS, MODELS, NAIVE_OPTIONS, type ModelId } from "@/lib/config";
import { caddyPerHour, fmt$, naivePerHour, usageCost, type Assumptions, type TokenSizes } from "@/lib/cost";
import { MOCK_BRIEFS } from "@/data/mock/briefs";
import { SCENARIOS } from "@/data/transcripts";
import { Icon, type IconName } from "@/components/Icon";
import { Disclosure, Switch, Tabs, useTween } from "@/components/ui";

export default function CostPage() {
  const session = useSession();
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [sizes, setSizes] = useState<{ mode: string; sizes: TokenSizes } | null>(null);
  const [a, setA] = useState<Assumptions>({ ...CALL_DEFAULTS, naiveCaching: false });
  const [naiveModel, setNaiveModel] = useState<ModelId>(MODELS.naive);
  const [scale, setScale] = useState({ recruiters: 1000, hoursPerDay: 3, days: 21 });

  useEffect(() => {
    fetch("/api/tokens", { method: "POST", headers: session.headers(), body: JSON.stringify({ scenarioId }) })
      .then((r) => r.json())
      .then(setSizes);
  }, [scenarioId, session.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const dealId = SCENARIOS.find((s) => s.id === scenarioId)!.dealId;
  const briefUsage = session.briefs[dealId]?.mode === "live" ? session.briefs[dealId].usage : MOCK_BRIEFS[dealId].usage;

  const naive = sizes ? naivePerHour(sizes.sizes, a, naiveModel) : null;
  const caddy = sizes ? caddyPerHour(sizes.sizes, a, briefUsage, MODELS.refine) : null;
  const naiveShown = useTween(naive?.total ?? 0);
  const caddyShown = useTween(caddy?.total ?? 0);
  const ratio = naive && caddy ? naive.total / caddy.total : 0;
  const ratioShown = useTween(ratio);
  const hoursPerMonth = scale.recruiters * scale.hoursPerDay * scale.days;

  if (!sizes || !naive || !caddy) {
    return (
      <div className="py-20 flex items-center justify-center gap-2 text-ink-3">
        <Icon name="loader" size={16} className="spin" /> Counting tokens…
      </div>
    );
  }

  const live = session.spend.filter((s) => !s.mock);
  const liveTotal = live.reduce((t, s) => t + usageCost(s.usage), 0);
  const refines = session.spend.filter((s) => s.kind === "refine");
  const avgRefineMs = refines.length ? refines.reduce((t, s) => t + s.ms, 0) / refines.length : 0;
  const modelName = (m: string) => (m.includes("opus") ? "Opus" : "Sonnet");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="display text-3xl font-semibold">What one call hour costs</h1>
        <p className="text-ink-2 mt-1">Same playbook, same deal, same call. Two ways to coach it.</p>
      </div>

      {/* The two numbers */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel lift p-6">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-paper"><Icon name="alert" size={14} /></span>
            Naive: {modelName(naiveModel)} on every line
          </div>
          <div className="num text-5xl font-semibold mt-4">{fmt$(naiveShown)}</div>
          <div className="text-sm text-ink-3 mt-1">per call hour · {naive.calls} big-model calls</div>
          <Stack
            parts={[
              { label: "Playbook + deal, resent every line", v: naive.prefixCost, cls: "bg-ink" },
              { label: "Transcript, growing", v: naive.transcriptCost, cls: "bg-ink/60" },
              { label: "Output", v: naive.outputCost, cls: "bg-ink/30" },
            ]}
            total={naive.total}
          />
        </div>

        <div className="panel lift p-6 border-fast/30">
          <div className="flex items-center gap-2 text-sm text-fast">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-fast-soft"><Icon name="zap" size={14} /></span>
            Caddy Lab: think before, look up during
          </div>
          <div className="num text-5xl font-semibold mt-4 text-fast">{fmt$(caddyShown)}</div>
          <div className="text-sm text-ink-3 mt-1 flex flex-wrap items-center gap-2">
            per call hour · 1 brief + {caddy.calls} small-model calls
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fast-soft text-fast font-medium">
              <Icon name="trend" size={12} />
              <span className="num">{ratioShown.toFixed(0)}x</span> cheaper
            </span>
          </div>
          <Stack
            parts={[
              { label: "Pre-call brief (Sonnet)", v: caddy.brief, cls: "bg-fast" },
              { label: "Refinements (Haiku, cached)", v: caddy.refine, cls: "bg-fast/50" },
              { label: "Fast path", v: 0, cls: "bg-fast/20" },
            ]}
            total={caddy.total}
            note="Fast path makes no model calls"
          />
        </div>
      </div>

      {/* The levers people actually want to flip */}
      <div className="panel px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Switch checked={a.naiveCaching} onChange={(v) => setA({ ...a, naiveCaching: v })} label="Give naive prompt caching too" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-3">Naive model</span>
          <div className="w-40">
            <Tabs tabs={NAIVE_OPTIONS.map((m) => ({ id: m, label: modelName(m) }))} value={naiveModel as (typeof NAIVE_OPTIONS)[number]} onChange={(v) => setNaiveModel(v)} />
          </div>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-ink-3">Scenario</span>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-line bg-paper">
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
      </div>

      {/* At scale, as a sentence */}
      <div className="panel p-6">
        <div className="flex items-center gap-2 text-sm text-ink-2 mb-3">
          <Icon name="users" size={14} /> At scale
        </div>
        <p className="text-lg leading-relaxed">
          With <b className="num font-semibold">{scale.recruiters.toLocaleString()}</b> recruiters on <b className="num font-semibold">{scale.hoursPerDay}</b> call hours a day, that&apos;s{" "}
          <span className="num font-semibold">{fmt$(naive.total * hoursPerMonth)}</span> a month the naive way, or{" "}
          <span className="num font-semibold text-fast">{fmt$(caddy.total * hoursPerMonth)}</span> with Caddy Lab.
        </p>
      </div>

      {/* Everything else, on demand */}
      <div className="panel px-5 py-3 divide-y divide-line">
        <Disclosure title="Adjust assumptions" icon="gauge" className="py-2">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 pb-2 text-sm">
            <Num label="Call length (minutes)" value={a.callMinutes} step={5} onChange={(v) => setA({ ...a, callMinutes: v })} />
            <Num label="Recruiters on calls" value={scale.recruiters} step={100} onChange={(v) => setScale({ ...scale, recruiters: v })} />
            <Num label="Utterances per hour" value={a.utterancesPerHour} step={10} onChange={(v) => setA({ ...a, utterancesPerHour: v })} />
            <Num label="Call hours per day" value={scale.hoursPerDay} step={1} onChange={(v) => setScale({ ...scale, hoursPerDay: v })} />
            <Num label="Share that trigger a refinement" value={a.pushbackShare} step={0.05} onChange={(v) => setA({ ...a, pushbackShare: v })} />
            <Num label="Working days" value={scale.days} step={1} onChange={(v) => setScale({ ...scale, days: v })} />
          </div>
        </Disclosure>
        <Disclosure title="How these numbers are made" icon="info" className="py-2">
          <div className="grid sm:grid-cols-3 gap-6 pt-3 pb-2 text-sm">
            <Fact icon="layers" title="Token sizes">
              <ul className="num text-xs text-ink-2 space-y-0.5">
                <li>naive prefix {sizes.sizes.naivePrefix.toLocaleString()}</li>
                <li>per transcript line {sizes.sizes.tokensPerLine}</li>
                <li>refine cached prefix {sizes.sizes.refinePrefix.toLocaleString()}</li>
                <li>refine tail {sizes.sizes.refineTail}</li>
              </ul>
              <p className="text-xs text-ink-3 mt-2">{sizes.mode === "counted" ? "Counted with the API's token counter." : "Estimated at 4 characters a token (mock mode)."}</p>
            </Fact>
            <Fact icon="clock" title="This session">
              <p className="text-ink-2">{session.spend.length} API results seen, {live.length} live.</p>
              <p className="num text-ink-2">{fmt$(liveTotal)} real spend</p>
              {avgRefineMs > 0 && <p className="text-ink-3 text-xs mt-1">avg refine {Math.round(avgRefineMs)} ms{refines.every((r) => r.mock) ? " (simulated)" : ""}</p>}
            </Fact>
            <Fact icon="zap" title="Latency">
              <p className="text-ink-2">Naive waits on a big model before anything shows. Caddy Lab shows a question in milliseconds and only upgrades it if Haiku finds something better.</p>
            </Fact>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}

// One stacked bar instead of three: the shape tells the story, hover gives the numbers.
function Stack({ parts, total, note }: { parts: { label: string; v: number; cls: string }[]; total: number; note?: string }) {
  return (
    <div className="mt-6">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-paper">
        {parts.filter((p) => p.v > 0).map((p) => (
          <div key={p.label} title={`${p.label}: ${fmt$(p.v)}`} className={`${p.cls} transition-[width] duration-500`} style={{ width: `${(p.v / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-ink-3">
            <span className={`w-2 h-2 rounded-sm ${p.cls}`} />
            <span className="flex-1">{p.label}</span>
            <span className="num">{fmt$(p.v)}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-2 text-xs text-ink-3">{note}</p>}
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

function Fact({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 font-semibold mb-1.5"><Icon name={icon} size={13} />{title}</h3>
      {children}
    </div>
  );
}
