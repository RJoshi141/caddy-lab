import { z } from "zod";

// One rung of a dig-deeper ladder. `signals` and `playbookRef` are what the
// "why this question" panel shows, so the model has to commit to them.
export const Rung = z.object({
  question: z.string(),
  why: z.string(), // one line, deal specific
  signals: z.array(z.string()),
  playbookRef: z.string(), // file name in /playbook
});

export const Brief = z.object({
  dealId: z.string(),
  summary: z.string(),
  motivations: z.array(z.string()),
  riskSignals: z.array(z.object({ signal: z.string(), severity: z.enum(["low", "med", "high"]), evidence: z.string() })),
  likelyObjections: z.array(z.object({ category: z.string(), why: z.string() })),
  // categoryId -> 3 to 4 questions, ordered from first ask to deepest dig
  ladders: z.record(z.string(), z.array(Rung).min(1).max(4)),
});

export const Refinement = z.object({
  verdict: z.enum(["keep", "replace"]),
  question: z.string(),
  reason: z.string(),
  playbookRef: z.string().optional(),
});

export type Rung = z.infer<typeof Rung>;
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
