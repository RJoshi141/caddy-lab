// Pre-call brief: the one expensive step. Sonnet reads the deal once.
import { DEAL_BY_ID } from "@/data/deals";
import { MOCK_BRIEFS } from "@/data/mock/briefs";
import { MODELS } from "@/lib/config";
import { Brief } from "@/lib/schemas";
import { BRIEF_SYSTEM, PLAYBOOK_BLOCK, briefUser } from "@/lib/prompts";
import { getClient, liveAllowed, parseJson, textOf } from "@/lib/anthropic";

const cache = new Map<string, unknown>(); // per server instance, fine for a demo

export async function POST(req: Request) {
  const { dealId, fresh } = await req.json();
  const deal = DEAL_BY_ID[dealId];
  if (!deal) return Response.json({ error: "unknown deal" }, { status: 404 });

  if (!liveAllowed(req)) return Response.json({ ...MOCK_BRIEFS[dealId], mode: "mock" });
  if (!fresh && cache.has(dealId)) return Response.json({ ...(cache.get(dealId) as object), mode: "live-cached" });

  const t0 = Date.now();
  const msg = await getClient().messages.create({
    model: MODELS.brief,
    max_tokens: 4000,
    // Playbook first and cached: the refine path reuses the same block.
    system: [
      { type: "text", text: BRIEF_SYSTEM },
      { type: "text", text: PLAYBOOK_BLOCK, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: briefUser(deal) }],
  });

  const parsed = Brief.safeParse({ ...parseJson(textOf(msg)), dealId });
  if (!parsed.success) {
    // Never break the demo: fall back to the precomputed brief and say so.
    return Response.json({ ...MOCK_BRIEFS[dealId], mode: "mock-fallback", error: parsed.error.message });
  }
  const out = { brief: parsed.data, usage: { model: MODELS.brief, ...msg.usage }, ms: Date.now() - t0 };
  cache.set(dealId, out);
  return Response.json({ ...out, mode: "live" });
}
