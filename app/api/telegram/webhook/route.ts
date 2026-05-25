import { NextResponse } from "next/server";
import { syncOrderStatusToGoogleSheet } from "@/lib/google-sheets/orders";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const BANGKOK_TIME_ZONE = "Asia/Bangkok";

type TelegramMessage = {
  text?: string;
  chat?: {
    id?: number | string;
  };
};

type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

type OrderItemRecord = {
  menu_item_name?: string | null;
  menu_item_emoji?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  subtotal?: number | null;
};

type OrderRecord = {
  id?: string;
  order_number?: string | null;
  status?: string | null;
  total_price?: number | string | null;
  payment_status?: string | null;
  created_at?: string | null;
  customers?:
    | {
        name?: string | null;
        phone_number?: string | null;
      }
    | Array<{
        name?: string | null;
        phone_number?: string | null;
      }>
    | null;
  order_items?: OrderItemRecord[] | null;
};

type ItemSummary = {
  name: string;
  emoji: string;
  quantity: number;
  revenue: number;
};

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

type OrderAction = {
  orderNumber: string;
  patch: {
    status?: OrderStatus;
    payment_status?: "unpaid" | "paid";
  };
  label: string;
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

const PAYMENT_STATUS_LABELS: Record<"unpaid" | "paid", string> = {
  unpaid: "รอชำระเงิน",
  paid: "ชำระเงินแล้ว",
};

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
}

function getAdminChatIds() {
  return [
    process.env.TELEGRAM_CHAT_ID,
    process.env.CHAT_ID,
    process.env.TELEGRAM_ADMIN_CHAT_IDS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAdminChat(chatId: number | string) {
  const allowedChatIds = getAdminChatIds();
  return allowedChatIds.length > 0 && allowedChatIds.includes(String(chatId));
}

function toBangkokDate(date: Date) {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS);
}

function bangkokStartOfDay(date = new Date()) {
  const shifted = toBangkokDate(date);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - BANGKOK_OFFSET_MS);
}

function formatBangkokDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: BANGKOK_TIME_ZONE,
  }).format(date);
}

function formatBangkokTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BANGKOK_TIME_ZONE,
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function safeNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/().,]+/g, "")
    .trim();
}

function getCustomer(order: OrderRecord) {
  return Array.isArray(order.customers) ? order.customers[0] : order.customers;
}

