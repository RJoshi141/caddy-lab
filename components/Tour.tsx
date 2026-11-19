"use client";
// First-visit tour. Spotlights one part of the screen at a time with a short
// note. Shows once (remembered in localStorage), can be skipped at any step,
// and can be replayed from the header.
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";

type CallState = "idle" | "live" | "ended";
type Step = { target?: string; title: string; body: string };

// Each step describes what's actually on screen: before, during or after a call.
function stepsFor(call: CallState, hasQuestion: boolean): Step[] {
  return [
    {
      title: "Welcome to Caddy Lab",
      body:
        call === "idle"
          ? "A prototype that suggests the next question during a live recruiting call. Want a quick tour? It takes about 30 seconds."
          : "A prototype that suggests the next question during a live recruiting call. Here's a quick look at what's on screen right now.",
    },
    {
      target: "controls",
      title: call === "ended" ? "Run it again" : "Run the call",
      body:
        call === "idle"
          ? "Press Play, or Step through it one line at a time. End call jumps straight to the recap."
          : call === "live"
            ? "You're mid-call. Keep going with Step or Play, or press End call to jump to the recap."
            : "The call is over. Replay starts it again from the top.",
    },
    {
      target: "transcript",
      title: "Live captions",
      body: call === "idle" ? "The call shows up here as it happens, word by word." : "The call so far, word by word. Older lines fade so the latest one stands out.",
    },
    call === "ended"
      ? { target: "question", title: "After the call", body: "The recap: what came up, and a follow-up to the hiring manager that's already drafted. One tap to send." }
      : hasQuestion
        ? { target: "question", title: "Ask next", body: "This is the question to ask right now, with why it was picked and how it went in similar deals. Just ask it. The caddy notices." }
        : { target: "question", title: "Ask next", body: "When the candidate pushes back, the question to ask shows up here, with why it was picked and how it went in similar deals. Until then, it stays quiet." },
    { target: "brief", title: "The pre-call brief", body: "Everything worked out before the call: the risks, what the candidate wants, and the follow-ups ready to go." },
    { target: "cost-tab", title: "What it costs", body: "The cost per call hour, and where every number comes from." },
  ];
}

const KEY = "caddy-lab:tour:v1";
const SPLASH_MS = 2300; // let the loader finish first
export const startTour = () => window.dispatchEvent(new Event("caddy:tour"));

type Rect = { top: number; left: number; width: number; height: number };

