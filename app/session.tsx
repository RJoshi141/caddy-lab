"use client";
// Session state shared by both routes: mode, passcode, and every API usage
// object we've seen, so the cost screen reflects what actually happened.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Brief, Usage } from "@/lib/schemas";

type Mode = "mock" | "live";
type Spend = { kind: "brief" | "refine"; usage: Usage; mock: boolean; ms: number };

type Ctx = {
  mode: Mode;
  liveAvailable: boolean;
  setPasscode: (p: string) => Promise<boolean>;
  goMock: () => void;
  headers: () => Record<string, string>;
  spend: Spend[];
  addSpend: (s: Spend) => void;
  briefs: Record<string, { brief: Brief; usage: Usage; mode: string }>;
  setBrief: (dealId: string, b: { brief: Brief; usage: Usage; mode: string }) => void;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("mock");
  const [pass, setPass] = useState("");
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [spend, setSpend] = useState<Spend[]>([]);
  const [briefs, setBriefs] = useState<Ctx["briefs"]>({});

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((s) => setLiveAvailable(!!s.liveAvailable)).catch(() => {});
  }, []);

  const setPasscode = useCallback(async (p: string) => {
    const s = await fetch("/api/status", { headers: { "x-caddy-pass": p } }).then((r) => r.json());
    if (s.liveAllowed) {
      setPass(p);
      setMode("live");
      setBriefs({}); // force fresh live briefs
    }
    return !!s.liveAllowed;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      mode,
      liveAvailable,
      setPasscode,
      goMock: () => {
        setMode("mock");
        setBriefs({});
      },
      headers: () => ({ "content-type": "application/json", ...(mode === "live" ? { "x-caddy-pass": pass } : {}) }),
      spend,
      addSpend: (s) => setSpend((xs) => [...xs, s]),
      briefs,
      setBrief: (id, b) => setBriefs((x) => ({ ...x, [id]: b })),
    }),
    [mode, liveAvailable, setPasscode, pass, spend, briefs]
  );
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession outside provider");
  return c;
};
