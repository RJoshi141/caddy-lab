// Precomputed briefs for mock mode. These are what Sonnet produces from the
// mock deals, saved so the demo never depends on a live API call.
import type { Brief, Usage } from "@/lib/schemas";

export const MOCK_BRIEFS: Record<string, { brief: Brief; usage: Usage }> = {
  "nadia-ledgerline": {
    usage: { model: "claude-sonnet-5-5", input_tokens: 2140, output_tokens: 1380 },
    brief: {
      dealId: "nadia-ledgerline",
      summary:
        "Nadia likes the team and the problem. The risk is a 190 anchor borrowed from a friend, a parallel final round, and a manager likely to counter. Budget tops out at 185, so the gap is small and mostly about how she frames it.",
      motivations: ["Real ownership (the payouts service is hers end to end)", "Not feeling like she took a step down vs peers", "Stability with a young kid"],
      riskSignals: [
        { signal: "Anchored to peer comp", severity: "med", evidence: "Email Wed: a friend in a similar role is on more. Client ceiling 185, hard stop 190" },
        { signal: "Competing final round", severity: "high", evidence: "Email Mon: hears by end of next week" },
        { signal: "Counteroffer likely", severity: "high", evidence: "4 years at the bank, no equity, bonus underpaid" },
      ],
      likelyObjections: [
        { category: "comp_gap", why: "Range shared was 170 to 185, she has a higher number in mind" },
        { category: "competing_process", why: "Bigger company, she'll assume a bigger package" },
        { category: "counteroffer", why: "Bank has a habit of retention offers for senior engineers" },
      ],
      drewOn: { deals: 1284, files: 9 },
      nextSteps: [
        "Tell Marta the real gap is about 5k on base, not 25k.",
        "Go back with 185 and a six month comp review in writing.",
        "Prep Nadia for the counteroffer before she resigns.",
      ],
      ladders: {
        comp_gap: [
          { question: "When you say 190, is that the number you need, or the number that would stop you feeling behind your friend?", why: "Splits an ego anchor from a real cash need before anyone goes back to Marta", signals: ["number mentioned", "peer anchor"], playbookRef: "comp-gap.md", evidence: { deals: 214, rate: 0.71, baseline: 0.46, example: "Senior engineer, fintech, anchored to a friend's pay. Split base from total, accepted at 182k." } },
          { question: "Your bonus paid 6% last year, not 10. If we compare real take home, not targets, how far apart are we actually?", why: "Her current package is weaker than it looks on paper", signals: ["base vs total"], playbookRef: "base-vs-total-comp.md", evidence: { deals: 168, rate: 0.64, baseline: 0.49, example: "Staff engineer at a bank, bonus paid half of target. Showed real take home, closed 8k under ask." } },
          { question: "If Ledgerline landed at 185 base with the payouts service fully yours, what would still give you pause?", why: "Tests whether ownership closes the last 5k", signals: ["comp below expectation"], playbookRef: "comp-gap.md", evidence: { deals: 97, rate: 0.68, baseline: 0.51, example: "Platform lead took a lower base for full ownership of a payments service." } },
          { question: "If I brought back 185 and an early comp review at six months, is that a yes, or is there a number below which it's a no?", why: "Gets her walk-away number inside the client's ceiling", signals: ["base vs total"], playbookRef: "comp-gap.md", evidence: { deals: 131, rate: 0.62, baseline: 0.44, example: "Accepted 5k under ask with a written six month comp review." } },
        ],
        competing_process: [
          { question: "If both offers landed the same day at the same number, which would you pick, and what's the reason?", why: "Finds out if the other role wins on something other than money", signals: ["other offer", "late stage elsewhere"], playbookRef: "competing-process.md", evidence: { deals: 302, rate: 0.58, baseline: 0.37, example: "The other role's draw was the manager, not the money. Matched on scope, offer accepted." } },
          { question: "You said bigger company, bigger package. Is it the size you want, or the number?", why: "She's assuming, not reporting, a higher offer", signals: ["other offer"], playbookRef: "offer-comparison.md", evidence: { deals: 188, rate: 0.61, baseline: 0.4, example: "'Bigger company, bigger package' was a guess. Their offer came in lower." } },
          { question: "Would you own something end to end there the way you would with payouts at Ledgerline?", why: "Ownership was her first stated motivation", signals: ["late stage elsewhere"], playbookRef: "offer-comparison.md", evidence: { deals: 142, rate: 0.66, baseline: 0.45, example: "Ownership beat brand for a senior engineer choosing between two finals." } },
        ],
        counteroffer: [
          { question: "Go back to the moment you started looking. What happened that week?", why: "If money alone caused it, the bank's counter will work", signals: ["counter mention", "current employer leverage"], playbookRef: "counteroffer-risk.md", evidence: { deals: 256, rate: 0.74, baseline: 0.41, example: "Reason for leaving was scope, not pay. Counteroffer declined." } },
          { question: "If the bank matched 190 tomorrow, would you still own anything there that you'd be proud of in a year?", why: "Ties the counter back to her ownership motivation", signals: ["counter mention"], playbookRef: "counteroffer-risk.md", evidence: { deals: 119, rate: 0.69, baseline: 0.42, example: "Candidate named what a match wouldn't fix, and resigned anyway." } },
          { question: "What will you say to your manager if they offer a promotion in the room?", why: "Rehearse before the offer, not after", signals: ["current employer leverage"], playbookRef: "resignation-prep.md", evidence: { deals: 203, rate: 0.81, baseline: 0.52, example: "Rehearsed the resignation, turned down a promotion in the room." } },
        ],
      },
    },
  },
  "marcus-cobalt": {
    usage: { model: "claude-sonnet-5-5", input_tokens: 1820, output_tokens: 1210 },
    brief: {
      dealId: "marcus-cobalt",
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
      drewOn: { deals: 876, files: 7 },
      nextSteps: [
        "Ask Sam if the role can include one direct report within a year.",
        "Offer two fixed office days to take the commute off the table.",
        "If it's still lukewarm, park Marcus and look for a team lead role.",
      ],
      ladders: {
        motivation_mismatch: [
          { question: "When you picture leading a team, is it the people part you want, or the influence over what gets built?", why: "A senior IC with real product influence might scratch the second itch, not the first", signals: ["wants something else"], playbookRef: "motivation-mismatch.md", evidence: { deals: 163, rate: 0.52, baseline: 0.31, example: "Wanted influence, not reports. Took a senior IC role with roadmap ownership." } },
          { question: "What part of Sam's pitch, if any, actually got your attention?", why: "Finds the one real hook before deciding to park him", signals: ["lukewarm language"], playbookRef: "motivation-mismatch.md", evidence: { deals: 221, rate: 0.49, baseline: 0.33, example: "The one hook was the product. Built the second interview around it." } },
          { question: "If this one's not it, what should I be looking for for you? A team lead role at a smaller company?", why: "Keeps the relationship even if Cobalt is a no", signals: ["low energy"], playbookRef: "career-direction.md", evidence: { deals: 97, rate: 0.44, baseline: 0.28, example: "Parked for six weeks, placed in a team lead role elsewhere." } },
        ],
        remote_location: [
          { question: "If it were two days, and you picked which two, does the commute still kill it?", why: "Sam can do 2 days, so this one is solvable", signals: ["office days", "commute"], playbookRef: "remote-hybrid.md", evidence: { deals: 311, rate: 0.63, baseline: 0.39, example: "Two fixed days solved a 70 minute commute objection." } },
          { question: "Have you done that journey at rush hour yet?", why: "70 minutes on paper is often 90 in practice", signals: ["commute"], playbookRef: "commute.md", evidence: { deals: 88, rate: 0.57, baseline: 0.4, example: "Trial commute surfaced the real issue early: school pickup." } },
        ],
        title_level: [
          { question: "Is 'senior' a step sideways because of how it reads, or because of what you'd own?", why: "Title can flex, IC can't, so find which he cares about", signals: ["level concern"], playbookRef: "title-concerns.md", evidence: { deals: 134, rate: 0.55, baseline: 0.36, example: "Title was pride, not scope. Lead title for the same role closed it." } },
          { question: "If the title were Lead PM but still IC, would that change anything?", why: "Cheap for the client to give, tests if it's pride or scope", signals: ["level concern"], playbookRef: "title-concerns.md", evidence: { deals: 76, rate: 0.6, baseline: 0.38, example: "Client flexed the title at no cost, offer accepted." } },
        ],
      },
    },
  },
};
