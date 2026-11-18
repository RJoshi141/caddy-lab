// One place for models, prices and knobs. Prices checked against
// platform.claude.com/docs/en/about-claude/pricing on 2026-11-17.
// All prices are USD per million tokens.

export const MODELS = {
  // Pre-call brief: runs once per deal, so we can afford the bigger model.
  brief: "claude-sonnet-5-5",
  // Slow-path refinement + categorization fallback: high volume, latency sensitive.
  refine: "claude-haiku-5-5",
  // What the "naive" baseline uses on every line.
  naive: "claude-sonnet-5-5",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS] | "claude-opus-5-5";

type Price = {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheRead: number;
};

// Haiku 5.5 is tiered by prompt length. Our prompts stay well under 100k,
// so we use the lower tier and say so in the README.
export const PRICING: Record<ModelId, Price> = {
  "claude-sonnet-5-5": { input: 2.0, output: 10.0, cacheWrite5m: 2.5, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite5m: 0.125, cacheRead: 0.01 },
  // Only used as a naive-baseline option ("a powerful model on every line").
  "claude-opus-5-5": { input: 4.0, output: 20.0, cacheWrite5m: 5.0, cacheRead: 0.2 },
};

export const NAIVE_OPTIONS = ["claude-sonnet-5-5", "claude-opus-5-5"] as const;

// Live mode only turns on when a key exists AND the server flag is set.
// The deployed link defaults to mock so nobody can burn the key.
export const LIVE_ENABLED =
  process.env.CADDY_LIVE === "1" && !!process.env.ANTHROPIC_API_KEY;

export const FASTPATH = {
  // Below this confidence the panel stays quiet. Most lines are not pushback.
  minConfidence: 0.42,
  // A refinement only replaces the fast suggestion if it lands this fast and
  // the recruiter has not touched the card. Otherwise it shows as a chip.
  swapWindowMs: 3000,
  // How many lines of context the slow path sees.
  contextLines: 4,
  // How many playbook snippets the slow path gets.
  topK: 4,
};

// Assumptions behind the per-hour numbers. Editable on /cost.
export const CALL_DEFAULTS = {
  utterancesPerHour: 240, // ~4 turns a minute across both speakers
  pushbackShare: 0.25, // share of lines that trigger a refinement
  naiveOutputTokens: 120,
  refineOutputTokens: 90,
  callMinutes: 30,
};

// The corpus, as described on the first call. Used to price the one-time
// offline pass that turns it into situation -> question -> outcome cards.
export const CORPUS = {
  deals: 60000,
  tokensPerDeal: 3000, // notes, emails, call summaries, outcome
  outPerDeal: 300, // extracted moments: pushback, question asked, what happened
  docs: 3000, // "several thousand" playbook docs
  tokensPerDoc: 2000,
  outPerDoc: 800, // situations + question ladders per doc
  batchDiscount: 0.5, // Batch API is half price, fine for an overnight job
};

// Where every number on the Cost tab comes from. Shown on the page so the
// math can be checked, not taken on trust.
export const PRICING_URL = "https://platform.claude.com/docs/en/about-claude/pricing";
export const SOURCES = [
  { id: 1, title: "Model prices", detail: "Sonnet 5.5: $2 in, $10 out. Haiku 5.5: $0.10 in, $0.50 out, per million tokens (prompts under 100k).", from: "Anthropic pricing page, checked Nov 17, 2026", url: PRICING_URL },
  { id: 2, title: "Prompt caching", detail: "Cache reads: $0.10 on Sonnet (5% of input), $0.01 on Haiku. Five-minute cache writes cost 1.25x input.", from: "Anthropic pricing page", url: PRICING_URL },
  { id: 3, title: "Batch API", detail: "Half price for overnight jobs: Haiku $0.05 in, $0.25 out. Sonnet $1 in, $5 out.", from: "Anthropic pricing page", url: PRICING_URL },
  { id: 4, title: "Token sizes", detail: "Mock mode estimates 4 characters per token. Live mode counts every prompt with Anthropic's free token counting endpoint.", from: "Anthropic token counting docs", url: "https://platform.claude.com/docs/en/build-with-claude/token-counting" },
  { id: 5, title: "Corpus size", detail: "About 60,000 deals and several thousand playbook docs (3,000 assumed here).", from: "My first call with Seb" },
  { id: 6, title: "Call shape", detail: "240 lines an hour, 30 minute calls, 1 in 4 lines is pushback. Each Haiku call reads an 8k cached prefix.", from: "My estimates, editable under Details" },
] as const;
