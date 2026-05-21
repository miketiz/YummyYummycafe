import {
  Clock,
  Flame,
  type LucideIcon,
  Star,
  Wheat,
} from "lucide-react";
import {
  DEFAULT_MENU_ITEMS,
  groupMenuItems,
  type MenuItem,
} from "@/lib/menu/catalog";

export type { MenuItem };
export type CartItem = MenuItem & { quantity: number };

export const allMenuItems = DEFAULT_MENU_ITEMS;
export const { bakery, beverages } = groupMenuItems(DEFAULT_MENU_ITEMS);

export const features: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
}> = [
  { icon: Flame, title: "อบสดทุกเช้า", desc: "เริ่มอบตั้งแต่ 6:00" },
  { icon: Wheat, title: "วัตถุดิบธรรมชาติ", desc: "ไม่ใส่สารกันบูด" },
  { icon: Star, title: "สูตรซิกเนเจอร์", desc: "คราฟต์สูตรเฉพาะร้าน" },
  { icon: Clock, title: "เปิดทุกวัน", desc: "7:00 - 19:00" },
];
