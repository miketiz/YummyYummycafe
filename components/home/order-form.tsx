"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Trash2, Plus, Minus, X, MapPin } from "lucide-react";
import type { MenuItem as BaseMenuItem } from "./menu-data";
import { useMenuItems } from "./use-menu-items";

type MenuItem = BaseMenuItem & { emoji?: string };

type OrderItem = MenuItem & { quantity: number };

type OrderFormData = {
  phone_number: string;
  customer_name: string;
  email?: string;
  address?: string;
  delivery_type: "delivery" | "pickup";
  delivery_distance_km?: number;
  payment_method?: "cash" | "bank_transfer" | "promptpay";
  payment_reference?: string;
  notes?: string;
};

interface OrderFormProps {
  initialItems?: OrderItem[];
  onOrderSuccess?: () => void;
}

export function OrderForm({ initialItems = [], onOrderSuccess }: OrderFormProps) {
  const [items, setItems] = useState<OrderItem[]>(initialItems);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"menu" | "details">("menu");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { bakery, beverages } = useMenuItems();

  const [formData, setFormData] = useState<OrderFormData>({
    phone_number: "",
    customer_name: "",
    delivery_type: "delivery",
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ที่ตั้งร้าน YummyYummy
  const SHOP_LAT = 16.419073;
  const SHOP_LNG = 102.8094977;

  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleGpsPin = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์นี้ไม่รองรับ GPS");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsCoords({ lat, lng });

        // คำนวณระยะทางจากร้าน
        const distKm = haversineKm(SHOP_LAT, SHOP_LNG, lat, lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`,
            { headers: { "Accept-Language": "th" } }
          );
          const data = await res.json();
          const addr = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setFormData((prev) => ({
            ...prev,
            address: addr,
            delivery_distance_km: Math.round(distKm * 10) / 10,
          }));
          toast.success(`ปักหมุดสำเร็จ — ห่างจากร้าน ${distKm.toFixed(1)} กม.`);
        } catch {
          setFormData((prev) => ({
            ...prev,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            delivery_distance_km: Math.round(distKm * 10) / 10,
          }));
          toast.success(`บันทึกพิกัดแล้ว — ห่างจากร้าน ${distKm.toFixed(1)} กม.`);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) toast.error("กรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้ง");
        else toast.error("ไม่สามารถรับ GPS ได้ ลองใหม่อีกครั้ง");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openPaymentForm = () => {
    if (items.length === 0) {
      toast.error("กรุณาเลือกเมนูอย่างน้อยหนึ่งรายการ");
      return;
    }
    setShowPaymentForm(true);
  };

  const addItem = (item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} เพิ่มลงตะกร้า`);
  };

  const removeItem = (itemId: number) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
      );
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // สูตรค่าส่งใกล้เคียง Grab: ฿20 base + ฿7/กม. ปัดขึ้นทีละ ฿1
  const GRAB_BASE = 20;
  const GRAB_PER_KM = 7;
  const calcDeliveryFee = (km: number) => Math.ceil(GRAB_BASE + GRAB_PER_KM * km);

  const deliveryFee =
    formData.delivery_type === "delivery"
      ? formData.delivery_distance_km
        ? calcDeliveryFee(formData.delivery_distance_km)
        : GRAB_BASE
      : 0;

  const total = subtotal + deliveryFee;

  const handleSubmitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.phone_number || !formData.customer_name) {
      toast.error("กรุณากรอกเบอร์โทรศัพท์และชื่อ");
      return;
    }
    if (items.length === 0) {
      toast.error("กรุณาเลือกเมนูอย่างน้อยหนึ่งรายการ");
      return;
    }
    if (formData.delivery_type === "delivery" && !formData.address) {
      toast.error("กรุณากรอกที่อยู่สำหรับการจัดส่ง");
      return;
    }

    setIsSubmitting(true);

    const orderPayload = {
      phone_number: formData.phone_number,
      customer_name: formData.customer_name,
      email: formData.email,
      address: formData.address,
      delivery_type: formData.delivery_type,
      delivery_distance_km: formData.delivery_distance_km,
      delivery_fee: deliveryFee,
      payment_method: formData.payment_method || "cash",
      notes: formData.notes,
      items: items.map((item) => ({
        menu_item_name: item.name,
        menu_item_emoji: item.emoji ?? "",
        quantity: item.quantity,
        unit_price: item.price,
      })),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "(no body)");
        throw new Error(`Failed to create order: ${response.status} ${text}`);
      }

      const data = await response.json();

      if (formData.payment_method) {
        const paymentResponse = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: data.order.id,
            amount: total,
            payment_method: formData.payment_method,
            payment_status: "pending",
            payment_reference: formData.payment_reference,
            notes: formData.notes,
          }),
        });

        if (!paymentResponse.ok) {
          console.warn("Payment record creation failed", await paymentResponse.text().catch(() => "(no body)"));
        }
      }

      toast.success(`สั่งซื้อสำเร็จ! หมายเลขออเดอร์: ${data.order.order_number}`);

      setItems([]);
      setFormData({ phone_number: "", customer_name: "", delivery_type: "delivery" });
      setShowPaymentForm(false);
      setGpsCoords(null);
      setStep("menu");
      onOrderSuccess?.();
    } catch (error) {
      console.error("Order creation error:", error);
      toast.error("เกิดข้อผิดพลาดในการสั่งซื้อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── MENU STEP ──────────────────────────────────────────────────────────────
  if (step === "menu") {
    return (
      // flex column fills the modal's scroll container; summary bar sticks at bottom via sticky
      <div className="flex flex-col min-h-full">
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 space-y-6 pb-0">
          {/* Header */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-2xl font-bold text-foreground">เลือกเมนู</h2>
            {items.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {items.length} รายการ • ฿{subtotal.toFixed(0)}
                </span>
              </div>
            )}
          </div>

          {/* Bakery */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">🥐 เบเกอรี่</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {bakery.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="bg-card border border-border rounded-2xl p-3 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-2xl block mb-1">{item.emoji ?? ""}</span>
                  <p className="text-xs font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">฿{item.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Beverages */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">☕ เครื่องดื่ม</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {beverages.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="bg-card border border-border rounded-2xl p-3 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-2xl block mb-1">{item.emoji ?? ""}</span>
                  <p className="text-xs font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">฿{item.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>เลือกเมนูเพื่อเริ่มสั่งซื้อ</p>
            </div>
          )}
        </div>

        {/* Summary bar — sticky bottom inside the modal scroll container */}
        {items.length > 0 && (
          <div className="sticky bottom-0 bg-card border-t border-border p-4 space-y-3 mt-4">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="max-h-36 overflow-y-auto space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-muted/30 rounded-lg p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.emoji ?? ""} {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ฿{item.price} × {item.quantity} = ฿{(item.price * item.quantity).toFixed(0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 hover:bg-red-50 rounded ml-1"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setItems([])}
                  className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  ล้างตะกร้า
                </button>
                <button
                  onClick={openPaymentForm}
                  className="flex-1 px-4 py-2 border border-primary text-primary rounded-xl text-sm font-medium hover:bg-primary/5"
                >
                  ชำระเงิน
                </button>
                <button
                  onClick={() => setStep("details")}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
                >
                  ดำเนินการต่อ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment contact modal — z-[70] so it sits above page.tsx order modal (z-[60]) */}
        {showPaymentForm && (
          <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">ข้อมูลติดต่อสำหรับชำระเงิน</h3>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="w-8 h-8 rounded-lg hover:bg-muted grid place-content-center"
                  aria-label="close payment form"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">ชื่อ*</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="เช่น สมชาย"
                  className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">เบอร์โทรศัพท์*</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="เช่น 0634365174"
                  className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  ช่องทางติดต่อสำหรับส่ง (เช่น Line/IG)*
                </label>
                <input
                  type="text"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="เช่น Line: @ชื่อ หรือ IG: @ชื่อ"
                  className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  ใช้สำหรับการติดต่อเรื่องการชำระเงิน/การจัดส่ง
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (!formData.customer_name || !formData.phone_number || !formData.notes) {
                      toast.error("กรุณากรอกชื่อ เบอร์โทร และช่องทางติดต่อ");
                      return;
                    }
                    setShowPaymentForm(false);
                    setStep("details");
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
                >
                  ไปชำระเงินต่อ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DETAILS STEP ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto p-4 pb-8">
      <h2 className="text-2xl font-bold text-foreground mb-6 pt-2">กรอกข้อมูลการสั่งซื้อ</h2>

      <form className="space-y-4 bg-card border border-border rounded-2xl p-6" onSubmit={handleSubmitOrder}>
        {/* Phone & Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">เบอร์โทรศัพท์*</label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="เช่น 0634365174"
              className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">ชื่อ*</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="เช่น สมชาย"
              className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">อีเมล (ไม่บังคับ)</label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
            className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Delivery Type */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">ประเภทการรับสินค้า*</label>
          <div className="flex gap-3">
            {(["delivery", "pickup"] as const).map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl cursor-pointer hover:bg-muted"
              >
                <input
                  type="radio"
                  name="delivery_type"
                  value={type}
                  checked={formData.delivery_type === type}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_type: e.target.value as "delivery" | "pickup" })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">
                  {type === "delivery" ? "📍 จัดส่ง" : "🏪 รับเอง"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Address */}
        {formData.delivery_type === "delivery" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">ที่อยู่สำหรับจัดส่ง*</label>
                <button
                  type="button"
                  onClick={handleGpsPin}
                  disabled={gpsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50 transition"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <MapPin className="w-3 h-3" />
                  )}
                  {gpsLoading ? "กำลังระบุตำแหน่ง..." : "ปักหมุด GPS"}
                </button>
              </div>
              <textarea
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="เช่น ซอย... ถนน... เขต... จังหวัด... รหัสไปรษณีย์..."
                rows={3}
                className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              {gpsCoords && (
                <a
                  href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  ดูตำแหน่งใน Google Maps ({gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)})
                </a>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  ระยะทาง (กม.) - สำหรับคำนวณค่าส่ง
                </label>
                {gpsCoords && (
                  <a
                    href={`https://www.google.com/maps/dir/${SHOP_LAT},${SHOP_LNG}/${gpsCoords.lat},${gpsCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MapPin className="w-3 h-3" />
                    ดูเส้นทาง
                  </a>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                value={formData.delivery_distance_km || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delivery_distance_km: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="เช่น 2.5"
                className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              {gpsCoords && formData.delivery_distance_km && (
                <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  คำนวณจาก GPS อัตโนมัติ — แก้ไขได้ถ้าต้องการ
                </p>
              )}
            </div>
          </>
        )}

        {/* Payment Method */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">วิธีการชำระเงิน</label>
          <select
            value={formData.payment_method || "cash"}
            onChange={(e) =>
              setFormData({ ...formData, payment_method: e.target.value as OrderFormData["payment_method"] })
            }
            className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="cash">💵 เงินสด</option>
            <option value="bank_transfer">🏦 โอนเงินธนาคาร</option>
            <option value="promptpay">📱 PromptPay</option>
          </select>
        </div>

        {formData.payment_method && formData.payment_method !== "cash" && (
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              เลขอ้างอิงการโอน/สลิป (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={formData.payment_reference || ""}
              onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
              placeholder="เช่น TRX123456"
              className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">ถ้ายังไม่มี สามารถแจ้งภายหลังได้ครับ</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">หมายเหตุ (ไม่บังคับ)</label>
          <textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="เช่น ไม่มีน้ำตาล ให้มากกว่าปกติ ฯลฯ"
            rows={2}
            className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border">
          <p className="text-sm text-muted-foreground">รายละเอียดสินค้า</p>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span>{item.emoji ?? ""} {item.name} × {item.quantity}</span>
              <span>฿{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ราคารวม</span>
              <span className="font-medium">฿{subtotal.toFixed(0)}</span>
            </div>
            {formData.delivery_type === "delivery" && (
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">ค่าจัดส่ง</span>
                  {formData.delivery_distance_km ? (
                    <p className="text-xs text-muted-foreground">
                      ฿20 + ฿7 × {formData.delivery_distance_km} กม.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">ยังไม่ได้ระบุระยะทาง</p>
                  )}
                </div>
                <span className="font-medium">฿{deliveryFee}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold pt-1 border-t border-border">
              <span>รวมทั้งสิ้น</span>
              <span>฿{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => setStep("menu")}
            className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← กลับไป
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            ยืนยันการสั่งซื้อ
          </button>
        </div>
      </form>
    </div>
  );
}
