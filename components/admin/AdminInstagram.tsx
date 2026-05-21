import { useEffect, useState } from "react";
import {
  Camera, Calendar, Clock, Heart, MessageCircle, Send,
  ExternalLink, X, TrendingUp, Image as ImageIcon, CheckCircle2,
  RefreshCw,
} from "lucide-react";
import type { ScheduledPost } from "./AdminMenu";

type PostHistoryItem = {
  id: string;
  caption: string;
  itemName: string;
  postedAt: string;
  likes: number;
  comments: number;
  status: string;
  mediaUrls: string[];
};

type StatCardProps = { label: string; value: string | number; icon: React.ElementType; color: string };
function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function timeFromNow(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `อีก ${d} วัน`;
  if (h > 0) return `อีก ${h} ชั่วโมง`;
  const m = Math.floor(diff / 60000);
  if (m > 0) return `อีก ${m} นาที`;
  return "ถึงเวลาแล้ว!";
}

type Props = {
  scheduled: ScheduledPost[];
  onRemoveScheduled: (id: number) => void;
};

const PALETTE = ["#a8d5ba", "#f9c74f", "#a8c7e8", "#f4a8c7", "#c8a8e8"];

export function AdminInstagram({ scheduled, onRemoveScheduled }: Props) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [history, setHistory] = useState<PostHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/unipost/history?limit=50");
      const data = (await res.json()) as { posts?: PostHistoryItem[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setHistory(data.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch post history:", err);
      setError(err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลโพสได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const totalLikes = history.reduce((s, p) => s + p.likes, 0);
  const totalComments = history.reduce((s, p) => s + p.comments, 0);
  const avgEngagement = history.length > 0 ? Math.round((totalLikes + totalComments) / history.length) : 0;
  const completedPosts = history.filter((p) =>
    p.status === "published" || p.status === "completed" || p.status === "sent" || p.status === "success"
  );

  const upcoming = [...scheduled].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-sm">
          <Camera size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Instagram</h1>
          <p className="text-muted-foreground text-sm">จัดการโพส ดูตารางเวลา และประวัติการโพส</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="โพสทั้งหมด" value={history.length} icon={ImageIcon} color="bg-purple-100 text-purple-600" />
          <StatCard label="ยอด Like รวม" value={totalLikes.toLocaleString()} icon={Heart} color="bg-pink-100 text-pink-600" />
          <StatCard label="ยอด Comment รวม" value={totalComments} icon={MessageCircle} color="bg-blue-100 text-blue-600" />
          <StatCard label="Engagement เฉลี่ย" value={avgEngagement} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
        </div>
      )}

      {/* Upcoming scheduled */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">โพสที่กำลังจะมาถึง</h2>
          {upcoming.length > 0 && (
            <span className="ml-auto text-xs bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-full">{upcoming.length} โพส</span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Calendar size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">ยังไม่มีโพสที่นัดไว้</p>
            <p className="text-xs text-muted-foreground mt-1">ไปที่ &quot;จัดการเมนู → Instagram Caption&quot; เพื่อนัดเวลาโพส</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((post) => (
              <div key={post.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex gap-4 p-4">
                  {post.imageUrl ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted/30">
                      <img
                        src={post.imageUrl}
                        alt={post.itemName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shrink-0 text-3xl">
                      {post.itemEmoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{post.itemName}</p>
                        <p className="text-xs text-muted-foreground">{post.style}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={10} /> {timeFromNow(post.scheduledAt)}
                        </span>
                        <button onClick={() => onRemoveScheduled(post.id)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(post.scheduledAt)}
                    </p>
                    <button onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                      className="text-xs text-primary mt-1.5 hover:underline">
                      {expandedId === post.id ? "ซ่อน caption ▲" : "ดู caption ▼"}
                    </button>
                    {expandedId === post.id && (
                      <p className="text-xs text-foreground whitespace-pre-line mt-2 p-2 bg-muted/30 rounded-lg leading-relaxed">{post.caption}</p>
                    )}
                  </div>
                </div>
                <div className="border-t border-border px-4 py-2.5 flex gap-2 bg-muted/20">
                  <button
                    onClick={() => { navigator.clipboard.writeText(post.caption); window.open("https://www.instagram.com/", "_blank"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 transition-opacity"
                  >
                    <Send size={11} /> โพสเลย
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(post.caption)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted-foreground border border-border hover:text-foreground hover:bg-card transition-colors"
                  >
                    <ExternalLink size={11} /> Copy caption
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">ประวัติการโพส</h2>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> รีเฟรช
          </button>
        </div>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={`hist-sk-${i}`} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-3" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <span>{error}</span>
            <button onClick={fetchHistory} className="ml-auto text-xs underline hover:no-underline">ลองใหม่</button>
          </div>
        )}

        {!loading && !error && completedPosts.length === 0 && (
          <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Camera size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">ยังไม่มีประวัติการโพส</p>
            <p className="text-xs text-muted-foreground mt-1">เมื่อโพสหรือส่งไป UniPost แล้วจะแสดงที่นี่</p>
          </div>
        )}

        {!loading && completedPosts.length > 0 && (
          <div className="flex flex-col gap-3">
            {completedPosts.map((post, pi) => (
              <div key={post.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex gap-4 p-4">
                  {post.mediaUrls.length > 0 ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted/30">
                      <img
                        src={post.mediaUrls[0]}
                        alt={post.itemName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                          (e.currentTarget.parentNode as HTMLElement).classList.add("flex", "items-center", "justify-center", "text-2xl");
                          (e.currentTarget.parentNode as HTMLElement).innerHTML = post.itemName.length <= 6 ? post.itemName : "📷";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                      style={{ background: `${PALETTE[pi % PALETTE.length]}40` }}>
                      {post.itemName.length <= 6 ? post.itemName : "📷"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-foreground">{post.itemName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{post.postedAt ? formatDate(post.postedAt) : `สถานะ: ${post.status}`}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1 text-pink-500 font-medium">
                          <Heart size={12} fill="currentColor" /> {post.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-blue-500 font-medium">
                          <MessageCircle size={12} /> {post.comments}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                      className="text-xs text-primary mt-1.5 hover:underline">
                      {expandedId === post.id ? "ซ่อน caption ▲" : "ดู caption ▼"}
                    </button>
                    {expandedId === post.id && post.caption && (
                      <p className="text-xs text-foreground whitespace-pre-line mt-2 p-2 bg-muted/30 rounded-lg leading-relaxed">{post.caption}</p>
                    )}
                  </div>
                </div>
                {(post.likes > 0 || post.comments > 0) && (
                  <div className="border-t border-border px-4 py-2 bg-muted/10 flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-400"
                        style={{ width: `${Math.min(100, ((post.likes + post.comments) / 250) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{post.likes + post.comments} interactions</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
