import { z } from "zod";

// One rung of a dig-deeper ladder. `signals` and `playbookRef` are what the
// "why this question" panel shows, so the model has to commit to them.
// What happened when recruiters asked this kind of question in similar past
// deals. Comes from the offline pass over the deal history, not from a model at call time.
export const Evidence = z.object({
  deals: z.number(), // similar past deals where this question was asked
  rate: z.number(), // share that went on to an accepted offer
  baseline: z.number(), // same, when it wasn't asked
  example: z.string(), // one anonymised example
});

export const Rung = z.object({
  question: z.string(),
  why: z.string(), // one line, deal specific
  signals: z.array(z.string()),
  playbookRef: z.string(), // file name in /playbook
  evidence: Evidence.optional(),
});

export const Brief = z.object({
  dealId: z.string(),
  summary: z.string(),
  motivations: z.array(z.string()),
  riskSignals: z.array(z.object({ signal: z.string(), severity: z.enum(["low", "med", "high"]), evidence: z.string() })),
  likelyObjections: z.array(z.object({ category: z.string(), why: z.string() })),
  // categoryId -> 3 to 4 questions, ordered from first ask to deepest dig
  ladders: z.record(z.string(), z.array(Rung).min(1).max(4)),
  // How much of the corpus this brief drew on.
  drewOn: z.object({ deals: z.number(), files: z.number() }).optional(),
  // What the recruiter should do after the call, if it goes the way the brief expects.
  nextSteps: z.array(z.string()).optional(),
  // A follow-up drafted before the call, ready to send the moment it ends.
  followUp: z.object({ to: z.string(), subject: z.string(), body: z.string() }).optional(),
});

export const Refinement = z.object({
  verdict: z.enum(["keep", "replace"]),
  question: z.string(),
  reason: z.string(),
  playbookRef: z.string().optional(),
  evidence: Evidence.optional(),
});

export type Rung = z.infer<typeof Rung>;
export type Evidence = z.infer<typeof Evidence>;
export type Brief = z.infer<typeof Brief>;
export type Refinement = z.infer<typeof Refinement>;

// What we track per API call so the cost meter uses real numbers.
export type Usage = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};
