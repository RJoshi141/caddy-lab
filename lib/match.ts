// Did the recruiter just ask the suggested question? Cheap word overlap,
// no model. Lets the caddy log "asked" on its own, so nobody clicks anything.
const STOP = new Set("the and that this with what your you for are was would could have from they them their about just really".split(" "));
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []);

export function askedSimilarity(said: string, suggested: string) {
  const a = words(said), b = words(suggested);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

export const ASKED_THRESHOLD = 0.5;
