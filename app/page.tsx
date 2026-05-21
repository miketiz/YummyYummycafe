"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Menu, ShoppingCart } from "lucide-react";
import { Toaster, toast } from "sonner";
import { ChatWidget } from "@/components/home/chat-widget";
import { MenuCard } from "@/components/home/menu-card";
import { OrderStatusCheck } from "../components/home/order-status-check";
import {
  features,
  type CartItem,
  type MenuItem,
} from "@/components/home/menu-data";
import { OrderForm } from "@/components/home/order-form";
import { SectionHeader } from "@/components/home/section-header";
import { useMenuItems } from "@/components/home/use-menu-items";

export default function HomePage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartHeight, setCartHeight] = useState(0);
  const { bakery, beverages } = useMenuItems();
  const cartRef = useRef<HTMLElement>(null);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [cart],
  );

  useEffect(() => {
    if (!showCart) {
      return;
    }

    const element = cartRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setCartHeight(element.offsetHeight);
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    const frame = requestAnimationFrame(() => {
      setCartHeight(element.offsetHeight);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [showCart, cart]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((v) => v.id === item.id);
      if (existing) {
        return prev.map((v) =>
          v.id === item.id ? { ...v, quantity: v.quantity + 1 } : v,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`เพิ่ม ${item.name} แล้ว`, { description: `฿${item.price}` });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="bottom-right" richColors />

      <header className="fixed top-0 inset-x-0 z-50 bg-card/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <button
            onClick={() => scrollTo("top")}
            className="flex items-center gap-2.5"
          >
            <span className="w-11 h-11 rounded-2xl bg-primary/95 ring-1 ring-white/10 shadow-sm flex items-center justify-center">
              <img src="/logo.png" alt="logo" className="w-8 h-8 object-contain drop-shadow-sm" />
            </span>
            <span className="font-heading text-xl">YummyYummy</span>
          </button>

          <nav className="hidden md:flex items-center gap-2">
            {["bakery", "beverages", "about"].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="px-4 py-2 rounded-full hover:bg-primary/15 transition"
              >
                {id === "bakery"
                  ? "เบเกอรี่"
                  : id === "beverages"
                    ? "เครื่องดื่ม"
                    : "เกี่ยวกับเรา"}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCart((v) => !v)}
              className="px-3.5 py-2 rounded-full bg-primary text-primary-foreground flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm">{totalItems}</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-xl hover:bg-muted"
              aria-label="toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-3">
            <div className="bg-card border border-border rounded-2xl p-2 flex flex-col">
              <button onClick={() => scrollTo("bakery")} className="text-left px-3 py-2 rounded-xl hover:bg-muted">เบเกอรี่</button>
              <button onClick={() => scrollTo("beverages")} className="text-left px-3 py-2 rounded-xl hover:bg-muted">เครื่องดื่ม</button>
              <button onClick={() => scrollTo("about")} className="text-left px-3 py-2 rounded-xl hover:bg-muted">เกี่ยวกับเรา</button>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1759459981049-1a658da71c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
          alt="YummyYummy Bakery"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-background" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4"
        >
          <p className="text-primary text-xs tracking-[0.28em] uppercase mb-4">Freshly Baked Daily</p>
          <h1 className="text-white leading-tight font-heading text-[clamp(2.7rem,9vw,6.2rem)]">
            YummyYummy
            <span className="block italic text-primary font-normal">Bakery</span>
          </h1>
          <p className="text-white/80 mt-4 max-w-2xl mx-auto">
            เบเกอรี่คราฟท์อบสดทุกเช้า วัตถุดิบธรรมชาติ และรสชาติที่ตั้งใจในทุกชิ้น
          </p>
          <button
            onClick={() => scrollTo("bakery")}
            className="mt-8 px-8 py-3 rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            สั่งเลย
          </button>
          <div className="mt-8 flex justify-center">
            <ChevronDown className="text-white/70" />
          </div>
        </motion.div>
      </section>

      <section className="py-12 px-4 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="text-center flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <feature.icon className="w-5 h-5" />
              </div>
              <p className="font-heading">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <OrderStatusCheck />

      <section id="bakery" className="py-18 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHeader en="Fresh from the oven" th="เบเกอรี่สด" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bakery.map((item, index) => (
              <MenuCard key={item.id} item={item} index={index} onAddToCart={addToCart} />
            ))}
          </div>
        </div>
      </section>

      <section id="beverages" className="py-18 px-4 sm:px-6 lg:px-8 bg-secondary/25 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <SectionHeader en="Crafted drinks" th="เครื่องดื่ม" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {beverages.map((item, index) => (
              <MenuCard key={item.id} item={item} index={index} onAddToCart={addToCart} />
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-18 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-primary text-xs uppercase tracking-[0.25em] mb-2">Our Story</p>
          <h2 className="font-heading text-[clamp(1.9rem,4vw,2.8rem)]">YummyYummy Bakery</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            เราเริ่มจากความรักในขนมปัง และอยากให้ทุกเช้าของคุณมีความสุขขึ้นอีกนิด
            ด้วยเบเกอรี่ที่อบใหม่ทุกวันและเครื่องดื่มที่จับคู่กันอย่างตั้งใจ
          </p>
        </div>
      </section>

      {showCart && (
        <aside
          ref={cartRef}
          className="fixed bottom-6 left-6 md:left-auto md:right-6 z-50 w-[min(92vw,360px)] bg-card border border-border rounded-3xl shadow-2xl p-5"
        >
          <p className="font-heading text-lg">ตะกร้าสินค้า</p>
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">ยังไม่มีสินค้าในตะกร้า</p>
          ) : (
            <div className="mt-3 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[72%]">{item.name} x {item.quantity}</span>
                  <span>฿{item.quantity * item.price}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>รวม</span>
                <span>฿{totalPrice}</span>
              </div>
              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => setCart([])}
                  className="flex-1 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  ล้างตะกร้า
                </button>
                <button
                  onClick={() => { setShowCart(false); setShowOrderModal(true); }}
                  className="flex-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
                >
                  ชำระเงิน →
                </button>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Order modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-background rounded-3xl shadow-2xl overflow-y-auto relative">
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 grid place-content-center"
              aria-label="close order form"
            >
              ✕
            </button>
            <OrderForm initialItems={cart.map((item) => ({ ...item }))} />
          </div>
        </div>
      )}

          {/* Pass cartHeight so ChatWidget can position itself above the cart box */}
      <ChatWidget
        cartOffset={showCart ? cartHeight : 0}
        onOpenChat={() => {
          setShowCart(false);
          setCartHeight(0);
        }}
      />
    </div>
  );
}
