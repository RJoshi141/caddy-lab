"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/app/session";

export function Header() {
  const path = usePathname();
  const { mode, liveAvailable, setPasscode, goMock } = useSession();
  const [asking, setAsking] = useState(false);
  const [pass, setPass] = useState("");
  const [bad, setBad] = useState(false);

  const tab = (href: string, label: string) => (
    <Link href={href} className={`px-3 py-1.5 rounded-md text-sm ${path === href ? "bg-ink text-paper" : "text-ink-2 hover:bg-line"}`}>
      {label}
    </Link>
  );

  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fast" />
          <span className="font-semibold tracking-tight">Caddy Lab</span>
        </div>
        <nav className="flex gap-1">
          {tab("/", "Call")}
          {tab("/cost", "Cost")}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {mode === "live" ? (
            <button onClick={goMock} className="px-2.5 py-1 rounded-full bg-slow-soft text-slow">Live API · switch to mock</button>
          ) : asking ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await setPasscode(pass);
                setBad(!ok);
                if (ok) setAsking(false);
              }}
              className="flex gap-1"
            >
              <input autoFocus type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="passcode" className={`px-2 py-1 rounded border ${bad ? "border-risk" : "border-line"} bg-card w-28`} />
              <button className="px-2 py-1 rounded bg-ink text-paper">Go</button>
            </form>
          ) : (
            <button
              onClick={() => setAsking(true)}
              disabled={!liveAvailable}
              title={liveAvailable ? "Use the real API" : "Live mode is off on this deployment"}
              className="px-2.5 py-1 rounded-full bg-fast-soft text-fast disabled:cursor-not-allowed"
            >
              Mock mode{liveAvailable ? " · go live" : ""}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
