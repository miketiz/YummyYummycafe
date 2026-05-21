import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type MenuItemRecord = {
  id?: number;
  name?: string;
  category?: string | null;
  emoji?: string | null;
  in_stock?: boolean | null;
};

type OrderItemRecord = {
  menu_item_name?: string | null;
  menu_item_emoji?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
};

type OrderRecord = {
  id?: string;
  order_number?: string;
  status?: string | null;
  total_price?: number | null;
  created_at?: string | null;
  customer_id?: string | null;
  customers?: {
    id?: string | null;
    name?: string | null;
    phone_number?: string | null;
    created_at?: string | null;
  } | null;
  order_items?: OrderItemRecord[] | null;
};

type DailyPoint = { day: string; orders: number; revenue: number };
type HourPoint = { hour: string; orders: number };
type RevenuePoint = { name: string; revenue: number };
type BestsellerPoint = { name: string; sold: number; share: number; emoji: string };
type LowStockPoint = { name: string; remaining: number; unit: string; level: "critical" | "low" };

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function toBangkokDate(date: Date) {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS);
}

function bangkokStartOfDay(date = new Date()) {
  const shifted = toBangkokDate(date);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - BANGKOK_OFFSET_MS);
}

function bangkokDayKey(date: Date) {
  const shifted = toBangkokDate(date);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/().,]+/g, "")
    .trim();
}