const W = 340; // card width
const PAD = 8; // spotlight padding around the target
const GAP = 14; // space between spotlight and card
const EASE = "cubic-bezier(.22,.8,.24,1)";
const MOVE_MS = 480;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export function Tour() {
  const path = usePathname();
  const router = useRouter();
  const [i, setI] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1); // which way the content slides
  const [phase, setPhase] = useState<"in" | "shown" | "out">("in");
  const [snap, setSnap] = useState<{ call: CallState; q: boolean }>({ call: "idle", q: false });
  const [rect, setRect] = useState<Rect | null>(null);
  const [view, setView] = useState({ w: 1280, h: 800 });
  const [cardH, setCardH] = useState(200);

  const STEPS = stepsFor(snap.call, snap.q);
  const step = i == null ? null : STEPS[i];
  const last = i === STEPS.length - 1;

  // Open (or reopen) the tour, reading where the call is right now.
  const open = useCallback(() => {
    setSnap({ call: (document.body.dataset.call as CallState) || "idle", q: document.body.dataset.question === "yes" });
    setDir(1);
    setPhase("in");
    setI(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("shown")));
  }, []);

  // Fade everything out, then unmount and remember it was seen.
  const close = useCallback(() => {
    setPhase("out");
    setTimeout(() => setI(null), 260);
    try {
      localStorage.setItem(KEY, "done");
    } catch {}
  }, []);

  const go = useCallback(
    (to: number) => {
      if (to < 0) return;
      if (to >= STEPS.length) return close();
      setDir(to > (i ?? 0) ? 1 : -1);
      setI(to);
    },
    [i, STEPS.length, close]
  );

  // Auto-start once, on the Call tab, after the loader.
  useEffect(() => {
    let seen = "1";
    try {
      seen = localStorage.getItem(KEY) ?? "";
    } catch {}
    if (seen || path !== "/") return;
    const t = setTimeout(open, SPLASH_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replay from the header: go to the Call tab, then start.
  useEffect(() => {
    const onStart = () => {
      if (path !== "/") router.push("/");
      setTimeout(open, path !== "/" ? 350 : 0);
    };
    window.addEventListener("caddy:tour", onStart);
    return () => window.removeEventListener("caddy:tour", onStart);
  }, [path, router, open]);

  // Find the target, bring it into view, and keep measuring while things move.
  useLayoutEffect(() => {
    if (i == null) {
      delete document.body.dataset.tour;
      return;
    }
    document.body.dataset.tour = "open";
    const el = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const measure = () => {
      setView({ w: window.innerWidth, h: window.innerHeight });
      const r = el?.getBoundingClientRect();
      setRect(r && r.width ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    };
    measure();
    const t = setTimeout(measure, 380); // after the smooth scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [i, step?.target]);

  // Keyboard: arrows move, Enter advances, Escape skips.
  useEffect(() => {
    if (i == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft" && i > 1) go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, close]);

  if (i == null || !step) return null;

  // Spotlight: the target with padding, or a zero-size point in the middle for
  // the welcome card, so it grows out to the first target instead of jumping.
  const spot = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: view.h / 2, left: view.w / 2, width: 0, height: 0 };

  // Card: below, above, beside, or inside the target. Never off-screen.
  let pos = { left: (view.w - W) / 2, top: (view.h - cardH) / 2 };
  if (rect) {
    const s = spot, bottom = s.top + s.height, right = s.left + s.width;
    const centred = clamp(s.left + s.width / 2 - W / 2, 16, view.w - W - 16);
    const sideTop = clamp(s.top, 16, view.h - cardH - 16);
    if (view.h - bottom - GAP >= cardH + 16) pos = { left: centred, top: bottom + GAP };
    else if (s.top - GAP >= cardH + 16) pos = { left: centred, top: s.top - GAP - cardH };
    else if (s.left - GAP >= W + 16) pos = { left: s.left - GAP - W, top: sideTop };
    else if (view.w - right - GAP >= W + 16) pos = { left: right + GAP, top: sideTop };
    else pos = { left: clamp(right - W - 24, 16, view.w - W - 16), top: clamp(Math.min(bottom, view.h) - cardH - 24, 16, view.h - cardH - 16) };
  }

  const shown = phase === "shown";
  const move = `${MOVE_MS}ms ${EASE}`;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Click-blocker; the dimming comes from the spotlight's shadow */}
      <div className="absolute inset-0" />

      {/* Spotlight: glides and resizes between targets */}
      <div
        aria-hidden="true"
        className="absolute rounded-2xl"
        style={{
          ...spot,
          boxShadow: `0 0 0 9999px rgb(23 25 29 / ${shown ? 0.48 : 0})${rect ? ", 0 0 0 2px rgb(47 93 80 / 0.55), 0 0 0 8px rgb(47 93 80 / 0.12)" : ""}`,
          transition: `top ${move}, left ${move}, width ${move}, height ${move}, box-shadow 320ms ease`,
        }}
      />

      {/* Card: one card that travels; only its content changes */}
      <div
        ref={(el) => {
          if (el && Math.abs(el.offsetHeight - cardH) > 2) setCardH(el.offsetHeight);
        }}
        className="absolute panel shadow-2xl overflow-hidden"
        style={{
          width: W,
          left: pos.left,
          top: pos.top,
          opacity: shown ? 1 : 0,
          transform: shown ? "none" : "translateY(8px) scale(0.98)",
          transition: `left ${move}, top ${move}, opacity 260ms ease, transform 320ms ${EASE}`,
        }}
      >
        <div key={i} className={`p-5 ${dir > 0 ? "tour-in-next" : "tour-in-back"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="grid place-items-center w-6 h-6 rounded-full bg-fast-soft text-fast"><Icon name="compass" size={13} /></span>
            <h2 className="font-semibold">{step.title}</h2>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">{step.body}</p>
        </div>

        <div className="px-5 pb-4 flex items-center gap-2">
          {/* Progress: the current step stretches into a pill */}
          {i > 0 && (
            <div className="flex items-center gap-1 mr-1" aria-label={`Step ${i} of ${STEPS.length - 1}`}>
              {STEPS.slice(1).map((_, k) => (
                <span key={k} className="h-1.5 rounded-full transition-all duration-500" style={{ width: k + 1 === i ? 18 : 6, background: k + 1 <= i ? "var(--color-fast)" : "var(--color-line)" }} />
              ))}
            </div>
          )}
          <button onClick={close} className="press text-sm text-ink-3 hover:text-ink px-2 py-1.5 rounded-lg">
            {i === 0 ? "Skip" : "Skip tour"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            {i > 1 && (
              <button onClick={() => go(i - 1)} className="press text-sm px-3 min-h-9 rounded-lg border border-line hover:bg-paper">Back</button>
            )}
            <button autoFocus onClick={() => go(i + 1)} className="press text-sm px-4 min-h-9 rounded-lg bg-ink text-paper">
              {i === 0 ? "Start tour" : last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
