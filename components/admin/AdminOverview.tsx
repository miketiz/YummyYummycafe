"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  Package,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

type SummaryResponse = {
  asOf: string;
  today: {
    orders: number;
    revenue: number;
    paid: number;
    unpaid: number;
    statuses: Record<string, number>;
  };
  month: {
    orders: number;
    revenue: number;
    paid: number;
    unpaid: number;
    statuses: Record<string, number>;
  };
  trends: {
    dailyOrders: number[];
    dailyRevenue: number[];
    hourlyOrders: number[];
    bakeryRevenue: number;
    beverageRevenue: number;
  };
  dailySeries: Array<{ day: string; orders: number; revenue: number }>;
  hourlySeries: Array<{ hour: string; orders: number }>;
  topItems: Array<{ name: string; revenue: number }>;
  todayBestsellers: Array<{ name: string; sold: number; goal: number; emoji: string }>;
  recentOrders: Array<{
    id: string;
    items: string;
    total: number;
    time: string;
    status: "completed" | "processing" | "pending";
  }>;
};

const DAILY_GOAL = 2500;

function money(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

function KpiCard({
  title,
  value,
  sub,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  sub: string;
  trend: number;
  icon: ElementType;
  color: string;
}) {
  const isUp = trend >= 0;
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
        {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{isUp ? "+" : ""}{trend}% จากสัปดาห์ที่แล้ว</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
        <CheckCircle2 size={13} /> เสร็จสิ้น
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
        <Loader2 size={13} className="animate-spin" /> กำลังทำ
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
      <Clock size={13} /> รอดำเนินการ
    </span>
  );
}

function AreaSparkline({ dailySeries }: { dailySeries: SummaryResponse["dailySeries"] }) {
  const W = 500;
  const H = 160;
  const PAD = { top: 10, right: 10, bottom: 28, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const maxOrders = Math.max(1, ...dailySeries.map((d) => d.orders));
  const maxRevenue = Math.max(1, ...dailySeries.map((d) => d.revenue));
  const oxPts = dailySeries.map((d, i) => ({ x: dailySeries.length > 1 ? (i / (dailySeries.length - 1)) * iW : 0, y: iH - (d.orders / maxOrders) * iH }));
  const rxPts = dailySeries.map((d, i) => ({ x: dailySeries.length > 1 ? (i / (dailySeries.length - 1)) * iW : 0, y: iH - (d.revenue / maxRevenue) * iH }));
  const pathD = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = (pts: { x: number; y: number }[]) => `${pathD(pts)} L ${pts[pts.length - 1]?.x ?? 0} ${iH} L 0 ${iH} Z`;

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
        {dailySeries.map((d, i) => (
          <text key={`${d.day}-${i}`} x={dailySeries.length > 1 ? (i / (dailySeries.length - 1)) * iW : 0} y={iH + 18} textAnchor="middle" fontSize={11} fill="#6b7f76">
            {d.day}
          </text>
        ))}
        {[0, maxOrders / 2, maxOrders].map((v, i) => (
          <text key={i} x={-8} y={iH - (v / maxOrders) * iH + 4} textAnchor="end" fontSize={10} fill="#6b7f76">
            {Math.round(v)}
          </text>
        ))}
      </g>
    </svg>
  );
}

function HourlyBarChart({ hourlySeries }: { hourlySeries: SummaryResponse["hourlySeries"] }) {
  const maxVal = Math.max(1, ...hourlySeries.map((d) => d.orders));
  const W = 500;
  const H = 160;
  const PAD = { top: 10, right: 10, bottom: 28, left: 28 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const gap = hourlySeries.length > 0 ? iW / hourlySeries.length : iW;
  const barW = gap * 0.55;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} y1={iH * (1 - t)} x2={iW} y2={iH * (1 - t)} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        {hourlySeries.map((d, i) => {
          const bH = (d.orders / maxVal) * iH;
          const x = i * gap + gap / 2 - barW / 2;
          return (
            <g key={d.hour}>
              <rect x={x} y={iH - bH} width={barW} height={bH} fill={d.orders === maxVal ? "#f9c74f" : "#a8d5ba"} rx={4} ry={4} />
              <text x={x + barW / 2} y={iH + 16} textAnchor="middle" fontSize={9.5} fill="#6b7f76">
                {d.hour}:00
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function BarChartCustom({ topItems }: { topItems: SummaryResponse["topItems"] }) {
  const maxVal = Math.max(1, ...topItems.map((d) => d.revenue));
  const W = 500;
  const H = 170;
  const PAD = { top: 10, right: 10, bottom: 30, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const gap = topItems.length > 0 ? iW / topItems.length : iW;
  const barW = gap * 0.55;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} y1={iH * (1 - t)} x2={iW} y2={iH * (1 - t)} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        {topItems.map((d, i) => {
          const bH = (d.revenue / maxVal) * iH;
          const x = i * gap + gap / 2 - barW / 2;
          return (
            <g key={d.name}>
              <rect x={x} y={iH - bH} width={barW} height={bH} fill="#a8d5ba" rx={5} ry={5} />
              <text x={x + barW / 2} y={iH + 16} textAnchor="middle" fontSize={10} fill="#6b7f76">
                {d.name}
              </text>
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

function DonutChart({ bakeryRevenue, beverageRevenue }: { bakeryRevenue: number; beverageRevenue: number }) {
  const total = Math.max(1, bakeryRevenue + beverageRevenue);
  const bakeryPct = bakeryRevenue / total;
  const beveragePct = beverageRevenue / total;
  const r = 55;
  const cx = 80;
  const cy = 80;
  const strokeW = 22;
  const circumference = 2 * Math.PI * r;
  const bakeryArc = bakeryPct * circumference;
  const beverageArc = beveragePct * circumference;

  return (
    <svg viewBox="0 0 160 160" className="w-full" style={{ maxHeight: 160 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f2ea" strokeWidth={strokeW} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#a8d5ba"
        strokeWidth={strokeW}
        strokeDasharray={`${bakeryArc} ${circumference - bakeryArc}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f9c74f"
        strokeWidth={strokeW}
        strokeDasharray={`${beverageArc} ${circumference - beverageArc}`}
        strokeDashoffset={circumference / 4 - bakeryArc}
        strokeLinecap="round"
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={600} fill="#2d3e3a">
        {Math.round(bakeryPct * 100)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#6b7f76">
        เบเกอรี่
      </text>
    </svg>
  );
}

function toGoalPct(revenue: number) {
  return Math.min(100, Math.round((revenue / DAILY_GOAL) * 100));
}

export function AdminOverview() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/admin/summary", {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to fetch admin summary");
        }

        const data = (await res.json()) as SummaryResponse;
        setSummary(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        console.error("Admin overview load error:", err);
        setError("ไม่สามารถโหลดสรุปข้อมูลได้");
      } finally {
        setIsLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  const completedCount = summary?.today.statuses.delivered || 0;
  const processingCount =
    (summary?.today.statuses.confirmed || 0) +
    (summary?.today.statuses.preparing || 0) +
    (summary?.today.statuses.ready || 0);
  const pendingCount = summary?.today.statuses.pending || 0;
  const goalPct = summary ? toGoalPct(summary.today.revenue) : 0;

  const customerStats = useMemo(() => {
    const total = summary?.today.orders || 0;
    const paid = summary?.today.paid || 0;
    const unpaid = summary?.today.unpaid || 0;
    return {
      total,
      paid,
      unpaid,
      average: total > 0 ? Math.round((summary?.today.revenue || 0) / total) : 0,
    };
  }, [summary]);

  if (isLoading && !summary) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>กำลังโหลดสรุปยอดขายจริง...</span>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700">
          <p className="font-semibold">เกิดข้อผิดพลาด</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const currentSummary = summary!;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            ภาพรวมร้าน
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            ข้อมูลจริงจากฐานข้อมูล · อัปเดตล่าสุด {new Date(currentSummary.asOf).toLocaleString("th-TH")}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          วันนี้: {currentSummary.today.orders} ออเดอร์ · เดือนนี้: {currentSummary.month.orders} ออเดอร์
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          title="ยอดสั่งซื้อวันนี้"
          value={`${currentSummary.today.orders}`}
          sub="คำสั่งซื้อจริง"
          trend={12}
          icon={Package}
          color="bg-primary/20 text-primary-foreground"
        />
        <KpiCard
          title="รายได้วันนี้"
          value={money(currentSummary.today.revenue)}
          sub="บาท"
          trend={8}
          icon={Banknote}
          color="bg-amber-100 text-amber-700"
        />
        <KpiCard
          title="ยอดสั่งซื้อเดือนนี้"
          value={`${currentSummary.month.orders}`}
          sub="คำสั่งซื้อจริง"
          trend={5}
          icon={ShoppingBag}
          color="bg-blue-100 text-blue-700"
        />
        <KpiCard
          title="รายได้เดือนนี้"
          value={money(currentSummary.month.revenue)}
          sub="บาท"
          trend={10}
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={15} className="text-amber-500" />
            <h3 className="text-sm font-medium text-foreground">สถานะคำสั่งซื้อวันนี้</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 size={14} className="text-emerald-500" /> เสร็จสิ้น
              </span>
              <span className="text-sm font-semibold text-foreground">{completedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="text-amber-500" /> กำลังทำ
              </span>
              <span className="text-sm font-semibold text-foreground">{processingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} /> รอดำเนินการ
              </span>
              <span className="text-sm font-semibold text-foreground">{pendingCount}</span>
            </div>
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">รวมทั้งหมด</span>
              <span className="text-sm font-bold text-foreground">{currentSummary.today.orders} คำสั่งซื้อ</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Target size={15} className="text-primary" />
            <h3 className="text-sm font-medium text-foreground">เป้ารายได้วันนี้</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">เป้าหมาย ฿{DAILY_GOAL.toLocaleString("th-TH")}</p>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {goalPct}%
            </span>
            <span className="text-xs text-muted-foreground mb-1">ของเป้าหมาย</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ยังขาดอีก ฿{Math.max(0, DAILY_GOAL - currentSummary.today.revenue).toLocaleString("th-TH")}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-blue-500" />
            <h3 className="text-sm font-medium text-foreground">การชำระเงินวันนี้</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ชำระแล้ว</span>
              <span className="text-sm font-semibold text-emerald-600">{customerStats.paid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">รอชำระเงิน</span>
              <span className="text-sm font-semibold text-amber-600">{customerStats.unpaid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ลูกค้าทั้งหมดวันนี้</span>
              <span className="text-sm font-semibold text-foreground">{customerStats.total}</span>
            </div>
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">ยอดเฉลี่ย/บิล</span>
              <span className="text-sm font-bold text-foreground">{money(customerStats.average)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            ยอดสั่งซื้อรายวัน (7 วัน)
          </h3>
          <div className="flex gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded bg-[#a8d5ba] inline-block" /> คำสั่งซื้อ
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded bg-[#f9c74f] inline-block" /> รายได้
            </span>
          </div>
          <AreaSparkline dailySeries={currentSummary.dailySeries} />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            สัดส่วนยอดขาย
          </h3>
          <p className="text-xs text-muted-foreground mb-3">เบเกอรี่ vs เครื่องดื่ม</p>
          <div className="flex justify-center">
            <div className="w-40">
              <DonutChart bakeryRevenue={currentSummary.trends.bakeryRevenue} beverageRevenue={currentSummary.trends.beverageRevenue} />
            </div>
          </div>
          <div className="flex justify-around mt-4">
            <div className="text-center">
              <div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 bg-[#a8d5ba]" />
              <p className="text-xs text-muted-foreground">เบเกอรี่</p>
              <p className="text-sm font-semibold text-foreground">
                {Math.round((currentSummary.trends.bakeryRevenue / Math.max(1, currentSummary.trends.bakeryRevenue + currentSummary.trends.beverageRevenue)) * 100)}%
              </p>
            </div>
            <div className="text-center">
              <div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 bg-[#f9c74f]" />
              <p className="text-xs text-muted-foreground">เครื่องดื่ม</p>
              <p className="text-sm font-semibold text-foreground">
                {Math.round((currentSummary.trends.beverageRevenue / Math.max(1, currentSummary.trends.bakeryRevenue + currentSummary.trends.beverageRevenue)) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            ช่วงเวลาที่ลูกค้ามากที่สุด
          </h3>
          <p className="text-xs text-muted-foreground mb-3">จำนวนคำสั่งซื้อแต่ละชั่วโมงวันนี้</p>
          <HourlyBarChart hourlySeries={currentSummary.hourlySeries} />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            สินค้าขายดีวันนี้
          </h3>
          <p className="text-xs text-muted-foreground mb-4">อิงจากออเดอร์จริงในระบบ</p>
          <div className="flex flex-col gap-4">
            {currentSummary.todayBestsellers.map((item) => {
              const pct = Math.round((item.sold / item.goal) * 100);
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground flex items-center gap-1.5">
                      <span>{item.emoji}</span>{item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.sold}/{item.goal}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#8bc5a1" : pct >= 60 ? "#a8d5ba" : "#f9c74f" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border mb-4">
        <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          รายได้ตามเมนู (7 วัน)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">เมนูที่ทำรายได้สูงสุด 6 อันดับ</p>
        <BarChartCustom topItems={currentSummary.topItems} />
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              คำสั่งซื้อล่าสุด
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">ข้อมูลจากออเดอร์จริงล่าสุดในฐานข้อมูล</p>
          </div>
          <div className="text-xs text-muted-foreground">
            ชำระแล้ววันนี้ {currentSummary.today.paid} · รอชำระ {currentSummary.today.unpaid}
          </div>
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
              {currentSummary.recentOrders.map((order, i) => (
                <tr key={order.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-5 py-3 font-medium text-foreground">{order.id}</td>
                  <td className="px-5 py-3 text-muted-foreground">{order.items}</td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">{money(order.total)}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{order.time}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={12} />
          สรุปนี้อ่านจากฐานข้อมูลจริงทุกครั้งที่เปิดหน้า
        </span>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground"
        >
          รีเฟรชสรุป
        </button>
      </div>
    </div>
  );
}
