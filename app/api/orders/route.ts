import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface CreateOrderInput {
  phone_number: string;
  customer_name: string;
  email?: string;
  address?: string;
  delivery_distance_km?: number;
  items: Array<{
    menu_item_name: string;
    menu_item_emoji?: string;
    quantity: number;
    unit_price: number;
  }>;
  delivery_type: "delivery" | "pickup";
  delivery_address?: string;
  delivery_fee?: number;
  notes?: string;
  payment_method?: "cash" | "bank_transfer" | "promptpay";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderInput;

    if (!body.phone_number || !body.customer_name || !body.items?.length) {
      return NextResponse.json(
        { error: "Missing required fields: phone_number, customer_name, items" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 1. Get or create customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_number", body.phone_number)
      .single();

    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update customer info if provided
      if (body.email || body.address) {
        await supabase
          .from("customers")
          .update({
            email: body.email || undefined,
            address: body.address || undefined,
            delivery_distance_km: body.delivery_distance_km || undefined,
          })
          .eq("id", customerId);
      }
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          phone_number: body.phone_number,
          name: body.customer_name,
          email: body.email,
          address: body.address,
          delivery_distance_km: body.delivery_distance_km,
        })
        .select("id")
        .single();

      if (customerError) {
        console.error("Customer creation error:", customerError);
        return NextResponse.json(
          { error: "Failed to create customer" },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // 2. Calculate totals
    const itemsSubtotal = body.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const deliveryFee = body.delivery_type === "delivery" ? (body.delivery_fee || 0) : 0;
    const totalPrice = itemsSubtotal + deliveryFee;

    // 3. Generate order number (e.g., ORD-20250517-001)
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const { data: todaysOrders } = await supabase
      .from("orders")
      .select("id", { count: "exact" })
      .gte("created_at", new Date().toISOString().split("T")[0]);

    const orderNumber = `ORD-${today}-${String((todaysOrders?.length || 0) + 1).padStart(3, "0")}`;

    // 4. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        order_number: orderNumber,
        status: "pending",
        total_price: totalPrice,
        delivery_fee: deliveryFee,
        delivery_type: body.delivery_type,
        delivery_address: body.delivery_address || body.address,
        notes: body.notes,
        payment_method: body.payment_method,
        payment_status: "unpaid",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // 5. Create order items
    const { error: itemsError } = await supabase.from("order_items").insert(
      body.items.map((item) => ({
        order_id: order.id,
        menu_item_name: item.menu_item_name,
        menu_item_emoji: item.menu_item_emoji,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      }))
    );

    if (itemsError) {
      console.error("Order items creation error:", itemsError);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_price: order.total_price,
          delivery_fee: order.delivery_fee,
          created_at: order.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET orders with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const phone = searchParams.get("phone");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        customers(id, name, phone_number, address),
        order_items(*)
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (phone) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone_number", phone)
        .single();

      if (customer) {
        query = query.eq("customer_id", customer.id);
      } else {
        return NextResponse.json({ data: [] });
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Orders fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
