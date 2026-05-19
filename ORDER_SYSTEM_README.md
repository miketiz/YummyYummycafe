# YummyYummy Order System - Supabase Setup Guide

## 📋 Overview

This is a complete order management system for YummyYummy Cafe built with:
- **Backend**: Next.js API routes + Supabase PostgreSQL
- **Frontend**: React components for customers (OrderForm) and admin (OrderManagementPanel)
- **Authentication**: Optional Supabase Auth

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 2. Setup Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Create Database Schema

1. Go to your Supabase project → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `lib/supabase/schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** to create all tables

### 4. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 5. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

Visit `http://localhost:3000` to test!

---

## 🛠️ File Structure

```
├── lib/supabase/
│   ├── client.ts           # Browser-side Supabase client
│   ├── server.ts           # Server-side Supabase client
│   └── schema.sql          # Database schema (copy to SQL editor)
│
├── app/api/orders/
│   ├── route.ts            # POST (create) and GET (list) orders
│   └── [id]/route.ts       # GET, PATCH (update), DELETE (cancel) single order
│
├── components/
│   ├── home/
│   │   └── order-form.tsx  # Customer order form (menu + checkout)
│   └── admin/
│       └── AdminOrders.tsx # Admin panel for managing orders
│
└── .env.local.example      # Environment variables template
```

---

## 📱 Usage

### For Customers - Order Form

Import and use in your page:

```tsx
import { OrderForm } from "@/components/home/order-form";

export default function OrderPage() {
  return <OrderForm />;
}
```

**Features:**
- Browse menu items (bakery + beverages)
- Add/remove items from cart
- Choose delivery or pickup
- Enter customer details
- Choose payment method
- Automatic delivery fee calculation (free if ≥ 500 baht)
- Order confirmation with order number

### For Admin - Order Management

Import and use in your admin dashboard:

```tsx
import { OrderManagementPanel } from "@/components/admin/AdminOrders";

export default function AdminPage() {
  return <OrderManagementPanel />;
}
```

**Features:**
- View all orders
- Filter by status (pending, confirmed, preparing, ready, delivered, cancelled)
- Update order status
- View order details and customer info
- Cancel orders (within 15 minutes)
- Real-time status updates

---

## 🔌 API Routes

### Create Order
```bash
POST /api/orders
Content-Type: application/json

{
  "phone_number": "0634365174",
  "customer_name": "สมชาย",
  "email": "somchai@example.com",
  "address": "123 Soi X, Bangkok",
  "delivery_type": "delivery",
  "delivery_distance_km": 2.5,
  "delivery_fee": 50,
  "payment_method": "cash",
  "notes": "ไม่มีน้ำตาล",
  "items": [
    {
      "menu_item_name": "ครัวซองต์เนยแท้",
      "menu_item_emoji": "🥐",
      "quantity": 2,
      "unit_price": 65
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "order_number": "ORD-20250517-001",
    "status": "pending",
    "total_price": 180,
    "delivery_fee": 50,
    "created_at": "2025-05-17T10:30:00Z"
  }
}
```

### Get Orders
```bash
GET /api/orders?status=pending&limit=50
GET /api/orders?phone=0634365174
```

### Get Single Order
```bash
GET /api/orders/{id}
```

### Update Order Status
```bash
PATCH /api/orders/{id}
Content-Type: application/json

{
  "status": "confirmed",
  "payment_status": "paid",
  "notes": "Ready to deliver"
}
```

### Cancel Order
```bash
DELETE /api/orders/{id}
```

Can only cancel within 15 minutes and if status is not "preparing", "ready", or "delivered".

---

## 📊 Database Schema

### customers
- `id` - UUID (PK)
- `phone_number` - VARCHAR UNIQUE
- `name` - VARCHAR
- `email` - VARCHAR
- `address` - TEXT
- `delivery_distance_km` - DECIMAL
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### orders
- `id` - UUID (PK)
- `customer_id` - UUID (FK)
- `order_number` - VARCHAR UNIQUE (e.g., ORD-20250517-001)
- `status` - VARCHAR (pending|confirmed|preparing|ready|delivered|cancelled)
- `total_price` - DECIMAL
- `delivery_fee` - DECIMAL
- `delivery_type` - VARCHAR (delivery|pickup)
- `delivery_address` - TEXT
- `notes` - TEXT
- `payment_method` - VARCHAR (cash|bank_transfer|promptpay)
- `payment_status` - VARCHAR (unpaid|paid)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### order_items
- `id` - UUID (PK)
- `order_id` - UUID (FK)
- `menu_item_name` - VARCHAR
- `menu_item_emoji` - VARCHAR
- `quantity` - INT
- `unit_price` - DECIMAL
- `subtotal` - DECIMAL
- `notes` - TEXT
- `created_at` - TIMESTAMP

### payments
- `id` - UUID (PK)
- `order_id` - UUID (FK)
- `amount` - DECIMAL
- `payment_method` - VARCHAR
- `payment_status` - VARCHAR (pending|completed|failed)
- `payment_reference` - VARCHAR
- `notes` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### menu_items
- `id` - INT (PK)
- `name` - VARCHAR
- `name_en` - VARCHAR
- `price` - DECIMAL
- `category` - VARCHAR (bakery|beverage)
- `emoji` - VARCHAR
- `tag` - VARCHAR (bestseller|new)
- `in_stock` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## 🔐 Security Notes

1. **Never commit `.env.local`** - Use `.env.local.example` as template
2. **Service Role Key** - Keep `SUPABASE_SERVICE_ROLE_KEY` secret, only use on server
3. **Anon Key** - Safe to expose in browser (public)
4. **RLS (Row Level Security)** - Consider enabling for production (see schema.sql comments)

---

## 🎨 Customization

### Update Order Status Labels

Edit `components/admin/AdminOrders.tsx`:
```tsx
const statusLabels: Record<string, string> = {
  pending: "⏳ รอยืนยัน",
  // ... update labels as needed
};
```

### Modify Delivery Fee Logic

Edit `components/home/order-form.tsx` (deliveryFee calculation):
```tsx
const deliveryFee =
  formData.delivery_type === "delivery"
    ? subtotal >= 500
      ? 0
      : formData.delivery_distance_km && formData.delivery_distance_km <= 3
        ? 50  // Change this value
        : 0
    : 0;
```

### Add More Payment Methods

1. Update database column `payment_method` enum
2. Add option in `order-form.tsx` select dropdown
3. Handle in admin panel if needed

---

## 🚨 Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not set"
- Make sure `.env.local` file exists
- Restart dev server after creating/editing .env.local

### Orders API returns 401
- Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Verify RLS policies if enabled

### Images/emojis not showing
- Ensure menu items have emoji field populated
- Check `menu-data.ts` has emoji property

### Can't create orders
- Verify schema was created (check Supabase SQL Editor)
- Check browser console for API errors
- Ensure customer phone_number is unique for updates to work

---

## 📈 Next Steps

1. **Add email notifications** when order status changes
2. **Add order tracking link** for customers
3. **Integrate with payment gateway** (Stripe, PayPal, etc.)
4. **Add SMS notifications** via Twilio
5. **Create order history page** for customers
6. **Add customer authentication** with Supabase Auth
7. **Analytics dashboard** for sales tracking

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Questions?** Check the API routes, schema.sql, or component files for more details!
