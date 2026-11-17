import Anthropic from "@anthropic-ai/sdk";
import { LIVE_ENABLED } from "@/lib/config";

let client: Anthropic | null = null;
export const getClient = () => (client ??= new Anthropic());

// Live calls need the server flag AND the passcode the presenter types in.
export function liveAllowed(req: Request) {
  const pass = process.env.CADDY_PASSCODE;
  return LIVE_ENABLED && (!pass || req.headers.get("x-caddy-pass") === pass);
}

// Ask for no thinking on the latency-sensitive path. If a model rejects
// that setting, retry once with defaults rather than failing the demo.
export async function createFast(params: Anthropic.MessageCreateParamsNonStreaming) {
  const c = getClient();
  try {
    return await c.messages.create({ ...params, thinking: { type: "disabled" } } as Anthropic.MessageCreateParamsNonStreaming);
  } catch (e) {
    if (e instanceof Anthropic.APIError && e.status === 400) return c.messages.create(params);
    throw e;
  }
}

export const textOf = (m: Anthropic.Message) =>
  m.content.map((b) => (b.type === "text" ? b.text : "")).join("");

// Models sometimes wrap JSON in a fence. Strip it before parsing.
export const parseJson = (s: string) => JSON.parse(s.replace(/^[\s\S]*?(\{)/, "$1").replace(/\}[^}]*$/, "}"));
