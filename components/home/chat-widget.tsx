"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { bakery, beverages, type MenuItem } from "./menu-data";

type Source = {
  id: string;
  source: string;
  title: string;
  score: number;
  excerpt: string;
};

type ApiChatResponse = {
  answer: string;
  sources: Source[];
  confidence: number;
  threshold: number;
  guarded: boolean;
};

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  guarded?: boolean;
};

const QUICK_SHORTCUTS = [
  { label: "เมนูแนะนำ", message: "มีเมนูอะไรบ้าง" },
  { label: "เวลาเปิด-ปิด", message: "ร้านเปิดกี่โมง ปิดกี่โมง" },
  { label: "จัดส่ง", message: "จัดส่งกี่โมง และค่าส่งเท่าไร" },
  { label: "ติดต่อร้าน", message: "ขอช่องทางติดต่อร้าน" },
];

function isMenuQuestion(message: string) {
  return /เมนู|รายการอาหาร|รายการเมนู|มีอะไรบ้าง|ขายอะไร|แนะนำอะไร|menu/i.test(
    message,
  );
}

function formatMenuItem(item: MenuItem) {
  return `${item.name} (${item.price} บาท)`;
}

function buildLocalMenuAnswer() {
  const bakeryLine = bakery.map(formatMenuItem).join(", ");
  const beverageLine = beverages.map(formatMenuItem).join(", ");

  return [
    "มีเมนูหลัก 2 หมวดครับ คือเบเกอรี่กับเครื่องดื่ม",
    `เบเกอรี่: ${bakeryLine}`,
    `เครื่องดื่ม: ${beverageLine}`,
    "ถ้าต้องการ ผมช่วยแนะนำเมนูขายดี หรือสรุปราคาแบบละเอียดให้ต่อได้ครับ",
  ].join("\n\n");
}

interface ChatWidgetProps {
  /** Height (px) of the cart box when visible. Pass 0 when cart is hidden. */
  cartOffset?: number;
}

export function ChatWidget({ cartOffset = 0 }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "สวัสดีค่ะ ฉันเป็นผู้ช่วยของร้าน YummyYummy Cafe ถามข้อมูลเมนู เวลาเปิด-ปิด การจัดส่ง หรือช่องทางติดต่อได้เลย",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  // Gap between cart box top edge and the chat button / panel
  const GAP = 12; // px

  // Base bottom values (matches the original fixed positioning)
  const BASE_BTN_BOTTOM = 24;   // bottom-6  = 1.5rem = 24px
  const BASE_PANEL_BOTTOM = 96; // bottom-24 = 6rem   = 96px

  // When cart is open, shift both upward so they sit above the cart box
  const btnBottom   = cartOffset > 0 ? BASE_BTN_BOTTOM   + cartOffset + GAP : BASE_BTN_BOTTOM;
  const panelBottom = cartOffset > 0 ? BASE_PANEL_BOTTOM + cartOffset + GAP : BASE_PANEL_BOTTOM;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const sendMessage = async (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || isLoading) {
      return;
    }

    const nextUserMessage: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, nextUserMessage]);
    scrollToBottom();

    try {
      const history = messages.concat(nextUserMessage).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "(no body)");
        console.warn("chat request failed:", response.status, text);
        try {
          const errJson = JSON.parse(text || "{}");
          const msg = errJson?.error?.message || errJson?.message || `Server error ${response.status}`;
          const dataFallback: ApiChatResponse = {
            answer: msg,
            sources: [],
            confidence: 0,
            threshold: 0,
            guarded: true,
          };
          const data = dataFallback;
          const fallbackMenuAnswer =
            isMenuQuestion(message) &&
            (data.guarded || /ขออภัย|ไม่มั่นใจพอ|ไม่สามารถตอบ/.test(data.answer))
              ? buildLocalMenuAnswer()
              : null;

          const aiMessage: UiMessage = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: fallbackMenuAnswer ?? data.answer,
            guarded: data.guarded,
          };

          setMessages((prev) => [...prev, aiMessage]);
          scrollToBottom();
          setIsLoading(false);
          return;
        } catch {
          throw new Error("chat request failed");
        }
      }

      const data = (await response.json()) as ApiChatResponse;
      const fallbackMenuAnswer =
        isMenuQuestion(message) &&
        (data.guarded || /ขออภัย|ไม่มั่นใจพอ|ไม่สามารถตอบ/.test(data.answer))
          ? buildLocalMenuAnswer()
          : null;

      const aiMessage: UiMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: fallbackMenuAnswer ?? data.answer,
        guarded: data.guarded,
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            "ขออภัย ระบบแชทมีปัญหาชั่วคราว ลองใหม่อีกครั้งได้เลย (ถ้าเพิ่งรีสตาร์ท ให้รอสักครู่ และเช็กว่า dev server ยังรันอยู่)",
        },
      ]);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {open && (
        <section
          style={{ bottom: panelBottom }}
          className="fixed right-4 sm:right-6 z-50 w-[min(95vw,420px)] h-[min(72vh,620px)] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-[bottom] duration-300"
        >
          <header className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 grid place-content-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-heading text-sm leading-none">Yummy Assistant</p>
                <p className="text-xs text-muted-foreground mt-1">RAG knowledge mode</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-muted grid place-content-center"
              aria-label="close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={message.role === "user" ? "max-w-[84%] bg-primary text-primary-foreground rounded-2xl px-3 py-2" : "max-w-[88%] bg-muted rounded-2xl px-3 py-2"}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                </div>
              </article>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[88%] bg-muted rounded-2xl px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">กำลังคิดคำตอบ...</p>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-border p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.label}
                  onClick={() => void sendMessage(shortcut.message)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-full text-xs border border-border bg-background hover:bg-muted disabled:opacity-50"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="พิมพ์คำถามเกี่ยวกับร้าน..."
                className="flex-1 bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!canSend}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 grid place-content-center"
                aria-label="send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </footer>
        </section>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{ bottom: btnBottom }}
        className="fixed right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-content-center transition-[bottom] duration-300"
        aria-label="toggle chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </>
  );
}
