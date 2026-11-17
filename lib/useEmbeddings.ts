"use client";
// Owns the embedding worker. Warms the model on page load, pre-embeds
// category exemplars and playbook docs, then answers classify() in ~10-30ms.
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/data/categories";
import { PLAYBOOK_DOCS, dot } from "@/lib/retrieval";

export type EmbedStatus = "loading" | "ready" | "error";

export function useEmbeddings() {
  const [status, setStatus] = useState<EmbedStatus>("loading");
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, (v: { vectors: number[][]; ms: number }) => void>());
  const nextId = useRef(0);
  const exemplarVecs = useRef<{ categoryId: string; v: number[] }[]>([]);
  const docVecs = useRef<number[][] | null>(null);

  const embed = useCallback((texts: string[]) => {
    return new Promise<{ vectors: number[][]; ms: number }>((resolve) => {
      const id = nextId.current++;
      pending.current.set(id, resolve);
      worker.current?.postMessage({ id, texts });
    });
  }, []);

  useEffect(() => {
    const w = new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.onmessage = async (e) => {
      const m = e.data;
      if (m.type === "error") return setStatus("error");
      if (m.type === "result") {
        pending.current.get(m.id)?.({ vectors: m.vectors ?? [], ms: m.ms ?? 0 });
        pending.current.delete(m.id);
      }
      if (m.type === "ready") {
        // Pre-embed everything we compare against, once.
        const ex = CATEGORIES.flatMap((c) => c.exemplars.map((t) => ({ categoryId: c.id, t })));
        const { vectors } = await embed(ex.map((x) => x.t));
        exemplarVecs.current = ex.map((x, i) => ({ categoryId: x.categoryId, v: vectors[i] }));
        const docs = await embed(PLAYBOOK_DOCS.map((d) => `${d.title}. ${d.text.slice(0, 800)}`));
        docVecs.current = docs.vectors;
        setStatus("ready");
      }
    };
    return () => w.terminate();
  }, [embed]);

  // Nearest exemplar wins. Returns the query vector too, so retrieval can reuse it.
  const classify = useCallback(
    async (text: string) => {
      if (status !== "ready") return null;
      const { vectors, ms } = await embed([text]);
      const q = vectors[0];
      let best = { categoryId: "", sim: -1 };
      for (const e of exemplarVecs.current) {
        const s = dot(e.v, q);
        if (s > best.sim) best = { categoryId: e.categoryId, sim: s };
      }
      return { ...best, ms, queryVec: q };
    },
    [status, embed]
  );

  return { status, classify, docVecs };
}
