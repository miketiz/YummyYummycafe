import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MENU_ITEMS, menuItemToRecord, normalizeMenuRecord, type MenuItem, type MenuItemRecord } from "@/lib/menu/catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorMeta(error: unknown) {
  if (process.env.NODE_ENV === "production" || !error || typeof error !== "object") {
    return {};
  }

  const err = error as { message?: string; code?: string; details?: string; hint?: string };
  return {
    details: err.message,
    code: err.code,
    meta: err.details,
    hint: err.hint,
  };
}

function cleanBody(body: Record<string, unknown>, id: number) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const nameEn = typeof body.nameEn === "string" ? body.nameEn.trim() : name;
  const price = Number(body.price);
  const category = body.category === "beverage" ? "beverage" : "bakery";
  const emoji = typeof body.emoji === "string" && body.emoji.trim()
    ? body.emoji.trim().slice(0, 10)
    : category === "beverage" ? "☕" : "🥐";
  const tag = body.tag === "bestseller" || body.tag === "new" ? body.tag : null;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

  if (!name || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    id,
    name,
    name_en: nameEn,
    price,
    category,
    emoji,
    tag,
    image_url: imageUrl || null,
    in_stock: body.inStock !== false,
  };
}

const MENU_SELECT_WITH_IMAGE = "id, name, name_en, price, category, emoji, tag, image_url, in_stock";
const MENU_SELECT = "id, name, name_en, price, category, emoji, tag, in_stock";

function isMissingImageColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { message?: string; code?: string; details?: string; hint?: string };
  const text = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return err.code === "42703" || err.code === "PGRST204" || text.includes("image_url");
}

function withoutImageUrl<T extends Record<string, unknown>>(record: T) {
  const next = { ...record };
  delete next.image_url;
  return next;
}

async function selectMenuItems(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const withImage = await supabase
    .from("menu_items")
    .select(MENU_SELECT_WITH_IMAGE)
    .order("id", { ascending: true });

  if (!withImage.error) {
    return withImage;
  }

  return supabase
    .from("menu_items")
    .select(MENU_SELECT)
    .order("id", { ascending: true });
}

async function nextMenuId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data } = await supabase
    .from("menu_items")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Math.max(Number(data?.id ?? 0) + 1, DEFAULT_MENU_ITEMS.length + 1);
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await selectMenuItems(supabase);

    if (error) {
      return NextResponse.json({
        data: DEFAULT_MENU_ITEMS,
        source: "fallback",
        error: "Failed to fetch menu_items",
        ...errorMeta(error),
      });
    }

    if (!data || data.length === 0) {
      const seedRows = DEFAULT_MENU_ITEMS.map(menuItemToRecord);
      const seedWithImage = await supabase
        .from("menu_items")
        .upsert(seedRows, { onConflict: "id" })
        .select(MENU_SELECT_WITH_IMAGE)
        .order("id", { ascending: true });
      let seeded = seedWithImage.data as unknown;
      let seedError: unknown = seedWithImage.error;
      if (seedWithImage.error && isMissingImageColumn(seedWithImage.error)) {
        const seedWithoutImage = await supabase
          .from("menu_items")
          .upsert(seedRows.map(withoutImageUrl), { onConflict: "id" })
          .select(MENU_SELECT)
          .order("id", { ascending: true });
        seeded = seedWithoutImage.data;
        seedError = seedWithoutImage.error;
      }

      if (seedError || !Array.isArray(seeded)) {
        return NextResponse.json({
          data: DEFAULT_MENU_ITEMS,
          source: "fallback",
          error: seedError ? "Failed to seed menu_items" : undefined,
          ...errorMeta(seedError),
        });
      }

      return NextResponse.json({
        data: seeded
          .map((record) => normalizeMenuRecord(record as MenuItemRecord))
          .filter((item): item is MenuItem => item !== null),
        source: "supabase-seeded",
      });
    }

    return NextResponse.json({
      data: data
        .map((record) => normalizeMenuRecord(record))
        .filter((item): item is MenuItem => item !== null),
      source: "supabase",
    });
  } catch (error) {
    return NextResponse.json({
      data: DEFAULT_MENU_ITEMS,
      source: "fallback",
      error: "Menu API fallback was used",
      ...errorMeta(error),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const supabase = await createServerSupabaseClient();
    const id = Number(body.id) > 0 ? Number(body.id) : await nextMenuId(supabase);
    const payload = cleanBody(body, id);

    if (!payload) {
      return NextResponse.json({ error: "Valid name and price are required" }, { status: 400 });
    }

    const saveWithImage = await supabase
      .from("menu_items")
      .upsert(payload, { onConflict: "id" })
      .select(MENU_SELECT_WITH_IMAGE)
      .single();
    let saved = saveWithImage.data as unknown;
    let saveError: unknown = saveWithImage.error;
    if (saveWithImage.error && isMissingImageColumn(saveWithImage.error)) {
      const saveWithoutImage = await supabase
        .from("menu_items")
        .upsert(withoutImageUrl(payload), { onConflict: "id" })
        .select(MENU_SELECT)
        .single();
      saved = saveWithoutImage.data;
      saveError = saveWithoutImage.error;
    }

    if (saveError || !saved) {
      return NextResponse.json({ error: "Failed to save menu item", ...errorMeta(saveError) }, { status: 500 });
    }

    return NextResponse.json({ data: normalizeMenuRecord(saved as MenuItemRecord) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", ...errorMeta(error) }, { status: 500 });
  }
}
