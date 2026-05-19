import { useState } from "react";
import { Link } from "react-router";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, BarChart2, ArrowLeft, Instagram } from "lucide-react";
import { AdminOverview } from "../components/admin/AdminOverview";
import { AdminMenu } from "../components/admin/AdminMenu";
import { AdminInstagram } from "../components/admin/AdminInstagram";
import type { ScheduledPost } from "../components/admin/AdminMenu";

const navItems = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "orders", label: "คำสั่งซื้อ", icon: ShoppingBag },
  { id: "menu", label: "จัดการเมนู", icon: UtensilsCrossed },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "reports", label: "รายงาน", icon: BarChart2 },
];

export default function Admin() {
  const [activeNav, setActiveNav] = useState("overview");
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);

  const removeScheduled = (id: number) => setScheduled((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm">🥐</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground leading-tight" style={{ fontFamily: "var(--font-heading)" }}>YummyYummy</p>
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
            to="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            กลับสู่เว็บไซต์
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {activeNav === "overview" && <AdminOverview />}

        {activeNav === "menu" && (
          <AdminMenu scheduled={scheduled} setScheduled={setScheduled} />
        )}

        {activeNav === "instagram" && (
          <AdminInstagram scheduled={scheduled} onRemoveScheduled={removeScheduled} />
        )}

        {(activeNav === "orders" || activeNav === "reports") && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                {activeNav === "orders"
                  ? <ShoppingBag size={28} className="text-muted-foreground" />
                  : <BarChart2 size={28} className="text-muted-foreground" />}
              </div>
              <h2 className="text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                {activeNav === "orders" ? "คำสั่งซื้อ" : "รายงาน"}
              </h2>
              <p className="text-sm text-muted-foreground">กำลังพัฒนา — เร็วๆ นี้</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
