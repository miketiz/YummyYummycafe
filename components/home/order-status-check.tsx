"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Search } from "lucide-react";

type OrderItem = {
  id: string;
  menu_item_name: string;
  menu_item_emoji?: string;
  quantity: number;
  unit_price: number;
};

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  delivery_fee?: number;
  delivery_type: "delivery" | "pickup";
  payment_status: "unpaid" | "paid";
  created_at: string;
  customers?: {
    name: string;
    phone_number: string;
    address?: string;
  };
  order_items?: OrderItem[];
};

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  pending: { label: "รอยืนยัน", className: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock3 },
  confirmed: { label: "ยืนยันแล้ว", className: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
  preparing: { label: "กำลังเตรียม", className: "bg-purple-50 text-purple-700 border-purple-200", icon: Clock3 },
  ready: { label: "พร้อมส่ง", className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  delivered: { label: "ส่งแล้ว", className: "bg-gray-50 text-gray-700 border-gray-200", icon: CheckCircle2 },
  cancelled: { label: "ยกเลิกแล้ว", className: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
};

export function OrderStatusCheck() {
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextPhone = phone.trim();
    const nextOrderNumber = orderNumber.trim();

    if (!nextPhone && !nextOrderNumber) {
      setError("กรุณากรอกเบอร์โทรหรือเลขออเดอร์อย่างน้อย 1 ช่อง");
      setOrders([]);
      setSearched(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams();

      if (nextPhone) params.set("phone", nextPhone);
      if (nextOrderNumber) params.set("order_number", nextOrderNumber);

      const response = await fetch(`/api/orders?${params.toString()}&limit=10`);

      if (!response.ok) {
        throw new Error("ไม่สามารถค้นหาออเดอร์ได้");
      }

      const data = (await response.json()) as { data?: CustomerOrder[] };
      setOrders(data.data || []);

      if ((data.data || []).length === 0) {
        setError("ไม่พบออเดอร์จากข้อมูลที่กรอก");
      }
    } catch (fetchError) {
      setOrders([]);
      setError(fetchError instanceof Error ? fetchError.message : "เกิดข้อผิดพลาดในการค้นหา");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="order-check" className="py-18 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-secondary/20 to-background border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <p className="text-primary text-xs tracking-[0.25em] uppercase mb-2">Track Your Order</p>
          <h2 className="font-heading text-[clamp(1.8rem,4vw,2.6rem)]">เช็กสถานะออเดอร์</h2>
          <p className="mt-3 text-muted-foreground">
            กรอกเบอร์โทรหรือเลขออเดอร์เพื่อดูสถานะล่าสุดของคำสั่งซื้อได้ทันที
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">เบอร์โทร</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 0899999999"
                  inputMode="tel"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">เลขออเดอร์</span>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="เช่น ORD-20260519-001"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                ค้นหาสถานะออเดอร์
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhone("");
                  setOrderNumber("");
                  setOrders([]);
                  setError(null);
                  setSearched(false);
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                ล้างค่า
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              ถ้ามีทั้งเบอร์โทรและเลขออเดอร์ ระบบจะใช้ร่วมกันเพื่อค้นหาให้แม่นยำขึ้น
            </p>
          </form>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">ผลการค้นหา</p>
                  <p className="text-xs text-muted-foreground">แสดงออเดอร์ล่าสุดที่ตรงกับข้อมูล</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {orders.length} รายการ
                </span>
              </div>

              {!searched ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  ใส่เบอร์โทรหรือเลขออเดอร์แล้วกดค้นหา
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-border px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังค้นหา...
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  ไม่พบข้อมูลออเดอร์
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const meta = statusMeta[order.status] ?? statusMeta.pending;
                    const StatusIcon = meta.icon;

                    return (
                      <article key={order.id} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-heading text-lg">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customers?.name || "ไม่ระบุชื่อ"} • {order.customers?.phone_number || "ไม่ระบุเบอร์"}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.className}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground text-xs">รูปแบบรับสินค้า</p>
                            <p className="font-medium">{order.delivery_type === "delivery" ? "จัดส่ง" : "รับเอง"}</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground text-xs">การชำระเงิน</p>
                            <p className="font-medium">{order.payment_status === "paid" ? "ชำระแล้ว" : "รอชำระเงิน"}</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground text-xs">ยอดรวม</p>
                            <p className="font-medium">฿{order.total_price.toFixed(0)}</p>
                          </div>
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground text-xs">สั่งเมื่อ</p>
                            <p className="font-medium">{new Date(order.created_at).toLocaleString("th-TH")}</p>
                          </div>
                        </div>

                        {order.order_items?.length ? (
                          <div className="mt-4 space-y-2 border-t border-border pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">รายการสินค้า</p>
                            {order.order_items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-foreground/90">
                                  {item.menu_item_emoji ? `${item.menu_item_emoji} ` : ""}
                                  {item.menu_item_name} × {item.quantity}
                                </span>
                                <span className="text-muted-foreground">฿{(item.unit_price * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {order.customers?.address ? (
                          <p className="mt-4 text-xs text-muted-foreground">
                            ที่อยู่จัดส่ง: {order.customers.address}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}