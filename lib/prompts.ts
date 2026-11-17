// Prompts live here so the cost meter can count exactly what we send.
import playbook from "@/data/playbook-index.json";
import type { Deal } from "@/data/deals";
import { CATEGORIES } from "@/data/categories";

const docs = playbook as { file: string; text: string }[];

// The whole playbook as one stable block. Same bytes every request, so it
// caches across every call and every deal.
export const PLAYBOOK_BLOCK =
  "<playbook>\n" + docs.map((d) => `<file name="${d.file}">\n${d.text}\n</file>`).join("\n") + "\n</playbook>";

export const CATEGORY_LIST = CATEGORIES.map((c) => `${c.id}: ${c.label}`).join("\n");

export const BRIEF_SYSTEM = `You prepare an agency recruiter for a live call. You read one deal and write a brief the call assistant will use without calling you again.

Rules:
- Every question must be specific to THIS deal: use names, numbers, dates and quotes from the deal. A question that would work for any candidate is a failure.
- Ladders go from the first natural ask to the deepest dig. 3 to 4 rungs.
- Only include ladders for categories that are plausible on this call.
- playbookRef must be a file name from the playbook.
- Plain conversational English a recruiter would actually say. No em dashes.

Categories:
${CATEGORY_LIST}

Return only JSON matching:
{"dealId": string, "summary": string, "motivations": string[], "riskSignals": [{"signal": string, "severity": "low"|"med"|"high", "evidence": string}], "likelyObjections": [{"category": string, "why": string}], "ladders": {"<categoryId>": [{"question": string, "why": string, "signals": string[], "playbookRef": string}]}}`;

export const briefUser = (deal: Deal) => `<deal>\n${JSON.stringify(deal, null, 1)}\n</deal>`;

export const REFINE_SYSTEM = `You are the slow path of a live call assistant for agency recruiters. A fast classifier already showed the recruiter a question. You get the last few lines of the call, that question, the deal brief, and the names of the most relevant playbook files.

Decide if you can do clearly better. Replace only if your question uses something the candidate JUST said that the current one misses, or the current one is now stale. Otherwise keep. Keeping is a good outcome.

Your question must be one sentence, under 30 words, something a recruiter can say out loud right now. No em dashes.

Return only JSON: {"verdict": "keep"|"replace", "question": string, "reason": string (under 15 words), "playbookRef": string}`;

export const refineUser = (p: { lines: string[]; current: string; category: string; files: string[] }) =>
  `Category: ${p.category}
Most relevant playbook files: ${p.files.join(", ")}
Current suggestion: ${p.current}
Last lines:
${p.lines.join("\n")}`;
