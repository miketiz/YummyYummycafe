export type MenuCategory = "bakery" | "beverage";
export type MenuTag = "bestseller" | "new";

export type MenuItem = {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  category: MenuCategory;
  emoji: string;
  tag?: MenuTag;
  image: string;
  description: string;
  inStock: boolean;
};

export type MenuItemRecord = {
  id?: number | string | null;
  name?: string | null;
  name_en?: string | null;
  price?: number | string | null;
  category?: string | null;
  emoji?: string | null;
  tag?: string | null;
  image_url?: string | null;
  in_stock?: boolean | null;
};

const MENU_IMAGES = {
  croissant:
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  cinnamonRoll:
    "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  fruitTart:
    "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  sourdough:
    "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  danish:
    "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  muffin:
    "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  eclair:
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  cheesecake:
    "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  matcha:
    "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  americano:
    "https://images.unsplash.com/photo-1517959105821-eaf2591984ca?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  strawberryLatte:
    "https://images.unsplash.com/photo-1629174114500-6ec256a6213f?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  thaiTea:
    "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  honeyLemonSoda:
    "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  cocoa:
    "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  bakeryFallback:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&fm=jpg&q=80&w=1200",
  beverageFallback:
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&fm=jpg&q=80&w=1200",
} as const;

function normalizeForImage(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function imageForMenu(name: string, nameEn: string, category: MenuCategory) {
  const key = normalizeForImage(`${name} ${nameEn}`);

  if (key.includes("croissant")) return MENU_IMAGES.croissant;
  if (key.includes("cinnamon")) return MENU_IMAGES.cinnamonRoll;
  if (key.includes("fruittart") || key.includes("tart")) return MENU_IMAGES.fruitTart;
  if (key.includes("sourdough") || key.includes("loaf")) return MENU_IMAGES.sourdough;
  if (key.includes("danish") || key.includes("almond")) return MENU_IMAGES.danish;
  if (key.includes("muffin") || key.includes("blueberry")) return MENU_IMAGES.muffin;
  if (key.includes("eclair") || key.includes("éclair")) return MENU_IMAGES.eclair;
  if (key.includes("cheesecake") || key.includes("basque")) return MENU_IMAGES.cheesecake;
  if (key.includes("matcha")) return MENU_IMAGES.matcha;
  if (key.includes("americano")) return MENU_IMAGES.americano;
  if (key.includes("strawberry")) return MENU_IMAGES.strawberryLatte;
  if (key.includes("thaitea") || key.includes("cha-thai") || key.includes("milk-tea")) return MENU_IMAGES.thaiTea;
  if (key.includes("lemon") || key.includes("soda") || key.includes("honey")) return MENU_IMAGES.honeyLemonSoda;
  if (key.includes("cocoa")) return MENU_IMAGES.cocoa;
  if (key.includes("chocolate") && category === "beverage") return MENU_IMAGES.cocoa;
  if (key.includes("chocolate") && category === "bakery") return MENU_IMAGES.eclair;
  if (key.includes("coffee")) return MENU_IMAGES.americano;

  return category === "beverage" ? MENU_IMAGES.beverageFallback : MENU_IMAGES.bakeryFallback;
}

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 1,
    name: "ครัวซองต์เนยแท้",
    nameEn: "Butter Croissant",
    price: 65,
    category: "bakery",
    emoji: "🥐",
    tag: "bestseller",
    image: MENU_IMAGES.croissant,
    description: "กรอบนอกนุ่มใน ใช้เนยแท้ อบสดทุกเช้า",
    inStock: true,
  },
  {
    id: 2,
    name: "ซินนามอนโรล",
    nameEn: "Cinnamon Roll",
    price: 85,
    category: "bakery",
    emoji: "🌀",
    tag: "bestseller",
    image: MENU_IMAGES.cinnamonRoll,
    description: "หอมซินนามอน ราดครีมชีสโฮมเมด",
    inStock: true,
  },
  {
    id: 3,
    name: "ฟรุตทาร์ต",
    nameEn: "Fresh Fruit Tart",
    price: 95,
    category: "bakery",
    emoji: "🥧",
    tag: "new",
    image: MENU_IMAGES.fruitTart,
    description: "ทาร์ตผลไม้สด คัสตาร์ดเนียน หวานพอดี",
    inStock: true,
  },
  {
    id: 4,
    name: "ซาวร์โดว์",
    nameEn: "Sourdough Loaf",
    price: 180,
    category: "bakery",
    emoji: "🍞",
    image: MENU_IMAGES.sourdough,
    description: "หมักธรรมชาติ 24 ชั่วโมง เปลือกกรอบ เนื้อหนึบ",
    inStock: true,
  },
  {
    id: 5,
    name: "ดานิชอัลมอนด์",
    nameEn: "Almond Danish",
    price: 90,
    category: "bakery",
    emoji: "🥮",
    tag: "new",
    image: MENU_IMAGES.danish,
    description: "แป้งพัฟกรอบ ครีมอัลมอนด์หอมมัน",
    inStock: true,
  },
  {
    id: 6,
    name: "บลูเบอร์รี่มัฟฟิน",
    nameEn: "Blueberry Muffin",
    price: 70,
    category: "bakery",
    emoji: "🧁",
    image: MENU_IMAGES.muffin,
    description: "มัฟฟินนุ่ม ชุ่มเนย ใส่บลูเบอร์รี่เต็มคำ",
    inStock: true,
  },
  {
    id: 7,
    name: "เอแคลร์ช็อกโกแลต",
    nameEn: "Chocolate Eclair",
    price: 90,
    category: "bakery",
    emoji: "🍫",
    image: MENU_IMAGES.eclair,
    description: "แป้งชูว์เบา ไส้ครีมช็อกโกแลตเข้มข้น",
    inStock: true,
  },
  {
    id: 8,
    name: "ชีสเค้กหน้าไหม้",
    nameEn: "Basque Cheesecake",
    price: 120,
    category: "bakery",
    emoji: "🍰",
    tag: "bestseller",
    image: MENU_IMAGES.cheesecake,
    description: "ชีสเค้กเนียนละมุน หอมคาราเมลจากหน้าไหม้",
    inStock: true,
  },
  {
    id: 9,
    name: "มัทฉะลาเต้",
    nameEn: "Matcha Latte",
    price: 85,
    category: "beverage",
    emoji: "🍵",
    tag: "bestseller",
    image: MENU_IMAGES.matcha,
    description: "มัทฉะญี่ปุ่นกับนมสด รสนุ่ม กลิ่นหอม",
    inStock: true,
  },
  {
    id: 10,
    name: "อเมริกาโน่เย็น",
    nameEn: "Iced Americano",
    price: 70,
    category: "beverage",
    emoji: "☕",
    image: MENU_IMAGES.americano,
    description: "กาแฟคั่วกลาง หอมสะอาด ดื่มง่าย",
    inStock: true,
  },
  {
    id: 11,
    name: "สตรอว์เบอร์รี่ลาเต้",
    nameEn: "Strawberry Latte",
    price: 80,
    category: "beverage",
    emoji: "🍓",
    tag: "new",
    image: MENU_IMAGES.strawberryLatte,
    description: "ซอสสตรอว์เบอร์รี่โฮมเมดกับนมสด",
    inStock: true,
  },
  {
    id: 12,
    name: "ชาไทยครีมชีส",
    nameEn: "Thai Tea Cream Cheese",
    price: 85,
    category: "beverage",
    emoji: "🧋",
    tag: "new",
    image: MENU_IMAGES.thaiTea,
    description: "ชาไทยเข้มข้น ท็อปครีมชีสเค็มนิด ๆ",
    inStock: true,
  },
  {
    id: 13,
    name: "เลมอนฮันนี่โซดา",
    nameEn: "Honey Lemon Soda",
    price: 75,
    category: "beverage",
    emoji: "🍋",
    image: MENU_IMAGES.honeyLemonSoda,
    description: "สดชื่น เปรี้ยวหวาน หอมฮันนี่เลมอน",
    inStock: true,
  },
  {
    id: 14,
    name: "โกโก้เย็น",
    nameEn: "Iced Cocoa",
    price: 80,
    category: "beverage",
    emoji: "🍫",
    image: MENU_IMAGES.cocoa,
    description: "โกโก้เข้มข้น หวานน้อยได้ตามใจ",
    inStock: true,
  },
];

