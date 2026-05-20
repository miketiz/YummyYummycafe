"use client";

import {
  Package,
  Banknote,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Target,
  Users,
  Flame,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, type ElementType } from "react";

type DailyPoint = { day: string; orders: number; revenue: number };
type HourPoint = { hour: string; orders: number };
type RevenuePoint = { name: string; revenue: number };
type BestsellerPoint = { name: string; sold: number; share: number; emoji: string };
type LowStockPoint = { name: string; remaining: number; unit: string; level: "critical" | "low" };
type RecentOrderPoint = { id: string; items: string; total: number; time: string; status: string };

type DashboardSummary = {
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  weeklyOrders: number;
  todayRevenue: number;
  weeklyRevenue: number;
  averageOrderValueToday: number;
  customerStats: { totalToday: number; newToday: number; returningToday: number };
  statusCountsToday: { delivered: number; processing: number; pending: number };
  dailyData: DailyPoint[];
  hourlyData: HourPoint[];
  topItemsData: RevenuePoint[];
  todayBestsellers: BestsellerPoint[];
  lowStockItems: LowStockPoint[];
  recentOrders: RecentOrderPoint[];
  salesSplit: { bakery: number; beverage: number };
  updatedAt: string;
};

function formatCurrency(value: number) {
  return `฿${Math.round(value).toLocaleString("th-TH")}`;
}

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── custom SVG charts ──────────────────────────────────────

