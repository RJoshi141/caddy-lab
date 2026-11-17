// Runs a small sentence model in the browser (WASM) so classification and
// retrieval never leave the machine. First load downloads ~23MB, then the
// browser caches it.
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

type Msg = { id: number; texts: string[] };
let extractor: Awaited<ReturnType<typeof pipeline>> | null = null;

async function load() {
  // all-MiniLM-L6-v2, quantized. Good enough for 12 categories.
  extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
  self.postMessage({ type: "ready" });
}
load().catch((e) => self.postMessage({ type: "error", error: String(e) }));

self.onmessage = async (e: MessageEvent<Msg>) => {
  if (!extractor) return self.postMessage({ type: "result", id: e.data.id, error: "not ready" });
  const t0 = performance.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = await (extractor as any)(e.data.texts, { pooling: "mean", normalize: true });
  self.postMessage({ type: "result", id: e.data.id, vectors: out.tolist(), ms: performance.now() - t0 });
};
