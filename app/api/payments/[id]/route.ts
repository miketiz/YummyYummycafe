import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PaymentStatus = "pending" | "completed" | "failed";

interface UpdatePaymentInput {
  payment_status?: PaymentStatus;
  payment_reference?: string;
  notes?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: payment });
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdatePaymentInput;

    const supabase = await createServerSupabaseClient();

    const { data: existing, error: fetchError } = await supabase
      .from("payments")
      .select("id, order_id, payment_status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const nextStatus = body.payment_status || existing.payment_status;

    const { data: payment, error: updateError } = await supabase
      .from("payments")
      .update({
        payment_status: nextStatus,
        payment_reference: body.payment_reference,
        notes: body.notes,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Payment update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    if (nextStatus === "completed") {
      await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", existing.order_id);
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