function getReportRange(text: string) {
  const todayStart = bangkokStartOfDay();

  if (/เมื่อวาน|yesterday/i.test(text)) {
    const end = todayStart;
    return {
      label: "เมื่อวาน",
      start: new Date(end.getTime() - 24 * 60 * 60 * 1000),
      end,
    };
  }

  if (/สัปดาห์|week|7\s*วัน/i.test(text)) {
    return {
      label: "7 วันที่ผ่านมา",
      start: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
      end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  return {
    label: "วันนี้",
    start: todayStart,
    end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
  };
}

function buildHelpMessage() {
  return [
    "คำสั่งหลังบ้านที่ใช้ได้:",
    "- สรุปยอดวันนี้",
    "- สรุปยอดเมื่อวาน",
    "- สรุปยอด 7 วัน",
    "- ออเดอร์ค้าง",
    "- ออเดอร์ที่ยังไม่จัดส่ง",
    "- ออเดอร์ล่าสุด",
    "- เมนูขายดีวันนี้",
    "- วันนี้มีออเดอร์กี่รายการ",
    "- ออเดอร์ที่ยังไม่ชำระ",
    "- ชำระแล้ว ORD-20260524-001",
    "- รอชำระ ORD-20260524-001",
    "- ส่งแล้ว ORD-20260524-001",
    "- ยกเลิก ORD-20260524-001",
    "",
    "พิมพ์เป็นภาษาธรรมชาติได้ เช่น “ช่วยบอกออเดอร์ที่ยังไม่จัดส่งที”",
    "บอท Telegram นี้สงวนไว้สำหรับหลังบ้านเท่านั้น ส่วนแชทหน้าเว็บยังเป็นโหมดลูกค้าเหมือนเดิม",
  ].join("\n");
}

function buildSalesSummary(orders: OrderRecord[], label: string, start: Date, end: Date) {
  const itemMap = new Map<string, ItemSummary>();
  const statusCounts = new Map<string, number>();
  let revenue = 0;
  let paidRevenue = 0;
  let itemsSold = 0;

  for (const order of orders) {
    const totalPrice = safeNumber(order.total_price);
    revenue += totalPrice;

    const status = pickString(order.status, "unknown").toLowerCase();
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    const paymentStatus = pickString(order.payment_status).toLowerCase();
    if (paymentStatus === "paid" || paymentStatus === "completed") {
      paidRevenue += totalPrice;
    }

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    for (const item of items) {
      const name = pickString(item.menu_item_name, "ไม่ระบุเมนู");
      const quantity = Math.max(1, Math.round(safeNumber(item.quantity, 1)));
      const subtotal = safeNumber(item.subtotal, quantity * safeNumber(item.unit_price));
      const key = normalizeName(name);
      const current = itemMap.get(key) ?? {
        name,
        emoji: pickString(item.menu_item_emoji),
        quantity: 0,
        revenue: 0,
      };

      current.quantity += quantity;
      current.revenue += subtotal;
      current.emoji = current.emoji || pickString(item.menu_item_emoji);
      itemMap.set(key, current);
      itemsSold += quantity;
    }
  }

  const topItems = Array.from(itemMap.values())
    .sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue)
    .slice(0, 5);

  const statusLine = Array.from(statusCounts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ");

  const endDisplay = new Date(end.getTime() - 60 * 1000);
  const topItemLines = topItems.length
    ? topItems.map((item, index) => {
        const emoji = item.emoji ? `${item.emoji} ` : "";
        return `${index + 1}. ${emoji}${item.name} x${item.quantity} (${formatCurrency(item.revenue)})`;
      })
    : ["ยังไม่มีรายการขายในช่วงนี้"];

  return [
    `สรุปยอดขาย${label}`,
    `${formatBangkokDate(start)} ${formatBangkokTime(start)}-${formatBangkokTime(endDisplay)}`,
    "",
    `ยอดขายรวม: ${formatCurrency(revenue)}`,
    `ยอดชำระแล้ว: ${formatCurrency(paidRevenue)}`,
    `จำนวนออเดอร์: ${orders.length}`,
    `จำนวนสินค้าที่ขาย: ${itemsSold}`,
    `ค่าเฉลี่ยต่อออเดอร์: ${formatCurrency(orders.length > 0 ? revenue / orders.length : 0)}`,
    "",
    "เมนูขายดี:",
    ...topItemLines,
    "",
    `สถานะออเดอร์: ${statusLine || "ไม่มีข้อมูล"}`,
  ].join("\n");
}

function buildOrderList(title: string, orders: OrderRecord[]) {
  if (orders.length === 0) {
    return `${title}\nไม่มีรายการ`;
  }

  return [
    title,
    ...orders.slice(0, 10).map((order, index) => {
      const customer = getCustomer(order);
      const createdAt = order.created_at ? new Date(order.created_at) : null;
      const time = createdAt ? formatBangkokTime(createdAt) : "-";
      const name = pickString(customer?.name, "ไม่ระบุชื่อ");
      const phone = pickString(customer?.phone_number);
      const contact = phone ? `${name} (${phone})` : name;

      return [
        `${index + 1}. #${pickString(order.order_number, order.id)}`,
        `เวลา: ${time}`,
        `ลูกค้า: ${contact}`,
        `ยอด: ${formatCurrency(safeNumber(order.total_price))}`,
        `สถานะ: ${pickString(order.status, "pending")}`,
      ].join(" | ");
    }),
  ].join("\n");
}

function extractOrderNumber(text: string) {
  const match = text.match(/#?(ORD-\d{6,8}-\d{1,5})/i);
  return match?.[1]?.toUpperCase();
}

function parseOrderAction(text: string): OrderAction | null {
  const orderNumber = extractOrderNumber(text);
  if (!orderNumber) return null;

  if (/ชำระแล้ว|จ่ายแล้ว|รับเงินแล้ว|paid|mark\s*paid/i.test(text)) {
    return { orderNumber, patch: { payment_status: "paid" }, label: PAYMENT_STATUS_LABELS.paid };
  }

  if (/รอชำระ|ยังไม่ชำระ|ยังไม่จ่าย|unpaid|mark\s*unpaid/i.test(text)) {
    return { orderNumber, patch: { payment_status: "unpaid" }, label: PAYMENT_STATUS_LABELS.unpaid };
  }

  if (/ยืนยัน|confirm/i.test(text)) {
    return { orderNumber, patch: { status: "confirmed" }, label: ORDER_STATUS_LABELS.confirmed };
  }

  if (/กำลังเตรียม|กำลังทำ|prepar/i.test(text)) {
    return { orderNumber, patch: { status: "preparing" }, label: ORDER_STATUS_LABELS.preparing };
  }

  if (/พร้อมส่ง|พร้อมรับ|ready/i.test(text)) {
    return { orderNumber, patch: { status: "ready" }, label: ORDER_STATUS_LABELS.ready };
  }

  if (/ส่งแล้ว|จัดส่งแล้ว|delivered|done/i.test(text)) {
    return { orderNumber, patch: { status: "delivered" }, label: ORDER_STATUS_LABELS.delivered };
  }

  if (/ยกเลิก|cancel/i.test(text)) {
    return { orderNumber, patch: { status: "cancelled" }, label: ORDER_STATUS_LABELS.cancelled };
  }

  return null;
}

function isHelpIntent(text: string) {
  return /^\/?(start|help|commands)|ช่วย|คำสั่ง|ใช้ยังไง|ทำอะไรได้/i.test(text);
}

function isPendingOrderIntent(text: string) {
  return /ค้าง|ยังไม่จัดส่ง|ยังไม่ได้จัดส่ง|ยังไม่ส่ง|รอส่ง|รอดำเนินการ|กำลังเตรียม|กำลังทำ|ต้องส่ง|ยังไม่เสร็จ|pending|confirmed|preparing|ready|undelivered|open\s*orders?/i.test(text);
}

function isRecentOrderIntent(text: string) {
  return /ล่าสุด|ออเดอร์ใหม่|รายการใหม่|recent|last/i.test(text);
}

function isUnpaidOrderIntent(text: string) {
  return /ยังไม่ชำระ|รอชำระ|ค้างชำระ|ยังไม่จ่าย|unpaid|pending\s*payment/i.test(text);
}

function isSalesIntent(text: string) {
  return /สรุปยอด|ยอดขาย|รายได้|ขายได้|ยอดวันนี้|ยอดเมื่อวาน|กี่บาท|กี่ออเดอร์|เมนูขายดี|best|sales|revenue/i.test(text);
}

async function fetchOrders(start: Date, end: Date) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        total_price,
        payment_status,
        created_at,
        customers(name, phone_number),
        order_items(menu_item_name, menu_item_emoji, quantity, unit_price, subtotal)
      `,
    )
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrderRecord[];
}

async function fetchPendingOrders() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        total_price,
        payment_status,
        created_at,
        customers(name, phone_number)
      `,
    )
    .in("status", ["pending", "confirmed", "preparing", "ready"])
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrderRecord[];
}

async function fetchRecentOrders() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        total_price,
        payment_status,
        created_at,
        customers(name, phone_number)
      `,
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrderRecord[];
}

async function fetchUnpaidOrders() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        total_price,
        payment_status,
        created_at,
        customers(name, phone_number)
      `,
    )
    .eq("payment_status", "unpaid")
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrderRecord[];
}

