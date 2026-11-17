// Slow path: Haiku looks at the last few lines and decides keep or replace.
// Prefix order matters for caching: system, playbook, then this deal's brief.
import { MOCK_REFINEMENTS } from "@/data/mock/refinements";
import { MODELS } from "@/lib/config";
import { Refinement } from "@/lib/schemas";
import { PLAYBOOK_BLOCK, REFINE_SYSTEM, refineUser } from "@/lib/prompts";
import { createFast, liveAllowed, parseJson, textOf } from "@/lib/anthropic";

// Rough mock usage so the meter still moves in mock mode. Labeled as mock in the UI.
const MOCK_USAGE = { model: MODELS.refine, input_tokens: 320, output_tokens: 70, cache_read_input_tokens: 8200, cache_creation_input_tokens: 0 };

export async function POST(req: Request) {
  const body = await req.json();
  const { dealId, categoryId, rung, lines, current, files, brief } = body;
  const t0 = Date.now();

  if (!liveAllowed(req)) {
    // Fake a realistic Haiku round trip so the swap logic is exercised.
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 400));
    const r = MOCK_REFINEMENTS[`${dealId}:${categoryId}:${rung}`] ?? { verdict: "keep", question: "", reason: "Fast suggestion already fits" };
    return Response.json({ refinement: r, usage: MOCK_USAGE, ms: Date.now() - t0, mode: "mock" });
  }

  try {
    const msg = await createFast({
      model: MODELS.refine,
      max_tokens: 300,
      system: [
        { type: "text", text: REFINE_SYSTEM },
        { type: "text", text: PLAYBOOK_BLOCK, cache_control: { type: "ephemeral" } },
        { type: "text", text: `<brief>${JSON.stringify(brief)}</brief>`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: refineUser({ lines, current, category: categoryId, files }) }],
    });
    const parsed = Refinement.safeParse(parseJson(textOf(msg)));
    const refinement = parsed.success ? parsed.data : { verdict: "keep" as const, question: "", reason: "Unparseable, kept fast suggestion" };
    return Response.json({ refinement, usage: { model: MODELS.refine, ...msg.usage }, ms: Date.now() - t0, mode: "live" });
  } catch (e) {
    // Slow path failing is fine: the fast suggestion is already on screen.
    return Response.json({ refinement: { verdict: "keep", question: "", reason: "Refine failed, kept fast" }, error: String(e), ms: Date.now() - t0, mode: "error" });
  }
}
