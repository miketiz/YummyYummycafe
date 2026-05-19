import {
  TrendingUp,
  TrendingDown,
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
} from "lucide-react";

const dailyData = [
  { day: "จ.", orders: 28, revenue: 2440 },
  { day: "อ.", orders: 32, revenue: 2780 },
  { day: "พ.", orders: 25, revenue: 2120 },
  { day: "พฤ.", orders: 38, revenue: 3360 },
  { day: "ศ.", orders: 45, revenue: 3980 },
  { day: "ส.", orders: 52, revenue: 4620 },
  { day: "อา.", orders: 19, revenue: 1580 },
];

const hourlyData = [
  { hour: "7", orders: 2 },
  { hour: "8", orders: 8 },
  { hour: "9", orders: 5 },
  { hour: "10", orders: 3 },
  { hour: "11", orders: 2 },
  { hour: "12", orders: 4 },
  { hour: "13", orders: 1 },
  { hour: "14", orders: 1 },
  { hour: "15", orders: 3 },
  { hour: "16", orders: 2 },
  { hour: "17", orders: 1 },
];

const topItemsData = [
  { name: "ครัวซองต์", revenue: 3250 },
  { name: "ซินนามอน โรล", revenue: 2890 },
  { name: "มาการอง", revenue: 2640 },
  { name: "ดานิช", revenue: 2100 },
  { name: "เอแคลร์", revenue: 1890 },
  { name: "ลาเต้", revenue: 1560 },
];

const todayBestsellers = [
  { name: "ครัวซองต์เนยแท้", sold: 8, goal: 10, emoji: "🥐" },
  { name: "ซินนามอน โรล", sold: 5, goal: 8, emoji: "🌀" },
  { name: "มาการองฝรั่งเศส", sold: 4, goal: 6, emoji: "🫠" },
  { name: "ลาเต้", sold: 6, goal: 10, emoji: "☕" },
  { name: "เอแคลร์ช็อกโกแลต", sold: 3, goal: 5, emoji: "🍫" },
];

const lowStockItems = [
  { name: "ฟรุ๊ต ทาร์ต", remaining: 2, unit: "ชิ้น", level: "critical" },
  { name: "โฟกาชชาสมุนไพร", remaining: 3, unit: "ก้อน", level: "low" },
  { name: "สโคนครีม", remaining: 4, unit: "ชิ้น", level: "low" },
];

const recentOrders = [
  { id: "#2847", items: "ครัวซองต์ × 2, ลาเต้ × 1", total: 215, time: "09:12", status: "completed" },
  { id: "#2846", items: "ซินนามอน โรล × 1, มัฟฟิน × 2", total: 225, time: "09:05", status: "completed" },
  { id: "#2845", items: "มาการอง × 3, กาแฟ × 1", total: 395, time: "08:58", status: "completed" },
  { id: "#2844", items: "ซาวร์โดว์ × 1, เอแคลร์ × 1", total: 270, time: "08:47", status: "completed" },
  { id: "#2843", items: "ดานิช × 2, ชาเขียว × 2", total: 280, time: "08:33", status: "completed" },
  { id: "#2848", items: "ฟรุ๊ต ทาร์ต × 1, ลาเต้ × 1", total: 215, time: "09:18", status: "processing" },
  { id: "#2849", items: "สโคน × 2, กาแฟ × 2", total: 290, time: "09:22", status: "pending" },
];

const DAILY_GOAL = 2500;
const todayRevenue = 1580;
const goalPct = Math.min(100, Math.round((todayRevenue / DAILY_GOAL) * 100));

// ── custom SVG charts ──────────────────────────────────────

function AreaSparkline() {
  const W = 500, H = 160, PAD = { top: 10, right: 10, bottom: 28, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const maxOrders = Math.max(...dailyData.map((d) => d.orders));
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue));
  const oxPts = dailyData.map((d, i) => ({ x: (i / (dailyData.length - 1)) * iW, y: iH - (d.orders / maxOrders) * iH }));
  const rxPts = dailyData.map((d, i) => ({ x: (i / (dailyData.length - 1)) * iW, y: iH - (d.revenue / maxRevenue) * iH }));
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
        {dailyData.map((d, i) => (
          <text key={d.day} x={(i / (dailyData.length - 1)) * iW} y={iH + 18} textAnchor="middle" fontSize={11} fill="#6b7f76">{d.day}</text>
        ))}
        {[0, maxOrders / 2, maxOrders].map((v, i) => (
          <text key={i} x={-8} y={iH - (v / maxOrders) * iH + 4} textAnchor="end" fontSize={10} fill="#6b7f76">{Math.round(v)}</text>
        ))}
      </g>
    </svg>
  );
}

