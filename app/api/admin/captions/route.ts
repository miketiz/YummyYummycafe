import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CaptionRequest = {
  item?: {
    name?: unknown;
    nameEn?: unknown;
    price?: unknown;
    category?: unknown;
    tag?: unknown;
  };
  hasImage?: unknown;
  count?: unknown;
};

type CaptionItem = {
  name: string;
  nameEn: string;
  price: number;
  category: "bakery" | "beverage";
  tag?: "bestseller" | "new";
};

const DEFAULT_COUNT = 5;

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 80) || fallback : fallback;
}

function normalizeItem(body: CaptionRequest): CaptionItem | null {
  const raw = body.item;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const name = cleanText(source.name);
  const nameEn = cleanText(source.nameEn, name);
  const price = Number(source.price);
  const category = source.category === "beverage" ? "beverage" : "bakery";
  const tag =
    source.tag === "bestseller" || source.tag === "new" ? source.tag : undefined;

  if (!name || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return { name, nameEn, price, category, tag };
}

function normalizeCaptions(captions: unknown, count: number) {
  if (!Array.isArray(captions)) {
    return [];
  }

  const unique = new Set<string>();
  for (const caption of captions) {
    if (typeof caption !== "string") {
      continue;
    }

    const cleaned = caption
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleaned.length >= 40) {
      unique.add(cleaned.slice(0, 1200));
    }
  }

  return Array.from(unique).slice(0, count);
}

function hashtagBase(item: CaptionItem) {
  const englishName = item.nameEn.replace(/[^a-zA-Z0-9]/g, "");
  return [
    "#YummyYummy",
    "#YummyYummyBakery",
    englishName ? `#${englishName}` : null,
    item.category === "beverage" ? "#CafeThailand" : "#FreshBaked",
    item.tag === "bestseller" ? "#Bestseller" : null,
    item.tag === "new" ? "#NewMenu" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function fallbackCaptions(item: CaptionItem, count: number) {
  const hashtags = hashtagBase(item);
  const priceLine = `ราคา ${item.price.toLocaleString("th-TH")} บาท`;

  return [
    `หอมสดใหม่พร้อมเสิร์ฟแล้ววันนี้\n${item.name} เมนูที่หยิบขึ้นมากี่ครั้งก็ยังน่ากินเหมือนเดิม ${priceLine}\n\nแวะมาที่ร้านหรือทัก DM เพื่อจองไว้ก่อนได้เลย\n\n${hashtags}`,
    `ถ้าวันนี้อยากให้ตัวเองอารมณ์ดีขึ้นอีกนิด\nลอง ${item.name} จาก YummyYummy ดูไหมครับ\n\n${priceLine} ทำสด พร้อมเติมความอร่อยให้วันธรรมดาน่ารักขึ้น\n\n${hashtags}`,
    `${item.name} พร้อมขึ้นหน้าฟีดแล้ว\nรสชาติละมุน หน้าตาน่ารัก และเหมาะกับช่วงพักของวันนี้มาก ๆ\n\n${priceLine}\nสั่งล่วงหน้าได้ทาง DM\n\n${hashtags}`,
    `เมนูนี้อยากให้ลองจริง ๆ\n${item.name} ทำสดในสไตล์ YummyYummy หอม อร่อย และกินง่ายทุกเวลา\n\n${priceLine}\nมีจำนวนจำกัดในแต่ละวันนะครับ\n\n${hashtags}`,
    `โพสต์นี้ขอชวนมาชิม ${item.name}\nเมนูโปรดของสายคาเฟ่ที่เข้ากับทั้งกาแฟ ชา และช่วงเวลาพักใจ\n\n${priceLine}\nเจอกันที่ YummyYummy ครับ\n\n${hashtags}`,
  ].slice(0, count);
}

function buildPrompt(item: CaptionItem, hasImage: boolean, count: number) {
  return [
    "Create Instagram captions in Thai for YummyYummy Bakery/Cafe.",
    "Return only valid JSON with this exact shape: {\"captions\":[\"...\"]}.",
    `Create exactly ${count} distinct caption options.`,
    "Each caption should be ready to post, natural, warm, appetizing, and not too salesy.",
    "Vary the angles: hype, cozy morning, story/handmade, limited quantity, and friendly CTA.",
    "Use Thai as the main language. A little English is fine only for hashtags or short cafe phrases.",
    "Include price, a gentle CTA for DM/store visit, and 4-7 relevant hashtags.",
    "Do not invent discounts, delivery promises, stock quantity, ingredients, or opening hours.",
    hasImage
      ? "The user has a product image, so captions can refer to the photo lightly."
      : "No product image was uploaded, so do not say 'in this photo' or reference visible details.",
    "",
    "Menu item:",
    `Thai name: ${item.name}`,
    `English name: ${item.nameEn}`,
    `Price: ${item.price} THB`,
    `Category: ${item.category}`,
    `Tag: ${item.tag || "none"}`,
  ].join("\n");
}

async function callGemini(prompt: string, count: number) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.CAPTION_GOOGLE_MODEL || process.env.RAG_GOOGLE_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  const parsed = JSON.parse(text) as { captions?: unknown };
  return normalizeCaptions(parsed.captions, count);
}

async function callOpenAI(prompt: string, count: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.CAPTION_OPENAI_MODEL || process.env.RAG_OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a Thai social media copywriter for a small bakery cafe.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}") as {
    captions?: unknown;
  };
  return normalizeCaptions(parsed.captions, count);
}

export async function POST(request: Request) {
  let body: CaptionRequest;

  try {
    body = (await request.json()) as CaptionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const item = normalizeItem(body);
  if (!item) {
    return NextResponse.json({ error: "Valid menu item is required" }, { status: 400 });
  }

  const count =
    typeof body.count === "number" && Number.isFinite(body.count)
      ? Math.min(8, Math.max(3, Math.round(body.count)))
      : DEFAULT_COUNT;
  const prompt = buildPrompt(item, body.hasImage === true, count);

  try {
    const geminiCaptions = await callGemini(prompt, count).catch(() => null);
    if (geminiCaptions && geminiCaptions.length >= 3) {
      return NextResponse.json({ captions: geminiCaptions, provider: "gemini" });
    }

    const openAiCaptions = await callOpenAI(prompt, count).catch(() => null);
    if (openAiCaptions && openAiCaptions.length >= 3) {
      return NextResponse.json({ captions: openAiCaptions, provider: "openai" });
    }

    return NextResponse.json({
      captions: fallbackCaptions(item, count),
      provider: "fallback",
    });
  } catch (error) {
    console.error("admin/captions error", error);
    return NextResponse.json({
      captions: fallbackCaptions(item, count),
      provider: "fallback",
    });
  }
}