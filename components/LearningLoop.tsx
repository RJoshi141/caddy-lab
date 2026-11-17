"use client";
// Used/ignored by category. The point: questions recruiters keep using get
// promoted into the pre-built ladders next time, so the live path gets better for free.
import { CATEGORY_BY_ID } from "@/data/categories";
import { clearLog, type LogEntry } from "@/lib/log";

export function LearningLoop({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const byCat = new Map<string, { used: number; ignored: number }>();
  for (const e of log) {
    const x = byCat.get(e.categoryId) ?? { used: 0, ignored: 0 };
    x[e.action]++;
    byCat.set(e.categoryId, x);
  }
  // Promote: used at least twice and used more than ignored.
  const counts = new Map<string, number>();
  log.filter((e) => e.action === "used").forEach((e) => counts.set(e.question, (counts.get(e.question) ?? 0) + 1));
  const promoted = [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <section className="rounded-xl border border-line bg-card p-4 text-sm">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-semibold">Learning loop</h2>
        <span className="text-xs text-ink-3">{log.length} logged</span>
        {log.length > 0 && (
          <button onClick={() => { clearLog(); onClear(); }} className="ml-auto text-xs underline text-ink-3">clear</button>
        )}
      </div>
      {log.length === 0 && <p className="text-ink-3">Mark suggestions as used or ignored. Questions that keep getting used get pre-built into future briefs.</p>}
      <div className="space-y-1.5">
        {[...byCat].map(([cat, x]) => {
          const total = x.used + x.ignored;
          return (
            <div key={cat} className="grid grid-cols-[1fr_120px_48px] items-center gap-2">
              <span>{CATEGORY_BY_ID[cat]?.label ?? cat}</span>
              <div className="h-1.5 rounded bg-line overflow-hidden">
                <div className="h-full bg-fast" style={{ width: `${(x.used / total) * 100}%` }} />
              </div>
              <span className="num text-xs text-ink-3 text-right">{x.used}/{total}</span>
            </div>
          );
        })}
      </div>
      {promoted.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-xs text-ink-3 mb-1">Ready to pre-build</div>
          {promoted.map(([q, n]) => (
            <p key={q} className="text-ink-2 mb-1">“{q}” <span className="num text-xs text-ink-3">×{n}</span></p>
          ))}
        </div>
      )}
    </section>
  );
}
