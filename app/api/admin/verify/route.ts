import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";

    const expectedPassword = process.env.ADMIN_BASIC_AUTH_PASSWORD || "admin123";
    if (!password || password !== expectedPassword) {
      return NextResponse.json({ ok: false, error: "รหัสไม่ถูกต้อง" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin verify error:", error);
    return NextResponse.json({ ok: false, error: "ไม่สามารถตรวจสอบรหัสได้" }, { status: 500 });
  }
}
