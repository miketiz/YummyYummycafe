import {
  Clock,
  Flame,
  type LucideIcon,
  Star,
  Wheat,
} from "lucide-react";

export type MenuItem = {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  image: string;
  description: string;
  emoji?: string;
  tag?: "bestseller" | "new";
};

export type CartItem = MenuItem & { quantity: number };

export const bakery: MenuItem[] = [
  {
    id: 1,
    name: "ครัวซองต์เนยแท้",
    nameEn: "Butter Croissant",
    price: 65,
    emoji: "🥐",
    image:
      "https://images.unsplash.com/photo-1725545901708-27d59e5c4226?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "กรอบนอกนุ่มใน ใช้เนยแท้ 100% อบสดทุกเช้า",
    tag: "bestseller",
  },
  {
    id: 2,
    name: "ซินนามอน โรล",
    nameEn: "Cinnamon Roll",
    price: 85,
    emoji: "🌀",
    image:
      "https://images.unsplash.com/photo-1651604017121-9afaa05dfd8e?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "หอมอบอวล ราดครีมชีสโฮมเมด",
    tag: "bestseller",
  },
  {
    id: 3,
    name: "ฟรุ๊ต ทาร์ต",
    nameEn: "Fresh Fruit Tart",
    price: 95,
    emoji: "🥧",
    image:
      "https://images.unsplash.com/photo-1746003262617-6034c98b90d0?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "ทาร์ตผลไม้สด ครีมคัสตาร์ดเนียน",
    tag: "new",
  },
  {
    id: 4,
    name: "ซาวร์โดว์",
    nameEn: "Sourdough Loaf",
    price: 180,
    emoji: "🍞",
    image:
      "https://images.unsplash.com/photo-1707915317302-9565553eea02?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "หมักธรรมชาติ 24 ชั่วโมง เปลือกกรอบ",
  },
];

export const beverages: MenuItem[] = [
  {
    id: 11,
    name: "มัทฉะลาเต้",
    nameEn: "Matcha Latte",
    price: 85,
    emoji: "🍵",
    image:
      "https://images.unsplash.com/photo-1775846933630-3c1531299e5a?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "มัทฉะญี่ปุ่น ผสมนมโอ๊ตเนียนนุ่ม",
    tag: "bestseller",
  },
  {
    id: 12,
    name: "อเมริกาโน่เย็น",
    nameEn: "Iced Americano",
    price: 70,
    emoji: "☕",
    image:
      "https://images.unsplash.com/photo-1517959105821-eaf2591984ca?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "คั่วสดทุกวัน กลิ่นหอมและบาลานซ์ดี",
  },
  {
    id: 13,
    name: "สตรอว์เบอร์รี่ลาเต้",
    nameEn: "Strawberry Latte",
    price: 80,
    emoji: "🍓",
    image:
      "https://images.unsplash.com/photo-1629174114500-6ec256a6213f?auto=format&fit=crop&fm=jpg&q=80&w=1200",
    description: "สตรอว์เบอร์รี่สด ผสมนมสด หวานกำลังดี",
    tag: "new",
  },
];

export const features: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
}> = [
  { icon: Flame, title: "อบสดทุกเช้า", desc: "เริ่มอบตั้งแต่ 6:00" },
  { icon: Wheat, title: "วัตถุดิบธรรมชาติ", desc: "ไม่ใส่สารกันบูด" },
  { icon: Star, title: "สูตรซิกเนเจอร์", desc: "คราฟท์สูตรเฉพาะร้าน" },
  { icon: Clock, title: "เปิดทุกวัน", desc: "7:00 - 19:00" },
];
