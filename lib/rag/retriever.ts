import type { KnowledgeChunk, RetrievedChunk } from "./types";

const STOPWORDS = new Set([
  "คือ",
  "และ",
  "หรือ",
  "ของ",
  "ที่",
  "ได้",
  "ให้",
  "กับ",
  "ใน",
  "the",
  "is",
  "are",
  "a",
  "an",
  "to",
  "for",
  "of",
  "and",
]);

function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(input: string) {
  return normalize(input)
    .split(/[\s,.;:!?()\[\]{}"'`/\\|+-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bigrams(input: string) {
  const text = normalize(input).replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < text.length - 1; i += 1) {
    set.add(text.slice(i, i + 2));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function keywordScore(query: string, text: string) {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) {
    return 0;
  }

  const haystack = normalize(text);
  let matches = 0;
  for (const token of qTokens) {
    if (haystack.includes(token)) {
      matches += 1;
    }
  }

  return matches / qTokens.length;
}

export function retrieveRelevantChunks(
  query: string,
  chunks: KnowledgeChunk[],
  limit = 5,
): RetrievedChunk[] {
  const qBigrams = bigrams(query);

  return chunks
    .map((chunk) => {
      const kScore = keywordScore(query, `${chunk.title}\n${chunk.content}`);
      const bScore = jaccard(qBigrams, bigrams(`${chunk.title} ${chunk.content}`));
      const score = kScore * 0.7 + bScore * 0.3;
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