function AreaSparkline({ data }: { data: DailyPoint[] }) {
  const W = 500, H = 160, PAD = { top: 10, right: 10, bottom: 28, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const oxPts = data.map((d, i) => ({ x: (i / Math.max(1, data.length - 1)) * iW, y: iH - (d.orders / maxOrders) * iH }));
  const rxPts = data.map((d, i) => ({ x: (i / Math.max(1, data.length - 1)) * iW, y: iH - (d.revenue / maxRevenue) * iH }));
  const pathD = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = (pts: { x: number; y: number }[]) => `${pathD(pts)} L ${pts[pts.length - 1].x} ${iH} L 0 ${iH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="ov-ag1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8d5ba" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#a8d5ba" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="ov-ag2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9c74f" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#f9c74f" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} y1={iH * t} x2={iW} y2={iH * t} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        <path d={areaD(oxPts)} fill="url(#ov-ag1)" />
        <path d={areaD(rxPts)} fill="url(#ov-ag2)" />
        <path d={pathD(oxPts)} fill="none" stroke="#a8d5ba" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathD(rxPts)} fill="none" stroke="#f9c74f" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <text key={`${d.day}-${i}`} x={(i / Math.max(1, data.length - 1)) * iW} y={iH + 18} textAnchor="middle" fontSize={11} fill="#6b7f76">{d.day}</text>
        ))}
        {[0, maxOrders / 2, maxOrders].map((v, i) => (
          <text key={i} x={-8} y={iH - (v / maxOrders) * iH + 4} textAnchor="end" fontSize={10} fill="#6b7f76">{Math.round(v)}</text>
        ))}
      </g>
    </svg>
  );
}

function HourlyBarChart({ data }: { data: HourPoint[] }) {
  const maxVal = Math.max(1, ...data.map((d) => d.orders));
  const W = 500, H = 160, PAD = { top: 10, right: 10, bottom: 28, left: 28 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const gap = iW / Math.max(1, data.length);
  const barW = gap * 0.55;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} y1={iH * (1 - t)} x2={iW} y2={iH * (1 - t)} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        {data.map((d, i) => {
          const bH = (d.orders / maxVal) * iH;
          const x = i * gap + gap / 2 - barW / 2;
          return (
            <g key={d.hour}>
              <rect x={x} y={iH - bH} width={barW} height={bH} fill={d.orders === maxVal ? "#f9c74f" : "#a8d5ba"} rx={4} ry={4} />
              <text x={x + barW / 2} y={iH + 16} textAnchor="middle" fontSize={9.5} fill="#6b7f76">{d.hour}:00</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function BarChartCustom({ data }: { data: RevenuePoint[] }) {
  const maxVal = Math.max(1, ...data.map((d) => d.revenue));
  const W = 500, H = 170, PAD = { top: 10, right: 10, bottom: 30, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const gap = iW / Math.max(1, data.length);
  const barW = gap * 0.55;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} y1={iH * (1 - t)} x2={iW} y2={iH * (1 - t)} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        {data.map((d, i) => {
          const bH = (d.revenue / maxVal) * iH;
          const x = i * gap + gap / 2 - barW / 2;
          return (
            <g key={d.name}>
              <rect x={x} y={iH - bH} width={barW} height={bH} fill="#a8d5ba" rx={5} ry={5} />
              <text x={x + barW / 2} y={iH + 16} textAnchor="middle" fontSize={10} fill="#6b7f76">{d.name}</text>
            </g>
          );
        })}
        {[0, maxVal / 2, maxVal].map((v, i) => (
          <text key={i} x={-8} y={iH - (v / maxVal) * iH + 4} textAnchor="end" fontSize={10} fill="#6b7f76">
            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}
          </text>
        ))}
      </g>
    </svg>
  );
}

function DonutChart({ bakery, beverage }: { bakery: number; beverage: number }) {
  const r = 55, cx = 80, cy = 80, strokeW = 22;
  const circumference = 2 * Math.PI * r;
  const total = Math.max(1, bakery + beverage);
  const bakeryArc = (bakery / total) * circumference;
  const beverageArc = (beverage / total) * circumference;
  const bakeryPct = Math.round((bakery / total) * 100);
  return (
    <svg viewBox="0 0 160 160" className="w-full" style={{ maxHeight: 160 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f2ea" strokeWidth={strokeW} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#a8d5ba" strokeWidth={strokeW}
        strokeDasharray={`${bakeryArc} ${circumference - bakeryArc}`}
        strokeDashoffset={circumference / 4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f9c74f" strokeWidth={strokeW}
        strokeDasharray={`${beverageArc} ${circumference - beverageArc}`}
        strokeDashoffset={circumference / 4 - bakeryArc} strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={600} fill="#2d3e3a">{bakeryPct}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#6b7f76">เบเกอรี่</text>
    </svg>
  );
}

// ── status helpers ─────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "delivered") return (
    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
      <CheckCircle2 size={13} /> เสร็จสิ้น
    </span>
  );
  if (status === "confirmed" || status === "preparing" || status === "ready") return (
    <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
      <Loader2 size={13} className="animate-spin" /> กำลังทำ
    </span>
  );
  if (status === "cancelled") return (
    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
      <AlertTriangle size={13} /> ยกเลิก
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
      <Clock size={13} /> รอดำเนินการ
    </span>
  );
}

type KpiCardProps = { title: string; value: string; sub: string; icon: ElementType; color: string };

function KpiCard({ title, value, sub, icon: Icon, color }: KpiCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── main export ────────────────────────────────────────────

export function AdminOverview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/summary", { cache: "no-store" });
      const data = (await res.json()) as DashboardSummary & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถโหลดข้อมูล dashboard ได้");
      }

      setSummary(data);
    } catch (fetchError) {
      setSummary(null);
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดข้อมูล dashboard ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          กำลังโหลดข้อมูลจริงจากระบบ...
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>{error || "ไม่สามารถโหลดข้อมูล dashboard ได้"}</span>
          <button onClick={fetchSummary} className="ml-auto text-xs underline hover:no-underline">ลองใหม่</button>
        </div>
      </div>
    );
  }

  const completedCount = summary.statusCountsToday.delivered;
  const processingCount = summary.statusCountsToday.processing;
  const pendingCount = summary.statusCountsToday.pending;
  const peakHourEntry = summary.hourlyData.reduce((best, current) => (current.orders > best.orders ? current : best), summary.hourlyData[0] ?? { hour: "-", orders: 0 });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>ภาพรวมร้าน</h1>
          <p className="text-muted-foreground text-sm mt-1">ข้อมูลจริงจากคำสั่งซื้อและเมนู · อัปเดตล่าสุด {formatUpdatedAt(summary.updatedAt)}</p>
        </div>
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} /> รีเฟรช
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard title="ยอดสั่งซื้อวันนี้" value={String(summary.todayOrders)} sub="คำสั่งซื้อ" icon={Package} color="bg-primary/20 text-primary-foreground" />
        <KpiCard title="รายได้วันนี้" value={formatCurrency(summary.todayRevenue)} sub="บาท" icon={Banknote} color="bg-amber-100 text-amber-700" />
        <KpiCard title="ยอดสั่งซื้อ 7 วัน" value={String(summary.weeklyOrders)} sub="คำสั่งซื้อ" icon={ShoppingBag} color="bg-blue-100 text-blue-700" />
        <KpiCard title="รายได้ 7 วัน" value={formatCurrency(summary.weeklyRevenue)} sub="บาท" icon={Banknote} color="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4"><Flame size={15} className="text-amber-500" /><h3 className="text-sm font-medium text-foreground">สถานะคำสั่งซื้อวันนี้</h3></div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={14} className="text-emerald-500" /> เสร็จสิ้น</span><span className="text-sm font-semibold text-foreground">{completedCount}</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="text-amber-500" /> กำลังทำ</span><span className="text-sm font-semibold text-foreground">{processingCount}</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock size={14} /> รอดำเนินการ</span><span className="text-sm font-semibold text-foreground">{pendingCount}</span></div>
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between"><span className="text-xs text-muted-foreground">รวมทั้งหมด</span><span className="text-sm font-bold text-foreground">{summary.todayOrders} คำสั่งซื้อ</span></div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-1"><Target size={15} className="text-primary" /><h3 className="text-sm font-medium text-foreground">ยอดเฉลี่ยต่อออเดอร์วันนี้</h3></div>
          <p className="text-xs text-muted-foreground mb-4">คำนวณจากออเดอร์ที่เข้ามาวันนี้</p>
          <div className="flex items-end gap-1 mb-3"><span className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{formatCurrency(summary.averageOrderValueToday)}</span></div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: "100%" }} /></div>
          <p className="text-xs text-muted-foreground mt-2">รายได้วันนี้ {formatCurrency(summary.todayRevenue)}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4"><Users size={15} className="text-blue-500" /><h3 className="text-sm font-medium text-foreground">ลูกค้าวันนี้</h3></div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">ลูกค้าทั้งหมด</span><span className="text-sm font-semibold text-foreground">{summary.customerStats.totalToday}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">ลูกค้าประจำ</span><span className="text-sm font-semibold text-emerald-600">{summary.customerStats.returningToday}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">ลูกค้าใหม่</span><span className="text-sm font-semibold text-blue-600">{summary.customerStats.newToday}</span></div>
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between"><span className="text-xs text-muted-foreground">คำสั่งซื้อวันนี้</span><span className="text-sm font-bold text-foreground">{summary.todayOrders}</span></div>
          </div>
        </div>
      </div>

      {/* Area + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>ยอดสั่งซื้อรายวัน (7 วัน)</h3>
          <div className="flex gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 rounded bg-[#a8d5ba] inline-block" /> คำสั่งซื้อ</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 rounded bg-[#f9c74f] inline-block" /> รายได้ (÷100)</span>
          </div>
          <AreaSparkline data={summary.dailyData} />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>สัดส่วนยอดขาย</h3>
          <p className="text-xs text-muted-foreground mb-3">คำนวณจากยอดขาย 7 วัน</p>
          <div className="flex justify-center"><div className="w-40"><DonutChart bakery={summary.salesSplit.bakery} beverage={summary.salesSplit.beverage} /></div></div>
          <div className="flex justify-around mt-4">
            <div className="text-center"><div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 bg-[#a8d5ba]" /><p className="text-xs text-muted-foreground">เบเกอรี่</p><p className="text-sm font-semibold text-foreground">{formatCurrency(summary.salesSplit.bakery)}</p></div>
            <div className="text-center"><div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 bg-[#f9c74f]" /><p className="text-xs text-muted-foreground">เครื่องดื่ม</p><p className="text-sm font-semibold text-foreground">{formatCurrency(summary.salesSplit.beverage)}</p></div>
          </div>
        </div>
      </div>

      {/* Hourly + bestsellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>ช่วงเวลาที่ลูกค้ามากที่สุด</h3>
          <p className="text-xs text-muted-foreground mb-3">จำนวนคำสั่งซื้อแต่ละชั่วโมงวันนี้</p>
          <HourlyBarChart data={summary.hourlyData} />
          <p className="text-xs text-muted-foreground mt-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />ชั่วโมงยอดนิยม: {peakHourEntry.hour}:00 น. · {peakHourEntry.orders} คำสั่งซื้อ</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>สินค้าขายดีวันนี้</h3>
          <p className="text-xs text-muted-foreground mb-4">สัดส่วนจากยอดขายวันนี้</p>
          <div className="flex flex-col gap-4">
            {summary.todayBestsellers.map((item) => {
              const pct = item.share;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground flex items-center gap-1.5"><span>{item.emoji}</span>{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.sold} ชิ้น</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 60 ? "#8bc5a1" : pct >= 35 ? "#a8d5ba" : "#f9c74f" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top items bar */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border mb-4">
        <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>รายได้ตามเมนู (7 วัน)</h3>
        <p className="text-xs text-muted-foreground mb-3">เมนูที่ทำรายได้สูงสุด 6 อันดับ</p>
        <BarChartCustom data={summary.topItemsData} />
      </div>

      {/* Low stock */}
      {summary.lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-amber-500" /><h3 className="text-sm font-semibold text-amber-800">แจ้งเตือนสต็อกใกล้หมด</h3></div>
          <div className="flex flex-wrap gap-3">
            {summary.lowStockItems.map((item) => (
              <div key={item.name} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${item.level === "critical" ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                <span className="font-medium">{item.name}</span>
                <span className="opacity-70">เหลือ {item.remaining} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>คำสั่งซื้อล่าสุด</h3>
          <p className="text-xs text-muted-foreground mt-0.5">คำสั่งซื้อวันนี้ทั้งหมด</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-5 py-3 text-left text-xs text-muted-foreground font-medium">รหัสคำสั่งซื้อ</th>
                <th className="px-5 py-3 text-left text-xs text-muted-foreground font-medium">รายการ</th>
                <th className="px-5 py-3 text-right text-xs text-muted-foreground font-medium">ยอดรวม</th>
                <th className="px-5 py-3 text-center text-xs text-muted-foreground font-medium">เวลา</th>
                <th className="px-5 py-3 text-center text-xs text-muted-foreground font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentOrders.map((order, i) => (
                <tr key={order.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-5 py-3 font-medium text-foreground">{order.id}</td>
                  <td className="px-5 py-3 text-muted-foreground">{order.items}</td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">฿{order.total.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{order.time}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
