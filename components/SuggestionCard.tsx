"use client";
import { CATEGORY_BY_ID } from "@/data/categories";
import type { Suggestion } from "@/lib/fastpath";

type Props = {
  s: Suggestion & { files?: string[]; pending?: boolean; acted?: "used" | "ignored" };
  primary?: boolean;
  onAct?: (a: "used" | "ignored") => void;
  onPeek: (file: string) => void;
};

const ms = (x: number) => (x < 0.01 ? "<0.01 ms" : x < 1 ? `${x.toFixed(2)} ms` : `${Math.round(x)} ms`);

export function SuggestionCard({ s, primary, onAct, onPeek }: Props) {
  const swapped = s.refined?.swapped;
  const question = swapped ? s.refined!.question : s.question;
  const cat = CATEGORY_BY_ID[s.categoryId];

  return (
    <div className={`rise rounded-xl border bg-card ${primary ? "border-ink/15 shadow-sm p-5" : "border-line p-4 opacity-80"}`}>
      <div className="flex items-center gap-2 text-xs mb-3">
        <span className="px-2 py-0.5 rounded-full bg-fast-soft text-fast font-medium">{cat?.label}</span>
        <span className="text-ink-3">rung {s.rung + 1}</span>
        <span className={`px-1.5 py-0.5 rounded ${s.source === "brief" ? "text-fast" : "text-ink-3 bg-paper"}`}>
          {s.source === "brief" ? "deal specific" : "generic playbook"}
        </span>
        <span className="ml-auto num text-ink-3">
          fast {ms(s.latencyMs)} · {s.method}
        </span>
      </div>

      <p key={question} className={`${primary ? "text-xl leading-snug" : "text-base"} font-medium tracking-tight ${swapped ? "flash rounded" : ""}`}>
        {question}
      </p>

      {/* Refinement state. Swapped = it replaced the text. Otherwise it's a chip. */}
      <div className="mt-3 text-sm min-h-6">
        {s.pending && <span className="text-ink-3">Refining in background…</span>}
        {s.refined && swapped && (
          <span className="text-slow">
            ↻ Refined by Haiku in <span className="num">{ms(s.refined.latencyMs)}</span>: {s.refined.reason}
          </span>
        )}
        {s.refined && !swapped && s.refined.question && (
          <div className="rounded-lg bg-slow-soft text-slow px-3 py-2">
            <div className="text-xs mb-0.5">Arrived late, so not swapped ({s.refined.reason})</div>
            <div className="text-ink">{s.refined.question}</div>
          </div>
        )}
        {s.refined && !s.refined.question && (
          <span className="text-ink-3">
            ✓ Haiku kept it (<span className="num">{ms(s.refined.latencyMs)}</span>): {s.refined.reason}
          </span>
        )}
      </div>

      {primary && (
        <>
          {/* Why this question */}
          <div className="mt-4 pt-4 border-t border-line grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            <span className="text-ink-3">Heard</span>
            <div className="flex flex-wrap gap-1">
              {s.matchedSignals.map((x) => (
                <span key={x} className="px-2 py-0.5 rounded bg-paper border border-line">{x}</span>
              ))}
            </div>
            <span className="text-ink-3">Brief predicted</span>
            <div className="text-ink-2">{s.briefSignals.length ? s.briefSignals.join(", ") : "nothing for this rung"}</div>
            <span className="text-ink-3">Why for this deal</span>
            <div className="text-ink-2">{s.why}</div>
            <span className="text-ink-3">Source</span>
            <div className="flex flex-wrap gap-1">
              {[swapped && s.refined?.playbookRef ? s.refined.playbookRef : s.playbookRef].map((f) => (
                <button key={f} onClick={() => onPeek(f!)} className="underline decoration-line underline-offset-2 hover:decoration-ink num text-xs">{f}</button>
              ))}
              {s.files && (
                <span className="text-ink-3 text-xs">
                  · slow path read{" "}
                  {s.files.map((f, i) => (
                    <button key={f} onClick={() => onPeek(f)} className="num hover:text-ink">{f}{i < s.files!.length - 1 ? ", " : ""}</button>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {(["used", "ignored"] as const).map((a) => (
              <button
                key={a}
                onClick={() => onAct?.(a)}
                disabled={!!s.acted}
                className={`px-3 py-1.5 rounded-md text-sm border ${s.acted === a ? "bg-ink text-paper border-ink" : "border-line hover:bg-paper"} disabled:cursor-default`}
              >
                {a === "used" ? "Used it" : "Ignored"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
