"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle, Clock, AlertCircle, CreditCard } from "lucide-react";

type OrderData = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  delivery_fee: number;
  delivery_type: string;
  payment_status: string;
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
