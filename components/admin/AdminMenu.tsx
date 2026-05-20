import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import {
  Plus, Trash2, Edit2, X, Check, Sparkles, Copy, CheckCheck,
  ImagePlus, Camera, ChevronDown, Send, Calendar,
  CheckCircle2,
} from "lucide-react";

export type MenuItem = {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  category: "bakery" | "beverage";
  tag?: "bestseller" | "new" | "";
  emoji: string;
};

const INITIAL_MENU: MenuItem[] = [
  { id: 1, name: "ครัวซองต์เนยแท้", nameEn: "Butter Croissant", price: 65, category: "bakery", tag: "bestseller", emoji: "🥐" },
  { id: 2, name: "ซินนามอน โรล", nameEn: "Cinnamon Roll", price: 85, category: "bakery", tag: "bestseller", emoji: "🌀" },
  { id: 3, name: "ฟรุ๊ต ทาร์ต", nameEn: "Fruit Tart", price: 95, category: "bakery", tag: "new", emoji: "🥧" },
  { id: 4, name: "ซาวร์โดว์", nameEn: "Sourdough", price: 180, category: "bakery", emoji: "🍞" },
  { id: 5, name: "ดานิช พาสทรี", nameEn: "Danish Pastry", price: 75, category: "bakery", tag: "new", emoji: "🥮" },
  { id: 6, name: "มัฟฟิน บลูเบอร์รี่", nameEn: "Blueberry Muffin", price: 70, category: "bakery", emoji: "🫐" },
  { id: 7, name: "เอแคลร์ช็อกโกแลต", nameEn: "Chocolate Éclair", price: 90, category: "bakery", tag: "new", emoji: "🍫" },
  { id: 8, name: "โฟกาชชาสมุนไพร", nameEn: "Herb Focaccia", price: 120, category: "bakery", emoji: "🫓" },
  { id: 9, name: "สโคนครีม", nameEn: "Cream Scone", price: 75, category: "bakery", emoji: "🧁" },
  { id: 10, name: "มาการองฝรั่งเศส", nameEn: "French Macaron", price: 110, category: "bakery", tag: "new", emoji: "🫠" },
  { id: 11, name: "ลาเต้", nameEn: "Latte", price: 80, category: "beverage", emoji: "☕" },
  { id: 12, name: "ชาเขียวมัทฉะ", nameEn: "Matcha Latte", price: 85, category: "beverage", emoji: "🍵" },
  { id: 13, name: "ชาผลไม้", nameEn: "Fruit Tea", price: 70, category: "beverage", emoji: "🍹" },
];

const EMOJIS = ["🥐", "🌀", "🥧", "🍞", "🥮", "🫐", "🍫", "🫓", "🧁", "🫠", "☕", "🍵", "🍹", "🎂", "🍰", "🥞", "🧇", "🍩", "🍪", "🎉"];

const CAPTION_TEMPLATES = [
  (name: string, nameEn: string, price: number) =>
    `✨ ${name} เพิ่งออกจากเตา! 🔥\nกรอบนอก นุ่มใน หอมกรุ่นทั่วร้าน เพียง ฿${price} เท่านั้น!\n\n📍 YummyYummy Bakery\n⏰ เปิด 07:00 - 18:00 น. ทุกวัน\n\n#YummyYummyBakery #${nameEn.replace(/\s/g, "")} #เบเกอรี่สด #ขนมอบ #FreshBaked #อร่อย`,

  (name: string, nameEn: string, price: number) =>
    `💚 Good morning with ${name}!\n\nเริ่มต้นเช้าวันใหม่ด้วยความอร่อยสดใหม่จากเตา ราคาเพียง ฿${price} 🌿\n\nสั่งล่วงหน้าได้ที่ DM นะคะ หรือมารับที่ร้านได้เลย 💌\n\n#YummyYummy #${nameEn.replace(/\s/g, "")} #BakeryThailand #GoodMorning #เบเกอรี่ #ของหวาน`,

  (name: string, _nameEn: string, price: number) =>
    `เราทำ ${name} ด้วยใจ ❤️🥐\n\nทุกชิ้นผ่านการคัดสรรวัตถุดิบอย่างพิถีพิถัน เพื่อให้คุณได้รับความอร่อยที่ดีที่สุด\n\n✅ ทำสดทุกวัน\n✅ ไม่มีสารกันบูด\n✅ ราคาเป็นมิตร ฿${price}\n\n#YummyYummyBakery #Handmade #Fresh #เบเกอรี่ #Bakery #ขนมไทย`,
];

