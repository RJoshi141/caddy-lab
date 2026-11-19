"use client";
// First-visit tour. Spotlights one part of the screen at a time with a short
// note. Shows once (remembered in localStorage), can be skipped at any step,
// and can be replayed from the header.
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";

type Step = { target?: string; title: string; body: string };

const STEPS: Step[] = [
  { title: "Welcome to Caddy Lab", body: "A prototype that suggests the next question during a live recruiting call. Want a quick tour? It takes about 30 seconds." },
  { target: "controls", title: "Run the call", body: "Press Play, or Step through it one line at a time. End call jumps straight to the recap." },
  { target: "transcript", title: "Live captions", body: "The call shows up here as it happens, word by word." },
  { target: "question", title: "Ask next", body: "When the candidate pushes back, the question to ask shows up here, with why it was picked and how it went in similar deals. Just ask it. The caddy notices." },
  { target: "brief", title: "The pre-call brief", body: "Everything worked out before the call: the risks, what the candidate wants, and the follow-ups ready to go." },
  { target: "cost-tab", title: "What it costs", body: "The cost per call hour, and where every number comes from." },
];

const KEY = "caddy-lab:tour:v1";
const SPLASH_MS = 2300; // let the loader finish first
export const startTour = () => window.dispatchEvent(new Event("caddy:tour"));

type Rect = { top: number; left: number; width: number; height: number };

export function Tour() {
  const path = usePathname();
  const router = useRouter();
  const [i, setI] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(800);

  // Auto-start once, on the Call tab, after the loader.
  useEffect(() => {
    let seen = "1";
    try {
      seen = localStorage.getItem(KEY) ?? "";
    } catch {}
    if (seen || path !== "/") return;
    const t = setTimeout(() => setI(0), SPLASH_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replay from the header: go to the Call tab, then start.
  useEffect(() => {
    const onStart = () => {
      if (path !== "/") router.push("/");
      setTimeout(() => setI(0), path !== "/" ? 350 : 0);
    };
    window.addEventListener("caddy:tour", onStart);
    return () => window.removeEventListener("caddy:tour", onStart);
  }, [path, router]);

  const close = useCallback(() => {
    setI(null);
    try {
      localStorage.setItem(KEY, "done");
    } catch {}
  }, []);

  // Measure the spotlighted element, and keep measuring on scroll and resize.
  const step = i == null ? null : STEPS[i];
  useLayoutEffect(() => {
    if (i == null) {
      delete document.body.dataset.tour;
      return;
    }
    document.body.dataset.tour = "open";
    const el = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect(r.width ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    };
    measure();
    const t = setTimeout(measure, 350); // after smooth scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [i, step]);

  // Keyboard: arrows move, Escape skips.
  useEffect(() => {
    if (i == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === "Enter") setI((x) => (x == null ? x : x < STEPS.length - 1 ? x + 1 : (close(), null)));
      if (e.key === "ArrowLeft") setI((x) => (x ? x - 1 : x));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, close]);

  if (i == null || !step) return null;

  const last = i === STEPS.length - 1;
  const pad = 8;
  const W = 340;
  // Card goes below the target if it fits, otherwise above; centred when there's no target.
  const below = rect ? rect.top + rect.height + pad + 220 < vh : true;
  const cardStyle: React.CSSProperties = rect
    ? {
        width: W,
        left: Math.min(Math.max(16, rect.left + rect.width / 2 - W / 2), vw - W - 16),
        top: below ? rect.top + rect.height + pad + 12 : undefined,
        bottom: below ? undefined : vh - rect.top + pad + 12,
      }
    : { width: W + 40, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Click-blocker; the dimming comes from the spotlight's shadow */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div
          aria-hidden="true"
          className="absolute rounded-2xl transition-all duration-300 ease-out ring-2 ring-fast/60"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgb(23 25 29 / 0.45)" }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-ink/45 transition-opacity duration-300" />
      )}

      <div key={i} className="enter absolute panel shadow-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="grid place-items-center w-6 h-6 rounded-full bg-fast-soft text-fast"><Icon name="sparkles" size={12} /></span>
          <h2 className="font-semibold">{step.title}</h2>
          {i > 0 && <span className="ml-auto num text-xs text-ink-3">{i} of {STEPS.length - 1}</span>}
        </div>
        <p className="text-sm text-ink-2 leading-relaxed">{step.body}</p>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={close} className="press text-sm text-ink-3 hover:text-ink px-2 py-1.5 rounded-lg">
            {i === 0 ? "Skip" : "Skip tour"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            {i > 1 && (
              <button onClick={() => setI(i - 1)} className="press text-sm px-3 min-h-9 rounded-lg border border-line hover:bg-paper">Back</button>
            )}
            <button autoFocus onClick={() => (last ? close() : setI(i + 1))} className="press text-sm px-4 min-h-9 rounded-lg bg-ink text-paper">
              {i === 0 ? "Start tour" : last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
