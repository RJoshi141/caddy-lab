// Scripted calls. `gapMs` is the pause before the line plays, so the
// demo has a realistic rhythm without us waiting on real speech-to-text.

export type Line = { speaker: "recruiter" | "candidate"; text: string; gapMs: number };
export type Scenario = { id: string; title: string; dealId: string; lines: Line[] };

export const SCENARIOS: Scenario[] = [
  {
    id: "comp-pushback",
    title: "Comp pushback + competing offer",
    dealId: "nadia-ledgerline",
    lines: [
      { speaker: "recruiter", text: "Thanks for making time, Nadia. Marta's team were really impressed. How are you feeling after the final?", gapMs: 600 },
      { speaker: "candidate", text: "Good, I liked the team a lot. The payouts problem is genuinely interesting.", gapMs: 1800 },
      { speaker: "recruiter", text: "Great. Before they put anything formal together, I wanted to talk numbers.", gapMs: 1600 },
      { speaker: "candidate", text: "Yeah, so honestly the range you mentioned is lower than I was hoping for. I'd need the base to be closer to 190.", gapMs: 2200 },
      { speaker: "recruiter", text: "Okay, that's helpful to know.", gapMs: 1400 },
      { speaker: "candidate", text: "It's my mate at Stripe, she's on about that, and I'd feel a bit silly taking a step down.", gapMs: 2400 },
      { speaker: "recruiter", text: "Makes sense. And how is the other process going?", gapMs: 1500 },
      { speaker: "candidate", text: "I'm in final rounds with another company, I should hear by the end of next week.", gapMs: 2000 },
      { speaker: "candidate", text: "They haven't said a number yet but it's a bigger company so the package is probably higher.", gapMs: 2000 },
      { speaker: "recruiter", text: "Got it. What about the equity side of this one?", gapMs: 1500 },
      { speaker: "candidate", text: "I'm not really counting equity, my last company's options went to zero.", gapMs: 2000 },
      { speaker: "recruiter", text: "That's fair.", gapMs: 1000 },
      { speaker: "candidate", text: "And honestly my manager has hinted they'd match it if I resigned.", gapMs: 2200 },
      { speaker: "candidate", text: "So it really comes down to the base salary for me.", gapMs: 1800 },
      { speaker: "recruiter", text: "Understood. Let me think about how to take this back to Marta.", gapMs: 1600 },
    ],
  },
  {
    id: "lukewarm",
    title: "Lukewarm candidate, motivation mismatch",
    dealId: "marcus-cobalt",
    lines: [
      { speaker: "recruiter", text: "Hey Marcus, how did round two with Sam go?", gapMs: 600 },
      { speaker: "candidate", text: "It was fine I guess. Sam's nice.", gapMs: 1800 },
      { speaker: "recruiter", text: "Anything stand out?", gapMs: 1200 },
      { speaker: "candidate", text: "I'm just not sure it's what I want, to be honest.", gapMs: 2000 },
      { speaker: "recruiter", text: "Okay, tell me more.", gapMs: 1200 },
      { speaker: "candidate", text: "What I really want is to move into leading a team, and this is pretty clearly an IC role.", gapMs: 2400 },
      { speaker: "candidate", text: "And three days in the office is a lot, the commute would be over an hour each way.", gapMs: 2200 },
      { speaker: "recruiter", text: "That's a real commute.", gapMs: 1000 },
      { speaker: "candidate", text: "I mean, the product is interesting. It could be OK.", gapMs: 1800 },
      { speaker: "candidate", text: "I'm only really passively looking anyway, I'm not in a rush.", gapMs: 2000 },
      { speaker: "recruiter", text: "Understood. What would make it a yes for you?", gapMs: 1400 },
      { speaker: "candidate", text: "Maybe if there was a path to managing people. And the senior title feels a bit like a step sideways.", gapMs: 2400 },
      { speaker: "recruiter", text: "Let's dig into that.", gapMs: 1000 },
    ],
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
