"use client";
// Loader shown on a fresh page load. It's in the server HTML, so there's no
// flash of the app first; it steps through what the system is "preparing",
// then fades out.
import { useEffect, useState } from "react";

const STEPS = ["Loading the playbook", "Reading the deal", "Preparing follow-up questions"];
const STEP_MS = 520;

export function Splash() {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timers = [
      ...STEPS.slice(1).map((_, i) => setTimeout(() => setStep(i + 1), STEP_MS * (i + 1))),
      setTimeout(() => setLeaving(true), STEP_MS * STEPS.length + 150),
      setTimeout(() => setGone(true), STEP_MS * STEPS.length + 650),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 grid place-items-center bg-paper transition-opacity duration-500 ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="w-72 text-center">
        {/* Bars moving like a voice level, the caddy listening */}
        <div className="flex items-end justify-center gap-1.5 h-8 mb-6" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="eq w-1.5 rounded-full bg-fast" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <div className="display text-2xl font-semibold">Caddy Lab</div>
        <p className="mt-1 text-sm text-ink-3">Live call coaching, prototype</p>

        <div className="mt-8 h-1 rounded-full bg-line overflow-hidden">
          <div className="h-full bg-fast rounded-full transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p key={step} className="rise mt-3 text-xs text-ink-2">{STEPS[step]}…</p>
      </div>
    </div>
  );
}
