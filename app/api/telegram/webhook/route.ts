import { NextResponse } from "next/server";

export const runtime = "nodejs";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000/api/internal/ai/process";
const INTERNAL_AI_TOKEN = process.env.INTERNAL_AI_TOKEN;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function callInternalAI(question: string) {
  try {
    const res = await fetch(INTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": INTERNAL_AI_TOKEN || "",
      },
      body: JSON.stringify({ question, history: [] }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("internal ai call failed", res.status, t);
      return null;
    }
    const json = await res.json().catch(() => null);
    return json?.answer || null;
  } catch (error) {
    console.error("callInternalAI error", error);
    return null;
  }
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) {
    console.error("BOT_TOKEN not configured");
    return null;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch (error) {
    console.error("sendTelegramMessage error", error);
    return null;
  }
}

export async function POST(req: Request) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token") || req.headers.get("x-telegram-secret");
  if (!TELEGRAM_WEBHOOK_SECRET || secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const payload = update as {
      message?: { text?: string; chat?: { id?: number | string } };
      edited_message?: { text?: string; chat?: { id?: number | string } };
    };
    const message = payload.message || payload.edited_message;
    const text = message?.text;
    const chatId = message?.chat?.id;

    if (text && chatId) {
      const answer = (await callInternalAI(text)) || "ขอโทษครับ เกิดข้อผิดพลาดในการประมวลผล";
      await sendTelegramMessage(chatId, answer);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook handler error", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
