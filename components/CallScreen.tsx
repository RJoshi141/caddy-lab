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
import { SuggestionCard, SuggestionRow } from "./SuggestionCard";
import { CATEGORY_ICON, Icon } from "./Icon";
import { CATEGORY_BY_ID } from "@/data/categories";
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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const done = idx >= scenario.lines.length;
  // How far each category has climbed its ladder on this call (for the brief panel).
  const progress = cards.reduce<Record<string, number>>((m, c) => ({ ...m, [c.categoryId]: Math.max(m[c.categoryId] ?? 0, c.rung + 1) }), {});
  const ladderSize = current ? briefData?.brief.ladders[current.categoryId]?.length ?? 0 : 0;
  const firstName = deal.candidate.name.split(" ")[0];

  // Keyboard: space plays/pauses, right arrow steps. Handy while recording.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(t.tagName) || peek) return;
      if (e.key === " " && ready && !done) { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowRight" && ready && !playing) { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, done, playing, next, peek]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,370px)_1fr_minmax(290px,340px)] gap-5 items-start">
      {/* Live call: scenario, controls, transcript */}
      <section className="panel flex flex-col lg:sticky lg:top-20 max-h-[calc(100vh-110px)]" aria-labelledby="call-title">
        <div className="p-4 border-b border-line space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative grid place-items-center w-7 h-7 rounded-lg bg-fast-soft text-fast">
              <Icon name="phone" size={14} />
              {playing && <span className="ping absolute inset-0 rounded-lg border border-fast" />}
            </span>
            <div>
              <h2 id="call-title" className="font-semibold leading-tight">Live call</h2>
              <p className="text-xs text-ink-3">{playing ? "Listening…" : done ? "Call ended" : idx === 0 ? "Ready when you are" : "Paused"}</p>
            </div>
          </div>

          <label className="block">
            <span className="sr-only">Scenario</span>
            <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); reset(); }} className="w-full px-3 py-2 rounded-xl border border-line bg-paper text-sm">
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>

          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setPlaying((p) => !p)} disabled={!ready || done} className="press flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-xl bg-ink text-paper disabled:opacity-40 w-[92px]">
              <Icon name={playing ? "pause" : "play"} size={14} />{playing ? "Pause" : "Play"}
            </button>
            <button onClick={next} disabled={!ready || playing || done} className="press flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-line hover:bg-paper disabled:opacity-40">
              <Icon name="step" size={14} />Step
            </button>
            <button onClick={reset} aria-label="Reset" title="Reset" className="press grid place-items-center w-10 h-10 rounded-xl border border-line hover:bg-paper">
              <Icon name="reset" size={14} />
            </button>
            <div className="ml-auto flex rounded-lg bg-paper p-0.5 text-xs" role="group" aria-label="Playback speed">
              {[1, 1.5, 2].map((s) => (
                <button key={s} onClick={() => setSpeed(s)} aria-pressed={speed === s} className={`press px-2 py-1 rounded-md ${speed === s ? "bg-card shadow-sm text-ink" : "text-ink-3"}`}>{s}x</button>
              ))}
            </div>
          </div>

          {/* Progress through the call */}
          <div>
            <div className="h-1 rounded-full bg-line overflow-hidden">
              <div className="h-full bg-fast rounded-full transition-[width] duration-300" style={{ width: `${(idx / scenario.lines.length) * 100}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-ink-3">
              <span className="num">Line {idx} of {scenario.lines.length}</span>
              <span className="flex items-center gap-1.5" title="The local model helps when keywords miss">
                <span className={`w-1.5 h-1.5 rounded-full ${emb.status === "ready" ? "bg-fast" : emb.status === "error" ? "bg-ink-3" : "bg-slow animate-pulse"}`} />
                {emb.status === "ready" ? "Local model warm" : emb.status === "error" ? "Keywords only" : "Warming local model"}
              </span>
            </div>
          </div>
        </div>

        <ol ref={feed} className="p-4 space-y-3 overflow-y-auto flex-1" aria-live="polite">
          {scenario.lines.slice(0, idx).map((l, i) => {
            const fired = cards.find((c) => c.lineIndex === i);
            const isCand = l.speaker === "candidate";
            const latest = i === idx - 1;
            return (
              <li key={i} className={`rise flex gap-2 ${isCand ? "" : "flex-row-reverse"}`}>
                <span className={`mt-5 shrink-0 grid place-items-center w-7 h-7 rounded-full text-[11px] font-semibold ${isCand ? "bg-ink text-paper" : "bg-line text-ink-2"}`}>
                  {isCand ? firstName[0] : "R"}
                </span>
                <div className={`max-w-[85%] flex flex-col ${isCand ? "items-start" : "items-end"}`}>
                  <span className="text-xs text-ink-3 mb-1 px-1">{isCand ? firstName : "Recruiter"}</span>
                  <p className={`text-sm leading-relaxed px-3 py-2 rounded-2xl transition-colors ${isCand ? `rounded-tl-md bg-paper text-ink ${latest ? "ring-1 ring-ink/15" : ""}` : "rounded-tr-md bg-fast-soft/60 text-ink-2"}`}>
                    {l.text}
                  </p>
                  {fired && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-fast px-1">
                      <Icon name={CATEGORY_ICON[fired.categoryId] ?? "message"} size={11} />
                      {CATEGORY_BY_ID[fired.categoryId]?.label}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {idx === 0 && (
            <li className="py-10 text-center text-sm text-ink-3">
              <Icon name="mic" size={22} className="mx-auto mb-2 text-ink-3" />
              {ready ? "Press Play, or Step through line by line." : "Waiting for the pre-call brief…"}
              <span className="block mt-1 text-xs">Space to play · → to step</span>
            </li>
          )}
        </ol>
      </section>

      {/* The suggestion */}
      <section className="space-y-4 min-w-0" aria-labelledby="sugg-title">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={16} className="text-fast" />
          <h2 id="sugg-title" className="font-semibold">Suggested question</h2>
          <span className="text-xs text-ink-3 hidden sm:inline">Shows instantly, then Haiku sharpens it in the background</span>
        </div>
        {current ? (
          <SuggestionCard key={current.id} s={current} ladderSize={ladderSize} onAct={(a) => act(current, a)} onPeek={setPeek} />
        ) : (
          <div className="panel border-dashed p-10 text-center">
            <span className="mx-auto mb-3 grid place-items-center w-11 h-11 rounded-full bg-fast-soft text-fast"><Icon name="ear" size={20} /></span>
            <p className="font-medium">Listening for a moment worth digging into</p>
            <p className="mt-1 text-sm text-ink-3">Most lines aren&apos;t pushback, so the caddy stays quiet until one is.</p>
          </div>
        )}
        {history.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3 pt-2">
              <Icon name="clock" size={12} /> Earlier on this call
            </h3>
            {history.map((c) => <SuggestionRow key={c.id} s={c} onPeek={setPeek} />)}
          </div>
        )}
      </section>

      {/* Brief + learning loop */}
      <aside className="space-y-4">
        <BriefPanel deal={deal} data={briefData} loading={briefLoading} onRegenerate={() => loadBrief(true)} live={session.mode === "live"} progress={progress} />
        <LearningLoop log={log} onClear={() => setLog([])} />
      </aside>

      {peek && <PlaybookPeek file={peek} onClose={() => setPeek(null)} />}
    </div>
  );
}

// Playbook file viewer. Escape or clicking outside closes it.
function PlaybookPeek({ file, onClose }: { file: string; onClose: () => void }) {
  const doc = DOCS.find((d) => d.file === file);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] flex items-center justify-center p-6 z-20" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={doc?.title ?? file} className="rise panel max-w-xl w-full max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <Icon name="file" size={14} className="text-fast" />
          <span className="num text-xs text-ink-3">playbook/{file}</span>
          <button autoFocus className="press ml-auto flex items-center gap-1 text-sm text-ink-2 px-2 py-1 rounded-lg hover:bg-paper" onClick={onClose}>
            <Icon name="x" size={14} /> close
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-sm leading-relaxed space-y-3">{doc && <Markdown text={doc.text} />}</div>
      </div>
    </div>
  );
}

// Just enough markdown for the playbook files: headings, a note, numbered questions, paragraphs.
function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((block, i) => {
        if (block.startsWith("# ")) return <h3 key={i} className="display text-xl font-semibold">{block.slice(2)}</h3>;
        if (block.startsWith("## ")) return <h4 key={i} className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-2">{block.slice(3)}</h4>;
        if (block.startsWith("> ")) return <p key={i} className="flex gap-2 text-xs text-ink-3 bg-paper rounded-lg px-3 py-2"><Icon name="info" size={13} className="mt-px" />{block.slice(2)}</p>;
        if (/^\d+\.\s/.test(block))
          return (
            <ol key={i} className="space-y-2">
              {block.split("\n").map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="num shrink-0 grid place-items-center w-5 h-5 rounded-full bg-fast-soft text-fast text-[11px]">{j + 1}</span>
                  <span>{l.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ol>
          );
        return <p key={i} className="text-ink-2">{block}</p>;
      })}
    </>
  );
}
