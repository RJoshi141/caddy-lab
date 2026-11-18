"use client";
// The hero screen. Naive vs Caddy Lab per call hour, from token sizes
// (counted live, or estimated in mock) and the prices in config.
import { useEffect, useState } from "react";
import { useSession } from "@/app/session";
import { CALL_DEFAULTS, MODELS, NAIVE_OPTIONS, type ModelId } from "@/lib/config";
import { caddyPerHour, fmt$, naivePerHour, usageCost, type Assumptions, type TokenSizes } from "@/lib/cost";
import { MOCK_BRIEFS } from "@/data/mock/briefs";
import { SCENARIOS } from "@/data/transcripts";
import { Icon } from "@/components/Icon";

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
  // Prefer a real live brief usage if this session made one.
  const briefUsage = session.briefs[dealId]?.mode === "live" ? session.briefs[dealId].usage : MOCK_BRIEFS[dealId].usage;

  if (!sizes) return <div className="text-ink-3">Counting tokens…</div>;
  const naive = naivePerHour(sizes.sizes, a, naiveModel);
  const caddy = caddyPerHour(sizes.sizes, a, briefUsage, MODELS.refine);
  const ratio = naive.total / caddy.total;
  const hoursPerMonth = scale.recruiters * scale.hoursPerDay * scale.days;

  const live = session.spend.filter((s) => !s.mock);
  const liveTotal = live.reduce((t, s) => t + usageCost(s.usage), 0);
  const refines = session.spend.filter((s) => s.kind === "refine");
  const avgRefineMs = refines.length ? refines.reduce((t, s) => t + s.ms, 0) / refines.length : 0;

  const num = (k: keyof Assumptions, step = 1) => (
    <input type="number" step={step} value={a[k] as number} onChange={(e) => setA({ ...a, [k]: Number(e.target.value) })} className="num w-24 px-2 py-1 rounded border border-line bg-paper text-right" />
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="display text-3xl font-semibold">What one call hour costs</h1>
        <p className="text-ink-2 mt-1">
          Same playbook, same deal, same transcript. Token sizes are{" "}
          <span className="font-medium">{sizes.mode === "counted" ? "counted with the API's token counter" : "estimated at 4 characters a token (mock mode)"}</span>. Prices are in one config file.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel lift p-6">
          <div className="flex items-center gap-1.5 text-sm text-ink-3"><Icon name="alert" size={14} />Naive: {naiveModel.replace("claude-", "")} on every line, full context</div>
          <div className="num text-5xl font-semibold mt-2">{fmt$(naive.total)}</div>
          <div className="text-sm text-ink-3 mt-1">per call hour · {naive.calls} model calls</div>
          <Bars rows={[["playbook + deal, every line", naive.prefixCost], ["growing transcript", naive.transcriptCost], ["output", naive.outputCost]]} max={naive.total} color="bg-ink" />
        </div>
        <div className="panel lift p-6 border-fast/30">
          <div className="flex items-center gap-1.5 text-sm text-fast"><Icon name="zap" size={14} />Caddy Lab: brief once, local fast path, Haiku on pushback</div>
          <div className="num text-5xl font-semibold mt-2 text-fast">{fmt$(caddy.total)}</div>
          <div className="text-sm text-ink-3 mt-1">per call hour · 1 brief + {caddy.calls} Haiku calls · <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fast-soft text-fast font-medium"><Icon name="trend" size={12} />{ratio.toFixed(0)}x cheaper</span></div>
          <Bars rows={[[`pre-call brief (Sonnet, ${(60 / a.callMinutes).toFixed(1)} per hour)`, caddy.brief], ["refinements (Haiku, cached prefix)", caddy.refine], ["fast path", 0]]} max={naive.total} color="bg-fast" />
        </div>
      </div>

      <div className="panel p-5 grid md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-semibold mb-2"><Icon name="gauge" size={14} />Assumptions</h2>
          <Row label="Scenario">
            <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="px-2 py-1 rounded border border-line bg-paper">
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </Row>
          <Row label="Call length (minutes)">{num("callMinutes", 5)}</Row>
          <Row label="Utterances per hour">{num("utterancesPerHour", 10)}</Row>
          <Row label="Share that trigger a refinement">{num("pushbackShare", 0.05)}</Row>
          <Row label="Naive model">
            <select value={naiveModel} onChange={(e) => setNaiveModel(e.target.value as ModelId)} className="px-2 py-1 rounded border border-line bg-paper">
              {NAIVE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Row>
          <Row label="Give naive prompt caching too">
            <input type="checkbox" checked={a.naiveCaching} onChange={(e) => setA({ ...a, naiveCaching: e.target.checked })} />
          </Row>
          <p className="text-xs text-ink-3 pt-2">Flip caching on to see the fair version. Caching helps naive a lot, but the transcript still grows every line and it still pays big-model output on every turn.</p>
        </div>
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-semibold mb-2"><Icon name="users" size={14} />At scale, per month</h2>
          <Row label="Recruiters on calls"><input type="number" value={scale.recruiters} onChange={(e) => setScale({ ...scale, recruiters: +e.target.value })} className="num w-24 px-2 py-1 rounded border border-line bg-paper text-right" /></Row>
          <Row label="Call hours per day"><input type="number" value={scale.hoursPerDay} onChange={(e) => setScale({ ...scale, hoursPerDay: +e.target.value })} className="num w-24 px-2 py-1 rounded border border-line bg-paper text-right" /></Row>
          <Row label="Working days"><input type="number" value={scale.days} onChange={(e) => setScale({ ...scale, days: +e.target.value })} className="num w-24 px-2 py-1 rounded border border-line bg-paper text-right" /></Row>
          <div className="pt-3 grid grid-cols-2 gap-2">
            <div><div className="text-xs text-ink-3">Naive</div><div className="num text-xl">{fmt$(naive.total * hoursPerMonth)}</div></div>
            <div><div className="text-xs text-fast">Caddy Lab</div><div className="num text-xl text-fast">{fmt$(caddy.total * hoursPerMonth)}</div></div>
          </div>
        </div>
      </div>

      <div className="panel p-5 text-sm grid md:grid-cols-3 gap-4">
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold mb-1"><Icon name="layers" size={14} />Token sizes used</h2>
          <ul className="num text-xs text-ink-2 space-y-0.5">
            <li>naive prefix {sizes.sizes.naivePrefix.toLocaleString()}</li>
            <li>per transcript line {sizes.sizes.tokensPerLine}</li>
            <li>refine cached prefix {sizes.sizes.refinePrefix.toLocaleString()}</li>
            <li>refine tail {sizes.sizes.refineTail}</li>
          </ul>
        </div>
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold mb-1"><Icon name="clock" size={14} />This session</h2>
          <p className="text-ink-2">{session.spend.length} API results seen, {live.length} live.</p>
          <p className="num text-ink-2">{fmt$(liveTotal)} real spend</p>
          {avgRefineMs > 0 && <p className="text-ink-3 text-xs">avg refine round trip {Math.round(avgRefineMs)} ms{refines.every((r) => r.mock) ? " (simulated)" : ""}</p>}
        </div>
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold mb-1"><Icon name="zap" size={14} />The latency side</h2>
          <p className="text-ink-2">Naive needs a big model round trip before anything shows. Caddy Lab shows a question in milliseconds and only upgrades it if Haiku finds something better.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex items-center justify-between gap-3"><span className="text-ink-2">{label}</span>{children}</label>;
}

function Bars({ rows, max, color }: { rows: [string, number][]; max: number; color: string }) {
  return (
    <div className="mt-5 space-y-2">
      {rows.map(([label, v]) => (
        <div key={label} className="text-xs">
          <div className="flex justify-between text-ink-3 mb-0.5"><span>{label}</span><span className="num">{fmt$(v)}</span></div>
          <div className="h-2 rounded-full bg-paper overflow-hidden"><div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${Math.max(v > 0 ? 0.6 : 0, (v / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
