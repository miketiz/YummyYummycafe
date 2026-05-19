import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  delivery_fee: number | null;
  delivery_type: string;
  payment_status: string;
  created_at: string;
  customers?: {
    name: string;
    phone_number: string;
  } | null;
  order_items?: Array<{
    id: string;
    menu_item_name: string;
    menu_item_emoji?: string | null;
    quantity: number;
    unit_price: number;
    subtotal?: number | null;
  }>;
};

type HourSummary = { hour: string; orders: number };
type TopItemSummary = { name: string; revenue: number };
type BestsellerSummary = { name: string; sold: number; goal: number; emoji: string };

function formatBangkokDate(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

function startOfBangkokDay(date = new Date()) {
  const d = formatBangkokDate(date);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000);
}

function startOfBangkokMonth(date = new Date()) {
  const d = formatBangkokDate(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000);
}

function dayKey(date: Date) {
  return formatBangkokDate(date).toISOString().slice(0, 10);
}

function hourKey(date: Date) {
  return String(formatBangkokDate(date).getUTCHours()).padStart(2, "0");
}

function isBeverageItem(name: string) {
  return /(กาแฟ|ลาเต้|อเมริกาโน|americano|latte|mocha|cappuccino|tea|ชา|โกโก้|cocoa|milk|matcha|smoothie|juice|drink|เครื่องดื่ม)/i.test(
    name,
  );
}

function formatItemList(orderItems?: OrderRow["order_items"]) {
  return (
    orderItems?.map((item) => `${item.menu_item_name} × ${item.quantity}`).join(", ") || "-"
  );
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          total_price,
          delivery_fee,
          delivery_type,
          payment_status,
          created_at,
          customers(name, phone_number),
          order_items(id, menu_item_name, menu_item_emoji, quantity, unit_price, subtotal)
        `,
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Admin summary fetch error:", error);
      return NextResponse.json({ error: "Failed to load admin summary" }, { status: 500 });
    }

    const rows = (orders || []) as OrderRow[];
    const now = new Date();
    const todayStart = startOfBangkokDay(now);
    const monthStart = startOfBangkokMonth(now);

    const todayOrders = rows.filter((order) => new Date(order.created_at) >= todayStart);
    const monthOrders = rows.filter((order) => new Date(order.created_at) >= monthStart);

    const sumRevenue = (list: OrderRow[]) =>
      list.reduce((sum, order) => sum + Number(order.total_price || 0), 0);

    const sumCountByPayment = (list: OrderRow[], status: string) =>
      list.filter((order) => order.payment_status === status).length;

    const statusCounts = (list: OrderRow[]) =>
      list.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

        const dailyMap = new Map<string, { day: string; orders: number; revenue: number }>();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = dayKey(date);
      const label = new Date(date.getTime() + 7 * 60 * 60 * 1000).toLocaleDateString("th-TH", {
        weekday: "short",
      });
      dailyMap.set(key, { day: label, orders: 0, revenue: 0 });
    }

    const hourlyMap = new Map<string, number>();
    for (let hour = 7; hour <= 18; hour += 1) {
      hourlyMap.set(String(hour).padStart(2, "0"), 0);
    }

    const itemRevenueMap = new Map<string, TopItemSummary>();
    const bestsellerMap = new Map<string, { sold: number; emoji: string }>();
    let bakeryRevenue = 0;
    let beverageRevenue = 0;

    for (const order of rows) {
      const createdAt = new Date(order.created_at);
      const key = dayKey(createdAt);
      if (dailyMap.has(key)) {
        const current = dailyMap.get(key)!;
        current.orders += 1;
        current.revenue += Number(order.total_price || 0);
      }

      if (new Date(order.created_at) >= todayStart) {
        const hour = hourKey(createdAt);
        if (hourlyMap.has(hour)) {
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        }
      }

      for (const item of order.order_items || []) {
        const revenue = Number(item.unit_price || 0) * Number(item.quantity || 0);
        const itemKey = item.menu_item_name;
        const current = itemRevenueMap.get(itemKey) || { name: itemKey, revenue: 0 };
        current.revenue += revenue;
        itemRevenueMap.set(itemKey, current);

        const bestseller = bestsellerMap.get(itemKey) || { sold: 0, emoji: item.menu_item_emoji || "•" };
        bestseller.sold += Number(item.quantity || 0);
        bestseller.emoji = item.menu_item_emoji || bestseller.emoji;
        bestsellerMap.set(itemKey, bestseller);

        if (isBeverageItem(item.menu_item_name)) {
          beverageRevenue += revenue;
        } else {
          bakeryRevenue += revenue;
        }
      }
    }

    const dailySeries = Array.from(dailyMap.values());
    const hourlySeries: HourSummary[] = Array.from(hourlyMap.entries()).map(([hour, orders]) => ({
      hour,
      orders,
    }));

    const topItems = Array.from(itemRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const todayBestsellers: BestsellerSummary[] = Array.from(bestsellerMap.entries())
      .sort((a, b) => b[1].sold - a[1].sold)
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        sold: value.sold,
        goal: Math.max(value.sold + 2, value.sold + (index === 0 ? 2 : 3)),
        emoji: value.emoji,
      }));

    const recentOrders = rows.slice(0, 7).map((order) => ({
      id: order.order_number,
      items: formatItemList(order.order_items),
      total: Number(order.total_price || 0),
      time: formatBangkokDate(new Date(order.created_at)).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status:
        order.status === "delivered"
          ? "completed"
          : ["confirmed", "preparing", "ready"].includes(order.status)
            ? "processing"
            : "pending",
    }));

    const todayRevenue = sumRevenue(todayOrders);
    const monthRevenue = sumRevenue(monthOrders);
    const paidToday = sumCountByPayment(todayOrders, "paid");
    const unpaidToday = sumCountByPayment(todayOrders, "unpaid");
    const paidMonth = sumCountByPayment(monthOrders, "paid");
    const unpaidMonth = sumCountByPayment(monthOrders, "unpaid");

    return NextResponse.json({
      asOf: new Date().toISOString(),
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        paid: paidToday,
        unpaid: unpaidToday,
        statuses: statusCounts(todayOrders),
      },
      month: {
        orders: monthOrders.length,
        revenue: monthRevenue,
        paid: paidMonth,
        unpaid: unpaidMonth,
        statuses: statusCounts(monthOrders),
      },
      trends: {
        dailyOrders: dailySeries.map((item) => item.orders),
        dailyRevenue: dailySeries.map((item) => item.revenue),
        hourlyOrders: hourlySeries.map((item) => item.orders),
        bakeryRevenue,
        beverageRevenue,
      },
      dailySeries,
      hourlySeries,
      topItems,
      todayBestsellers,
      recentOrders,
    });
  } catch (error) {
    console.error("Admin summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
