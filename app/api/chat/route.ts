import { NextResponse } from "next/server";
import { generateRagAnswer } from "@/lib/rag/generator";
import { loadKnowledgeChunks } from "@/lib/rag/knowledge";
import { retrieveRelevantChunks } from "@/lib/rag/retriever";
import type { ChatRequestBody } from "@/lib/rag/types";

export const runtime = "nodejs";

let chunkCachePromise: Promise<Awaited<ReturnType<typeof loadKnowledgeChunks>>> | null =
  null;

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_CONTENT_LENGTH = 2_000;

type SanitizedChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeHistory(history: unknown): SanitizedChatMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item): item is SanitizedChatMessage => {
      return (
        typeof item === "object" &&
        item !== null &&
        ((item as SanitizedChatMessage).role === "user" ||
          (item as SanitizedChatMessage).role === "assistant") &&
        typeof (item as { content?: unknown }).content === "string"
      );
    })
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, MAX_HISTORY_CONTENT_LENGTH),
    }))
    .slice(-MAX_HISTORY_TURNS);
}

function isMenuOverviewQuestion(message: string) {
  return /เมนู|รายการอาหาร|รายการเมนู|มีอะไรบ้าง|ขายอะไร|แนะนำอะไร|menu/i.test(
    message,
  );
}

function isOpeningHoursQuestion(message: string) {
  return /เปิดกี่โมง|ปิดกี่โมง|เวลาเปิด|เวลาปิด|เปิดไหมตอนนี้|ร้านเปิด/i.test(
    message,
  );
}

function isDeliveryQuestion(message: string) {
  return /จัดส่ง|ค่าส่ง|ส่งกี่โมง|เวลาส่ง|ส่งฟรี/i.test(message);
}

function isContactQuestion(message: string) {
  return /ติดต่อ|ช่องทางติดต่อ|เบอร์|ไลน์|line|instagram|facebook/i.test(
    message,
  );
}

function getAllKnowledgeLines(chunks: Awaited<ReturnType<typeof loadKnowledgeChunks>>) {
  return chunks.flatMap((chunk) =>
    chunk.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function pickFirstLine(lines: string[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line)) ?? null;
}

function buildHoursAnswer(chunks: Awaited<ReturnType<typeof loadKnowledgeChunks>>) {
  const lines = getAllKnowledgeLines(chunks);
  const openLine = pickFirstLine(lines, /เปิดทุกวัน.*07:00 - 19:00|เปิดถึง 19:00|07:00 - 19:00/);
  const bakeLine = pickFirstLine(lines, /เริ่มอบเบเกอรี่|อบเบเกอรี่/);
  const earlyLine = pickFirstLine(lines, /07:00 - 10:00|เมนูอบสดมักหมดเร็ว|เมนูอบสด/);

  return [
    openLine || "ร้านเปิดทุกวัน 07:00 - 19:00 น.",
    bakeLine || "เริ่มอบเบเกอรี่ตั้งแต่ 06:00 น.",
    earlyLine || "ถ้าจะเอาเมนูอบสด แนะนำมาช่วงเช้า 07:00 - 10:00 น.",
  ].join(" ");
}

function buildDeliveryAnswer(chunks: Awaited<ReturnType<typeof loadKnowledgeChunks>>) {
  const lines = getAllKnowledgeLines(chunks);
  const deliveryLine = pickFirstLine(lines, /เวลาจัดส่ง|09:00 - 18:00/);
  const feeLine = pickFirstLine(lines, /จัดส่งฟรี|ค่าจัดส่ง|500 บาท/);
  const etaLine = pickFirstLine(lines, /30-60 นาที|ระยะเวลาจัดส่ง/);

  return [
    deliveryLine || "จัดส่งได้ตั้งแต่ 09:00 - 18:00 น.",
    feeLine || "จัดส่งฟรีเมื่อยอดครบ 500 บาท ถ้ายอดไม่ถึงจะมีค่าส่งตามระยะทาง",
    etaLine || "ระยะเวลาจัดส่งประมาณ 30-60 นาทีครับ",
  ].join(" ");
}

function buildContactAnswer(chunks: Awaited<ReturnType<typeof loadKnowledgeChunks>>) {
  const lines = getAllKnowledgeLines(chunks);
  const phoneLine = pickFirstLine(lines, /โทรศัพท์|0634365174|02-XXX-XXXX/);
  const lineLine = pickFirstLine(lines, /Line OA|@yummybakery/);
  const igLine = pickFirstLine(lines, /Instagram|@yummyyummy\.bakery/);

  return [
    phoneLine || "โทรศัพท์: 0634365174",
    lineLine || "Line OA: @yummybakery",
    igLine || "Instagram: @yummyyummy.bakery",
  ].join(" ");
}

function buildMenuOverviewAnswer(retrieved: Awaited<ReturnType<typeof loadKnowledgeChunks>>) {
  const grouped = new Map<string, { title: string; items: string[] }>();

  for (const chunk of retrieved) {
    const lines = chunk.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const match = line.match(/[-*] \*\*(.+?)\*\* ราคา (\d+) บาท/);
      if (!match) {
        continue;
      }

      const category = chunk.source.includes("menu-highlights")
        ? line.includes("ราคา")
          ? "เมนูแนะนำ"
          : chunk.title
        : chunk.title;

      const bucket = grouped.get(category) ?? { title: category, items: [] };
      bucket.items.push(`${match[1]} (${match[2]} บาท)`);
      grouped.set(category, bucket);
    }
  }

  const sections = Array.from(grouped.values());
  if (sections.length === 0) {
    return null;
  }

  const formatted = sections
    .map((section) => `${section.title}: ${section.items.join(", ")}`)
    .join("\n");

  return [
    "มีเมนูหลักอยู่ 2 หมวดครับ คือเบเกอรี่กับเครื่องดื่ม",
    formatted,
    "ถ้าต้องการ ผมสรุปราคาแบบครบทุกเมนู หรือช่วยแนะนำเมนูขายดีให้ต่อได้ครับ",
  ].join("\n\n");
}

