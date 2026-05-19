import { NextResponse } from "next/server";
import { generateRagAnswer } from "@/lib/rag/generator";
import { loadKnowledgeChunks } from "@/lib/rag/knowledge";
import { retrieveRelevantChunks } from "@/lib/rag/retriever";

export const runtime = "nodejs";

let chunkCachePromise: Promise<Awaited<ReturnType<typeof loadKnowledgeChunks>>> | null = null;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const headerToken = request.headers.get("x-internal-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const expected = process.env.INTERNAL_AI_TOKEN;
  if (!expected || !headerToken || headerToken !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = typeof body?.question === "string" ? body.question : "";
  const history = Array.isArray(body?.history) ? (body.history as ChatMessage[]) : [];

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
  } catch (err) {
    console.error("internal/ai/process error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
