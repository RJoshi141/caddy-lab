// Canned slow-path answers for mock mode, keyed "dealId:categoryId:rung".
// Anything not listed comes back as "keep", which is the common case live too.
import type { Refinement } from "@/lib/schemas";

export const MOCK_REFINEMENTS: Record<string, Refinement> = {
  "nadia-ledgerline:comp_gap:1": {
    verdict: "replace",
    question: "Is 190 what your friend at Stripe makes in base, or in total? Bigger companies often pad the number with RSUs.",
    reason: "She just named the peer anchor explicitly",
    playbookRef: "base-vs-total-comp.md",
  },
  "nadia-ledgerline:comp_gap:2": {
    verdict: "replace",
    question: "You haven't seen their number yet. If it came in at 185 too, which job would you actually pick?",
    reason: "She's guessing the other offer is higher",
    playbookRef: "offer-comparison.md",
  },
  "nadia-ledgerline:comp_gap:3": {
    verdict: "replace",
    question: "If equity counts as zero for you, would 185 base plus a six month comp review get you there?",
    reason: "She dismissed equity, so drop it from the pitch",
    playbookRef: "equity-skepticism.md",
  },
  "nadia-ledgerline:comp_gap:4": {
    verdict: "replace",
    question: "Say Ledgerline tops out at 185 and the bank counters at 190. What would make you walk anyway?",
    reason: "Generic rung, she just tied comp to the counter",
    playbookRef: "counteroffer-risk.md",
  },
  "nadia-ledgerline:counteroffer:0": {
    verdict: "keep",
    question: "",
    reason: "Brief question already ties to her reason for leaving",
  },
  "marcus-cobalt:motivation_mismatch:3": {
    verdict: "replace",
    question: "Sounds like the product is the one hook. If you led the booking app's roadmap with no reports, is that interesting or still a no?",
    reason: "He just said the product is interesting",
    playbookRef: "career-direction.md",
  },
  "marcus-cobalt:title_level:0": {
    verdict: "replace",
    question: "Is it the title, or is it that no reports for a year means another year before you can lead people?",
    reason: "He paired title with the path to managing",
    playbookRef: "title-concerns.md",
  },
};
