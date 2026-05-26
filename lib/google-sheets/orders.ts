type GoogleSheetOrderItem = {
  menu_item_name: string;
  menu_item_emoji?: string;
  quantity: number;
  unit_price: number;
};

export type GoogleSheetOrderInput = {
  orderNumber: string;
  createdAt?: string;
  source?: string;
  customerName: string;
  phoneNumber: string;
  deliveryType: "delivery" | "pickup";
  deliveryAddress?: string;
  deliveryFee: number;
  totalPrice: number;
  paymentMethod?: string;
  paymentStatus?: "unpaid" | "paid";
  orderStatus?: string;
  notes?: string;
  adminNote?: string;
  items: GoogleSheetOrderItem[];
};

export type GoogleSheetOrderStatusInput = {
  orderNumber: string;
  orderStatus?: string;
  paymentStatus?: "unpaid" | "paid";
  adminNote?: string;
  updatedAt?: string;
};

function getGoogleSheetWebhookConfig() {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEET_WEBHOOK_SECRET;

  if (!url || !secret) {
    return null;
  }

  return { url, secret };
}

async function postGoogleSheetPayload(payload: Record<string, unknown>, errorPrefix: string) {
  const config = getGoogleSheetWebhookConfig();

  if (!config) {
    console.warn("Google Sheet order sync skipped: missing webhook URL or secret");
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        secret: config.secret,
        ...payload,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`${errorPrefix}: ${response.status} ${details}`);
    }

    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      statusCode?: number;
    } | null;

    if (result && result.ok === false) {
      throw new Error(`${errorPrefix}: ${result.error || "Apps Script rejected request"}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function syncOrderToGoogleSheet(order: GoogleSheetOrderInput) {
  return postGoogleSheetPayload(
    {
      action: "append_order",
      order: {
        created_at: order.createdAt,
        order_number: order.orderNumber,
        source: order.source || "website",
        customer_name: order.customerName,
        phone_number: order.phoneNumber,
        items: order.items,
        delivery_type: order.deliveryType,
        delivery_address: order.deliveryAddress,
        delivery_fee: order.deliveryFee,
        total_price: order.totalPrice,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus || "unpaid",
        order_status: order.orderStatus || "pending",
        notes: order.notes,
        admin_note: order.adminNote,
        updated_at: order.createdAt,
      },
    },
    "Google Sheet order sync failed",
  );
}

export async function syncOrderStatusToGoogleSheet(order: GoogleSheetOrderStatusInput) {
  return postGoogleSheetPayload(
    {
      action: "update_order_status",
      order: {
        order_number: order.orderNumber,
        payment_status: order.paymentStatus,
        order_status: order.orderStatus,
        admin_note: order.adminNote,
        updated_at: order.updatedAt || new Date().toISOString(),
      },
    },
    "Google Sheet order status sync failed",
  );
}
