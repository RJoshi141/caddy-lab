"use client";
// Used / ignored log for the learning loop. localStorage because Vercel's
// filesystem doesn't persist and we don't need a database for a demo.
export type LogEntry = { at: number; dealId: string; categoryId: string; rung: number; source: string; action: "used" | "ignored"; question: string; refined: boolean };

const KEY = "caddy-lab:log:v1";

export function readLog(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function appendLog(e: LogEntry) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...readLog(), e].slice(-500)));
  } catch {
    /* private mode etc. The demo carries on. */
  }
}

export function clearLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
