// Turns /playbook/*.md into one JSON file the browser can load.
// Runs before dev and build. Embeddings are computed in the browser at
// startup instead, so the build has no model download.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "playbook");
const docs = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((file) => {
    const raw = readFileSync(join(dir, file), "utf8");
    const fm = Object.fromEntries(
      (raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
        .split("\n")
        .map((l) => l.split(/:\s*/, 2))
    );
    const section = (h: string) => raw.split(`## ${h}`)[1]?.split("\n## ")[0]?.trim() ?? "";
    const ladder = section("Dig deeper")
      .split("\n")
      .map((l) => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
    return {
      file,
      title: fm.title as string,
      category: fm.category as string,
      real: section("What's really going on"),
      ladder,
      watch: section("Watch for"),
      text: raw.replace(/^---[\s\S]*?---\n/, "").trim(),
    };
  });

writeFileSync(join(process.cwd(), "data/playbook-index.json"), JSON.stringify(docs, null, 1));
console.log(`playbook index: ${docs.length} docs`);
