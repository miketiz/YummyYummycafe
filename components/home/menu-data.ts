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
  tag?: "bestseller" | "new";
};

export type CartItem = MenuItem & { quantity: number };

export const bakery: MenuItem[] = [
  {
    id: 1,
    name: "ครัวซองต์เนยแท้",
    nameEn: "Butter Croissant",
    price: 65,
    image:
      "https://images.unsplash.com/photo-1623334044303-241021148842?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
    description: "กรอบนอกนุ่มใน ใช้เนยแท้ 100% อบสดทุกเช้า",
    tag: "bestseller",
  },
  {
    id: 2,
    name: "ซินนามอน โรล",
    nameEn: "Cinnamon Roll",
    price: 85,
    image:
      "https://images.unsplash.com/photo-1694632288834-17d86b340745?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
    description: "หอมอบอวล ราดครีมชีสโฮมเมด",
    tag: "bestseller",
  },
  {
    id: 3,
    name: "ฟรุ๊ต ทาร์ต",
    nameEn: "Fresh Fruit Tart",
    price: 95,
    image:
      "https://images.unsplash.com/photo-1670819916757-e8d5935a6c65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
    description: "ทาร์ตผลไม้สด ครีมคัสตาร์ดเนียน",
    tag: "new",
  },
  {
    id: 4,
    name: "ซาวร์โดว์",
    nameEn: "Sourdough Loaf",
    price: 180,
    image:
      "https://images.unsplash.com/photo-1602077812176-1bd3ff433d74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
    description: "หมักธรรมชาติ 24 ชั่วโมง เปลือกกรอบ",
  },
];

export const beverages: MenuItem[] = [
  {
    id: 11,
    name: "มัทฉะลาเต้",
    nameEn: "Matcha Latte",
    price: 85,
    image:
      "https://images.unsplash.com/photo-1749280447307-31a68eb38673?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
    description: "มัทฉะญี่ปุ่น ผสมนมโอ๊ตเนียนนุ่ม",
    tag: "bestseller",
  },
  {
    id: 12,
    name: "อเมริกาโน่เย็น",
    nameEn: "Iced Americano",
    price: 70,
    image:
      "https://images.unsplash.com/photo-1549652127-2e5e59e86a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
    description: "คั่วสดทุกวัน กลิ่นหอมและบาลานซ์ดี",
  },
  {
    id: 13,
    name: "สตรอว์เบอร์รี่ลาเต้",
    nameEn: "Strawberry Latte",
    price: 80,
    image:
      "https://images.unsplash.com/photo-1686638745403-d21193f16b2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=700",
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