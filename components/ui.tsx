"use client";
// Small shared pieces for progressive disclosure: show the headline, tuck the detail.
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

// Smooth open/close without measuring heights: animate grid rows 0fr -> 1fr.
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!open}>
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

export function Disclosure({ title, icon, meta, defaultOpen = false, children, className = "" }: { title: string; icon?: IconName; meta?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="press group w-full flex items-center gap-1.5 py-1 text-left text-xs font-semibold uppercase tracking-wider text-ink-2 hover:text-ink">
        {icon && <Icon name={icon} size={12} />}
        {title}
        {meta && <span className="normal-case tracking-normal font-normal text-ink-3">{meta}</span>}
        <Icon name="chevron" size={14} className={`ml-auto text-ink-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <Collapse open={open}>{children}</Collapse>
    </div>
  );
}

// Segmented tabs with a sliding pill.
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const i = Math.max(0, tabs.findIndex((t) => t.id === value));
  return (
    <div role="tablist" className="relative grid rounded-lg bg-paper p-0.5 text-xs" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      <span aria-hidden="true" className="absolute top-0.5 bottom-0.5 rounded-md bg-card shadow-sm transition-transform duration-300 ease-out" style={{ width: `calc((100% - 4px) / ${tabs.length})`, left: 2, transform: `translateX(${i * 100}%)` }} />
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)} className={`relative z-[1] py-1.5 rounded-md transition-colors ${t.id === value ? "text-ink font-medium" : "text-ink-3 hover:text-ink-2"}`}>
          {t.label}
          {t.count != null && <span className="ml-1 num text-ink-3">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// iOS-style switch, still a real checkbox for accessibility.
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="press inline-flex items-center gap-2.5 cursor-pointer select-none text-sm">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`relative w-9 h-5 rounded-full transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-fast ${checked ? "bg-fast" : "bg-line"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </label>
  );
}

// Numbers glide to their new value instead of jumping.
export function useTween(value: number, ms = 450) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * eased;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}
