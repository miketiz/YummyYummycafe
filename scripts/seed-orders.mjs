#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
loadEnvFile(path.join(root, ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env. Need NEXT_PUBLIC_SUPABASE_URL and a Supabase key.");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${pathname} failed: ${response.status} ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function insertCustomer(customer) {
  // check existing by phone_number to avoid unique constraint errors
  const phone = encodeURIComponent(customer.phone_number || "");
  const existing = await supabaseRequest(
    `customers?select=id,name,phone_number&phone_number=eq.${phone}`
  );

  if (existing && existing.length > 0) {
    return existing[0];
  }

  const [row] = await supabaseRequest("customers?select=id,name,phone_number", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(customer),
  });

  return row;
}

async function insertOrder(order) {
  const [row] = await supabaseRequest("orders?select=*", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(order),
  });

  return row;
}

async function insertOrderItems(items) {
  await supabaseRequest("order_items", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(items),
  });
}

async function updateOrder(orderId, patch) {
  await supabaseRequest(`orders?id=eq.${orderId}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
}

const seedOrders = [
  {
    customer: {
      phone_number: "0890000001",
      name: "คุณแอน",
      address: "123 ถนนตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร",
    },
    order: {
      delivery_type: "delivery",
      delivery_address: "123 ถนนตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร",
      delivery_fee: 40,
      payment_method: "promptpay",
      payment_status: "paid",
      notes: "ไม่รับช้อนพลาสติก",
    },
    status: "confirmed",
    items: [
      { menu_item_name: "Croissant Butter", menu_item_emoji: "🥐", quantity: 2, unit_price: 55 },
      { menu_item_name: "Americano", menu_item_emoji: "☕", quantity: 1, unit_price: 65 },
    ],
  },
  {
    customer: {
      phone_number: "0890000002",
      name: "คุณบี",
      address: "45/7 หมู่บ้านตัวอย่าง",
    },
    order: {
      delivery_type: "pickup",
      payment_method: "cash",
      payment_status: "unpaid",
      notes: "รับตอน 10:30",
    },
    status: "preparing",
    items: [
      { menu_item_name: "Blueberry Muffin", menu_item_emoji: "🫐", quantity: 3, unit_price: 45 },
      { menu_item_name: "Milk Tea", menu_item_emoji: "🧋", quantity: 2, unit_price: 70 },
    ],
  },
  {
    customer: {
      phone_number: "0890000003",
      name: "คุณซี",
      address: "88 อาคาร A ชั้น 3",
    },
    order: {
      delivery_type: "delivery",
      delivery_address: "88 อาคาร A ชั้น 3",
      delivery_fee: 30,
      payment_method: "bank_transfer",
      payment_status: "paid",
      notes: "ฝากไว้หน้าป้อม รปภ.",
    },
    status: "ready",
    items: [
      { menu_item_name: "Cheese Cake", menu_item_emoji: "🍰", quantity: 1, unit_price: 95 },
      { menu_item_name: "Latte", menu_item_emoji: "☕", quantity: 2, unit_price: 75 },
    ],
  },
  {
    customer: {
      phone_number: "0890000004",
      name: "คุณดี",
      address: "ซอยสุขใจ 9",
    },
    order: {
      delivery_type: "pickup",
      payment_method: "cash",
      payment_status: "unpaid",
      notes: "",
    },
    status: "pending",
    items: [
      { menu_item_name: "Banana Bread", menu_item_emoji: "🍞", quantity: 1, unit_price: 75 },
      { menu_item_name: "Espresso", menu_item_emoji: "☕", quantity: 2, unit_price: 55 },
    ],
  },
  {
    customer: {
      phone_number: "0890000005",
      name: "คุณอี",
      address: "100/1 แขวงตัวอย่าง เขตเมือง",
    },
    order: {
      delivery_type: "delivery",
      delivery_address: "100/1 แขวงตัวอย่าง เขตเมือง",
      delivery_fee: 50,
      payment_method: "card",
      payment_status: "paid",
      notes: "ไม่มีน้ำตาล",
    },
    status: "delivered",
    items: [
      { menu_item_name: "Iced Latte", menu_item_emoji: "🧊☕", quantity: 1, unit_price: 95 },
      { menu_item_name: "Chocolate Cookie", menu_item_emoji: "🍪", quantity: 2, unit_price: 40 },
    ],
  },
  {
    customer: {
      phone_number: "0890000006",
      name: "คุณเอฟ",
      address: "ตึก B ห้อง 12",
    },
    order: {
      delivery_type: "pickup",
      payment_method: "card",
      payment_status: "paid",
      notes: "เอาแก้วผ้าได้ไหม",
    },
    status: "ready",
    items: [
      { menu_item_name: "Matcha Frappé", menu_item_emoji: "🍵", quantity: 1, unit_price: 120 },
    ],
  },
  {
    customer: {
      phone_number: "0890000007",
      name: "คุณจี",
      address: "หมู่บ้านสวนสวย",
    },
    order: {
      delivery_type: "delivery",
      delivery_address: "หมู่บ้านสวนสวย",
      delivery_fee: 35,
      payment_method: "promptpay",
      payment_status: "unpaid",
      notes: "โทรก่อนมาส่ง",
    },
    status: "pending",
    items: [
      { menu_item_name: "Ham Sandwich", menu_item_emoji: "🥪", quantity: 2, unit_price: 85 },
      { menu_item_name: "Orange Juice", menu_item_emoji: "🍊", quantity: 1, unit_price: 60 },
    ],
  },
  {
    customer: {
      phone_number: "0890000008",
      name: "คุณเอช",
      address: "ชั้น 5 คอนโด X",
    },
    order: {
      delivery_type: "delivery",
      delivery_address: "ชั้น 5 คอนโด X",
      delivery_fee: 30,
      payment_method: "bank_transfer",
      payment_status: "paid",
      notes: "วางไว้หน้าห้อง",
    },
    status: "delivered",
    items: [
      { menu_item_name: "Vegan Salad", menu_item_emoji: "🥗", quantity: 1, unit_price: 110 },
    ],
  },
  {
    customer: {
      phone_number: "0890000009",
      name: "คุณไอ",
      address: "ตลาดนัดกลางคืน",
    },
    order: {
      delivery_type: "pickup",
      payment_method: "cash",
      payment_status: "paid",
      notes: "รับที่ซุ้ม B",
    },
    status: "completed",
    items: [
      { menu_item_name: "Iced Americano", menu_item_emoji: "🧊☕", quantity: 2, unit_price: 70 },
      { menu_item_name: "Cookie", menu_item_emoji: "🍪", quantity: 1, unit_price: 35 },
    ],
  },
  {
    customer: {
      phone_number: "0890000010",
      name: "คุณเจ",
      address: "สวนสาธารณะ",
    },
    order: {
      delivery_type: "delivery",
      delivery_address: "สวนสาธารณะ",
      delivery_fee: 45,
      payment_method: "card",
      payment_status: "paid",
      notes: "ขอถ้วยแยกน้ำเชื่อม",
    },
    status: "confirmed",
    items: [
      { menu_item_name: "Cappuccino", menu_item_emoji: "☕", quantity: 1, unit_price: 85 },
      { menu_item_name: "Lemon Tart", menu_item_emoji: "🍰", quantity: 1, unit_price: 95 },
    ],
  },
];

async function main() {
  const createdOrders = [];

  for (const entry of seedOrders) {
    const customer = await insertCustomer(entry.customer);

    const itemsSubtotal = entry.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const deliveryFee = entry.order.delivery_type === "delivery" ? (entry.order.delivery_fee || 0) : 0;

    const order = await insertOrder({
      customer_id: customer.id,
      order_number: `SEED-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "pending",
      total_price: itemsSubtotal + deliveryFee,
      delivery_fee: deliveryFee,
      delivery_type: entry.order.delivery_type,
      delivery_address: entry.order.delivery_address || null,
      notes: entry.order.notes || null,
      payment_method: entry.order.payment_method,
      payment_status: entry.order.payment_status,
    });

    await insertOrderItems(
      entry.items.map((item) => ({
        order_id: order.id,
        menu_item_name: item.menu_item_name,
        menu_item_emoji: item.menu_item_emoji,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      }))
    );

    if (entry.status !== "pending") {
      await updateOrder(order.id, {
        status: entry.status,
        payment_status: entry.order.payment_status,
      });
    }

    createdOrders.push({
      order_number: order.order_number,
      status: entry.status,
      customer: entry.customer.name,
      total_price: itemsSubtotal + deliveryFee,
    });
  }

  console.log("Seed complete:");
  console.table(createdOrders);
}

main().catch((error) => {
  console.error("Seed failed:", error.message || error);
  process.exit(1);
});
