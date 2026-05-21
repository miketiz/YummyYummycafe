import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  total_price?: number | null;
  payment_status?: string | null;
  created_at?: string | null;
  order_items?: OrderItemRecord[] | null;
};

type ItemSummary = {
  name: string;
  emoji: string;
  quantity: number;
  revenue: number;
};

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const TELEGRAM_API_BASE = "https://api.telegram.org";

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
    dateStyle: "full",
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

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/().,]+/g, "")
    .trim();
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function buildSalesReportMessage(orders: OrderRecord[], reportStart: Date, reportEnd: Date) {
  const itemMap = new Map<string, ItemSummary>();
  const statusCounts = new Map<string, number>();

  let revenue = 0;
  let paidRevenue = 0;
  let itemsSold = 0;
  let paidOrders = 0;
  let cancelledOrders = 0;

  for (const order of orders) {
    const totalPrice = safeNumber(order.total_price);
    revenue += totalPrice;

    const status = pickString(order.status).toLowerCase() || "unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    if (status === "cancelled") {
      cancelledOrders += 1;
    }

    const paymentStatus = pickString(order.payment_status).toLowerCase();
    if (paymentStatus === "paid" || paymentStatus === "completed") {
      paidRevenue += totalPrice;
      paidOrders += 1;
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

      current.name = name;
      current.emoji = current.emoji || pickString(item.menu_item_emoji);
      current.quantity += quantity;
      current.revenue += subtotal;
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

  const averageOrderValue = orders.length > 0 ? revenue / orders.length : 0;
  const reportDateLabel = formatBangkokDate(reportStart);
  const generatedAtLabel = formatBangkokTime(new Date());
  const reportEndDisplay = new Date(reportEnd.getTime() - 60 * 1000);
  const periodLabel = `${formatBangkokTime(reportStart)}-${formatBangkokTime(reportEndDisplay)}`;
  const topItemsLines = topItems.length
    ? topItems.map((item, index) => {
        const emoji = item.emoji ? `${item.emoji} ` : "";
        return `${index + 1}. ${emoji}${item.name} x${item.quantity} (${formatCurrency(item.revenue)})`;
      })
    : ["ยังไม่มีรายการขายในช่วงนี้"];

  return [
    `รายงานยอดขายรายวัน YummyYummy Cafe`,
    `${reportDateLabel} (${periodLabel})`,
    "",
    `ยอดขายรวม: ${formatCurrency(revenue)}`,
    `จำนวนออเดอร์: ${orders.length}`,
    `จำนวนสินค้าที่ขาย: ${itemsSold}`,
    `ค่าเฉลี่ยต่อออเดอร์: ${formatCurrency(averageOrderValue)}`,
    `ชำระเงินแล้ว: ${paidOrders} ออเดอร์ / ${formatCurrency(paidRevenue)}`,
    `ออเดอร์ยกเลิก: ${cancelledOrders}`,
    "",
    "เมนูขายดี:",
    ...topItemsLines,
    "",
    `สถานะออเดอร์: ${statusLine || "ไม่มีข้อมูล"}`,
    `ส่งรายงานเวลา ${generatedAtLabel} น.`,
  ].join("\n");
}

async function sendTelegramMessage(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Missing Telegram env: require TELEGRAM_BOT_TOKEN or BOT_TOKEN, and TELEGRAM_CHAT_ID or CHAT_ID");
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details}`);
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const reportEnd = bangkokStartOfDay();
    const reportStart = new Date(reportEnd.getTime() - 24 * 60 * 60 * 1000);

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
          order_items(menu_item_name, menu_item_emoji, quantity, unit_price, subtotal)
        `,
      )
      .gte("created_at", reportStart.toISOString())
      .lt("created_at", reportEnd.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch daily sales report orders", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const orders = (data ?? []) as OrderRecord[];
    const message = buildSalesReportMessage(orders, reportStart, reportEnd);
    await sendTelegramMessage(message);

    return NextResponse.json({
      ok: true,
      sent: true,
      orders: orders.length,
      reportStart: reportStart.toISOString(),
      reportEnd: reportEnd.toISOString(),
    });
  } catch (error) {
    console.error("Daily sales report cron failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Daily sales report failed" },
      { status: 500 },
    );
  }
}
