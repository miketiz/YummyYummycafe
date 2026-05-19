#!/usr/bin/env node

import express from "express";
import bodyParser from "body-parser";
import { Telegraf } from "telegraf";
import cron from "node-cron";

const BOT_TOKEN = process.env.BOT_TOKEN;
const INTERNAL_AI_TOKEN = process.env.INTERNAL_AI_TOKEN;
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000/api/internal/ai/process";
const CHAT_ID = process.env.CHAT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN in environment");
  process.exit(1);
}

if (!INTERNAL_AI_TOKEN) {
  console.warn("Warning: INTERNAL_AI_TOKEN not set. Internal AI calls will fail without it.");
}

const bot = new Telegraf(BOT_TOKEN);

async function callInternalAI(question, history = []) {
  try {
    const res = await fetch(INTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": INTERNAL_AI_TOKEN || "",
      },
      body: JSON.stringify({ question, history }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("internal AI error", res.status, text);
      return null;
    }

    const json = await res.json();
    return json.answer || null;
  } catch (error) {
    console.error("callInternalAI error", error);
    return null;
  }
}

bot.start((ctx) => ctx.reply("สวัสดี! ฉันคือบอทของ YummyYummy — พิมพ์คำถามเพื่อให้ฉันช่วยได้"));

bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  console.log("User text:", text);
  const answer = await callInternalAI(text, [{ role: "user", content: text }]);
  if (answer) {
    await ctx.reply(answer);
  } else {
    await ctx.reply("ขอโทษครับ เกิดปัญหาในการประมวลผล ลองใหม่อีกครั้งหรือถามเจ้าหน้าที่ร้านได้นะครับ");
  }
});

async function sendSalesSummary() {
  if (!CHAT_ID) {
    console.warn("CHAT_ID not set; skipping scheduled sales summary");
    return;
  }

  const answer = await callInternalAI("สรุปยอดขายวันนี้", []);
  const text = answer || "ไม่สามารถดึงข้อมูลยอดขายได้ในขณะนี้";

  try {
    await bot.telegram.sendMessage(CHAT_ID, `ยอดขายสรุป (อัตโนมัติ):\n\n${text}`);
    console.log("Sent sales summary to", CHAT_ID);
  } catch (error) {
    console.error("Failed to send sales summary", error);
  }
}

cron.schedule("0 7 * * *", () => {
  console.log("Running scheduled sales summary job");
  void sendSalesSummary();
});

async function start() {
  if (WEBHOOK_URL) {
    const app = express();
    app.use(bodyParser.json());

    const path = "/telegram-webhook";

    app.post(path, (req, res) => {
      bot.handleUpdate(req.body, res).catch((error) => {
        console.error("bot.handleUpdate error", error);
      });
      res.status(200).send("ok");
    });

    const port = process.env.WEBHOOK_PORT || 3001;
    app.listen(port, async () => {
      console.log(`Webhook server listening on port ${port}`);
      const webhookTarget = `${WEBHOOK_URL}${path}`;
      try {
        await bot.telegram.setWebhook(webhookTarget);
        console.log("Webhook set to", webhookTarget);
      } catch (error) {
        console.error("Failed to set webhook", error);
      }
    });
  } else {
    await bot.launch();
    console.log("Bot started (polling)");
  }

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

start().catch((error) => {
  console.error("Failed to start bot", error);
  process.exit(1);
});
