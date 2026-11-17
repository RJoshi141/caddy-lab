// Picks the top-k playbook files for the slow path. Uses embeddings when the
// browser model is warm, plain TF-IDF otherwise. Either way it's local.
import playbook from "@/data/playbook-index.json";
import { CATEGORY_BY_ID } from "@/data/categories";

type Doc = { file: string; title: string; category: string; text: string };
const DOCS = playbook as Doc[];

const STOP = new Set("the a an and or but to of in on for with is it i you that this be are was at as so if my me we they not do have just".split(" "));
const tokens = (s: string) => s.toLowerCase().match(/[a-z]+/g)?.filter((t) => t.length > 2 && !STOP.has(t)) ?? [];

// Build TF-IDF once at module load. 34 small docs, this is instant.
const df = new Map<string, number>();
const docTf = DOCS.map((d) => {
  const tf = new Map<string, number>();
  for (const t of tokens(d.title + " " + d.text)) tf.set(t, (tf.get(t) ?? 0) + 1);
  for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  return tf;
});
const idf = (t: string) => Math.log(1 + DOCS.length / (1 + (df.get(t) ?? 0)));

export function topKPlaybook(query: string, categoryId: string, k: number, docVecs?: number[][], queryVec?: number[]) {
  const scores = DOCS.map((d, i) => {
    let s: number;
    if (docVecs && queryVec) s = dot(docVecs[i], queryVec);
    else s = tokens(query).reduce((acc, t) => acc + (docTf[i].get(t) ?? 0) * idf(t), 0) / 10;
    // Small boost for files the taxonomy says belong to this category.
    if (CATEGORY_BY_ID[categoryId]?.playbook.includes(d.file)) s += 0.25;
    return { file: d.file, title: d.title, score: s };
  });
  return scores.sort((a, b) => b.score - a.score).slice(0, k);
}

export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
export const PLAYBOOK_DOCS = DOCS;
