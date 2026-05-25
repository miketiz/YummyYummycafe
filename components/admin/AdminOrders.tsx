"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle, Clock, AlertCircle, CreditCard, Printer } from "lucide-react";

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  delivery_fee: number;
  delivery_type: string;
  delivery_address?: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers?: {
    name: string;
    phone_number: string;
    address?: string;
  };
  order_items?: Array<{
    id: string;
    menu_item_name: string;
    menu_item_emoji?: string;
    quantity: number;
    unit_price: number;
  }>;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  preparing: "bg-purple-50 text-purple-700 border-purple-200",
  ready: "bg-green-50 text-green-700 border-green-200",
  delivered: "bg-gray-50 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "⏳ รอยืนยัน",
  confirmed: "✅ ยืนยันแล้ว",
  preparing: "👨‍🍳 กำลังเตรียม",
  ready: "📦 พร้อมส่ง",
  delivered: "✔️ ส่งแล้ว",
  cancelled: "❌ ยกเลิก",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBaht(value: number) {
  return `฿${Number(value || 0).toFixed(0)}`;
}

function printOrderSlip(order: OrderData) {
  const subtotal = order.total_price - (order.delivery_fee || 0);
  const deliveryLabel = order.delivery_type === "delivery" ? "จัดส่ง" : "รับเอง";
  const paymentLabel = order.payment_status === "paid" ? "ชำระแล้ว" : "รอชำระเงิน";
  const deliveryIcon = order.delivery_type === "delivery" ? "🛵" : "🛍️";
  const paymentIcon = order.payment_status === "paid" ? "✅" : "⏳";
  const orderStatus = statusLabels[order.status] || order.status;
  const createdAt = new Date(order.created_at).toLocaleString("th-TH");
  const address = order.delivery_address || order.customers?.address || "-";
  const items = order.order_items ?? [];
  const itemsHtml = items
    .map((item) => {
      const lineTotal = item.unit_price * item.quantity;
      return `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(`${item.menu_item_emoji || ""} ${item.menu_item_name}`.trim())}</div>
            <div class="item-sub">x${item.quantity} @ ${formatBaht(item.unit_price)}</div>
          </td>
          <td class="amount">${formatBaht(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    toast.error("ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต popup");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(order.order_number)}</title>
        <style>
          @page { size: 80mm auto; margin: 6mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #17251f;
            background: #ffffff;
            font-family: "Tahoma", "Arial", sans-serif;
            font-size: 12px;
            line-height: 1.45;
          }
          .slip {
            width: 100%;
            border: 1px solid #c7dfcf;
            border-radius: 18px;
            padding: 14px;
            background:
              radial-gradient(circle at top left, rgba(249, 199, 79, 0.16), transparent 34%),
              linear-gradient(180deg, #ffffff 0%, #fbfffc 100%);
            box-shadow: 0 10px 28px rgba(47, 111, 78, 0.10);
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 8px 8px 12px;
            border-bottom: 2px solid #2f6f4e;
            position: relative;
          }
          .logo {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            object-fit: cover;
            border: 1px solid #d9ecdf;
            background: #f1f8f3;
          }
          .brand-copy { flex: 1; min-width: 0; }
          .kicker {
            color: #6b7f76;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0;
          }
          .brand h1 {
            margin: 0;
            font-size: 20px;
            letter-spacing: 0;
            color: #1f4f36;
          }
          .brand p { margin: 2px 0 0; color: #5f746a; font-size: 11px; }
          .badge {
            border: 1px solid #9fcfb0;
            border-radius: 999px;
            padding: 5px 8px;
            color: #1f4f36;
            background: #effaf2;
            font-weight: 700;
            white-space: nowrap;
            font-size: 11px;
          }
          .order-no {
            margin: 12px 0;
            padding: 12px 10px;
            border-radius: 14px;
            background: #2f6f4e;
            color: white;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .order-no::before,
          .order-no::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ffffff;
            transform: translateY(-50%);
          }
          .order-no::before { left: -9px; }
          .order-no::after { right: -9px; }
          .order-no .label {
            color: rgba(255,255,255,0.76);
          }
          .order-no strong { display: block; font-size: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .box {
            border: 1px solid #e4efe8;
            border-radius: 12px;
            padding: 8px;
            min-height: 54px;
            background: rgba(255,255,255,0.84);
          }
          .label {
            display: block;
            color: #6b7f76;
            font-size: 10px;
            margin-bottom: 3px;
          }
          .value { font-weight: 700; word-break: break-word; }
          .section {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px dashed #b8cec0;
          }
          .section-title {
            margin: 0 0 7px;
            font-size: 12px;
            font-weight: 700;
            color: #2f6f4e;
            text-transform: uppercase;
          }
          .section-title::before { content: "✦ "; color: #f0a83a; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px 0; border-bottom: 1px solid #edf4ef; vertical-align: top; }
          .item-name { font-weight: 700; }
          .item-sub { color: #6b7f76; font-size: 11px; }
          .amount { text-align: right; font-weight: 700; white-space: nowrap; }
          .totals { margin-top: 8px; }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .grand {
            margin-top: 6px;
            padding: 10px;
            border-radius: 12px;
            background: #1f4f36;
            color: white;
            font-size: 16px;
            font-weight: 800;
          }
          .note {
            min-height: 42px;
            border: 1px dashed #b8cec0;
            border-radius: 12px;
            padding: 8px;
            background: rgba(255,255,255,0.72);
            white-space: pre-wrap;
          }
          .cute-row {
            margin: 12px 0 4px;
            text-align: center;
            color: #2f6f4e;
            font-weight: 700;
            letter-spacing: 0;
          }
          .footer {
            margin-top: 14px;
            text-align: center;
            color: #6b7f76;
            font-size: 10px;
            border-top: 1px dashed #b8cec0;
            padding-top: 10px;
          }
          @media print {
            body { background: #ffffff; }
            .slip { border: 0; border-radius: 0; padding: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <main class="slip">
          <header class="brand">
            <img class="logo" src="/logo.png" alt="YummyYummy logo" />
            <div class="brand-copy">
              <div class="kicker">Fresh bakery cafe</div>
              <h1>YummyYummy</h1>
              <p>🥐 order sticker / kitchen slip</p>
            </div>
            <div class="badge">${escapeHtml(deliveryIcon)} ${escapeHtml(deliveryLabel)}</div>
          </header>

          <section class="order-no">
            <span class="label">ORDER NO.</span>
            <strong>${escapeHtml(order.order_number)}</strong>
            <div>${escapeHtml(createdAt)}</div>
          </section>

          <section class="grid">
            <div class="box">
              <span class="label">ลูกค้า</span>
              <div class="value">${escapeHtml(order.customers?.name || "-")}</div>
            </div>
            <div class="box">
              <span class="label">โทร</span>
              <div class="value">${escapeHtml(order.customers?.phone_number || "-")}</div>
            </div>
            <div class="box">
              <span class="label">สถานะออเดอร์</span>
              <div class="value">${escapeHtml(orderStatus)}</div>
            </div>
            <div class="box">
              <span class="label">ชำระเงิน</span>
              <div class="value">${escapeHtml(paymentIcon)} ${escapeHtml(paymentLabel)}</div>
            </div>
          </section>

          <div class="cute-row">🥐 ✦ 🍓 ✦ ☕</div>

          <section class="section">
            <p class="section-title">ที่อยู่ / จุดรับสินค้า</p>
            <div class="note">${escapeHtml(address)}</div>
          </section>

          <section class="section">
            <p class="section-title">รายการสินค้า</p>
            <table>
              <tbody>${itemsHtml || "<tr><td>ไม่มีรายการสินค้า</td><td></td></tr>"}</tbody>
            </table>
          </section>

          <section class="section totals">
            <div class="totals-row"><span>ค่าสินค้า</span><strong>${formatBaht(subtotal)}</strong></div>
            <div class="totals-row"><span>ค่าส่ง</span><strong>${formatBaht(order.delivery_fee || 0)}</strong></div>
            <div class="totals-row grand"><span>รวมทั้งหมด</span><strong>${formatBaht(order.total_price)}</strong></div>
          </section>

          <section class="section">
            <p class="section-title">หมายเหตุ</p>
            <div class="note">${escapeHtml(order.notes || "-")}</div>
          </section>

          <footer class="footer">
            Made with care by YummyYummy<br />
            แปะใบนี้กับถุง/กล่องก่อนส่งมอบสินค้า
          </footer>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function OrderManagementPanel() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [orderNumberQuery, setOrderNumberQuery] = useState("");
  const [updatingPaymentOrderId, setUpdatingPaymentOrderId] = useState<string | null>(null);
  const filterStatusRef = useRef(filterStatus);
  const phoneQueryRef = useRef(phoneQuery);
  const orderNumberQueryRef = useRef(orderNumberQuery);

  useEffect(() => {
    filterStatusRef.current = filterStatus;
  }, [filterStatus]);

  useEffect(() => {
    phoneQueryRef.current = phoneQuery;
  }, [phoneQuery]);

  useEffect(() => {
    orderNumberQueryRef.current = orderNumberQuery;
  }, [orderNumberQuery]);

  const fetchOrders = useCallback(async (overrides?: {
    status?: string;
    phone?: string;
    orderNumber?: string;
  }) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      const nextStatus = overrides?.status ?? filterStatusRef.current;
      const nextPhone = overrides?.phone ?? phoneQueryRef.current;
      const nextOrderNumber = overrides?.orderNumber ?? orderNumberQueryRef.current;

      if (nextStatus !== "all") {
        params.set("status", nextStatus);
      }
      if (nextPhone.trim()) {
        params.set("phone", nextPhone.trim());
      }
      if (nextOrderNumber.trim()) {
        params.set("order_number", nextOrderNumber.trim());
      }

      const res = await fetch(`/api/orders${params.toString() ? `?${params.toString()}` : ""}`);

      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("ไม่สามารถโหลดออเดอร์ได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [filterStatus, fetchOrders]);

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update order");

      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data.data } : o))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      toast.success(`อัปเดตสถานะเป็น ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("ไม่สามารถอัปเดตสถานะได้");
    }
  };

  const updatePaymentStatus = async (
    orderId: string,
    newPaymentStatus: "paid" | "unpaid"
  ) => {
    try {
      setUpdatingPaymentOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update payment status");

      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data.data } : o))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...data.data });
      }

      toast.success(newPaymentStatus === "paid" ? "อัปเดตเป็นชำระเงินแล้ว" : "อัปเดตเป็นรอชำระเงิน");
    } catch (error) {
      console.error("Payment update error:", error);
      toast.error("ไม่สามารถอัปเดตสถานะชำระเงินได้");
    } finally {
      setUpdatingPaymentOrderId(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm("คุณแน่ใจว่าต้องการยกเลิกออเดอร์นี้?")) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to cancel order");

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }

      toast.success("ยกเลิกออเดอร์สำเร็จ");
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("ไม่สามารถยกเลิกออเดอร์ได้");
    }
  };

  const filteredOrders = filterStatus === "all" 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">จัดการออเดอร์</h2>
        <button
          onClick={() => {
            void fetchOrders();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          รีโหลด
        </button>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-card border border-border rounded-2xl p-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">ค้นหาด้วยเบอร์โทร</span>
          <input
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            placeholder="เช่น 0899999999"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">ค้นหาด้วยเลขออเดอร์</span>
          <input
            value={orderNumberQuery}
            onChange={(e) => setOrderNumberQuery(e.target.value)}
            placeholder="เช่น ORD-20260519"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            onClick={() => {
              void fetchOrders();
            }}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90"
          >
            ค้นหา
          </button>
          <button
            onClick={() => {
              setPhoneQuery("");
              setOrderNumberQuery("");
              setFilterStatus("all");
              setSelectedOrder(null);
              fetchOrders({ status: "all", phone: "", orderNumber: "" });
            }}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80"
          >
            ล้าง
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "confirmed", "preparing", "ready", "delivered", "cancelled"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {status === "all" ? "ทั้งหมด" : statusLabels[status]}
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-3 max-h-[42rem] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>ไม่มีออเดอร์ในหมวดหมู่นี้</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedOrder?.id === order.id
                    ? "border-primary bg-primary/5"
                    : `border-border bg-card hover:border-primary/50`
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.customers?.name} • {order.customers?.phone_number}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-xs font-medium ${statusColors[order.status]}`}>
                    {statusLabels[order.status] || order.status}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {order.order_items?.length || 0} รายการ •{" "}
                    {order.delivery_type === "delivery" ? "📍 จัดส่ง" : "🏪 รับเอง"}
                  </span>
                  <span className="font-semibold text-foreground">
                    ฿{order.total_price.toFixed(0)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(order.created_at).toLocaleString("th-TH")}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Order Details */}
        {selectedOrder && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 h-fit">
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {selectedOrder.order_number}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedOrder.customers?.name}
              </p>
            </div>

            <button
              onClick={() => printOrderSlip(selectedOrder)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Printer className="h-4 w-4" />
              พิมพ์ใบออเดอร์
            </button>

            {/* Customer Info */}
            <div className="space-y-2 pb-4 border-b border-border">
              <p className="text-xs text-muted-foreground">📞 {selectedOrder.customers?.phone_number}</p>
              {selectedOrder.customers?.address && (
                <p className="text-xs text-muted-foreground">📍 {selectedOrder.customers.address}</p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase">
                สินค้า
              </p>
              {selectedOrder.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.menu_item_emoji} {item.menu_item_name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    ฿{(item.unit_price * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="space-y-1 bg-muted/30 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">รายการ</span>
                <span>
                  ฿
                  {(
                    selectedOrder.total_price - (selectedOrder.delivery_fee || 0)
                  ).toFixed(0)}
                </span>
              </div>
              {selectedOrder.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ค่าส่ง</span>
                  <span>฿{selectedOrder.delivery_fee.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                <span>รวมทั้งสิ้น</span>
                <span>฿{selectedOrder.total_price.toFixed(0)}</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg text-sm">
                {selectedOrder.payment_status === "paid" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-muted-foreground">
                  {selectedOrder.payment_status === "paid" ? "ชำระแล้ว" : "รอชำระเงิน"}
                </span>
              </div>

              {selectedOrder.status !== "cancelled" && (
                <div className="grid grid-cols-2 gap-2">
                  {(["unpaid", "paid"] as const).map((paymentStatus) => {
                    const isActive = selectedOrder.payment_status === paymentStatus;
                    const isUpdating = updatingPaymentOrderId === selectedOrder.id;

                    return (
                      <button
                        key={paymentStatus}
                        onClick={() => updatePaymentStatus(selectedOrder.id, paymentStatus)}
                        disabled={isUpdating || isActive}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                          isActive
                            ? paymentStatus === "paid"
                              ? "bg-green-600 text-white"
                              : "bg-yellow-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {isUpdating && !isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : paymentStatus === "paid" ? (
                          <CreditCard className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        {paymentStatus === "paid" ? "ชำระเงินแล้ว" : "รอชำระเงิน"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status Update */}
            {!["delivered", "cancelled"].includes(selectedOrder.status) && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-foreground uppercase">
                  อัปเดตสถานะ
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {["confirmed", "preparing", "ready", "delivered"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedOrder.status === status
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {statusLabels[status]?.split(" ")[1] || statusLabels[status]}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Cancel Button */}
            {!["delivered", "cancelled"].includes(selectedOrder.status) && (
              <button
                onClick={() => cancelOrder(selectedOrder.id)}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                ยกเลิกออเดอร์
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
