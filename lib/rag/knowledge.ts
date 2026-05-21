import { promises as fs } from "node:fs";
import path from "node:path";
import type { KnowledgeChunk } from "./types";

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

function cleanText(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function chunkByParagraph(text: string, maxChars = 480) {
  const paragraphs = cleanText(text)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (para.length <= maxChars) {
      current = para;
      continue;
    }

    for (let i = 0; i < para.length; i += maxChars) {
      chunks.push(para.slice(i, i + maxChars));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export async function loadKnowledgeChunks(): Promise<KnowledgeChunk[]> {
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const markdownFiles = files.filter((name) => name.endsWith(".md"));

  const allChunks: KnowledgeChunk[] = [];

  for (const file of markdownFiles) {
    const sourcePath = path.join(KNOWLEDGE_DIR, file);
    const raw = await fs.readFile(sourcePath, "utf8");
    const title = raw.split("\n")[0]?.replace(/^#+\s*/, "").trim() || file;
    const body = raw.replace(/^#.*$/m, "").trim();

    const chunks = chunkByParagraph(body);
    chunks.forEach((content, index) => {
      allChunks.push({
        id: `${file.replace(/\.md$/, "")}-${index + 1}`,
        source: file,
        title,
        content,
      });
    });
  }

  return allChunks;
}
