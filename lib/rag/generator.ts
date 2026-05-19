import type { ChatMessage, RetrievedChunk } from "./types";

type GenerateAnswerInput = {
  question: string;
  history: ChatMessage[];
  retrieved: RetrievedChunk[];
};

let geminiQuotaWarned = false;

function normalizeAnswer(text: string) {
  return text
    .replace(/^[#>*\-\s]+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildContext(retrieved: RetrievedChunk[]) {
  return retrieved
    .map(
      (chunk, idx) =>
        `[${idx + 1}] (${chunk.source}) ${chunk.title}\n${chunk.content}`,
    )
    .join("\n\n---\n\n");
}

function compactChunkText(chunk: RetrievedChunk) {
  const lines = chunk.content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("##") && !line.startsWith("#"));

  const bullets = lines
    .filter((line) => line.startsWith("-") || line.startsWith("*") )
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/\s{2,}/g, " "))
    .slice(0, 3);

  if (bullets.length > 0) {
    return bullets.join(" ");
  }

  return lines.slice(0, 2).join(" ");
}

function chunkToNaturalSentence(chunk: RetrievedChunk) {
  const text = compactChunkText(chunk)
    .replace(/\s*:\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  return text.endsWith(".") || text.endsWith("!") || text.endsWith("?")
    ? text
    : `${text}ครับ`;
}

function fallbackAnswer(question: string, retrieved: RetrievedChunk[]) {
  if (retrieved.length === 0 || retrieved[0].score < 0.12) {
    return [
      "ยังไม่พบข้อมูลที่ตรงกับคำถามนี้แบบตรงตัวครับ",
      "จากข้อมูลร้านที่มี ตอนนี้สรุปได้ว่าเปิดทุกวัน 07:00 - 19:00 น. และจัดส่ง 09:00 - 18:00 น.",
      "ถ้าต้องการ ผมช่วยเช็กเรื่องเมนู ราคา การจัดส่ง หรือช่องทางติดต่อให้ได้ครับ",
    ].join(" ");
  }

  const top = retrieved.slice(0, 3);
  const sentences = top
    .map(chunkToNaturalSentence)
    .filter((sentence): sentence is string => Boolean(sentence));

  if (sentences.length === 0) {
    return "ผมมีข้อมูลของร้านอยู่ครับ ถ้าต้องการผมช่วยสรุปเรื่องเวลาเปิด-ปิด เมนู ราคา การจัดส่ง หรือการสั่งซื้อให้แบบสั้น ๆ ได้";
  }

  return [
    "จากข้อมูลที่มี ผมสรุปให้ได้ดังนี้ครับ",
    ...sentences,
    "ถ้าต้องการ ผมสรุปเป็นคำตอบสั้น ๆ หรือแยกเป็นข้อให้ต่อได้ครับ",
  ].join(" ");
}

function buildSystemPrompt() {
  return [
    "คุณคือผู้ช่วยของร้าน YummyYummy Cafe",
    "ตอบเป็นภาษาไทย สุภาพ เป็นธรรมชาติ เหมือนพนักงานร้านคุยกับลูกค้า",
    "ใช้ข้อมูลจาก CONTEXT เป็นหลัก ถ้าไม่มีคำตอบตรง ๆ ให้สรุปหรืออนุมานจากข้อมูลที่มี และบอกว่าเป็นการแนะนำจากข้อมูลร้าน",
    "ถ้าคำถามมีหลายประเด็น ให้ตอบครบทุกประเด็นเรียงจากสิ่งที่สำคัญที่สุดก่อน",
    "ถ้ามีเวลา ราคา ที่อยู่ ช่องทางติดต่อ หรือเงื่อนไขต่าง ๆ ให้ยึดตามตัวเลขและถ้อยคำใน CONTEXT",
    "ตอบให้กระชับแต่ครบ ไม่ต้องใส่คำนำยาว ถ้าต้องแนะนำต่อให้แนะนำแบบสั้น ๆ ตอนท้าย",
    "ถ้าข้อมูลไม่แน่ชัด ให้บอกสิ่งที่แน่ชัดที่สุดและระบุว่าควรยืนยันกับร้าน",
  ].join("\n");
}

async function callOpenAI(
  question: string,
  history: ChatMessage[],
  retrieved: RetrievedChunk[],
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.RAG_OPENAI_MODEL || "gpt-4o-mini";
  const context = buildContext(retrieved);
  const system = buildSystemPrompt();

  const historyMessages = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content }));

  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      ...historyMessages,
      {
        role: "user",
        content: `CONTEXT:\n${context}\n\nQUESTION:\n${question}`,
      },
    ],
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      console.warn(`RAG: OpenAI request failed: ${response.status} - ${text}`);
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const answer = normalizeAnswer(json.choices?.[0]?.message?.content || "");
    return answer.length >= 20 ? answer : null;
  } catch (err) {
    console.warn("RAG: OpenAI call error", err);
    return null;
  }
}

