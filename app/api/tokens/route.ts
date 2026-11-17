// Token sizes behind the cost meter. Live: Anthropic's count_tokens endpoint,
// so the naive side is measured, not guessed. Mock: chars/4, labeled as such.
import { DEAL_BY_ID } from "@/data/deals";
import { MOCK_BRIEFS } from "@/data/mock/briefs";
import { SCENARIO_BY_ID } from "@/data/transcripts";
import { MODELS } from "@/lib/config";
import { estTokens } from "@/lib/cost";
import { PLAYBOOK_BLOCK, REFINE_SYSTEM, refineUser } from "@/lib/prompts";
import { getClient, liveAllowed } from "@/lib/anthropic";

const NAIVE_SYSTEM = "You coach an agency recruiter live. Read the full call so far, the deal and the playbook, and suggest the single best next question.";

export async function POST(req: Request) {
  const { scenarioId } = await req.json();
  const s = SCENARIO_BY_ID[scenarioId];
  const deal = DEAL_BY_ID[s.dealId];
  const brief = MOCK_BRIEFS[s.dealId].brief;
  const transcript = s.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const naivePrefixText = NAIVE_SYSTEM + PLAYBOOK_BLOCK + JSON.stringify(deal);
  const refinePrefixText = REFINE_SYSTEM + PLAYBOOK_BLOCK + JSON.stringify(brief);
  const tail = refineUser({ lines: s.lines.slice(0, 4).map((l) => l.text), current: brief.summary.slice(0, 120), category: "comp_gap", files: ["a.md", "b.md", "c.md", "d.md"] });

  if (!liveAllowed(req)) {
    return Response.json({
      mode: "estimated",
      sizes: {
        naivePrefix: estTokens(naivePrefixText),
        tokensPerLine: Math.round(estTokens(transcript) / s.lines.length),
        refinePrefix: estTokens(refinePrefixText),
        refineTail: estTokens(tail),
      },
    });
  }

  const count = async (model: string, system: string, user: string) =>
    (await getClient().messages.countTokens({ model, system, messages: [{ role: "user", content: user }] })).input_tokens;

  const [naivePrefix, naiveFull, refinePrefix, refineFull] = await Promise.all([
    count(MODELS.naive, naivePrefixText, "."),
    count(MODELS.naive, naivePrefixText, transcript),
    count(MODELS.refine, refinePrefixText, "."),
    count(MODELS.refine, refinePrefixText, tail),
  ]);
  return Response.json({
    mode: "counted",
    sizes: {
      naivePrefix,
      tokensPerLine: Math.round((naiveFull - naivePrefix) / s.lines.length),
      refinePrefix,
      refineTail: refineFull - refinePrefix,
    },
  });
}
