// Precomputed briefs for mock mode. These are what Sonnet produces from the
// mock deals, saved so the demo never depends on a live API call.
import type { Brief, Usage } from "@/lib/schemas";

export const MOCK_BRIEFS: Record<string, { brief: Brief; usage: Usage }> = {
  "priya-ledgerline": {
    usage: { model: "claude-sonnet-5-5", input_tokens: 2140, output_tokens: 1380 },
    brief: {
      dealId: "priya-ledgerline",
      summary:
        "Priya likes the team and the problem. The risk is a 190 anchor borrowed from a friend, a parallel final round, and a manager likely to counter. Budget tops out at 185, so the gap is small and mostly about how she frames it.",
      motivations: ["Real ownership (the payouts service is hers end to end)", "Not feeling like she took a step down vs peers", "Stability with a young kid"],
      riskSignals: [
        { signal: "Anchored to peer comp", severity: "med", evidence: "Wants ~190; client ceiling is 185, hard stop 190" },
        { signal: "Competing final round", severity: "high", evidence: "Email Mon: hears by end of next week" },
        { signal: "Counteroffer likely", severity: "high", evidence: "4 years at the bank, no equity, bonus underpaid" },
      ],
      likelyObjections: [
        { category: "comp_gap", why: "Range shared was 170 to 185, she has a higher number in mind" },
        { category: "competing_process", why: "Bigger company, she'll assume a bigger package" },
        { category: "counteroffer", why: "Bank has a habit of retention offers for senior engineers" },
      ],
      ladders: {
        comp_gap: [
          { question: "When you say 190, is that the number you need, or the number that would stop you feeling behind your friend at Stripe?", why: "Splits an ego anchor from a real cash need before anyone goes back to Dana", signals: ["number mentioned", "peer anchor"], playbookRef: "comp-gap.md" },
          { question: "Your bonus paid 6% last year, not 10. If we compare real take home, not targets, how far apart are we actually?", why: "Her current package is weaker than it looks on paper", signals: ["base vs total"], playbookRef: "base-vs-total-comp.md" },
          { question: "If Ledgerline landed at 185 base with the payouts service fully yours, what would still give you pause?", why: "Tests whether ownership closes the last 5k", signals: ["comp below expectation"], playbookRef: "comp-gap.md" },
          { question: "If I brought back 185 and an early comp review at six months, is that a yes, or is there a number below which it's a no?", why: "Gets her walk-away number inside the client's ceiling", signals: ["base vs total"], playbookRef: "comp-gap.md" },
        ],
        competing_process: [
          { question: "If both offers landed the same day at the same number, which would you pick, and what's the reason?", why: "Finds out if the other role wins on something other than money", signals: ["other offer", "late stage elsewhere"], playbookRef: "competing-process.md" },
          { question: "You said bigger company, bigger package. Is it the size you want, or the number?", why: "She's assuming, not reporting, a higher offer", signals: ["other offer"], playbookRef: "offer-comparison.md" },
          { question: "Would you own something end to end there the way you would with payouts at Ledgerline?", why: "Ownership was her first stated motivation", signals: ["late stage elsewhere"], playbookRef: "offer-comparison.md" },
        ],
        counteroffer: [
          { question: "Go back to the moment you started looking. What happened that week?", why: "If money alone caused it, the bank's counter will work", signals: ["counter mention", "current employer leverage"], playbookRef: "counteroffer-risk.md" },
          { question: "If the bank matched 190 tomorrow, would you still own anything there that you'd be proud of in a year?", why: "Ties the counter back to her ownership motivation", signals: ["counter mention"], playbookRef: "counteroffer-risk.md" },
          { question: "What will you say to your manager if they offer a promotion in the room?", why: "Rehearse before the offer, not after", signals: ["current employer leverage"], playbookRef: "resignation-prep.md" },
        ],
      },
    },
  },
  "marcus-halden": {
    usage: { model: "claude-sonnet-5-5", input_tokens: 1820, output_tokens: 1210 },
    brief: {
      dealId: "marcus-halden",
      summary:
        "Marcus is not really in market. He wants to lead people, and this is a firm IC role with a 70 minute commute. Sam can flex to 2 office days but not on the IC part. The honest outcome may be parking him for a better fit.",
      motivations: ["Move into people leadership", "Less commuting", "Interesting product (lower priority)"],
      riskSignals: [
        { signal: "Lukewarm language", severity: "high", evidence: "Email: 'still trying to figure out if this is the right move'" },
        { signal: "Role shape mismatch", severity: "high", evidence: "Wants to lead; role is IC for 12+ months" },
        { signal: "Commute", severity: "med", evidence: "70 min each way, 3 days" },
      ],
      likelyObjections: [
        { category: "motivation_mismatch", why: "Leadership goal vs IC role" },
        { category: "remote_location", why: "Commute plus 3 days" },
        { category: "title_level", why: "Senior IC may read as sideways" },
      ],
      ladders: {
        motivation_mismatch: [
          { question: "When you picture leading a team, is it the people part you want, or the influence over what gets built?", why: "A senior IC with real product influence might scratch the second itch, not the first", signals: ["wants something else"], playbookRef: "motivation-mismatch.md" },
          { question: "What part of Sam's pitch, if any, actually got your attention?", why: "Finds the one real hook before deciding to park him", signals: ["lukewarm language"], playbookRef: "motivation-mismatch.md" },
          { question: "If this one's not it, what should I be looking for for you? A team lead role at a smaller company?", why: "Keeps the relationship even if Halden is a no", signals: ["low energy"], playbookRef: "career-direction.md" },
        ],
        remote_location: [
          { question: "If it were two days, and you picked which two, does the commute still kill it?", why: "Sam can do 2 days, so this one is solvable", signals: ["office days", "commute"], playbookRef: "remote-hybrid.md" },
          { question: "Have you done that journey at rush hour yet?", why: "70 minutes on paper is often 90 in practice", signals: ["commute"], playbookRef: "commute.md" },
        ],
        title_level: [
          { question: "Is 'senior' a step sideways because of how it reads, or because of what you'd own?", why: "Title can flex, IC can't, so find which he cares about", signals: ["level concern"], playbookRef: "title-concerns.md" },
          { question: "If the title were Lead PM but still IC, would that change anything?", why: "Cheap for the client to give, tests if it's pride or scope", signals: ["level concern"], playbookRef: "title-concerns.md" },
        ],
      },
    },
  },
};
