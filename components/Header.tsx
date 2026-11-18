"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/app/session";
import { Icon, type IconName } from "./Icon";

export function Header() {
  const path = usePathname();
  const { mode, liveAvailable, setPasscode, goMock } = useSession();
  const [asking, setAsking] = useState(false);
  const [pass, setPass] = useState("");
  const [bad, setBad] = useState(false);

  const tab = (href: string, label: string, icon: IconName) => {
    const on = path === href;
    return (
      <Link href={href} aria-current={on ? "page" : undefined} className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${on ? "bg-ink text-paper" : "text-ink-2 hover:bg-line/70"}`}>
        <Icon name={icon} size={14} />
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b border-line bg-paper/85 backdrop-blur sticky top-0 z-10">
      <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/" className="display font-semibold text-[17px]">Caddy Lab</Link>
        <nav className="flex gap-1" aria-label="Main">
          {tab("/", "Call", "phone")}
          {tab("/cost", "Cost", "dollar")}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {mode === "live" ? (
            <button onClick={goMock} className="press text-slow hover:underline underline-offset-4">Live API · switch to mock</button>
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
              <label className="sr-only" htmlFor="pass">Passcode</label>
              <input id="pass" autoFocus type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="passcode" className={`px-2 py-1 rounded-lg border ${bad ? "border-risk" : "border-line"} bg-card w-28`} />
              <button className="press px-3 py-1 rounded-lg bg-ink text-paper">Go</button>
            </form>
          ) : (
            <button
              onClick={() => setAsking(true)}
              disabled={!liveAvailable}
              title={liveAvailable ? "Use the real API" : "Live mode is off on this deployment"}
              className="text-ink-3 enabled:hover:text-ink disabled:cursor-default"
            >
              Mock mode{liveAvailable ? " · go live" : ""}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