function inferCategory(name: string): "bakery" | "beverage" {
  const normalized = normalizeName(name);
  if (
    normalized.includes("ลาเต้") ||
    normalized.includes("กาแฟ") ||
    normalized.includes("ชา") ||
    normalized.includes("matcha") ||
    normalized.includes("latte") ||
    normalized.includes("coffee") ||
    normalized.includes("tea") ||
    normalized.includes("juice")
  ) {
    return "beverage";
  }

  return "bakery";
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

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BANGKOK_TIME_ZONE,
  }).format(new Date(iso));
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    timeZone: BANGKOK_TIME_ZONE,
  }).format(date);
}

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const todayStart = bangkokStartOfDay();
  const sevenDaysAgo = bangkokStartOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

  const [totalOrdersRes, pendingOrdersRes, recentOrdersRes, menuItemsRes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          total_price,
          created_at,
          customer_id,
          customers(id, name, phone_number, created_at),
          order_items(id, menu_item_name, menu_item_emoji, quantity, unit_price)
        `,
      )
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(250),
    supabase.from("menu_items").select("id, name, category, emoji, in_stock").order("updated_at", { ascending: false }),
  ]);

  if (recentOrdersRes.error) {
    return NextResponse.json(
      { error: "Failed to fetch dashboard orders" },
      { status: 500 },
    );
  }

  const totalOrders = totalOrdersRes.count ?? 0;
  const pendingOrders = pendingOrdersRes.count ?? 0;
  const orders = (recentOrdersRes.data ?? []) as OrderRecord[];

  const menuItems = menuItemsRes.error || !Array.isArray(menuItemsRes.data)
    ? []
    : (menuItemsRes.data as MenuItemRecord[]);

  const categoryByName = new Map<string, "bakery" | "beverage">();
  for (const item of menuItems) {
    if (typeof item.name === "string" && item.name.trim()) {
      const category = item.category === "beverage" ? "beverage" : "bakery";
      categoryByName.set(normalizeName(item.name), category);
    }
  }

  const dailyMap = new Map<string, DailyPoint>();
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(sevenDaysAgo.getTime() + offset * 24 * 60 * 60 * 1000);
    dailyMap.set(bangkokDayKey(day), {
      day: formatDayLabel(day),
      orders: 0,
      revenue: 0,
    });
  }

  const hourlyMap = new Map<string, number>();
  for (let hour = 7; hour <= 21; hour += 1) {
    hourlyMap.set(String(hour), 0);
  }

  const topItems = new Map<string, RevenuePoint & { sold: number; emoji: string; category: "bakery" | "beverage" }>();
  const todayItems = new Map<string, RevenuePoint & { sold: number; emoji: string; category: "bakery" | "beverage" }>();
  const todayCustomers = new Map<string, { createdAt: string }>();
  const salesSplit = { bakery: 0, beverage: 0 };
  const todayStatusCounts = {
    delivered: 0,
    processing: 0,
    pending: 0,
  };
  let todayRevenue = 0;
  let weeklyRevenue = 0;
  let todayOrders = 0;

  for (const order of orders) {
    const createdAtRaw = order.created_at;
    if (!createdAtRaw) {
      continue;
    }

    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      continue;
    }

    const totalPrice = safeNumber(order.total_price);
    weeklyRevenue += totalPrice;

    const dayEntry = dailyMap.get(bangkokDayKey(createdAt));
    if (dayEntry) {
      dayEntry.orders += 1;
      dayEntry.revenue += totalPrice;
    }

    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
    for (const rawItem of orderItems) {
      const itemName = pickString(rawItem.menu_item_name);
      if (!itemName) {
        continue;
      }

      const quantity = Math.max(1, Math.round(safeNumber(rawItem.quantity, 1)));
      const unitPrice = safeNumber(rawItem.unit_price);
      const revenue = quantity * unitPrice;
      const emoji = pickString(rawItem.menu_item_emoji);
      const category = categoryByName.get(normalizeName(itemName)) ?? inferCategory(itemName);
      const key = normalizeName(itemName);

      salesSplit[category] += revenue;

      const topEntry = topItems.get(key) ?? {
        name: itemName,
        revenue: 0,
        sold: 0,
        emoji,
        category,
      };
      topEntry.name = itemName;
      topEntry.revenue += revenue;
      topEntry.sold += quantity;
      topEntry.emoji = topEntry.emoji || emoji;
      topEntry.category = category;
      topItems.set(key, topEntry);

      if (createdAt >= todayStart) {
        const todayEntry = todayItems.get(key) ?? {
          name: itemName,
          revenue: 0,
          sold: 0,
          emoji,
          category,
        };
        todayEntry.name = itemName;
        todayEntry.revenue += revenue;
        todayEntry.sold += quantity;
        todayEntry.emoji = todayEntry.emoji || emoji;
        todayEntry.category = category;
        todayItems.set(key, todayEntry);
      }
    }

    if (createdAt >= todayStart) {
      todayRevenue += totalPrice;
      todayOrders += 1;

      const hour = String(new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: BANGKOK_TIME_ZONE,
      }).format(createdAt)).padStart(2, "0");
      if (hourlyMap.has(hour)) {
        hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
      }

      const status = pickString(order.status).toLowerCase();
      if (status === "delivered") {
        todayStatusCounts.delivered += 1;
      } else if (status === "pending") {
        todayStatusCounts.pending += 1;
      } else if (status === "confirmed" || status === "preparing" || status === "ready") {
        todayStatusCounts.processing += 1;
      }

      const customer = order.customers;
      if (customer?.id) {
        todayCustomers.set(customer.id, {
          createdAt: pickString(customer.created_at),
        });
      }
    }
  }

  const todayCustomerIds = Array.from(todayCustomers.keys());
  const newCustomersToday = todayCustomerIds.filter((id) => {
    const createdAt = todayCustomers.get(id)?.createdAt;
    return createdAt ? new Date(createdAt) >= todayStart : false;
  }).length;

  const weeklyOrders = orders.length;
  const weeklyRevenueFromOrders = weeklyRevenue;
  const averageOrderValueToday = todayOrders > 0 ? todayRevenue / todayOrders : 0;

  const dailyData = Array.from(dailyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);

  const hourlyData = Array.from(hourlyMap.entries()).map(([hour, ordersCount]) => ({
    hour,
    orders: ordersCount,
  }));

  const topItemsData = Array.from(topItems.values())
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 6)
    .map(({ name, revenue }) => ({ name, revenue }));

  const totalTodaySold = Array.from(todayItems.values()).reduce((sum, item) => sum + item.sold, 0);
  const todayBestsellers = Array.from(todayItems.values())
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 5)
    .map(({ name, sold, emoji }) => ({
      name,
      sold,
      emoji: emoji || "🍞",
      share: totalTodaySold > 0 ? Math.round((sold / totalTodaySold) * 100) : 0,
    }));

  const recentOrders = orders
    .slice()
    .sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 10)
    .map((order) => {
      const items = Array.isArray(order.order_items) ? order.order_items : [];
      const itemLabel = items
        .map((item) => {
          const name = pickString(item.menu_item_emoji, item.menu_item_name);
          const label = pickString(item.menu_item_name);
          const qty = Math.max(1, Math.round(safeNumber(item.quantity, 1)));
          return `${name ? `${name} ` : ""}${label} × ${qty}`.trim();
        })
        .join(", ");

      return {
        id: `#${pickString(order.order_number)}`,
        items: itemLabel || "ไม่มีรายการ",
        total: safeNumber(order.total_price),
        time: order.created_at ? formatTime(order.created_at) : "-",
        status: pickString(order.status) || "pending",
      };
    });

  const lowStockItems: LowStockPoint[] = menuItems
    .filter((item) => item.in_stock === false && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      name: item.name as string,
      remaining: 0,
      unit: "ชิ้น",
      level: "critical" as const,
    }));

  return NextResponse.json({
    totalOrders,
    pendingOrders,
    todayOrders,
    weeklyOrders,
    todayRevenue,
    weeklyRevenue: weeklyRevenueFromOrders,
    averageOrderValueToday,
    customerStats: {
      totalToday: todayCustomerIds.length,
      newToday: newCustomersToday,
      returningToday: Math.max(0, todayCustomerIds.length - newCustomersToday),
    },
    statusCountsToday: todayStatusCounts,
    dailyData,
    hourlyData,
    topItemsData,
    todayBestsellers,
    lowStockItems,
    recentOrders,
    salesSplit,
    updatedAt: new Date().toISOString(),
  });
}