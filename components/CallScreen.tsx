"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCENARIOS, SCENARIO_BY_ID } from "@/data/transcripts";
import { DEAL_BY_ID } from "@/data/deals";
import playbook from "@/data/playbook-index.json";
import { useSession } from "@/app/session";
import { keywordClassify, rungFor, type Classification, type Suggestion } from "@/lib/fastpath";
import { initialEngine, step, type EngineState } from "@/lib/engine";
import { topKPlaybook } from "@/lib/retrieval";
import { useEmbeddings } from "@/lib/useEmbeddings";
import { appendLog, readLog, type LogEntry } from "@/lib/log";
import { FASTPATH } from "@/lib/config";
import { ASKED_THRESHOLD, askedSimilarity } from "@/lib/match";
import { MOMENT, SuggestionCard, SuggestionRow } from "./SuggestionCard";
import { CATEGORY_ICON, Icon } from "./Icon";
import { Disclosure } from "./ui";
import { BriefPanel } from "./BriefPanel";
import { LearningLoop } from "./LearningLoop";

type Card = Suggestion & { files?: string[]; pending?: boolean; acted?: "used" | "ignored"; autoAsked?: boolean; shownAt: number };
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
  const [speed] = useState(1); // one speed: fewer controls
  const [cards, setCards] = useState<Card[]>([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const engine = useRef<EngineState>(initialEngine());
  const cardsRef = useRef<Card[]>([]);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  const busy = useRef(false);
  // The line currently being "heard": words appear like live captions.
  const [streaming, setStreaming] = useState<{ i: number; words: number } | null>(null);
  const runId = useRef(0);
  const [briefOpen, setBriefOpen] = useState(false);
  const [heard, setHeard] = useState(0); // lines fully processed
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
    runId.current++;
    busy.current = false;
    setStreaming(null);
    setHeard(0);
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
          return { ...c, pending: false, refined: { question: replace ? rf.question : "", reason: rf.reason, swapped, latencyMs: r.ms, playbookRef: rf.playbookRef, evidence: rf.evidence } };
        });
      });
    },
    [scenario, deal.id, briefData, session, emb.docVecs]
  );

  // Fast path for one line. Everything here is local.
  const playLine = useCallback(
    async (i: number) => {
      const line = scenario.lines[i];
      // The recruiter just spoke: did they ask the question on screen? If so, log it. No clicks needed.
      if (line.speaker === "recruiter") {
        const top = cardsRef.current[cardsRef.current.length - 1];
        const shown = top?.refined?.swapped ? top.refined.question : top?.question;
        if (top && shown && !top.acted && askedSimilarity(line.text, shown) >= ASKED_THRESHOLD) act(top, "used", true);
      }
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
    // act only uses setters and the deal id, which is stable within a scenario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, emb, briefData, refine]
  );

  const next = useCallback(async () => {
    if (busy.current || idx >= scenario.lines.length) return;
    busy.current = true;
    const run = runId.current;
    const i = idx;
    const words = scenario.lines[i].text.split(" ").length;
    setIdx(i + 1);
    // Captions arrive word by word, like real speech-to-text.
    const per = Math.min(55, 900 / words) / speed;
    for (let k = 1; k <= words; k++) {
      if (runId.current !== run) return;
      setStreaming({ i, words: k });
      await new Promise((r) => setTimeout(r, per));
    }
    if (runId.current !== run) return;
    setStreaming(null);
    // The sentence just ended: fast path runs now.
    await playLine(i);
    if (i + 1 >= scenario.lines.length) setPlaying(false);
    busy.current = false;
    setHeard(i + 1);
  }, [idx, scenario.lines, playLine, speed]);

  // Hang up: hear the rest of the call instantly and jump to the recap.
  const endCall = useCallback(async () => {
    runId.current++;
    setStreaming(null);
    setPlaying(false);
    const total = scenario.lines.length;
    for (let i = heard; i < total; i++) await playLine(i);
    busy.current = false;
    setIdx(total);
    setHeard(total);
  }, [heard, scenario.lines.length, playLine]);

  // Autoplay: wait the line's gap, then play it.
  useEffect(() => {
    // Wait until the last line has been fully heard, then pause like a real speaker would.
    if (!playing || heard !== idx || idx >= scenario.lines.length) return;
    const t = setTimeout(next, scenario.lines[idx].gapMs / speed);
    return () => clearTimeout(t);
  }, [playing, heard, idx, speed, scenario.lines, next]);

  function act(card: Card, action: "used" | "ignored", auto = false) {
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, acted: action, autoAsked: auto } : c)));
    appendLog({ at: Date.now(), dealId: deal.id, categoryId: card.categoryId, rung: card.rung, source: card.source, action, question: card.refined?.swapped ? card.refined.question : card.question, refined: !!card.refined?.swapped });
    setLog(readLog());
  }

  const current = cards[cards.length - 1];
  const history = cards.slice(0, -1).reverse();
  const ready = !!briefData;
  const done = idx >= scenario.lines.length;
  // How far each category has climbed its ladder on this call (for the brief panel).
  const progress = cards.reduce<Record<string, number>>((m, c) => ({ ...m, [c.categoryId]: Math.max(m[c.categoryId] ?? 0, c.rung + 1) }), {});
  const ladderSize = current ? briefData?.brief.ladders[current.categoryId]?.length ?? 0 : 0;
  const firstName = deal.candidate.name.split(" ")[0];
  const upNext = current ? rungFor(briefData?.brief ?? null, current.categoryId, current.rung + 1)?.question : undefined;

  // Keyboard: space plays/pauses, right arrow steps. Handy while recording.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(t.tagName) || peek || briefOpen) return;
      if (e.key === " " && ready && !done) { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowRight" && ready && !playing) { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, done, playing, next, peek, briefOpen]);

  return (
    <div className="max-w-[1180px] mx-auto">
      {/* Call bar: who, where we are, and the few controls you need */}
      <section className="panel relative overflow-hidden px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3" aria-label="Call">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative grid place-items-center w-10 h-10 rounded-full bg-ink text-paper text-sm font-semibold shrink-0">
            {deal.candidate.name.split(" ").map((p) => p[0]).join("")}
            {streaming && scenario.lines[streaming.i].speaker === "candidate" && <span className="ping absolute inset-0 rounded-full border-2 border-fast" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold truncate">{deal.candidate.name}</span>
              <span className="num text-xs text-ink-3">${Math.round(deal.fee / 1000)}k fee</span>
            </div>
            <label className="flex items-center gap-1 text-xs text-ink-3">
              <span className="sr-only">Scenario</span>
              <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); reset(); }} className="appearance-none bg-transparent pr-4 hover:text-ink cursor-pointer max-w-[260px] truncate">
                {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{DEAL_BY_ID[s.dealId].job.title} · {s.title}</option>)}
              </select>
              <Icon name="chevron" size={12} className="-ml-4 pointer-events-none" />
            </label>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Voice level, only while someone is talking */}
          <div className={`flex items-end gap-0.5 h-5 mr-1 transition-opacity duration-300 ${streaming ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((k) => (
              <span key={k} className={`eq w-1 rounded-full ${streaming && scenario.lines[streaming.i].speaker === "candidate" ? "bg-ink" : "bg-fast"}`} style={{ animationDelay: `${k * 110}ms` }} />
            ))}
          </div>
          <button onClick={() => setBriefOpen(true)} className="press flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-line hover:bg-paper text-sm">
            <Icon name="clipboard" size={14} /> Brief
            {briefData && <span className="num text-[11px] px-1.5 rounded-full bg-risk-soft text-risk">{briefData.brief.riskSignals.length}</span>}
          </button>
          {done ? (
            <button onClick={reset} className="press flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-ink text-paper text-sm">
              <Icon name="reset" size={14} /> Replay
            </button>
          ) : (
            <>
              <button onClick={next} disabled={!ready || playing || !!streaming} className="press flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-line hover:bg-paper text-sm disabled:opacity-40">
                <Icon name="step" size={14} /> Step
              </button>
              <button onClick={() => setPlaying((p) => !p)} disabled={!ready} className="press flex items-center justify-center gap-1.5 min-h-10 w-[92px] rounded-xl bg-ink text-paper text-sm disabled:opacity-40">
                <Icon name={playing ? "pause" : "play"} size={14} /> {playing ? "Pause" : "Play"}
              </button>
              {idx > 0 && (
                <button onClick={endCall} className="press rise min-h-10 px-3.5 rounded-xl text-sm font-medium bg-risk-soft text-risk hover:bg-risk hover:text-white">
                  End call
                </button>
              )}
            </>
          )}
        </div>

        {/* Progress through the call, as a hairline */}
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-line/60">
          <div className="h-full bg-fast transition-[width] duration-500" style={{ width: `${(idx / scenario.lines.length) * 100}%` }} />
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-6 items-start">
        {/* Captions */}
        <section className="lg:sticky lg:top-20" aria-label="Transcript">
          <ol ref={feed} className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 space-y-4" aria-live="polite">
            {scenario.lines.slice(0, idx).map((l, i) => {
              const isCand = l.speaker === "candidate";
              return (
                <li key={i} className={`rise transition-opacity duration-500 hover:opacity-100 ${i < idx - 3 ? "opacity-35" : ""}`}>
                  <div className={`text-[11px] uppercase tracking-wider mb-1 ${isCand ? "text-ink-2 font-semibold" : "text-ink-3"}`}>{isCand ? firstName : "You"}</div>
                  <p className={`leading-relaxed ${isCand ? "text-[15px] text-ink" : "text-sm text-ink-3"}`}>
                    {streaming?.i === i ? (
                      <>
                        {l.text.split(" ").slice(0, streaming.words).join(" ")}
                        <span className="caret text-ink-3" />
                      </>
                    ) : (
                      l.text
                    )}
                  </p>
                </li>
              );
            })}
            {idx === 0 && (
              <li className="text-sm text-ink-3 pt-2">
                {ready ? "The call shows up here as it happens." : "Preparing the brief…"}
                <span className="block mt-1 text-xs">Space to play · → to step</span>
              </li>
            )}
          </ol>
        </section>

        {/* The one thing to look at */}
        <section className="space-y-4 min-w-0" aria-label="Ask next">
          {done && cards.length > 0 ? (
            <Recap key={scenarioId} cards={cards} nextSteps={briefData?.brief.nextSteps ?? []} followUp={briefData?.brief.followUp} name={firstName} />
          ) : current ? (
            <SuggestionCard key={current.id} s={current} ladderSize={ladderSize} upNext={upNext} onAct={(a) => act(current, a)} onPeek={setPeek} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-8 py-16 text-center">
              <div className={`mx-auto mb-4 flex items-end justify-center gap-1 h-8 transition-opacity ${streaming || playing ? "opacity-100" : "opacity-30"}`} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((k) => <span key={k} className={`${streaming || playing ? "eq" : "h-2"} w-1.5 rounded-full bg-fast`} style={{ animationDelay: `${k * 110}ms` }} />)}
              </div>
              <p className="font-medium">{streaming || playing ? "Listening" : "Quiet until it matters"}</p>
              <p className="mt-1 text-sm text-ink-3">A question shows up only when there&apos;s one worth asking.</p>
            </div>
          )}
          {(done ? cards.length > 0 : history.length > 0) && (
            <Disclosure title={done ? "Questions from this call" : "Earlier"} icon="clock" meta={<span className="num">{done ? cards.length : history.length}</span>}>
              <div className="space-y-2 pt-2">
                {(done ? [...cards].reverse() : history).map((c) => <SuggestionRow key={c.id} s={c} />)}
              </div>
            </Disclosure>
          )}
        </section>
      </div>

      {/* Brief and learning loop live in a drawer: there when you want them, gone when you don't */}
      <Drawer open={briefOpen} onClose={() => setBriefOpen(false)} title="Pre-call brief">
        <BriefPanel deal={deal} data={briefData} loading={briefLoading} onRegenerate={() => loadBrief(true)} live={session.mode === "live"} progress={progress} />
        <LearningLoop log={log} onClear={() => setLog([])} />
        <p className="flex items-center gap-1.5 text-xs text-ink-3 px-1">
          <span className={`w-1.5 h-1.5 rounded-full ${emb.status === "ready" ? "bg-fast" : emb.status === "error" ? "bg-ink-3" : "bg-slow animate-pulse"}`} />
          {emb.status === "ready" ? "Local model warm" : emb.status === "error" ? "Matching on keywords only" : "Warming local model"}
        </p>
      </Drawer>

      {peek && <PlaybookPeek file={peek} onClose={() => setPeek(null)} />}
    </div>
  );
}

// Slide-over panel from the right.
function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div className={`fixed inset-0 z-30 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-ink/20 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <aside role="dialog" aria-modal="true" aria-label={title} className={`absolute right-0 top-0 h-full w-full max-w-[420px] bg-paper border-l border-line overflow-y-auto p-4 space-y-4 transition-[transform,box-shadow] duration-300 ease-out ${open ? "translate-x-0 shadow-2xl" : "translate-x-full shadow-none"}`}>
        <div className="flex justify-end">
          <button onClick={onClose} className="press flex items-center gap-1 text-sm text-ink-2 px-2 py-1 rounded-lg hover:bg-line/60">
            <Icon name="x" size={14} /> close
          </button>
        </div>
        {children}
      </aside>
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

// After the call: what happened, with nothing for the recruiter to write up.
function Recap({ cards, nextSteps, followUp, name }: { cards: Card[]; nextSteps: string[]; followUp?: { to: string; subject: string; body: string }; name: string }) {
  const [sent, setSent] = useState(false);
  const asked = cards.filter((c) => c.autoAsked).length;
  const used = cards.filter((c) => c.acted === "used").length;
  const moments = [...new Set(cards.map((c) => c.categoryId))];
  return (
    <article className="enter panel p-6 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat value={cards.length} label="questions suggested" />
        <Stat value={used} label={asked ? `used, ${asked} caught automatically` : "used"} />
        <Stat value={moments.length} label="moments flagged" />
      </div>
      {/* The follow-up is already written. One tap, like replying YES. */}
      {followUp && (
        <div className={`rounded-2xl border transition-colors duration-500 ${sent ? "border-fast/40 bg-fast-soft/40" : "border-line bg-paper/60"}`}>
          <div className="flex items-center gap-2 px-4 pt-3.5 text-xs text-ink-3">
            <Icon name="message" size={12} className="text-fast" />
            <span>Drafted for you · to <span className="text-ink-2 font-medium">{followUp.to}</span></span>
          </div>
          <div className="px-4 pt-1.5 pb-3">
            <div className="font-medium text-sm">{followUp.subject}</div>
            <p className="mt-1 text-sm text-ink-2 leading-relaxed">{followUp.body}</p>
          </div>
          <div className="flex items-center justify-end gap-2 px-4 pb-3.5">
            {sent ? (
              <span className="rise flex items-center gap-1.5 min-h-10 text-sm text-fast font-medium">
                <Icon name="check" size={15} /> Sent from your Gmail
              </span>
            ) : (
              <button onClick={() => setSent(true)} className="press flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-ink text-paper text-sm">
                <Icon name="send" size={14} /> Send
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2"><Icon name="ear" size={12} /> What came up</h3>
        <div className="flex flex-wrap gap-1.5">
          {moments.map((m) => (
            <span key={m} className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-fast-soft text-fast text-xs font-medium">
              <Icon name={CATEGORY_ICON[m] ?? "message"} size={12} />{MOMENT[m] ?? m}
            </span>
          ))}
        </div>
      </div>
      {nextSteps.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2"><Icon name="target" size={12} /> {followUp ? "Then" : `Next steps for ${name}'s deal`}</h3>
          <ol className="space-y-2">
            {nextSteps.map((n, i) => (
              <li key={n} className="rise flex gap-2.5 text-sm" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="num shrink-0 grid place-items-center w-5 h-5 rounded-full bg-fast-soft text-fast text-[11px]">{i + 1}</span>
                <span className="text-ink-2">{n}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-ink-3 pt-3 border-t border-line">
        <Icon name="check" size={12} className="text-fast" /> Saved to the deal and the learning loop. Nothing to write up.
      </p>
    </article>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5">
      <div className="num text-2xl font-semibold">{value}</div>
      <div className="text-xs text-ink-3 leading-snug">{label}</div>
    </div>
  );
}