async function getKnowledgeChunks() {
  if (!chunkCachePromise) {
    chunkCachePromise = loadKnowledgeChunks();
  }
  return chunkCachePromise;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ChatRequestBody>;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "`message` is required" },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "`message` is too long" },
        { status: 400 },
      );
    }

    const knowledgeChunks = await getKnowledgeChunks();
    const retrieved = retrieveRelevantChunks(message, knowledgeChunks, 5);
    const topScore = retrieved[0]?.score ?? 0;
    const threshold = Number(process.env.RAG_CONFIDENCE_THRESHOLD ?? "0.18");

    if (isMenuOverviewQuestion(message)) {
      const menuAnswer = buildMenuOverviewAnswer(knowledgeChunks);
      if (menuAnswer) {
        return NextResponse.json({
          answer: menuAnswer,
          sources: retrieved.map((chunk) => ({
            id: chunk.id,
            source: chunk.source,
            title: chunk.title,
            score: Number(chunk.score.toFixed(3)),
            excerpt: chunk.content.slice(0, 160),
          })),
          confidence: Number(topScore.toFixed(3)),
          threshold,
          guarded: false,
        });
      }
    }

    if (isOpeningHoursQuestion(message)) {
      return NextResponse.json({
        answer: buildHoursAnswer(knowledgeChunks),
        sources: retrieved.map((chunk) => ({
          id: chunk.id,
          source: chunk.source,
          title: chunk.title,
          score: Number(chunk.score.toFixed(3)),
          excerpt: chunk.content.slice(0, 160),
        })),
        confidence: Number(topScore.toFixed(3)),
        threshold,
        guarded: false,
      });
    }

    if (isDeliveryQuestion(message)) {
      return NextResponse.json({
        answer: buildDeliveryAnswer(knowledgeChunks),
        sources: retrieved.map((chunk) => ({
          id: chunk.id,
          source: chunk.source,
          title: chunk.title,
          score: Number(chunk.score.toFixed(3)),
          excerpt: chunk.content.slice(0, 160),
        })),
        confidence: Number(topScore.toFixed(3)),
        threshold,
        guarded: false,
      });
    }

    if (isContactQuestion(message)) {
      return NextResponse.json({
        answer: buildContactAnswer(knowledgeChunks),
        sources: retrieved.map((chunk) => ({
          id: chunk.id,
          source: chunk.source,
          title: chunk.title,
          score: Number(chunk.score.toFixed(3)),
          excerpt: chunk.content.slice(0, 160),
        })),
        confidence: Number(topScore.toFixed(3)),
        threshold,
        guarded: false,
      });
    }

    if (topScore < threshold) {
      const allChunksAsRetrieved = knowledgeChunks.map((chunk) => ({
        ...chunk,
        score: 0.1,
      }));

      const answer = await generateRagAnswer({
        question: message,
        history: normalizeHistory(body.history),
        retrieved: allChunksAsRetrieved,
      });

      return NextResponse.json({
        answer:
          answer ??
          "ขออภัย ระบบไม่สามารถสร้างคำตอบได้ในขณะนี้ ลองอีกครั้งในภายหลังครับ",
        sources: knowledgeChunks.slice(0, 3).map((chunk) => ({
          id: chunk.id,
          source: chunk.source,
          title: chunk.title,
          score: 0,
          excerpt: chunk.content.slice(0, 160),
        })),
        confidence: 0,
        threshold,
        guarded: false,
      });
    }

    const answer = await generateRagAnswer({
      question: message,
      history: normalizeHistory(body.history),
      retrieved,
    });

    return NextResponse.json({
      answer: answer ?? "ขออภัย ระบบไม่สามารถสร้างคำตอบได้ในขณะนี้ ลองอีกครั้งในภายหลังครับ",
      sources: retrieved.map((chunk) => ({
        id: chunk.id,
        source: chunk.source,
        title: chunk.title,
        score: Number(chunk.score.toFixed(3)),
        excerpt: chunk.content.slice(0, 160),
      })),
      confidence: Number(topScore.toFixed(3)),
      threshold,
      guarded: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