async function callGemini(
  question: string,
  history: ChatMessage[],
  retrieved: RetrievedChunk[],
) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("RAG: GOOGLE_API_KEY not set, skipping Gemini call");
    return null;
  }

  const model = process.env.RAG_GOOGLE_MODEL || "gemini-1.5-flash";
  const context = buildContext(retrieved);
  const rules = buildSystemPrompt();

  const historyText = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = [
    rules,
    "",
    "CONTEXT:",
    context,
    "",
    "HISTORY:",
    historyText || "(none)",
    "",
    "QUESTION:",
    question,
  ].join("\n");

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const runRequest = async () =>
    fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

  const parseText = async (response: Response) => {
    const json = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = normalizeAnswer(
      json.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n") || "",
    );

    return text.length >= 20 ? text : null;
  };

  const getRetryDelayMs = (response: Response, bodyText: string) => {
    const header = response.headers.get("retry-after");
    if (header) {
      const headerSeconds = Number(header);
      if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
        return headerSeconds * 1000;
      }
    }

    const secondsMatch = bodyText.match(/retryDelay"\s*:\s*"(\d+)s"/);
    if (secondsMatch) {
      const seconds = Number(secondsMatch[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }

    const msMatch = bodyText.match(/retry in\s*([\d.]+)\s*ms/i);
    if (msMatch) {
      const ms = Number(msMatch[1]);
      if (Number.isFinite(ms) && ms > 0) {
        return Math.ceil(ms);
      }
    }

    return 0;
  };

  const isQuotaExhausted = (bodyText: string) =>
    /Quota exceeded|RESOURCE_EXHAUSTED|free_tier/i.test(bodyText);

  const isTransientGeminiError = (status: number) =>
    status === 429 || status === 503 || status === 502 || status === 504;

  const maybeRetryAfter = async (response: Response) => {
      if (!isTransientGeminiError(response.status)) {
      return null;
    }

    const bodyText = await response.text().catch(() => "(no body)");
      if (response.status === 429 && (isQuotaExhausted(bodyText) || bodyText === "(no body)")) {
      if (!geminiQuotaWarned) {
        console.warn(`RAG: Gemini quota exhausted for ${model}; skipping retries.`);
        geminiQuotaWarned = true;
      }
      return bodyText;
    }

    const delayMs = getRetryDelayMs(response, bodyText);
      const waitMs = delayMs > 0 ? delayMs : response.status === 503 ? 2000 : 1500;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return bodyText;
  };

  try {
    let response = await runRequest();
      let retryCount = 0;

      while (!response.ok && retryCount < 1) {
      const retryBody = await maybeRetryAfter(response);
        if (retryBody !== null && isTransientGeminiError(response.status)) {
        response = await runRequest();
          retryCount += 1;
          continue;
      }

        break;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      const suppressQuotaLog =
        response.status === 429 &&
        (geminiQuotaWarned || isQuotaExhausted(text) || text === "(no body)");
      if (!suppressQuotaLog) {
        console.warn(`RAG: Gemini request failed: ${response.status} - ${text}`);
      }
      return null;
    }

    return await parseText(response);
  } catch (err) {
    console.warn("RAG: Gemini call error", err);
    return null;
  }
}

export async function generateRagAnswer({
  question,
  history,
  retrieved,
}: GenerateAnswerInput) {
  const geminiAnswer = await callGemini(question, history, retrieved).catch(
    () => null,
  );

  if (geminiAnswer) {
    return geminiAnswer;
  }

  const openAiAnswer = await callOpenAI(question, history, retrieved).catch(
    () => null,
  );

  if (openAiAnswer) {
    return openAiAnswer;
  }

  return fallbackAnswer(question, retrieved);
}
