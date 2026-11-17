// Two mock deals. Everything here is invented for the prototype.

export type Deal = {
  id: string;
  candidate: { name: string; currentRole: string; currentComp: string; notes: string };
  job: { title: string; client: string; comp: string; location: string; summary: string };
  client: { name: string; stage: string; hiringManager: string; notes: string };
  recentEmails: { from: string; date: string; body: string }[];
};

export const DEALS: Deal[] = [
  {
    id: "priya-ledgerline",
    candidate: {
      name: "Priya Nair",
      currentRole: "Senior Backend Engineer, retail bank (4 years)",
      currentComp: "$165k base, ~10% bonus that paid 6% last year, no equity",
      notes: "Strong on payments infra. Said early on she wants 'a real ownership role'. Has a 2 year old. Hybrid currently, 2 days.",
    },
    job: {
      title: "Staff Backend Engineer, Payments",
      client: "Ledgerline",
      comp: "$170k to $185k base, 0.15% equity, 4 year vest",
      location: "Hybrid, 2 days in office",
      summary: "Own the payouts service end to end. Team of 6. Series B, 30 months runway.",
    },
    client: {
      name: "Ledgerline",
      stage: "Final interview done, offer being prepared",
      hiringManager: "Dana Okafor, Head of Engineering",
      notes: "Dana loved her system design round. Budget can stretch to 185 for the right person. Will not go above 190.",
    },
    recentEmails: [
      { from: "Priya", date: "Mon", body: "Thanks for the update. Just so you know, I'm in final rounds somewhere else too, should hear by end of next week." },
      { from: "Dana (client)", date: "Tue", body: "We want her. Can you get a feel for the number before we send the offer? Don't want to lowball." },
      { from: "Priya", date: "Wed", body: "Happy to chat Thursday. Want to talk through comp before anything formal." },
    ],
  },
  {
    id: "marcus-halden",
    candidate: {
      name: "Marcus Reid",
      currentRole: "Product Manager, digital agency (3 years)",
      currentComp: "$140k base",
      notes: "Came in via referral, not actively looking. Mentioned wanting to 'lead people' in first call. Lives 70 min from client office.",
    },
    job: {
      title: "Senior Product Manager (IC), Patient App",
      client: "Halden Health",
      comp: "$155k to $165k base, bonus",
      location: "Hybrid, 3 days in office",
      summary: "Own the patient booking app. IC role, no direct reports for at least 12 months.",
    },
    client: {
      name: "Halden Health",
      stage: "Candidate has done 2 of 4 rounds",
      hiringManager: "Sam Whitlock, VP Product",
      notes: "Sam is flexible on office days for strong people (could do 2). Not flexible on it being IC.",
    },
    recentEmails: [
      { from: "Marcus", date: "Mon", body: "Second round was fine. Still trying to figure out if this is the right move to be honest." },
      { from: "Sam (client)", date: "Tue", body: "Liked Marcus. Bit quiet in the room. Is he actually keen?" },
    ],
  },
];

export const DEAL_BY_ID = Object.fromEntries(DEALS.map((d) => [d.id, d]));
