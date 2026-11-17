import { connection } from "next/server";
import { liveAllowed } from "@/lib/anthropic";
import { LIVE_ENABLED } from "@/lib/config";

// Tells the UI whether live mode exists on this deployment and if the passcode works.
export async function GET(req: Request) {
  await connection(); // must run per request, never prerender
  return Response.json({ liveAvailable: LIVE_ENABLED, liveAllowed: liveAllowed(req) });
}
