import { useState } from "react";
import {
  Instagram, Calendar, Clock, Heart, MessageCircle, Send,
  ExternalLink, X, TrendingUp, Image, CheckCircle2,
} from "lucide-react";
import type { ScheduledPost } from "./AdminMenu";

const MOCK_HISTORY = [
  {
    id: 101, itemName: "ครัวซองต์เนยแท้", itemEmoji: "🥐",
    postedAt: "2026-05-14T08:15:00", style: "แบบที่ 1 · Hype 🔥",
    likes: 142, comments: 18, hasImage: true,
    caption: "✨ ครัวซองต์เนยแท้ เพิ่งออกจากเตา! 🔥\nกรอบนอก นุ่มใน หอมกรุ่นทั่วร้าน เพียง ฿65\n\n#YummyYummyBakery #ButterCroissant #เบเกอรี่สด",
  },
  {
    id: 102, itemName: "ซินนามอน โรล", itemEmoji: "🌀",
    postedAt: "2026-05-12T09:00:00", style: "แบบที่ 3 · Brand story ❤️",
    likes: 98, comments: 11, hasImage: true,
    caption: "เราทำ ซินนามอน โรล ด้วยใจ ❤️\n\n✅ ทำสดทุกวัน\n✅ ไม่มีสารกันบูด\n✅ ราคาเป็นมิตร ฿85\n\n#YummyYummyBakery #CinnamonRoll",
  },
  {
    id: 103, itemName: "มาการองฝรั่งเศส", itemEmoji: "🫠",
    postedAt: "2026-05-10T10:30:00", style: "แบบที่ 2 · Morning vibe 🌿",
    likes: 215, comments: 34, hasImage: true,
    caption: "💚 Good morning with มาการองฝรั่งเศส!\n\nเริ่มต้นเช้าวันใหม่ด้วยความอร่อย ฿110\n\n#YummyYummy #FrenchMacaron",
  },
  {
    id: 104, itemName: "ลาเต้", itemEmoji: "☕",
    postedAt: "2026-05-08T07:45:00", style: "แบบที่ 1 · Hype 🔥",
    likes: 87, comments: 9, hasImage: false,
    caption: "✨ ลาเต้ เพิ่งชงใหม่! เพียง ฿80\n\n#YummyYummyBakery #Latte #กาแฟ",
  },
  {
    id: 105, itemName: "เอแคลร์ช็อกโกแลต", itemEmoji: "🍫",
    postedAt: "2026-05-06T11:00:00", style: "แบบที่ 2 · Morning vibe 🌿",
    likes: 176, comments: 22, hasImage: true,
    caption: "💚 Good morning with เอแคลร์ช็อกโกแลต!\n\n฿90 เท่านั้น\n\n#YummyYummy #ChocolateEclair",
  },
];

const PALETTE = ["#a8d5ba", "#f9c74f", "#a8c7e8", "#f4a8c7", "#c8a8e8"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
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

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
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

type Props = {
  scheduled: ScheduledPost[];
  onRemoveScheduled: (id: number) => void;
};

export function AdminInstagram({ scheduled, onRemoveScheduled }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyExpand, setHistoryExpand] = useState<number | null>(null);

  const totalLikes = MOCK_HISTORY.reduce((s, p) => s + p.likes, 0);
  const totalComments = MOCK_HISTORY.reduce((s, p) => s + p.comments, 0);
  const avgEngagement = Math.round((totalLikes + totalComments) / MOCK_HISTORY.length);

  const upcoming = [...scheduled].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-sm">
          <Instagram size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Instagram</h1>
          <p className="text-muted-foreground text-sm">จัดการโพส ดูตารางเวลา และประวัติการโพส</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="โพสเดือนนี้" value={MOCK_HISTORY.length} icon={Image} color="bg-purple-100 text-purple-600" />
        <StatCard label="ยอด Like รวม" value={totalLikes.toLocaleString()} icon={Heart} color="bg-pink-100 text-pink-600" />
        <StatCard label="ยอด Comment รวม" value={totalComments} icon={MessageCircle} color="bg-blue-100 text-blue-600" />
        <StatCard label="Engagement เฉลี่ย" value={avgEngagement} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
      </div>

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
            <p className="text-xs text-muted-foreground mt-1">ไปที่ "จัดการเมนู → Instagram Caption" เพื่อนัดเวลาโพส</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((post) => (
              <div key={post.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex gap-4 p-4">
                  {/* Image / emoji */}
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
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

                    {/* Caption preview + expand */}
                    <button onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                      className="text-xs text-primary mt-1.5 hover:underline">
                      {expandedId === post.id ? "ซ่อน caption ▲" : "ดู caption ▼"}
                    </button>
                    {expandedId === post.id && (
                      <p className="text-xs text-foreground whitespace-pre-line mt-2 p-2 bg-muted/30 rounded-lg leading-relaxed">{post.caption}</p>
                    )}
                  </div>
                </div>

                {/* Action bar */}
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
          <span className="ml-auto text-xs text-muted-foreground">{MOCK_HISTORY.length} โพส · เดือนที่ผ่านมา</span>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-3">
          {MOCK_HISTORY.map((post, pi) => (
            <div key={post.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex gap-4 p-4">
                {/* Color swatch / image indicator */}
                <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                  style={{ background: `${PALETTE[pi % PALETTE.length]}40` }}>
                  {post.itemEmoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-foreground">{post.itemName}</p>
                      <p className="text-xs text-muted-foreground">{post.style}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1 text-pink-500 font-medium"><Heart size={12} fill="currentColor" /> {post.likes}</span>
                      <span className="flex items-center gap-1 text-blue-500 font-medium"><MessageCircle size={12} /> {post.comments}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-emerald-500" /> โพสเมื่อ {formatDate(post.postedAt)}
                  </p>

                  <button onClick={() => setHistoryExpand(historyExpand === post.id ? null : post.id)}
                    className="text-xs text-primary mt-1.5 hover:underline">
                    {historyExpand === post.id ? "ซ่อน caption ▲" : "ดู caption ▼"}
                  </button>
                  {historyExpand === post.id && (
                    <p className="text-xs text-foreground whitespace-pre-line mt-2 p-2 bg-muted/30 rounded-lg leading-relaxed">{post.caption}</p>
                  )}
                </div>
              </div>

              {/* Engagement bar */}
              <div className="border-t border-border px-4 py-2 bg-muted/10 flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-400"
                    style={{ width: `${Math.min(100, ((post.likes + post.comments) / 250) * 100)}%` }} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {post.likes + post.comments} interactions
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
