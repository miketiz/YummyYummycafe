const TELEGRAM_API_BASE = "https://api.telegram.org";

type NewOrderNotificationItem = {
  menu_item_name: string;
  menu_item_emoji?: string;
  quantity: number;
  unit_price: number;
};

type NewOrderNotificationInput = {
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  deliveryType: "delivery" | "pickup";
  deliveryAddress?: string;
  deliveryFee: number;
  totalPrice: number;
  paymentMethod?: string;
  notes?: string;
  items: NewOrderNotificationItem[];
};

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
}

function getNotificationChatIds() {
  return [
    process.env.TELEGRAM_ORDER_CHAT_ID,
    process.env.TELEGRAM_CHAT_ID,
    process.env.CHAT_ID,
    process.env.TELEGRAM_ADMIN_CHAT_IDS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentMethodLabel(value?: string) {
  switch (value) {
    case "bank_transfer":
      return "โอนเงินธนาคาร";
    case "promptpay":
      return "PromptPay";
    case "cash":
      return "เงินสด";
    default:
      return value || "ยังไม่ระบุ";
  }
}

function buildNewOrderMessage(order: NewOrderNotificationInput) {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );
  const itemLines = order.items.map((item, index) => {
    const emoji = item.menu_item_emoji ? `${item.menu_item_emoji} ` : "";
    return `${index + 1}. ${emoji}${item.menu_item_name} x${item.quantity} (${formatCurrency(item.unit_price * item.quantity)})`;
  });

  return [
    "มีออเดอร์ใหม่",
    `เลขออเดอร์: ${order.orderNumber}`,
    "",
    "รายการ:",
    ...itemLines,
    "",
    `ค่าสินค้า: ${formatCurrency(subtotal)}`,
    order.deliveryFee > 0 ? `ค่าส่ง: ${formatCurrency(order.deliveryFee)}` : null,
    `ยอดรวม: ${formatCurrency(order.totalPrice)}`,
    "",
    `ลูกค้า: ${order.customerName}`,
    `โทร: ${order.phoneNumber}`,
    `รับสินค้า: ${order.deliveryType === "delivery" ? "จัดส่ง" : "รับเอง"}`,
    order.deliveryAddress ? `ที่อยู่: ${order.deliveryAddress}` : null,
    `ชำระเงิน: ${paymentMethodLabel(order.paymentMethod)}`,
    order.notes ? `หมายเหตุ: ${order.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function notifyNewOrder(order: NewOrderNotificationInput) {
  const botToken = getBotToken();
  const chatIds = getNotificationChatIds();

  if (!botToken || chatIds.length === 0) {
    console.warn("Telegram new order notification skipped: missing bot token or chat id");
    return;
  }

  const text = buildNewOrderMessage(order);
  await Promise.allSettled(
    chatIds.map(async (chatId) => {
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
        throw new Error(`Telegram new order notification failed: ${response.status} ${details}`);
      }
    }),
  );
}
