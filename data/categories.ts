// The pushback taxonomy. The fast path maps every transcript line to one of
// these (or to nothing). Keywords power the instant prefilter; exemplars are
// what the embedding classifier compares against once the model is warm.

export type Category = {
  id: string;
  label: string;
  // Each pattern that hits becomes a visible "signal" on the card.
  // weight < 1 for generic words that should lose ties to specific ones.
  signals: { name: string; pattern: RegExp; weight?: number }[];
  exemplars: string[];
  playbook: string[]; // primary playbook files for this category
};

export const CATEGORIES: Category[] = [
  {
    id: "comp_gap",
    label: "Comp gap",
    signals: [
      { name: "number mentioned", pattern: /\b\d{2,3}\s?(k|grand|thousand)\b|\$\s?\d/i },
      { name: "comp below expectation", pattern: /\b(lower|less|below|short of|under)\b.*\b(expect|hoping|need|want|target)/i },
      { name: "base vs total", pattern: /\b(base|salary|package|comp|compensation|equity|options|bonus|OTE)\b/i },
      { name: "peer anchor", pattern: /\b(my (mate|friend|peers?)|friends?|colleagues?)\b.*\b(on|earn|earning|making|paid)\b/i },
    ],
    exemplars: [
      "Honestly the salary is lower than I was hoping for",
      "I'd need the base to be quite a bit higher to move",
      "That package doesn't really work for me",
      "I was expecting something closer to 180",
    ],
    playbook: ["comp-gap.md", "base-vs-total-comp.md", "equity-skepticism.md"],
  },
  {
    id: "competing_process",
    label: "Competing process",
    signals: [
      { name: "other offer", pattern: /\b(another|other|second|competing)\b.*\b(offer|process|company|role|final)/i },
      { name: "late stage elsewhere", pattern: /\b(final round|onsite|final stage|last round|offer stage)\b/i },
      { name: "deadline pressure", pattern: /\b(by friday|end of (the )?(next )?week|deadline|expires?|need to decide)\b/i },
      { name: "bigger player", pattern: /\bbigger (company|package|offer|brand)\b/i },
    ],
    exemplars: [
      "I'm also in final rounds with another company",
      "I have an offer on the table that expires Friday",
      "To be transparent there's another process moving faster",
    ],
    playbook: ["competing-process.md", "exploding-offer.md", "offer-comparison.md"],
  },
  {
    id: "counteroffer",
    label: "Counteroffer risk",
    signals: [
      { name: "current employer leverage", pattern: /\b(my (boss|manager|company)|current (employer|company|team))\b.*\b(match|counter|promot|raise|keep)/i },
      { name: "counter mention", pattern: /\bcounter( |-)?offer|match it|they'd match|retention\b/i },
    ],
    exemplars: [
      "My manager would probably match it if I resigned",
      "They've hinted at a promotion if I stay",
      "I think they'd counter",
    ],
    playbook: ["counteroffer-risk.md", "resignation-prep.md"],
  },
  {
    id: "motivation_mismatch",
    label: "Motivation mismatch",
    signals: [
      { name: "lukewarm language", pattern: /\b(i guess|not sure|maybe|kind of|i suppose|it's fine|was fine|could be ok|on the fence)\b/i, weight: 0.7 },
      { name: "wants something else", pattern: /\b(what i really want|i'd rather|more interested in|looking for more|path to managing|leading a team)\b/i },
      { name: "low energy", pattern: /\b(passive\w*|just looking|not actively|not in a rush)\b/i },
    ],
    exemplars: [
      "I guess it sounds fine, I'm just not sure it's what I want",
      "I'm only really passively looking",
      "What I really want is to move into leadership",
    ],
    playbook: ["motivation-mismatch.md", "passive-candidate.md", "career-direction.md"],
  },
  {
    id: "remote_location",
    label: "Location / remote",
    signals: [
      { name: "office days", pattern: /\b(office|on-?site|in person|hybrid|days a week|commute)\b/i },
      { name: "remote preference", pattern: /\b(remote|wfh|work from home|relocat)/i },
    ],
    exemplars: [
      "Three days in the office is a lot for me",
      "I'd really need it to be fully remote",
      "The commute would be over an hour each way",
    ],
    playbook: ["remote-hybrid.md", "relocation.md", "commute.md"],
  },
  {
    id: "timing",
    label: "Timing",
    signals: [
      { name: "not now", pattern: /\b(not (the )?right time|bad timing|after (the )?(new year|bonus|vest)|in a few months|next quarter)\b/i },
      { name: "life event", pattern: /\b(wedding|baby|moving house|parental leave|vacation)\b/i },
    ],
    exemplars: [
      "The timing is just bad, I want to wait until after my bonus",
      "Maybe in a few months once things settle",
    ],
    playbook: ["timing-objection.md", "bonus-vesting-cliff.md"],
  },
  {
    id: "notice_period",
    label: "Notice period",
    signals: [{ name: "notice length", pattern: /\b(notice( period)?|(three|two|3|2|six|6) months'? notice|garden leave|non-?compete)\b/i }],
    exemplars: ["I'm on a three month notice period", "There's a non-compete I'd need to check"],
    playbook: ["notice-period.md", "non-compete.md"],
  },
  {
    id: "title_level",
    label: "Title / level",
    signals: [
      { name: "level concern", pattern: /\b(title|level|levell?ed|down-?level)\b/i },
      { name: "sideways move", pattern: /\bstep (back|sideways)\b/i },
    ],
    exemplars: ["That feels like a step back in title", "I'm already a senior, this is pitched lower"],
    playbook: ["title-concerns.md", "level-calibration.md"],
  },
  {
    id: "company_doubt",
    label: "Company doubt",
    signals: [
      { name: "stability worry", pattern: /\b(runway|funding|layoffs?|stable|stability|risky|startup risk|glassdoor|reviews)\b/i },
    ],
    exemplars: ["I read some bad things on Glassdoor", "How much runway do they actually have?"],
    playbook: ["company-stability.md", "employer-brand-concerns.md"],
  },
  {
    id: "hiring_manager",
    label: "Hiring manager concern",
    signals: [{ name: "manager vibe", pattern: /\b(hiring manager|the manager|my future boss|interviewer|didn't click|vibe)\b/i }],
    exemplars: ["I didn't really click with the hiring manager", "The interviewer seemed distracted"],
    playbook: ["hiring-manager-fit.md", "client-going-quiet.md"],
  },
  {
    id: "scope_role",
    label: "Role scope",
    signals: [{ name: "scope question", pattern: /\b(scope|responsibilit|day to day|team size|reports?|ownership|what would i actually)\b/i }],
    exemplars: ["I'm not clear what I'd actually own", "How big is the team I'd be on?"],
    playbook: ["role-scope.md", "team-structure.md"],
  },
  {
    id: "commitment_signal",
    label: "Buying signal",
    signals: [{ name: "positive intent", pattern: /\b(sounds great|i'm excited|really interested|next steps|when could i start|love that)\b/i }],
    exemplars: ["Honestly that sounds great", "What are the next steps?"],
    playbook: ["closing-buying-signal.md", "trial-close.md"],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
