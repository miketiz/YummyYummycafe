"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Plus, Send, ShoppingCart, X } from "lucide-react";
import { bakery, beverages, type CartItem, type MenuItem } from "./menu-data";

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
  menuItems?: MenuItem[];
  quickReplies?: string[];
};

type CheckoutStep = "idle" | "name" | "phone" | "fulfillment" | "address" | "payment" | "confirm";

type CheckoutDraft = {
  customerName: string;
  phoneNumber: string;
  deliveryType: "delivery" | "pickup";
  address: string;
  paymentMethod: "cash" | "bank_transfer" | "promptpay";
};

const EMPTY_CHECKOUT: CheckoutDraft = {
  customerName: "",
  phoneNumber: "",
  deliveryType: "delivery",
  address: "",
  paymentMethod: "cash",
};

const QUICK_SHORTCUTS = [
  { label: "สั่งอาหาร", message: "สั่งอาหาร" },
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

function createMessageId(prefix: "u" | "a") {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeMenuText(value: string) {
  return value.toLowerCase().replace(/[\s\-_/().,]+/g, "");
}

function isOrderingIntent(message: string) {
  return /(สั่ง|สั่งอาหาร|สั่งขนม|สั่งเครื่องดื่ม|เอา|ขอ|เพิ่ม|ใส่ตะกร้า|ซื้อ|order|add|buy)/i.test(message);
}

function isCheckoutIntent(message: string) {
  return /(ยืนยัน|ยืนยันออเดอร์|สรุปออเดอร์|เช็คเอาท์|checkout|ชำระเงิน|ส่งออเดอร์|confirm)/i.test(message);
}

function isCancelIntent(message: string) {
  return /(ยกเลิก|cancel|ไม่เอา|พอก่อน)/i.test(message);
}

function isConfirmIntent(message: string) {
  return /(ตกลง|ยืนยัน|confirm|ok|โอเค|ใช่)/i.test(message);
}

function normalizePhoneNumber(message: string) {
  const digits = message.replace(/\D/g, "");
  const match = digits.match(/0\d{8,9}/);
  return match?.[0] ?? null;
}

function paymentMethodLabel(method: CheckoutDraft["paymentMethod"]) {
  if (method === "bank_transfer") return "โอนเงินธนาคาร";
  if (method === "promptpay") return "PromptPay";
  return "เงินสด";
}

function parsePaymentMethod(message: string): CheckoutDraft["paymentMethod"] {
  if (/promptpay|พร้อมเพย์/i.test(message)) return "promptpay";
  if (/โอน|ธนาคาร|bank/i.test(message)) return "bank_transfer";
  return "cash";
}

function buildCartSummary(items: CartItem[], deliveryFee = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const lines = items.map((item, index) => {
    return `${index + 1}. ${item.emoji} ${item.name} x${item.quantity} = ฿${item.quantity * item.price}`;
  });
  return [
    "สรุปตะกร้าของคุณ",
    ...lines,
    `ค่าสินค้า: ฿${subtotal}`,
    deliveryFee > 0 ? `ค่าส่ง: ฿${deliveryFee}` : null,
    `รวม: ฿${subtotal + deliveryFee}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function pickSuggestedMenuItems(message: string, items: MenuItem[]) {
  const normalizedMessage = normalizeMenuText(message);
  const matched = items.filter((item) => {
    const name = normalizeMenuText(item.name);
    const nameEn = normalizeMenuText(item.nameEn);
    return normalizedMessage.includes(name) || normalizedMessage.includes(nameEn);
  });

  if (matched.length > 0) {
    return matched.slice(0, 4);
  }

  return [...items]
    .sort((left, right) => {
      const leftScore = left.tag === "bestseller" ? 0 : left.tag === "new" ? 1 : 2;
      const rightScore = right.tag === "bestseller" ? 0 : right.tag === "new" ? 1 : 2;
      return leftScore - rightScore || left.id - right.id;
    })
    .slice(0, 8);
}

function parseOrderRequest(message: string, items: MenuItem[]) {
  if (!isOrderingIntent(message)) {
    return null;
  }

  const normalizedMessage = normalizeMenuText(message);
  const item = items.find((menuItem) => {
    const name = normalizeMenuText(menuItem.name);
    const nameEn = normalizeMenuText(menuItem.nameEn);
    return normalizedMessage.includes(name) || normalizedMessage.includes(nameEn);
  });

  if (!item) {
    return null;
  }

  const quantityMatch = message.match(/(\d+)\s*(ชิ้น|แก้ว|อัน|กล่อง|x)?/i);
  const quantity = Math.max(1, Math.min(20, Number(quantityMatch?.[1] ?? 1)));
  return { item, quantity };
}

interface ChatWidgetProps {
  /** Height (px) of the cart box when visible. Pass 0 when cart is hidden. */
  cartOffset?: number;
  onOpenChat?: () => void;
  cartItems?: CartItem[];
  menuItems?: MenuItem[];
  onAddToCart?: (item: MenuItem) => void;
  onOpenCart?: () => void;
  onOrderSuccess?: () => void;
}

export function ChatWidget({
  cartOffset = 0,
  onOpenChat,
  cartItems = [],
  menuItems,
  onAddToCart,
  onOpenCart,
  onOrderSuccess,
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("idle");
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft>(EMPTY_CHECKOUT);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "สวัสดีค่ะ ฉันเป็นผู้ช่วยของร้าน YummyYummy Cafe ถามข้อมูลเมนู เวลาเปิด-ปิด การจัดส่ง หรือช่องทางติดต่อได้เลย",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const availableMenuItems = useMemo(() => {
    if (menuItems && menuItems.length > 0) {
      return menuItems;
    }
    return [...bakery, ...beverages];
  }, [menuItems]);

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

  const appendAssistantMessage = (message: Omit<UiMessage, "id" | "role">) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId("a"),
        role: "assistant",
        ...message,
      },
    ]);
    scrollToBottom();
  };

  const startCheckout = () => {
    if (cartItems.length === 0) {
      appendAssistantMessage({
        content: "ยังไม่มีสินค้าในตะกร้าค่ะ เลือกเมนูที่ต้องการก่อนนะคะ",
        menuItems: pickSuggestedMenuItems("สั่งอาหาร", availableMenuItems),
      });
      return;
    }

    setCheckoutStep("name");
    appendAssistantMessage({
      content: `${buildCartSummary(cartItems)}\n\nขอชื่อผู้สั่งซื้อค่ะ`,
    });
  };

  const addSuggestedItem = (item: MenuItem, quantity = 1) => {
    if (!onAddToCart) {
      return;
    }

    for (let count = 0; count < quantity; count += 1) {
      onAddToCart(item);
    }

    appendAssistantMessage({
      content: `เพิ่ม ${item.name} x${quantity} ลงตะกร้าแล้วค่ะ\n\nเลือกเมนูเพิ่มได้เลย หรือพิมพ์ "ยืนยันออเดอร์" เพื่อสั่งซื้อในแชท`,
      quickReplies: ["ยืนยันออเดอร์", "สั่งอาหาร"],
    });
  };

  const submitChatOrder = async (draft: CheckoutDraft) => {
    const deliveryFee = draft.deliveryType === "delivery" ? 20 : 0;
    const payload = {
      phone_number: draft.phoneNumber,
      customer_name: draft.customerName,
      address: draft.deliveryType === "delivery" ? draft.address : undefined,
      delivery_type: draft.deliveryType,
      delivery_fee: deliveryFee,
      payment_method: draft.paymentMethod,
      items: cartItems.map((item) => ({
        menu_item_name: item.name,
        menu_item_emoji: item.emoji ?? "",
        quantity: item.quantity,
        unit_price: item.price,
      })),
    };

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Failed to create order: ${response.status} ${text}`);
    }

    const data = (await response.json()) as { order?: { order_number?: string } };
    setCheckoutStep("idle");
    setCheckoutDraft(EMPTY_CHECKOUT);
    onOrderSuccess?.();
    appendAssistantMessage({
      content: `สั่งซื้อสำเร็จค่ะ\nเลขออเดอร์: ${data.order?.order_number ?? "-"}\nร้านได้รับแจ้งเตือนแล้ว และจะติดต่อกลับตามเบอร์ที่ให้ไว้ค่ะ`,
    });
  };

  const handleCheckoutMessage = async (message: string) => {
    if (isCancelIntent(message)) {
      setCheckoutStep("idle");
      setCheckoutDraft(EMPTY_CHECKOUT);
      appendAssistantMessage({ content: "ยกเลิกขั้นตอนสั่งซื้อในแชทแล้วค่ะ ตะกร้ายังอยู่เหมือนเดิม" });
      return true;
    }

    if (checkoutStep === "name") {
      const nextDraft = { ...checkoutDraft, customerName: message };
      setCheckoutDraft(nextDraft);
      setCheckoutStep("phone");
      appendAssistantMessage({ content: "ขอเบอร์โทรศัพท์สำหรับติดต่อกลับค่ะ" });
      return true;
    }

    if (checkoutStep === "phone") {
      const phoneNumber = normalizePhoneNumber(message);
      if (!phoneNumber) {
        appendAssistantMessage({ content: "ขอเบอร์โทรให้ครบ 9-10 หลัก เช่น 0812345678 ค่ะ" });
        return true;
      }
      const nextDraft = { ...checkoutDraft, phoneNumber };
      setCheckoutDraft(nextDraft);
      setCheckoutStep("fulfillment");
      appendAssistantMessage({
        content: "ต้องการรับสินค้าแบบไหนคะ",
        quickReplies: ["จัดส่ง", "รับเอง"],
      });
      return true;
    }

    if (checkoutStep === "fulfillment") {
      const deliveryType: CheckoutDraft["deliveryType"] = /รับเอง|pickup/i.test(message) ? "pickup" : "delivery";
      const nextDraft = { ...checkoutDraft, deliveryType };
      setCheckoutDraft(nextDraft);
      if (deliveryType === "pickup") {
        setCheckoutStep("payment");
        appendAssistantMessage({
          content: "เลือกวิธีชำระเงินค่ะ",
          quickReplies: ["เงินสด", "โอนเงิน", "PromptPay"],
        });
      } else {
        setCheckoutStep("address");
        appendAssistantMessage({ content: "ขอที่อยู่สำหรับจัดส่งค่ะ ค่าส่งเริ่มต้น ฿20" });
      }
      return true;
    }

    if (checkoutStep === "address") {
      const nextDraft = { ...checkoutDraft, address: message };
      setCheckoutDraft(nextDraft);
      setCheckoutStep("payment");
      appendAssistantMessage({
        content: "เลือกวิธีชำระเงินค่ะ",
        quickReplies: ["เงินสด", "โอนเงิน", "PromptPay"],
      });
      return true;
    }

    if (checkoutStep === "payment") {
      const nextDraft = { ...checkoutDraft, paymentMethod: parsePaymentMethod(message) };
      setCheckoutDraft(nextDraft);
      setCheckoutStep("confirm");
      const deliveryFee = nextDraft.deliveryType === "delivery" ? 20 : 0;
      appendAssistantMessage({
        content: [
          buildCartSummary(cartItems, deliveryFee),
          "",
          `ชื่อ: ${nextDraft.customerName}`,
          `โทร: ${nextDraft.phoneNumber}`,
          `รับสินค้า: ${nextDraft.deliveryType === "delivery" ? "จัดส่ง" : "รับเอง"}`,
          nextDraft.deliveryType === "delivery" ? `ที่อยู่: ${nextDraft.address}` : null,
          `ชำระเงิน: ${paymentMethodLabel(nextDraft.paymentMethod)}`,
          "",
          'พิมพ์ "ตกลง" เพื่อยืนยัน หรือ "ยกเลิก" เพื่อยกเลิกขั้นตอนนี้',
        ]
          .filter(Boolean)
          .join("\n"),
        quickReplies: ["ตกลง", "ยกเลิก"],
      });
      return true;
    }

    if (checkoutStep === "confirm") {
      if (!isConfirmIntent(message)) {
        appendAssistantMessage({ content: 'ถ้าต้องการส่งออเดอร์ พิมพ์ "ตกลง" หรือพิมพ์ "ยกเลิก" ได้ค่ะ' });
        return true;
      }
      await submitChatOrder(checkoutDraft);
      return true;
    }

    return false;
  };

  const sendMessage = async (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || isLoading) {
      return;
    }

    const nextUserMessage: UiMessage = {
      id: createMessageId("u"),
      role: "user",
      content: message,
    };

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, nextUserMessage]);
    scrollToBottom();

    try {
      if (checkoutStep !== "idle") {
        const handled = await handleCheckoutMessage(message);
        if (handled) {
          setIsLoading(false);
          return;
        }
      }

      if (isCheckoutIntent(message)) {
        startCheckout();
        setIsLoading(false);
        return;
      }

      const orderRequest = parseOrderRequest(message, availableMenuItems);
      if (orderRequest && onAddToCart) {
        addSuggestedItem(orderRequest.item, orderRequest.quantity);
        setIsLoading(false);
        return;
      }

      if (isOrderingIntent(message)) {
        const aiMessage: UiMessage = {
          id: createMessageId("a"),
          role: "assistant",
          content: "ได้เลยค่ะ ต้องการเมนูไหนคะ เลือกจากรายการด้านล่างแล้วกดเพิ่มลงตะกร้าได้เลย",
          menuItems: pickSuggestedMenuItems(message, availableMenuItems),
        };

        setMessages((prev) => [...prev, aiMessage]);
        scrollToBottom();
        setIsLoading(false);
        return;
      }

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
            id: createMessageId("a"),
            role: "assistant",
            content: fallbackMenuAnswer ?? data.answer,
            guarded: data.guarded,
            menuItems: isMenuQuestion(message) ? pickSuggestedMenuItems(message, availableMenuItems) : undefined,
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
        id: createMessageId("a"),
        role: "assistant",
        content: fallbackMenuAnswer ?? data.answer,
        guarded: data.guarded,
        menuItems: isMenuQuestion(message) ? pickSuggestedMenuItems(message, availableMenuItems) : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId("a"),
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
                  {message.menuItems && message.menuItems.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      {message.menuItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-background/80 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                <span className="mr-1">{item.emoji}</span>
                                {item.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>
                              <p className="text-xs font-semibold text-primary mt-0.5">฿{item.price}</p>
                            </div>
                            <button
                              onClick={() => addSuggestedItem(item)}
                              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                            >
                              <Plus className="h-3 w-3" />
                              เพิ่ม
                            </button>
                          </div>
                        </div>
                      ))}
                      {onOpenCart && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={startCheckout}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            ยืนยันในแชท
                          </button>
                          <button
                            onClick={onOpenCart}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            ดูตะกร้า
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {message.quickReplies && message.quickReplies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => void sendMessage(reply)}
                          disabled={isLoading}
                          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
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
        onClick={() => {
          if (!open) {
            onOpenChat?.();
          }
          setOpen((prev) => !prev);
        }}
        style={{ bottom: btnBottom }}
        className="fixed right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-content-center transition-[bottom] duration-300"
        aria-label="toggle chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </>
  );
}
