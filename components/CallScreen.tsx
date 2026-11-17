"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCENARIOS, SCENARIO_BY_ID } from "@/data/transcripts";
import { DEAL_BY_ID } from "@/data/deals";
import playbook from "@/data/playbook-index.json";
import { useSession } from "@/app/session";
import { keywordClassify, type Classification, type Suggestion } from "@/lib/fastpath";
import { initialEngine, step, type EngineState } from "@/lib/engine";
import { topKPlaybook } from "@/lib/retrieval";
import { useEmbeddings } from "@/lib/useEmbeddings";
import { appendLog, readLog, type LogEntry } from "@/lib/log";
import { FASTPATH } from "@/lib/config";
import { SuggestionCard } from "./SuggestionCard";
import { BriefPanel } from "./BriefPanel";
import { LearningLoop } from "./LearningLoop";

type Card = Suggestion & { files?: string[]; pending?: boolean; acted?: "used" | "ignored"; shownAt: number };
const DOCS = playbook as { file: string; title: string; text: string }[];

export function CallScreen() {
  const session = useSession();
  const emb = useEmbeddings();
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIO_BY_ID[scenarioId];
  const deal = DEAL_BY_ID[scenario.dealId];
  const briefData = session.briefs[deal.id];

  const [idx, setIdx] = useState(0); // next line to play
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const engine = useRef<EngineState>(initialEngine());
  const busy = useRef(false);
  const feed = useRef<HTMLOListElement>(null);
  // Keep the newest line in view, like a live caption feed.
  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [idx]);

  // localStorage only exists after mount, so this has to be an effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLog(readLog());
  }, []);

  // Pre-call: fetch the brief once per deal. Cached in session after that.
  const loadBrief = useCallback(
    async (fresh = false) => {
      setBriefLoading(true);
      try {
        const r = await fetch("/api/brief", { method: "POST", headers: session.headers(), body: JSON.stringify({ dealId: deal.id, fresh }) }).then((r) => r.json());
        session.setBrief(deal.id, r);
        if (r.mode === "live") session.addSpend({ kind: "brief", usage: r.usage, mock: false, ms: r.ms ?? 0 });
      } finally {
        setBriefLoading(false);
      }
    },
    [deal.id, session]
  );
  useEffect(() => {
    // Fetching on deal change is exactly what an effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!briefData && !briefLoading) loadBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, session.mode]);

  const reset = useCallback(() => {
    setPlaying(false);
    setIdx(0);
    setCards([]);
    engine.current = initialEngine();
  }, []);

  // Background refinement. Never blocks the fast card.
  const refine = useCallback(
    async (card: Card, queryVec?: number[]) => {
      const lines = scenario.lines.slice(Math.max(0, card.lineIndex - FASTPATH.contextLines + 1), card.lineIndex + 1).map((l) => `${l.speaker}: ${l.text}`);
      const files = topKPlaybook(lines.join(" "), card.categoryId, FASTPATH.topK, emb.docVecs.current ?? undefined, queryVec).map((d) => d.file);
      setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, files, pending: true } : c)));
      const r = await fetch("/api/refine", {
        method: "POST",
        headers: session.headers(),
        body: JSON.stringify({ dealId: deal.id, categoryId: card.categoryId, rung: card.rung, lines, current: card.question, files, brief: briefData?.brief }),
      }).then((r) => r.json());
      if (r.usage) session.addSpend({ kind: "refine", usage: r.usage, mock: r.mode !== "live", ms: r.ms });
      setCards((cs) => {
        const latest = cs[cs.length - 1];
        return cs.map((c) => {
          if (c.id !== card.id) return c;
          const rf = r.refinement;
          const replace = rf.verdict === "replace" && !!rf.question;
          // Swap only if fresh, untouched, and still the card on top. Otherwise chip.
          const swapped = replace && !c.acted && latest?.id === c.id && Date.now() - c.shownAt < FASTPATH.swapWindowMs;
          return { ...c, pending: false, refined: { question: replace ? rf.question : "", reason: rf.reason, swapped, latencyMs: r.ms, playbookRef: rf.playbookRef } };
        });
      });
    },
    [scenario, deal.id, briefData, session, emb.docVecs]
  );

  // Fast path for one line. Everything here is local.
  const playLine = useCallback(
    async (i: number) => {
      const line = scenario.lines[i];
      const t0 = performance.now();
      let c: Classification = line.speaker === "candidate" ? keywordClassify(line.text) : { categoryId: null, confidence: 0, signals: [], method: "none" };
      let queryVec: number[] | undefined;
      // Keywords missed: ask the embedding model (worker, ~10-30ms).
      if (line.speaker === "candidate" && !c.categoryId && emb.status === "ready") {
        const e = await emb.classify(line.text);
        if (e && e.sim >= 0.5) c = { categoryId: e.categoryId, confidence: e.sim, signals: ["semantic match"], method: "embedding" };
        queryVec = e?.queryVec;
      }
      const latency = performance.now() - t0;
      const r = step(engine.current, i, line.speaker, c, briefData?.brief ?? null, latency);
      engine.current = r.state;
      if (r.suggestion) {
        const card: Card = { ...r.suggestion, shownAt: Date.now() };
        setCards((cs) => [...cs, card]);
        refine(card, queryVec);
      }
    },
    [scenario, emb, briefData, refine]
  );

  const next = useCallback(async () => {
    if (busy.current || idx >= scenario.lines.length) return;
    busy.current = true;
    await playLine(idx);
    setIdx((x) => x + 1);
    if (idx + 1 >= scenario.lines.length) setPlaying(false);
    busy.current = false;
  }, [idx, scenario.lines.length, playLine]);

  // Autoplay: wait the line's gap, then play it.
  useEffect(() => {
    if (!playing) return;
    if (idx >= scenario.lines.length) return;
    const t = setTimeout(next, scenario.lines[idx].gapMs / speed);
    return () => clearTimeout(t);
  }, [playing, idx, speed, scenario.lines, next]);

  const act = (card: Card, action: "used" | "ignored") => {
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, acted: action } : c)));
    appendLog({ at: Date.now(), dealId: deal.id, categoryId: card.categoryId, rung: card.rung, source: card.source, action, question: card.refined?.swapped ? card.refined.question : card.question, refined: !!card.refined?.swapped });
    setLog(readLog());
  };

  const current = cards[cards.length - 1];
  const history = cards.slice(0, -1).reverse();
  const ready = !!briefData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr_minmax(280px,340px)] gap-5">
      {/* Transcript */}
      <section className="rounded-xl border border-line bg-card flex flex-col max-h-[calc(100vh-140px)]">
        <div className="p-4 border-b border-line space-y-3">
          <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); reset(); }} className="w-full px-2 py-1.5 rounded-md border border-line bg-paper text-sm">
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setPlaying((p) => !p)} disabled={!ready || idx >= scenario.lines.length} className="px-3 py-1.5 rounded-md bg-ink text-paper disabled:opacity-40 w-20">
              {playing ? "Pause" : "Play"}
            </button>
            <button onClick={next} disabled={!ready || playing || idx >= scenario.lines.length} className="px-3 py-1.5 rounded-md border border-line disabled:opacity-40">Step</button>
            <button onClick={reset} className="px-3 py-1.5 rounded-md border border-line">Reset</button>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="ml-auto px-1.5 py-1 rounded border border-line bg-paper text-xs">
              {[0.5, 1, 1.5, 2].map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span className={`w-1.5 h-1.5 rounded-full ${emb.status === "ready" ? "bg-fast" : emb.status === "error" ? "bg-risk" : "bg-slow animate-pulse"}`} />
            {emb.status === "ready" ? "Local embedding model warm" : emb.status === "error" ? "Embedding model failed, keywords only" : "Warming local embedding model (keywords work now)"}
          </div>
        </div>
        <ol ref={feed} className="p-4 space-y-3 overflow-y-auto flex-1">
          {scenario.lines.slice(0, idx).map((l, i) => {
            const fired = cards.find((c) => c.lineIndex === i);
            return (
              <li key={i} className="rise text-sm">
                <div className="text-xs text-ink-3 mb-0.5">{l.speaker === "candidate" ? deal.candidate.name.split(" ")[0] : "Recruiter"}{fired && <span className="text-fast"> · {fired.categoryId.replaceAll("_", " ")}</span>}</div>
                <p className={l.speaker === "candidate" ? "text-ink" : "text-ink-2"}>{l.text}</p>
              </li>
            );
          })}
          {idx === 0 && <li className="text-sm text-ink-3">{ready ? "Press play. The brief is ready, so the live path needs no model calls." : "Waiting for the pre-call brief…"}</li>}
        </ol>
      </section>

      {/* Suggestion */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold">Suggested question</h2>
          <span className="text-xs text-ink-3">fast path shows instantly, Haiku refines in the background</span>
        </div>
        {current ? (
          <SuggestionCard key={current.id} s={current} primary onAct={(a) => act(current, a)} onPeek={setPeek} />
        ) : (
          <div className="rounded-xl border border-dashed border-line p-8 text-ink-3 text-sm">Quiet until the candidate says something worth digging into.</div>
        )}
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-ink-3">Earlier</div>
            {history.map((c) => <SuggestionCard key={c.id} s={c} onPeek={setPeek} />)}
          </div>
        )}
      </section>

      {/* Brief + learning loop */}
      <aside className="space-y-4">
        <BriefPanel deal={deal} data={briefData} loading={briefLoading} onRegenerate={() => loadBrief(true)} live={session.mode === "live"} />
        <LearningLoop log={log} onClear={() => setLog([])} />
      </aside>

      {peek && (
        <div className="fixed inset-0 bg-ink/30 flex items-center justify-center p-6 z-20" onClick={() => setPeek(null)}>
          <div className="bg-card rounded-xl max-w-xl w-full max-h-[80vh] overflow-y-auto p-6 text-sm whitespace-pre-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex mb-3"><span className="num text-xs text-ink-3">playbook/{peek}</span><button className="ml-auto text-ink-3" onClick={() => setPeek(null)}>close</button></div>
            {DOCS.find((d) => d.file === peek)?.text}
          </div>
        </div>
      )}
    </div>
  );
}
