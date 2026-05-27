import { after, NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncOrderStatusToGoogleSheet } from "@/lib/google-sheets/orders";

export const maxDuration = 30;

interface UpdateOrderInput {
  status?: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  payment_status?: "unpaid" | "paid";
  notes?: string;
}

// GET single order
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customers(id, name, phone_number, address, email),
        order_items(*)
      `
      )
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH update order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateOrderInput;

    const supabase = await createServerSupabaseClient();

    // Check if order exists
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const statusChanged = body.status !== undefined && body.status !== order.status;

    // Cancelled orders are final. Delivered orders can still be marked paid.
    if (order.status === "cancelled" || (order.status === "delivered" && statusChanged)) {
      return NextResponse.json(
        { error: `Cannot update a ${order.status} order` },
        { status: 400 }
      );
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: body.status || order.status,
        payment_status: body.payment_status || order.payment_status,
        notes: body.notes !== undefined ? body.notes : undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Order update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    after(async () => {
      await syncOrderStatusToGoogleSheet({
        orderNumber: updatedOrder.order_number,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.payment_status,
        adminNote: body.notes,
        updatedAt: updatedOrder.updated_at,
      }).catch((error) => {
        console.error("Google Sheet order status sync error:", error);
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE cancel order
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, created_at")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Can only cancel within 15 minutes and if not preparing/ready
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const minutesElapsed = (now - createdAt) / (1000 * 60);

    if (minutesElapsed > 15) {
      return NextResponse.json(
        { error: "Orders can only be cancelled within 15 minutes" },
        { status: 400 }
      );
    }

    if (["preparing", "ready", "delivered", "cancelled"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a ${order.status} order` },
        { status: 400 }
      );
    }

    // Cancel order
    const { data: cancelledOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Order cancellation error:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cancelledOrder,
    });
  } catch (error) {
    console.error("Order cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