function HourlyBarChart() {
  const maxVal = Math.max(...hourlyData.map((d) => d.orders));
  const W = 500, H = 160, PAD = { top: 10, right: 10, bottom: 28, left: 28 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const gap = iW / hourlyData.length;
  const barW = gap * 0.55;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} y1={iH * (1 - t)} x2={iW} y2={iH * (1 - t)} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        {hourlyData.map((d, i) => {
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

function BarChartCustom() {
  const maxVal = Math.max(...topItemsData.map((d) => d.revenue));
  const W = 500, H = 170, PAD = { top: 10, right: 10, bottom: 30, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const gap = iW / topItemsData.length;
  const barW = gap * 0.55;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} y1={iH * (1 - t)} x2={iW} y2={iH * (1 - t)} stroke="rgba(168,213,186,0.2)" strokeDasharray="4 4" />
        ))}
        {topItemsData.map((d, i) => {
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

function DonutChart() {
  const r = 55, cx = 80, cy = 80, strokeW = 22;
  const circumference = 2 * Math.PI * r;
  const bakeryArc = 0.68 * circumference;
  const beverageArc = 0.32 * circumference;
  return (
    <svg viewBox="0 0 160 160" className="w-full" style={{ maxHeight: 160 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f2ea" strokeWidth={strokeW} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#a8d5ba" strokeWidth={strokeW}
        strokeDasharray={`${bakeryArc} ${circumference - bakeryArc}`}
        strokeDashoffset={circumference / 4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f9c74f" strokeWidth={strokeW}
        strokeDasharray={`${beverageArc} ${circumference - beverageArc}`}
        strokeDashoffset={circumference / 4 - bakeryArc} strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={600} fill="#2d3e3a">68%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#6b7f76">เบเกอรี่</text>
    </svg>
  );
}

// ── status helpers ─────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return (
    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
      <CheckCircle2 size={13} /> เสร็จสิ้น
    </span>
  );
  if (status === "processing") return (
    <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
      <Loader2 size={13} className="animate-spin" /> กำลังทำ
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
      <Clock size={13} /> รอดำเนินการ
    </span>
  );
}

type KpiCardProps = { title: string; value: string; sub: string; trend: number; icon: React.ElementType; color: string };

function KpiCard({ title, value, sub, trend, icon: Icon, color }: KpiCardProps) {
  const isUp = trend >= 0;
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
      <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
        {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{isUp ? "+" : ""}{trend}% จากสัปดาห์ที่แล้ว</span>
      </div>
    </div>
  );
}

// ── main export ────────────────────────────────────────────

export function AdminOverview() {
  const completedCount = recentOrders.filter((o) => o.status === "completed").length;
  const processingCount = recentOrders.filter((o) => o.status === "processing").length;
  const pendingCount = recentOrders.filter((o) => o.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>ภาพรวมร้าน</h1>
        <p className="text-muted-foreground text-sm mt-1">ข้อมูลสรุป ณ วันนี้ · อัปเดตล่าสุด 09:22 น.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard title="ยอดสั่งซื้อวันนี้" value="19" sub="คำสั่งซื้อ" trend={12} icon={Package} color="bg-primary/20 text-primary-foreground" />
        <KpiCard title="รายได้วันนี้" value="฿1,580" sub="บาท" trend={8} icon={Banknote} color="bg-amber-100 text-amber-700" />
        <KpiCard title="ยอดสั่งซื้อ 7 วัน" value="239" sub="คำสั่งซื้อ" trend={-3} icon={ShoppingBag} color="bg-blue-100 text-blue-700" />
        <KpiCard title="รายได้ 7 วัน" value="฿20,880" sub="บาท" trend={5} icon={TrendingUp} color="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4"><Flame size={15} className="text-amber-500" /><h3 className="text-sm font-medium text-foreground">สถานะคำสั่งซื้อวันนี้</h3></div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={14} className="text-emerald-500" /> เสร็จสิ้น</span><span className="text-sm font-semibold text-foreground">{completedCount}</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="text-amber-500" /> กำลังทำ</span><span className="text-sm font-semibold text-foreground">{processingCount}</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock size={14} /> รอดำเนินการ</span><span className="text-sm font-semibold text-foreground">{pendingCount}</span></div>
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between"><span className="text-xs text-muted-foreground">รวมทั้งหมด</span><span className="text-sm font-bold text-foreground">{recentOrders.length} คำสั่งซื้อ</span></div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-1"><Target size={15} className="text-primary" /><h3 className="text-sm font-medium text-foreground">เป้ารายได้วันนี้</h3></div>
          <p className="text-xs text-muted-foreground mb-4">เป้าหมาย ฿{DAILY_GOAL.toLocaleString()}</p>
          <div className="flex items-end gap-1 mb-3"><span className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{goalPct}%</span><span className="text-xs text-muted-foreground mb-1">ของเป้าหมาย</span></div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${goalPct}%` }} /></div>
          <p className="text-xs text-muted-foreground mt-2">ยังขาดอีก ฿{(DAILY_GOAL - todayRevenue).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4"><Users size={15} className="text-blue-500" /><h3 className="text-sm font-medium text-foreground">ลูกค้าวันนี้</h3></div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">ลูกค้าทั้งหมด</span><span className="text-sm font-semibold text-foreground">19</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">ลูกค้าประจำ</span><span className="text-sm font-semibold text-emerald-600">12</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">ลูกค้าใหม่</span><span className="text-sm font-semibold text-blue-600">7</span></div>
            <div className="mt-1 pt-3 border-t border-border flex items-center justify-between"><span className="text-xs text-muted-foreground">ยอดเฉลี่ย/คน</span><span className="text-sm font-bold text-foreground">฿83</span></div>
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
          <AreaSparkline />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>สัดส่วนยอดขาย</h3>
          <p className="text-xs text-muted-foreground mb-3">เบเกอรี่ vs เครื่องดื่ม</p>
          <div className="flex justify-center"><div className="w-40"><DonutChart /></div></div>
          <div className="flex justify-around mt-4">
            <div className="text-center"><div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 bg-[#a8d5ba]" /><p className="text-xs text-muted-foreground">เบเกอรี่</p><p className="text-sm font-semibold text-foreground">68%</p></div>
            <div className="text-center"><div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 bg-[#f9c74f]" /><p className="text-xs text-muted-foreground">เครื่องดื่ม</p><p className="text-sm font-semibold text-foreground">32%</p></div>
          </div>
        </div>
      </div>

      {/* Hourly + bestsellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>ช่วงเวลาที่ลูกค้ามากที่สุด</h3>
          <p className="text-xs text-muted-foreground mb-3">จำนวนคำสั่งซื้อแต่ละชั่วโมงวันนี้</p>
          <HourlyBarChart />
          <p className="text-xs text-muted-foreground mt-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />ชั่วโมงยอดนิยม: 8:00 น. · 8 คำสั่งซื้อ</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>สินค้าขายดีวันนี้</h3>
          <p className="text-xs text-muted-foreground mb-4">เทียบกับเป้าหมายรายวัน</p>
          <div className="flex flex-col gap-4">
            {todayBestsellers.map((item) => {
              const pct = Math.round((item.sold / item.goal) * 100);
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground flex items-center gap-1.5"><span>{item.emoji}</span>{item.name}</span>
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

      {/* Top items bar */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border mb-4">
        <h3 className="text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>รายได้ตามเมนู (7 วัน)</h3>
        <p className="text-xs text-muted-foreground mb-3">เมนูที่ทำรายได้สูงสุด 6 อันดับ</p>
        <BarChartCustom />
      </div>

      {/* Low stock */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-amber-500" /><h3 className="text-sm font-semibold text-amber-800">แจ้งเตือนสต็อกใกล้หมด</h3></div>
          <div className="flex flex-wrap gap-3">
            {lowStockItems.map((item) => (
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
              {recentOrders.map((order, i) => (
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