export function menuItemToRecord(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    name_en: item.nameEn,
    price: item.price,
    category: item.category,
    emoji: item.emoji,
    tag: item.tag ?? null,
    image_url: item.image,
    in_stock: item.inStock,
  };
}

export function normalizeMenuRecord(record: MenuItemRecord): MenuItem | null {
  const id = Number(record.id);
  const price = Number(record.price);
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!Number.isFinite(id) || !name || !Number.isFinite(price)) {
    return null;
  }

  const defaults = DEFAULT_MENU_ITEMS.find((item) => item.id === id);
  const category = record.category === "beverage" ? "beverage" : "bakery";
  const rawTag = record.tag === "bestseller" || record.tag === "new" ? record.tag : undefined;

  return {
    id,
    name,
    nameEn: record.name_en?.trim() || defaults?.nameEn || name,
    price,
    category,
    emoji: record.emoji?.trim() || defaults?.emoji || (category === "beverage" ? "☕" : "🥐"),
    tag: rawTag,
    image: record.image_url?.trim() || defaults?.image || imageForMenu(name, record.name_en ?? "", category),
    description:
      defaults?.description ||
      (category === "beverage"
        ? "เครื่องดื่มทำสดใหม่ พร้อมเสิร์ฟ"
        : "เบเกอรี่อบสดใหม่ พร้อมเสิร์ฟ"),
    inStock: record.in_stock !== false,
  };
}

export function groupMenuItems(items: MenuItem[]) {
  return {
    bakery: items.filter((item) => item.category === "bakery" && item.inStock),
    beverages: items.filter((item) => item.category === "beverage" && item.inStock),
  };
}
