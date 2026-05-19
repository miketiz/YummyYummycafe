import { NextResponse } from "next/server";
import { generateRagAnswer } from "@/lib/rag/generator";
import { loadKnowledgeChunks } from "@/lib/rag/knowledge";
import { retrieveRelevantChunks } from "@/lib/rag/retriever";

export const runtime = "nodejs";

let chunkCachePromise: Promise<Awaited<ReturnType<typeof loadKnowledgeChunks>>> | null = null;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const headerToken =
    request.headers.get("x-internal-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const expected = process.env.INTERNAL_AI_TOKEN;
  if (!expected || !headerToken || headerToken !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { question?: unknown; history?: unknown };
  const question = typeof payload.question === "string" ? payload.question : "";
  const history = Array.isArray(payload.history) ? (payload.history as ChatMessage[]) : [];

  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  if (!chunkCachePromise) {
    chunkCachePromise = loadKnowledgeChunks();
  }

  const chunks = await chunkCachePromise;
  const retrieved = retrieveRelevantChunks(question, chunks);

  try {
    const answer = await generateRagAnswer({ question, history, retrieved });
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("internal/ai/process error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