async function applyOrderAction(action: OrderAction) {
  const supabase = await createServerSupabaseClient();
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total_price, customers(name, phone_number)")
    .ilike("order_number", action.orderNumber)
    .single();

  if (fetchError || !order) {
    return `ไม่พบออเดอร์ ${action.orderNumber}`;
  }

  const current = order as OrderRecord;
  if (current.status === "cancelled") {
    return `ออเดอร์ ${action.orderNumber} ถูกยกเลิกแล้ว จึงไม่สามารถอัปเดตได้`;
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update(action.patch)
    .eq("id", current.id)
    .select("id, order_number, status, payment_status, total_price, customers(name, phone_number)")
    .single();

  if (updateError || !updatedOrder) {
    throw updateError || new Error("Failed to update order");
  }

  const updated = updatedOrder as OrderRecord;
  syncOrderStatusToGoogleSheet({
    orderNumber: pickString(updated.order_number, action.orderNumber),
    orderStatus: pickString(updated.status),
    paymentStatus: pickString(updated.payment_status) as "unpaid" | "paid",
    adminNote: `Telegram: ${action.label}`,
  }).catch((error) => {
    console.error("Google Sheet Telegram status sync error:", error);
  });

  const customer = getCustomer(updated);
  return [
    `อัปเดต ${action.orderNumber} สำเร็จ`,
    `คำสั่ง: ${action.label}`,
    `ลูกค้า: ${pickString(customer?.name, "ไม่ระบุชื่อ")}`,
    `ยอด: ${formatCurrency(safeNumber(updated.total_price))}`,
    `สถานะออเดอร์: ${ORDER_STATUS_LABELS[pickString(updated.status, "pending") as OrderStatus] ?? pickString(updated.status, "pending")}`,
    `สถานะชำระเงิน: ${PAYMENT_STATUS_LABELS[pickString(updated.payment_status, "unpaid") as "unpaid" | "paid"] ?? pickString(updated.payment_status, "unpaid")}`,
  ].join("\n");
}

async function buildAdminAnswer(text: string) {
  const orderAction = parseOrderAction(text);
  if (orderAction) {
    return applyOrderAction(orderAction);
  }

  if (isHelpIntent(text)) {
    return buildHelpMessage();
  }

  if (isPendingOrderIntent(text)) {
    const orders = await fetchPendingOrders();
    return buildOrderList("ออเดอร์ที่ยังไม่จัดส่ง/กำลังดำเนินการ", orders);
  }

  if (isRecentOrderIntent(text)) {
    const orders = await fetchRecentOrders();
    return buildOrderList("ออเดอร์ล่าสุด", orders);
  }

  if (isUnpaidOrderIntent(text)) {
    const orders = await fetchUnpaidOrders();
    return buildOrderList("ออเดอร์ที่ยังไม่ชำระเงิน", orders);
  }

  if (!isSalesIntent(text)) {
    return [
      "ผมยังตีความคำถามหลังบ้านนี้ไม่ชัดครับ",
      "ลองถามเป็นคำสั่ง เช่น:",
      "- ช่วยบอกออเดอร์ที่ยังไม่จัดส่งที",
      "- สรุปยอดวันนี้",
      "- ออเดอร์ล่าสุด",
      "- เมนูขายดีวันนี้",
    ].join("\n");
  }

  const range = getReportRange(text);
  const orders = await fetchOrders(range.start, range.end);
  return buildSalesSummary(orders, range.label, range.start, range.end);
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  const botToken = getBotToken();
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN or BOT_TOKEN not configured");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      console.error("sendTelegramMessage failed", res.status, details);
    }

    return res.ok;
  } catch (err) {
    console.error("sendTelegramMessage error", err);
    return false;
  }
}

export async function POST(req: Request) {
  const secretHeader =
    req.headers.get("x-telegram-bot-api-secret-token") ||
    req.headers.get("x-telegram-secret");

  if (!TELEGRAM_WEBHOOK_SECRET || secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const message = update.message || update.edited_message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    if (text && chatId) {
      if (!isAdminChat(chatId)) {
        await sendTelegramMessage(chatId, "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลหลังบ้าน");
        return NextResponse.json({ ok: true, skipped: "non-admin-chat" });
      }

      const answer = await buildAdminAnswer(text);
      await sendTelegramMessage(chatId, answer);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("telegram webhook handler error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