function TagBadge({ tag }: { tag?: string }) {
  if (!tag) return null;
  const styles = tag === "bestseller"
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${styles}`}>
      {tag === "bestseller" ? "⭐ bestseller" : "🆕 new"}
    </span>
  );
}

type FormState = {
  name: string;
  nameEn: string;
  price: string;
  category: "bakery" | "beverage";
  tag: "" | "bestseller" | "new";
  emoji: string;
};

const EMPTY_FORM: FormState = { name: "", nameEn: "", price: "", category: "bakery", tag: "", emoji: "🥐" };

// ── Menu Management section ────────────────────────────────

function MenuSection({ items, setItems }: { items: MenuItem[]; setItems: (items: MenuItem[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState<"all" | "bakery" | "beverage">("all");

  const bakery = items.filter((i) => i.category === "bakery");
  const beverage = items.filter((i) => i.category === "beverage");
  const displayed = filterCat === "all" ? items : filterCat === "bakery" ? bakery : beverage;

  const addItem = () => {
    if (!form.name || !form.price) return;
    const newItem: MenuItem = {
      id: Date.now(),
      name: form.name,
      nameEn: form.nameEn || form.name,
      price: Number(form.price),
      category: form.category,
      tag: form.tag || undefined,
      emoji: form.emoji,
    };
    setItems([...items, newItem]);
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const deleteItem = (id: number) => setItems(items.filter((i) => i.id !== id));

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, nameEn: item.nameEn, price: String(item.price), category: item.category, tag: item.tag || "", emoji: item.emoji });
  };

  const saveEdit = (id: number) => {
    setItems(items.map((i) => i.id === id ? { ...i, ...editForm, price: Number(editForm.price), tag: editForm.tag || undefined } : i));
    setEditingId(null);
  };

  return (
    <div>
      {/* Filter + Add */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(["all", "bakery", "beverage"] as const).map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-4 py-1.5 text-sm transition-colors ${filterCat === cat ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              {cat === "all" ? "ทั้งหมด" : cat === "bakery" ? "🥐 เบเกอรี่" : "☕ เครื่องดื่ม"}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/80 transition-colors">
            <Plus size={15} /> เพิ่มเมนูใหม่
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">เพิ่มเมนูใหม่</h3>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ชื่อเมนู (ไทย)*</label>
              <div className="flex gap-2">
                <select value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  className="bg-input-background border border-border rounded-xl px-2 text-sm w-14">
                  {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น ครัวซองต์เนยแท้" className="flex-1 bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ชื่อเมนู (อังกฤษ)</label>
              <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="e.g. Butter Croissant" className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ราคา (฿)*</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="เช่น 85" className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">หมวดหมู่</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as "bakery" | "beverage" })}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                <option value="bakery">🥐 เบเกอรี่</option>
                <option value="beverage">☕ เครื่องดื่ม</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">แท็ก</label>
              <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value as FormState["tag"] })}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                <option value="">ไม่มี</option>
                <option value="bestseller">⭐ Bestseller</option>
                <option value="new">🆕 New</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl">ยกเลิก</button>
            <button onClick={addItem} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/80 flex items-center gap-1.5">
              <Check size={14} /> บันทึกเมนู
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 mb-4">
        <span className="text-xs text-muted-foreground">ทั้งหมด <strong className="text-foreground">{items.length}</strong> เมนู</span>
        <span className="text-xs text-muted-foreground">เบเกอรี่ <strong className="text-foreground">{bakery.length}</strong></span>
        <span className="text-xs text-muted-foreground">เครื่องดื่ม <strong className="text-foreground">{beverage.length}</strong></span>
      </div>

      {/* Menu table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-5 py-3 text-left text-xs text-muted-foreground font-medium">เมนู</th>
              <th className="px-5 py-3 text-left text-xs text-muted-foreground font-medium hidden sm:table-cell">ชื่อ EN</th>
              <th className="px-5 py-3 text-center text-xs text-muted-foreground font-medium">ราคา</th>
              <th className="px-5 py-3 text-center text-xs text-muted-foreground font-medium hidden md:table-cell">หมวด</th>
              <th className="px-5 py-3 text-center text-xs text-muted-foreground font-medium hidden sm:table-cell">แท็ก</th>
              <th className="px-5 py-3 text-center text-xs text-muted-foreground font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                {editingId === item.id ? (
                  <td colSpan={6} className="px-5 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="flex gap-1.5">
                        <select value={editForm.emoji} onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
                          className="bg-input-background border border-border rounded-lg px-1 text-sm w-12">
                          {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="flex-1 bg-input-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <input value={editForm.nameEn} onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                        placeholder="English name" className="bg-input-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="bg-input-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value as "bakery" | "beverage" })}
                        className="bg-input-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary">
                        <option value="bakery">เบเกอรี่</option>
                        <option value="beverage">เครื่องดื่ม</option>
                      </select>
                      <select value={editForm.tag} onChange={(e) => setEditForm({ ...editForm, tag: e.target.value as FormState["tag"] })}
                        className="bg-input-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary">
                        <option value="">ไม่มีแท็ก</option>
                        <option value="bestseller">Bestseller</option>
                        <option value="new">New</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(item.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:bg-primary/80">
                          <Check size={12} /> บันทึก
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground">
                          <X size={12} /> ยกเลิก
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="text-lg">{item.emoji}</span> {item.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{item.nameEn}</td>
                    <td className="px-5 py-3 text-center font-medium text-foreground">฿{item.price}</td>
                    <td className="px-5 py-3 text-center hidden md:table-cell">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.category === "bakery" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                        {item.category === "bakery" ? "เบเกอรี่" : "เครื่องดื่ม"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center hidden sm:table-cell"><TagBadge tag={item.tag} /></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Instagram Caption Generator ────────────────────────────

export type ScheduledPost = {
  id: number;
  itemName: string;
  itemEmoji: string;
  caption: string;
  scheduledAt: string;
  imageUrl: string | null;
  style: string;
};

type InstagramSectionProps = {
  items: MenuItem[];
  scheduled: ScheduledPost[];
  setScheduled: React.Dispatch<React.SetStateAction<ScheduledPost[]>>;
};

function InstagramSection({ items, scheduled, setScheduled }: InstagramSectionProps) {
  const [selectedId, setSelectedId] = useState<number>(items[0]?.id ?? 1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [postedIdx, setPostedIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customCaption, setCustomCaption] = useState("");
  const [scheduleIdx, setScheduleIdx] = useState<number | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [unipostIdx, setUnipostIdx] = useState<number | null>(null);
  const [unipostMessage, setUnipostMessage] = useState<string | null>(null);
  const CUSTOM_CAPTION_IDX = 999;
  const fileRef = useRef<HTMLInputElement>(null);
  const nextScheduledId = useRef(1);

  const selectedItem = items.find((i) => i.id === selectedId) ?? items[0];
  const STYLES = ["แบบที่ 1 · Hype 🔥", "แบบที่ 2 · Morning vibe 🌿", "แบบที่ 3 · Brand story ❤️"];

  const styleLabel = (idx: number) => STYLES[idx] ?? `AI option ${idx + 1}`;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUnipostMessage("กรุณาเลือกไฟล์รูปภาพสำหรับโพสต์ Instagram");
      return;
    }

    if (file.type !== "image/jpeg") {
      setUnipostMessage("Instagram โพสต์ฟีดรองรับเฉพาะไฟล์ JPG/JPEG เท่านั้น");
      return;
    }

    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setUnipostMessage(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const generate = async () => {
    if (!selectedItem) return;
    setGenerating(true);
    setCaptions([]);
    setGenerateError(null);
    setPostedIdx(null);
    setScheduleIdx(null);

    try {
      const response = await fetch("/api/admin/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: {
            name: selectedItem.name,
            nameEn: selectedItem.nameEn,
            price: selectedItem.price,
            category: selectedItem.category,
            tag: selectedItem.tag,
          },
          hasImage: Boolean(imageUrl),
          count: 5,
        }),
      });

      const data = (await response.json()) as {
        captions?: unknown;
        error?: string;
      };

      if (!response.ok || !Array.isArray(data.captions)) {
        throw new Error(data.error || "Cannot generate captions");
      }

      const nextCaptions = data.captions.filter(
        (caption): caption is string => typeof caption === "string" && caption.trim().length > 0,
      );

      if (nextCaptions.length === 0) {
        throw new Error("No captions returned");
      }

      setCaptions(nextCaptions);
    } catch (error) {
      console.error("Caption generation error:", error);
      setCaptions(CAPTION_TEMPLATES.map((fn) => fn(selectedItem.name, selectedItem.nameEn, selectedItem.price)));
      setGenerateError("สร้างด้วย AI ไม่สำเร็จ เลยแสดง template สำรองให้ก่อน");
    } finally {
      setGenerating(false);
    }
  };

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const postNow = async (caption: string, idx: number) => {
    if (imageFile) {
      await sendToUniPost(caption, idx, null);
      return;
    }

    setUnipostMessage("กรุณาอัปโหลดรูปสินค้าก่อนโพสไป Instagram ผ่าน UniPost");
  };

  const schedulePost = (caption: string, idx: number) => {
    if (!scheduleTime || !selectedItem) return;
    const post: ScheduledPost = {
      id: nextScheduledId.current++,
      itemName: selectedItem.name,
      itemEmoji: selectedItem.emoji,
      caption,
      scheduledAt: scheduleTime,
      imageUrl,
      style: styleLabel(idx),
    };
    setScheduled((prev) => [...prev, post].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
    setScheduleIdx(null);
    setScheduleTime("");
  };

  const formatUniPostError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";

    if (!message) {
      return "ส่งโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    }

    if (message.includes("Missing UNIPOST_API_KEY")) {
      return "ตั้งค่า UniPost ยังไม่ครบ กรุณาตรวจสอบคีย์ใน .env.local";
    }

    if (message.includes("No active Instagram account found")) {
      return "ไม่พบบัญชี Instagram ที่เชื่อมต่ออยู่ใน UniPost";
    }

    if (message.includes("Instagram publishing requires an image file")) {
      return "กรุณาอัปโหลดรูปก่อนส่งโพสต์";
    }

    if (message.includes("JPG/JPEG") || message.includes("JPEG")) {
      return "Instagram โพสต์ฟีดต้องใช้ไฟล์ JPG/JPEG เท่านั้น";
    }

    if (message.includes("pre-publish validation")) {
      return "UniPost ตรวจสอบก่อนโพสต์ไม่ผ่าน กรุณาเช็กชนิดไฟล์และลองใหม่";
    }

    if (message.includes("Failed to reserve UniPost media upload")) {
      return "UniPost เตรียมอัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่";
    }

    if (message.includes("Failed to upload image to UniPost")) {
      return "อัปโหลดรูปไป UniPost ไม่สำเร็จ กรุณาลองใหม่";
    }

    if (message.includes("Failed to create UniPost post") || message.includes("Cannot create UniPost post")) {
      return "สร้างโพสต์ใน UniPost ไม่สำเร็จ กรุณาลองใหม่";
    }

    if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("fetch")) {
      return "เชื่อมต่อ UniPost ไม่ได้ กรุณาลองใหม่อีกครั้ง";
    }

    return message.length > 120 ? `${message.slice(0, 117)}...` : message;
  };

  const sendToUniPost = async (caption: string, idx: number, scheduledAt: string | null = scheduleTime) => {
    if (!selectedItem) return;

    setUnipostMessage(null);

    if (!imageFile) {
      setUnipostMessage("กรุณาอัปโหลดรูปสินค้าก่อนส่งไป UniPost");
      return;
    }

    if (scheduledAt === "") {
      setUnipostMessage("กรุณาเลือกวันและเวลาที่ต้องการโพสก่อน");
      return;
    }

    setUnipostIdx(idx);

    try {
      const payload = new FormData();
      payload.append("caption", caption);
      if (scheduledAt) {
        payload.append("scheduledAt", scheduledAt);
      }
      payload.append("itemName", selectedItem.name);
      payload.append("style", styleLabel(idx));
      payload.append("image", imageFile);

      const response = await fetch("/api/admin/unipost", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot create UniPost post");
      }

      setUnipostMessage(scheduledAt ? "ส่งโพสไป UniPost เรียบร้อยแล้ว" : "โพสไป Instagram ผ่าน UniPost แล้ว");
      if (!scheduledAt) {
        setPostedIdx(idx);
        setTimeout(() => setPostedIdx(null), 3000);
      }
      setScheduleIdx(null);
      setScheduleTime("");
    } catch (error) {
      console.error("UniPost submit error:", error);
      setUnipostMessage(formatUniPostError(error));
    } finally {
      setUnipostIdx(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
          <Camera size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>สร้าง Caption สำหรับ Instagram</h2>
          <p className="text-xs text-muted-foreground">เลือกเมนู อัปโหลดรูป สร้าง caption แล้วโพสหรือนัดเวลาได้เลย</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left */}
        <div className="flex flex-col gap-4">
          {/* Item selector */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <label className="text-sm font-medium text-foreground mb-3 block">เลือกเมนูที่ต้องการโพส</label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => { setSelectedId(Number(e.target.value)); setCaptions([]); setGenerateError(null); setPostedIdx(null); }}
                className="w-full bg-input-background border border-border rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary pr-10"
              >
                <optgroup label="🥐 เบเกอรี่">
                  {items.filter((i) => i.category === "bakery").map((item) => (
                    <option key={item.id} value={item.id}>{item.emoji} {item.name} — ฿{item.price}</option>
                  ))}
                </optgroup>
                <optgroup label="☕ เครื่องดื่ม">
                  {items.filter((i) => i.category === "beverage").map((item) => (
                    <option key={item.id} value={item.id}>{item.emoji} {item.name} — ฿{item.price}</option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {selectedItem && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <span className="text-3xl">{selectedItem.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedItem.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedItem.nameEn} · ฿{selectedItem.price}</p>
                </div>
                {selectedItem.tag && <TagBadge tag={selectedItem.tag} />}
              </div>
            )}
          </div>

          {/* Image upload */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <label className="text-sm font-medium text-foreground mb-3 block">อัปโหลดรูปสินค้า (ไม่บังคับ)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
            >
              {imageUrl ? (
                <div className="relative">
                  <div className="relative w-full h-52">
                    <Image
                      src={imageUrl}
                      alt="preview"
                      fill
                      unoptimized
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setImageUrl(null); setImageFile(null); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><ImagePlus size={20} /></div>
                  <p className="text-sm">วางรูปที่นี่ หรือคลิกเพื่อเลือก</p>
                  <p className="text-xs">JPG / JPEG เท่านั้น</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,.jpg,.jpeg" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Generate button */}
          <button onClick={generate} disabled={generating || !selectedItem}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-medium transition-all bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {generating
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />กำลังสร้าง caption...</>
              : <><Sparkles size={16} />สร้าง Caption ด้วย AI ✨</>}
          </button>

          {generateError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {generateError}
            </div>
          )}

          {unipostMessage && (
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
              {unipostMessage}
            </div>
          )}
        </div>

        {/* Right: captions */}
        <div className="flex flex-col gap-3">
          {captions.length === 0 && !generating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-card rounded-2xl border border-border border-dashed">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-3">
                <Camera size={24} className="text-pink-500" />
              </div>
              <p className="text-sm font-medium text-foreground">ยังไม่มี caption</p>
              <p className="text-xs text-muted-foreground mt-1">เลือกเมนูและกดปุ่มสร้าง caption</p>
            </div>
          )}

          {generating && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={`skeleton-${i}`} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
                  <div className="h-3 bg-muted rounded w-24 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2.5 bg-muted rounded w-full" />
                    <div className="h-2.5 bg-muted rounded w-4/5" />
                    <div className="h-2.5 bg-muted rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom caption — เขียนเอง */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">เขียนเอง ✏️</span>
              <button onClick={() => copy(customCaption, CUSTOM_CAPTION_IDX)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${copiedIdx === CUSTOM_CAPTION_IDX ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {copiedIdx === CUSTOM_CAPTION_IDX ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <textarea
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="พิมพ์ caption ที่ต้องการโพส..."
              rows={4}
              maxLength={2200}
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/50"
            />
            <div className="flex gap-2 flex-wrap mt-3">
              <button
                onClick={() => postNow(customCaption, CUSTOM_CAPTION_IDX)}
                disabled={!customCaption.trim()}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  postedIdx === CUSTOM_CAPTION_IDX
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {postedIdx === CUSTOM_CAPTION_IDX
                  ? <><CheckCircle2 size={13} /> โพสแล้ว!</>
                  : <><Send size={13} /> โพสเลย</>}
              </button>
              <button
                onClick={() => setScheduleIdx(scheduleIdx === CUSTOM_CAPTION_IDX ? null : CUSTOM_CAPTION_IDX)}
                disabled={!customCaption.trim()}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  scheduleIdx === CUSTOM_CAPTION_IDX
                    ? "bg-primary/20 border-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:border-border/50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
                }`}
              >
                <Calendar size={13} /> นัดโพส
              </button>
            </div>
            {scheduleIdx === CUSTOM_CAPTION_IDX && (
              <div className="mt-3 flex gap-2 items-center flex-wrap border-t border-border pt-3">
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="flex-1 bg-input-background border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => schedulePost(customCaption, CUSTOM_CAPTION_IDX)}
                  disabled={!scheduleTime}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={12} /> บันทึก
                </button>
                <button
                  onClick={() => sendToUniPost(customCaption, CUSTOM_CAPTION_IDX)}
                  disabled={!scheduleTime || unipostIdx === CUSTOM_CAPTION_IDX}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-xl text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unipostIdx === CUSTOM_CAPTION_IDX ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ส่งอยู่...</>
                  ) : (
                    <><Send size={12} /> ส่งไป UniPost</>
                  )}
                </button>
                <button onClick={() => setScheduleIdx(null)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {captions.map((caption, idx) => (
            <div key={`caption-${idx}`} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{styleLabel(idx)}</span>
                <button onClick={() => copy(caption, idx)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${copiedIdx === idx ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {copiedIdx === idx ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>

              {/* Caption text */}
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed mb-4">{caption}</p>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {/* Post Now */}
                <button
                  onClick={() => postNow(caption, idx)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                    postedIdx === idx
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90"
                  }`}
                >
                  {postedIdx === idx
                    ? <><CheckCircle2 size={13} /> โพสแล้ว! Caption คัดลอกแล้ว</>
                    : <><Send size={13} /> โพสเลย</>}
                </button>

                {/* Schedule */}
                <button
                  onClick={() => setScheduleIdx(scheduleIdx === idx ? null : idx)}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    scheduleIdx === idx
                      ? "bg-primary/20 border-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Calendar size={13} /> นัดโพส
                </button>
              </div>

              {/* Schedule picker */}
              {scheduleIdx === idx && (
                <div className="mt-3 flex gap-2 items-center flex-wrap border-t border-border pt-3">
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="flex-1 bg-input-background border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => schedulePost(caption, idx)}
                    disabled={!scheduleTime}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={12} /> บันทึก
                  </button>
                  <button
                    onClick={() => sendToUniPost(caption, idx)}
                    disabled={!scheduleTime || unipostIdx === idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-xl text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unipostIdx === idx ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ส่งอยู่...
                      </>
                    ) : (
                      <>
                        <Send size={12} /> ส่งไป UniPost
                      </>
                    )}
                  </button>
                  <button onClick={() => setScheduleIdx(null)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled confirmation banner */}
      {scheduled.length > 0 && (
        <div className="mt-6 flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-2xl">
          <Calendar size={16} className="text-primary shrink-0" />
          <p className="text-sm text-foreground">
            นัดโพสไว้แล้ว <strong>{scheduled.length} โพส</strong> — ดูและจัดการได้ที่เมนู{" "}
            <span className="text-primary font-medium">Instagram</span> ในแถบซ้าย
          </p>
        </div>
      )}
    </div>
  );
}

// ── main export ────────────────────────────────────────────

type AdminMenuProps = {
  scheduled: ScheduledPost[];
  setScheduled: React.Dispatch<React.SetStateAction<ScheduledPost[]>>;
};

export function AdminMenu({ scheduled, setScheduled }: AdminMenuProps) {
  const [items, setItems] = useState<MenuItem[]>(INITIAL_MENU);
  const [activeTab, setActiveTab] = useState<"menu" | "instagram">("menu");

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-foreground" style={{ fontFamily: "var(--font-heading)" }}>จัดการเมนู</h1>
        <p className="text-muted-foreground text-sm mt-1">เพิ่ม แก้ไข หรือลบเมนู และสร้าง caption สำหรับ Instagram</p>
      </div>

      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-6 w-fit">
        <button onClick={() => setActiveTab("menu")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "menu" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          🥐 รายการเมนู
        </button>
        <button onClick={() => setActiveTab("instagram")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "instagram" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <Camera size={14} /> Instagram Caption
        </button>
      </div>

      {activeTab === "menu" ? (
        <MenuSection items={items} setItems={setItems} />
      ) : (
        <InstagramSection items={items} scheduled={scheduled} setScheduled={setScheduled} />
      )}
    </div>
  );
}
