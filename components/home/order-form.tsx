"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { bakery, beverages, type MenuItem } from "./menu-data";

type OrderItem = MenuItem & { quantity: number };

type OrderFormData = {
  phone_number: string;
  customer_name: string;
  email?: string;
  address?: string;
  delivery_type: "delivery" | "pickup";
  delivery_distance_km?: number;
  payment_method?: "cash" | "bank_transfer" | "promptpay";
  notes?: string;
};

export function OrderForm() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"menu" | "details">("menu");

  const [formData, setFormData] = useState<OrderFormData>({
    phone_number: "",
    customer_name: "",
    delivery_type: "delivery",
  });

  const allMenuItems = [...bakery, ...beverages];

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
  const deliveryFee =
    formData.delivery_type === "delivery"
      ? subtotal >= 500
        ? 0
        : formData.delivery_distance_km && formData.delivery_distance_km <= 3
          ? 50
          : 0
      : 0;
  const total = subtotal + deliveryFee;

  const handleSubmitOrder = async () => {
    // Validation
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

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
            menu_item_emoji: item.emoji,
            quantity: item.quantity,
            unit_price: item.price,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const data = await response.json();
      toast.success(
        `สั่งซื้อสำเร็จ! หมายเลขออเดอร์: ${data.order.order_number}`
      );

      // Reset form
      setItems([]);
      setFormData({
        phone_number: "",
        customer_name: "",
        delivery_type: "delivery",
      });
      setStep("menu");
    } catch (error) {
      console.error("Order creation error:", error);
      toast.error("เกิดข้อผิดพลาดในการสั่งซื้อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "menu") {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
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

        {/* Bakery Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">🥐 เบเกอรี่</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {bakery.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="bg-card border border-border rounded-2xl p-3 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <span className="text-2xl block mb-1">{item.emoji}</span>
                <p className="text-xs font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">฿{item.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Beverages Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">☕ เครื่องดื่ม</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {beverages.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="bg-card border border-border rounded-2xl p-3 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <span className="text-2xl block mb-1">{item.emoji}</span>
                <p className="text-xs font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">฿{item.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Items Summary */}
        {items.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="max-h-32 overflow-y-auto space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-muted/30 rounded-lg p-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {item.emoji} {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ฿{item.price} × {item.quantity} = ฿
                        {(item.price * item.quantity).toFixed(0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
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
                  onClick={() => {
                    setItems([]);
                  }}
                  className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  ล้างตะกร้า
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

        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>เลือกเมนูเพื่อเริ่มสั่งซื้อ</p>
          </div>
        )}
      </div>
    );
  }

  // Details step
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-foreground mb-6">กรอกข้อมูลการสั่งซื้อ</h2>

      <div className="space-y-4 bg-card border border-border rounded-2xl p-6">
        {/* Phone and Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              เบอร์โทรศัพท์*
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              placeholder="เช่น 0634365174"
              className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              ชื่อ*
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
              placeholder="เช่น สมชาย"
              className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            อีเมล (ไม่บังคับ)
          </label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="email@example.com"
            className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Delivery Type */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            ประเภทการรับสินค้า*
          </label>
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
                    setFormData({
                      ...formData,
                      delivery_type: e.target.value as "delivery" | "pickup",
                    })
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

        {/* Address (for delivery) */}
        {formData.delivery_type === "delivery" && (
          <>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                ที่อยู่สำหรับจัดส่ง*
              </label>
              <textarea
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="เช่น ซอย... ถนน... เขต... จังหวัด... รหัสไปรษณีย์..."
                rows={3}
                className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                ระยะทาง (กม.) - สำหรับคำนวณค่าส่ง
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.delivery_distance_km || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delivery_distance_km: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="เช่น 2.5"
                className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </>
        )}

        {/* Payment Method */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            วิธีการชำระเงิน
          </label>
          <select
            value={formData.payment_method || "cash"}
            onChange={(e) =>
              setFormData({
                ...formData,
                payment_method: e.target.value as any,
              })
            }
            className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="cash">💵 เงินสด</option>
            <option value="bank_transfer">🏦 โอนเงินธนาคาร</option>
            <option value="promptpay">📱 PromptPay</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            หมายเหตุ (ไม่บังคับ)
          </label>
          <textarea
            value={formData.notes || ""}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="เช่น ไม่มีน้ำตาล ให้มากกว่าปกติ ฯลฯ"
            rows={2}
            className="w-full bg-input-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border">
          <div className="text-sm">
            <p className="text-muted-foreground">รายละเอียดสินค้า</p>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs mt-1">
                <span>
                  {item.emoji} {item.name} × {item.quantity}
                </span>
                <span>฿{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ราคารวม</span>
              <span className="font-medium">฿{subtotal.toFixed(0)}</span>
            </div>

            {formData.delivery_type === "delivery" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ค่าจัดส่ง</span>
                <span className="font-medium">
                  {deliveryFee === 0
                    ? "ฟรี"
                    : `฿${deliveryFee.toFixed(0)}`}
                </span>
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
            onClick={() => setStep("menu")}
            className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← กลับไป
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            ยืนยันการสั่งซื้อ
          </button>
        </div>
      </div>
    </div>
  );
}
