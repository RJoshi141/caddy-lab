"use client";
// Used/ignored by category. Questions recruiters keep using get flagged to
// pre-build into future briefs, so the live path gets better for free.
import { CATEGORY_BY_ID } from "@/data/categories";
import { clearLog, type LogEntry } from "@/lib/log";
import { CATEGORY_ICON, Icon } from "./Icon";

export function LearningLoop({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const byCat = new Map<string, { used: number; ignored: number }>();
  for (const e of log) {
    const x = byCat.get(e.categoryId) ?? { used: 0, ignored: 0 };
    x[e.action]++;
    byCat.set(e.categoryId, x);
  }
  // Promote: used at least twice.
  const counts = new Map<string, number>();
  log.filter((e) => e.action === "used").forEach((e) => counts.set(e.question, (counts.get(e.question) ?? 0) + 1));
  const promoted = [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <section className="panel p-5 text-sm" aria-labelledby="loop-title">
      <div className="flex items-center gap-2 mb-4">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-fast-soft text-fast"><Icon name="trend" size={14} /></span>
        <div>
          <h2 id="loop-title" className="font-semibold leading-tight">Learning loop</h2>
          <p className="text-xs text-ink-3">{log.length} {log.length === 1 ? "response" : "responses"} logged</p>
        </div>
        {log.length > 0 && (
          <button onClick={() => { clearLog(); onClear(); }} className="press ml-auto flex items-center gap-1 text-xs text-ink-3 px-2 py-1 rounded-lg hover:bg-paper hover:text-ink">
            <Icon name="trash" size={12} /> clear
          </button>
        )}
      </div>

      {log.length === 0 && (
        <p className="text-ink-3 leading-relaxed">Tap “Used it” or “Ignored” on a question. The ones recruiters keep using get flagged to pre-build for the next call.</p>
      )}

      <ul className="space-y-2.5">
        {[...byCat].map(([cat, x]) => {
          const total = x.used + x.ignored;
          return (
            <li key={cat} className="rise">
              <div className="flex items-center gap-2 mb-1">
                <Icon name={CATEGORY_ICON[cat] ?? "message"} size={13} className="text-fast" />
                <span className="flex-1">{CATEGORY_BY_ID[cat]?.label ?? cat}</span>
                <span className="num text-xs text-ink-3">{x.used} used · {x.ignored} ignored</span>
              </div>
              <div className="h-1.5 rounded-full bg-line overflow-hidden">
                <div className="h-full bg-fast rounded-full transition-[width] duration-500" style={{ width: `${(x.used / total) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      {promoted.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
            <Icon name="sparkles" size={12} /> Ready to pre-build
          </h3>
          {promoted.map(([q, n]) => (
            <p key={q} className="text-ink-2 mb-1.5">“{q}” <span className="num text-xs text-ink-3">×{n}</span></p>
          ))}
        </div>
      )}
    </section>
  );
}
