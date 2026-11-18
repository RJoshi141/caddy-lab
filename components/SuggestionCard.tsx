"use client";
import { CATEGORY_BY_ID } from "@/data/categories";
import type { Suggestion } from "@/lib/fastpath";
import { useState } from "react";
import { CATEGORY_ICON, Icon, type IconName } from "./Icon";
import { Collapse } from "./ui";

export type CardData = Suggestion & { files?: string[]; pending?: boolean; acted?: "used" | "ignored" };

const ms = (x: number) => (x < 0.01 ? "<0.01 ms" : x < 1 ? `${x.toFixed(2)} ms` : `${Math.round(x)} ms`);

// The big card: the question the recruiter should ask right now.
export function SuggestionCard({ s, ladderSize, onAct, onPeek }: { s: CardData; ladderSize: number; onAct: (a: "used" | "ignored") => void; onPeek: (file: string) => void }) {
  const swapped = s.refined?.swapped;
  const question = swapped ? s.refined!.question : s.question;
  const cat = CATEGORY_BY_ID[s.categoryId];
  const source = swapped && s.refined?.playbookRef ? s.refined.playbookRef : s.playbookRef;
  const dots = Math.max(ladderSize, s.rung + 1);
  const [more, setMore] = useState(false);

  return (
    <article className={`rise panel p-6 shadow-[0_10px_30px_-20px_rgb(23_25_29/0.35)] ${s.acted === "used" ? "border-fast/40" : ""}`}>
      {/* Meta row: what kind of moment this is, and how fast it showed up */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-fast-soft text-fast font-medium">
          <Icon name={CATEGORY_ICON[s.categoryId] ?? "message"} size={13} />
          {cat?.label}
        </span>
        <span className="flex items-center gap-1.5 text-ink-3" title="Where this sits in the follow-up ladder">
          <span className="flex gap-1">
            {Array.from({ length: dots }).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= s.rung ? "bg-fast" : "bg-line"}`} />
            ))}
          </span>
          Follow-up {s.rung + 1}
        </span>
        <span
          className="ml-auto flex items-center gap-1 num text-ink-3 px-2 py-0.5 rounded-full bg-paper cursor-help"
          title={`Fast path via ${s.method}. No model call.`}
        >
          <Icon name="zap" size={12} className="text-fast" />
          {ms(s.latencyMs)}
        </span>
      </div>

      <p key={question} className={`display mt-4 text-[26px] leading-[1.25] font-medium ${swapped ? "flash rounded-md -mx-1 px-1" : ""}`}>{question}</p>

      {/* Background refinement status */}
      <div className="mt-3 min-h-6 text-sm">
        {s.pending && (
          <span className="flex items-center gap-2 text-ink-3">
            <Icon name="loader" size={14} className="spin" /> Refining in the background…
          </span>
        )}
        {s.refined && swapped && (
          <span className="rise flex items-start gap-2 text-slow">
            <Icon name="refresh" size={14} className="mt-0.5" />
            <span>
              Refined by Haiku in <span className="num">{ms(s.refined.latencyMs)}</span>: {s.refined.reason}
            </span>
          </span>
        )}
        {s.refined && !swapped && s.refined.question && (
          <div className="rise rounded-xl bg-slow-soft px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slow mb-1">
              <Icon name="sparkles" size={12} /> Sharper option, arrived late so not swapped in
            </div>
            <div className="text-ink">{s.refined.question}</div>
          </div>
        )}
        {s.refined && !s.refined.question && (
          <span className="rise flex items-center gap-2 text-ink-3">
            <Icon name="check" size={14} className="text-fast" /> Haiku kept it (<span className="num">{ms(s.refined.latencyMs)}</span>): {s.refined.reason}
          </span>
        )}
      </div>

      {/* Why this question: the two rows that matter, the rest on demand */}
      <section className="mt-5 pt-4 border-t border-line">
        <div className="flex items-center mb-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-2">
            <Icon name="bulb" size={13} /> Why this question
          </h3>
          <button onClick={() => setMore((m) => !m)} aria-expanded={more} className="press ml-auto flex items-center gap-1 text-xs text-ink-3 hover:text-ink px-2 py-1 rounded-lg hover:bg-paper">
            {more ? "Less" : "More"}
            <Icon name="chevron" size={13} className={`transition-transform duration-300 ${more ? "rotate-180" : ""}`} />
          </button>
        </div>
        <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2.5 text-sm">
          <Row icon="ear" label="Heard">
            <div className="flex flex-wrap gap-1.5">
              {s.matchedSignals.map((x) => (
                <span key={x} className="px-2 py-0.5 rounded-md bg-paper border border-line">{x}</span>
              ))}
            </div>
          </Row>
          <Row icon="file" label="Source">
            <button onClick={() => onPeek(source)} className="press num text-xs px-2 py-0.5 rounded-md border border-line bg-paper hover:border-ink/30">
              {source}
            </button>
          </Row>
        </dl>
        <Collapse open={more}>
          <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2.5 text-sm pt-2.5">
            <Row icon="target" label="Why for this deal">
              <span className="text-ink-2">{s.why}</span>
              <span className={`mt-1 flex items-center gap-1 text-xs ${s.source === "brief" ? "text-fast" : "text-ink-3"}`}>
                <Icon name={s.source === "brief" ? "target" : "file"} size={11} />
                {s.source === "brief" ? "Written for this deal in the brief" : "Generic playbook question"}
              </span>
            </Row>
            <Row icon="clipboard" label="Brief predicted">
              <span className="text-ink-2">{s.briefSignals.length ? s.briefSignals.join(", ") : "Nothing for this follow-up"}</span>
            </Row>
            {s.files && (
              <Row icon="layers" label="Haiku also read">
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {s.files.filter((f) => f !== source).map((f) => (
                    <button key={f} onClick={() => onPeek(f)} className="num text-xs text-ink-3 hover:text-ink underline decoration-line underline-offset-2">{f}</button>
                  ))}
                </div>
              </Row>
            )}
          </dl>
        </Collapse>
      </section>

      <div className="mt-5 flex gap-2">
        <ActButton active={s.acted === "used"} disabled={!!s.acted} onClick={() => onAct("used")} icon="thumbsUp" label="Used it" />
        <ActButton active={s.acted === "ignored"} disabled={!!s.acted} onClick={() => onAct("ignored")} icon="x" label="Ignored" />
        {s.acted && <span className="rise self-center text-xs text-ink-3 ml-1">Logged to the learning loop</span>}
      </div>
    </article>
  );
}

function Row({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="flex items-center gap-1.5 text-ink-3">
        <Icon name={icon} size={13} /> {label}
      </dt>
      <dd className="min-w-0 flex flex-col items-start">{children}</dd>
    </>
  );
}

function ActButton({ active, disabled, onClick, icon, label }: { active: boolean; disabled: boolean; onClick: () => void; icon: IconName; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`press flex items-center gap-1.5 px-4 min-h-10 rounded-xl text-sm border ${active ? "bg-ink text-paper border-ink" : "border-line hover:bg-paper"} disabled:cursor-default ${disabled && !active ? "opacity-50" : ""}`}
    >
      <Icon name={active ? "check" : icon} size={15} />
      {label}
    </button>
  );
}

// Compact row for earlier suggestions.
export function SuggestionRow({ s }: { s: CardData }) {
  const swapped = s.refined?.swapped;
  const q = swapped ? s.refined!.question : s.question;
  return (
    <div className="rise panel lift px-4 py-3 flex items-start gap-3">
      <span className="mt-0.5 grid place-items-center w-7 h-7 rounded-full bg-fast-soft text-fast">
        <Icon name={CATEGORY_ICON[s.categoryId] ?? "message"} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink line-clamp-2">{q}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <span>{CATEGORY_BY_ID[s.categoryId]?.label} · follow-up {s.rung + 1}</span>
          {s.pending && <span className="flex items-center gap-1"><Icon name="loader" size={11} className="spin" /> refining</span>}
          {swapped && <span className="flex items-center gap-1 text-slow"><Icon name="refresh" size={11} /> refined</span>}
          {s.refined && !swapped && s.refined.question && <span className="flex items-center gap-1 text-slow"><Icon name="sparkles" size={11} /> late option</span>}
          {s.refined && !s.refined.question && <span className="flex items-center gap-1"><Icon name="check" size={11} /> kept</span>}
          {s.acted && <span className="flex items-center gap-1"><Icon name={s.acted === "used" ? "thumbsUp" : "x"} size={11} /> {s.acted}</span>}
        </div>
      </div>
    </div>
  );
}
