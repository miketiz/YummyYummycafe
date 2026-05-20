"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  BarChart2,
  Camera,
  LockKeyhole,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { AdminInstagram } from "@/components/admin/AdminInstagram";
import { OrderManagementPanel } from "@/components/admin/AdminOrders";
import { AdminMenu, type ScheduledPost } from "@/components/admin/AdminMenu";
import { AdminOverview } from "@/components/admin/AdminOverview";

const navItems = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "orders", label: "คำสั่งซื้อ", icon: ShoppingBag },
  { id: "menu", label: "จัดการเมนู", icon: UtensilsCrossed },
  { id: "instagram", label: "Instagram", icon: Camera },
  { id: "reports", label: "รายงาน", icon: BarChart2 },
];

export default function AdminPage() {
  const [activeNav, setActiveNav] = useState("overview");
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const removeScheduled = (id: number) =>
    setScheduled((prev) => prev.filter((p) => p.id !== id));

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "รหัสไม่ถูกต้อง");
      }

      setIsAuthenticated(true);
      setPassword("");
    } catch (error) {
      setIsAuthenticated(false);
      setAuthError(error instanceof Error ? error.message : "ไม่สามารถเข้าสู่ระบบได้");
    } finally {
      setAuthLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
              <LockKeyhole size={20} />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Admin Access
              </p>
              <p className="text-sm text-muted-foreground">กรอกรหัสเพื่อเข้าสู่หน้า admin ทุกครั้ง</p>
            </div>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm text-muted-foreground">รหัสผ่าน</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="ใส่รหัสผ่าน"
              autoFocus
            />
          </label>

          {authError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60"
          >
            {authLoading ? "กำลังตรวจสอบ..." : "เข้าสู่หน้า admin"}
          </button>

          <div className="text-xs text-muted-foreground text-center">
            ระบบจะไม่จำรหัสหลังรีเฟรชหน้า
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm">🥐</span>
            </div>
            <div>
              <p
                className="text-sm font-semibold text-sidebar-foreground leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                YummyYummy
              </p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                activeNav === id
                  ? "bg-primary/30 text-sidebar-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
              {id === "instagram" && scheduled.length > 0 && (
                <span className="ml-auto text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {scheduled.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            กลับสู่เว็บไซต์
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {activeNav === "overview" && <AdminOverview />}

        {activeNav === "menu" && (
          <AdminMenu scheduled={scheduled} setScheduled={setScheduled} />
        )}

        {activeNav === "instagram" && (
          <AdminInstagram
            scheduled={scheduled}
            onRemoveScheduled={removeScheduled}
          />
        )}

        {activeNav === "orders" && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <OrderManagementPanel />
          </div>
        )}

        {activeNav === "reports" && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BarChart2 size={28} className="text-muted-foreground" />
              </div>
              <h2
                className="text-foreground mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                รายงาน
              </h2>
              <p className="text-sm text-muted-foreground">กำลังพัฒนา - เร็วๆ นี้</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
