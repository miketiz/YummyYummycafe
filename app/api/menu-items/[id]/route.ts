import { NextRequest, NextResponse } from "next/server";
import { normalizeMenuRecord, type MenuItemRecord } from "@/lib/menu/catalog";
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

function cleanPatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.nameEn === "string") patch.name_en = body.nameEn.trim();
  if (Number.isFinite(Number(body.price)) && Number(body.price) > 0) patch.price = Number(body.price);
  if (body.category === "bakery" || body.category === "beverage") patch.category = body.category;
  if (typeof body.emoji === "string" && body.emoji.trim()) patch.emoji = body.emoji.trim().slice(0, 10);
  if (body.tag === "bestseller" || body.tag === "new") patch.tag = body.tag;
  if (body.tag === "" || body.tag === null) patch.tag = null;
  if (typeof body.imageUrl === "string") patch.image_url = body.imageUrl.trim() || null;
  if (typeof body.inStock === "boolean") patch.in_stock = body.inStock;

  return patch;
}

function isMissingImageColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { message?: string; code?: string; details?: string; hint?: string };
  const text = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return err.code === "42703" || err.code === "PGRST204" || text.includes("image_url");
}

function isNoRowsResult(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { message?: string; code?: string; details?: string };
  const text = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  return err.code === "PGRST116" || text.includes("0 rows");
}

function withoutImageUrl(record: Record<string, unknown>) {
  const next = { ...record };
  delete next.image_url;
  return next;
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/menu-items/[id]">) {
  try {
    const { id } = await ctx.params;
    const menuId = Number(id);
    if (!Number.isFinite(menuId)) {
      return NextResponse.json({ error: "Invalid menu id" }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const patch = cleanPatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const updateWithImage = await supabase
      .from("menu_items")
      .update(patch)
      .eq("id", menuId)
      .select("id, name, name_en, price, category, emoji, tag, image_url, in_stock")
      .single();
    let updated = updateWithImage.data as unknown;
    let updateError: unknown = updateWithImage.error;
    if (updateWithImage.error && isMissingImageColumn(updateWithImage.error) && "image_url" in patch) {
      const patchWithoutImage = withoutImageUrl(patch);
      if (Object.keys(patchWithoutImage).length === 0) {
        return NextResponse.json(
          { error: "Run the menu_items image_url migration before saving menu images" },
          { status: 409 },
        );
      }
      const updateWithoutImage = await supabase
        .from("menu_items")
        .update(patchWithoutImage)
        .eq("id", menuId)
        .select("id, name, name_en, price, category, emoji, tag, in_stock")
        .single();
      updated = updateWithoutImage.data;
      updateError = updateWithoutImage.error;
    }
    if (isNoRowsResult(updateError) && typeof patch.name === "string" && typeof patch.price === "number") {
      const insertPayload = { id: menuId, ...patch };
      const insertWithImage = await supabase
        .from("menu_items")
        .upsert(insertPayload, { onConflict: "id" })
        .select("id, name, name_en, price, category, emoji, tag, image_url, in_stock")
        .single();
      updated = insertWithImage.data;
      updateError = insertWithImage.error;
      if (insertWithImage.error && isMissingImageColumn(insertWithImage.error) && "image_url" in insertPayload) {
        const insertWithoutImage = await supabase
          .from("menu_items")
          .upsert(withoutImageUrl(insertPayload), { onConflict: "id" })
          .select("id, name, name_en, price, category, emoji, tag, in_stock")
          .single();
        updated = insertWithoutImage.data;
        updateError = insertWithoutImage.error;
      }
    }

    if (updateError || !updated) {
      return NextResponse.json({ error: "Failed to update menu item", ...errorMeta(updateError) }, { status: 500 });
    }

    return NextResponse.json({ data: normalizeMenuRecord(updated as MenuItemRecord) });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", ...errorMeta(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/menu-items/[id]">) {
  try {
    const { id } = await ctx.params;
    const menuId = Number(id);
    if (!Number.isFinite(menuId)) {
      return NextResponse.json({ error: "Invalid menu id" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("menu_items").delete().eq("id", menuId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete menu item", ...errorMeta(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", ...errorMeta(error) }, { status: 500 });
  }
}
