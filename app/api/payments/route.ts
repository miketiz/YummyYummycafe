import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PaymentMethod = "cash" | "bank_transfer" | "promptpay";
type PaymentStatus = "pending" | "completed" | "failed";

interface CreatePaymentInput {
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  payment_reference?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePaymentInput;

    if (!body.order_id || !body.amount || !body.payment_method) {
      return NextResponse.json(
        { error: "Missing required fields: order_id, amount, payment_method" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status")
      .eq("id", body.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const paymentStatus = body.payment_status ?? "pending";

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: body.order_id,
        amount: body.amount,
        payment_method: body.payment_method,
        payment_status: paymentStatus,
        payment_reference: body.payment_reference,
        notes: body.notes,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment creation error:", paymentError);
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    if (paymentStatus === "completed") {
      await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", body.order_id);
    }

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (orderId) {
      query = query.eq("order_id", orderId);
    }

    if (status) {
      query = query.eq("payment_status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Payments fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
