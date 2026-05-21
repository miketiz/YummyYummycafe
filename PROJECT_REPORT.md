# YummyYummy Bakery AI Order System

## Project Overview

YummyYummy Bakery AI Order System is a production-oriented web application for a small bakery/cafe. The project combines a customer storefront, AI-assisted ordering, order management, and Telegram automation so a small owner can receive orders, answer common questions, and monitor sales without switching between many tools.

Production domain:

- https://www.mmapp.me

Repository branch used during development:

- `feature/telegram-notifications`

## Problem

Small food businesses often handle customer questions, orders, order status, sales summaries, and social content manually. This creates repeated work and makes it easy to miss new orders or daily sales updates.

This project solves that by building:

- A customer-facing AI chat that answers store questions and supports ordering.
- A structured order flow connected to Supabase.
- A back-office Telegram bot for operational questions.
- Automatic Telegram notifications for new orders and daily sales reports.
- An admin dashboard for managing menus, orders, and Instagram content.

## Main Features

### Customer Storefront

- Displays bakery and beverage menus.
- Uses real menu data from Supabase through `/api/menu-items`.
- Supports cart ordering from menu cards.
- Supports order status lookup by phone number or order number.
- Hides out-of-stock menu items from the storefront.

### AI Chat For Customers

Endpoint:

- `POST /api/chat`

Knowledge source:

- `data/knowledge/store-profile.md`
- `data/knowledge/menu-highlights.md`
- `data/knowledge/order-policy.md`
- `data/knowledge/store-faq.md`

Capabilities:

- Answers store profile, opening hours, delivery, contact, menu, and policy questions.
- Uses RAG retrieval before generating an answer.
- Uses a confidence threshold guardrail.
- Can show selectable menu cards in chat.
- Can add selected menu items to the cart.
- Can complete an order inside the chat flow:
  - Select menu
  - Ask customer name
  - Ask phone number
  - Ask delivery or pickup
  - Ask address when delivery is selected
  - Ask payment method
  - Confirm and submit order

Important separation:

- Customer AI chat does not access Telegram back-office commands.
- Back-office Telegram logic is handled by a separate route.

### Order System

Endpoints:

- `POST /api/orders`
- `GET /api/orders`
- `GET/PATCH/DELETE /api/orders/[id]`

Data stored:

- Customer information
- Order number
- Order status
- Payment status
- Delivery type and address
- Ordered menu items
- Total price and delivery fee

After successful order creation:

- The website cart is cleared.
- A Telegram new order notification is sent to the shop owner.

### Telegram Back-Office Bot

Endpoint:

- `POST /api/telegram/webhook`

Webhook URL:

- `https://www.mmapp.me/api/telegram/webhook`

Security:

- Uses `TELEGRAM_WEBHOOK_SECRET`.
- Only allows configured admin chat IDs.
- Customer website chat cannot access this route.

Supported back-office prompts:

- `สรุปยอดวันนี้`
- `สรุปยอดเมื่อวาน`
- `สรุปยอด 7 วัน`
- `ออเดอร์ล่าสุด`
- `ออเดอร์ค้าง`
- `ช่วยบอกออเดอร์ที่ยังไม่จัดส่งที`
- `วันนี้มีออเดอร์กี่รายการ`

The Telegram bot uses intent matching plus Supabase queries for operational answers. This is intentionally more deterministic than free-form LLM database access.

### Telegram New Order Notification

File:

- `lib/telegram/notify.ts`

Trigger:

- Runs after `POST /api/orders` successfully creates order items.

Message includes:

- Order number
- Item list and quantities
- Subtotal, delivery fee, and total
- Customer name and phone number
- Delivery or pickup
- Address when available
- Payment method
- Notes when available

Environment variables:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ORDER_CHAT_ID` optional
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_ADMIN_CHAT_IDS`

### Daily Sales Cron

Endpoint:

- `GET /api/cron/daily-sales-report`

Vercel Cron:

```json
{
  "path": "/api/cron/daily-sales-report",
  "schedule": "0 0 * * *"
}
```

Schedule:

- Every day at 07:00 Asia/Bangkok.

Report includes:

- Previous Bangkok calendar day sales
- Total revenue
- Paid revenue
- Order count
- Items sold
- Average order value
- Top-selling menu items
- Status summary

Security:

- Requires `Authorization: Bearer <CRON_SECRET>` in production.

### Admin Dashboard

Route:

- `/admin`

Features:

- Dashboard overview and KPIs.
- Order management and status updates.
- Menu management with Supabase persistence.
- Menu image URL editing.
- In-stock/out-of-stock toggle.
- Instagram caption generation.
- UniPost integration for Instagram posting/scheduling.

Security:

- Admin password is checked by `/api/admin/verify`.
- Production should set `ADMIN_BASIC_AUTH_PASSWORD` in Vercel.

## Architecture

### Frontend

- Next.js App Router
- React client components
- Tailwind-style utility classes
- `next/image` for remote menu/hero images
- `sonner` for toast notifications

### Backend

- Next.js route handlers
- Supabase database
- Telegram Bot API
- Vercel Cron
- Gemini/OpenAI-compatible RAG generator support

### Data Storage

Supabase tables:

- `customers`
- `orders`
- `order_items`
- `menu_items`
- `payments`

Schema reference:

- `lib/supabase/schema.sql`

## Environment Variables

Required for production:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=

ADMIN_BASIC_AUTH_PASSWORD=
```

Optional:

```env
TELEGRAM_ORDER_CHAT_ID=
TELEGRAM_ADMIN_CHAT_IDS=
GOOGLE_API_KEY=
RAG_GOOGLE_MODEL=
RAG_CONFIDENCE_THRESHOLD=
OPENAI_API_KEY=
RAG_OPENAI_MODEL=
UNIPOST_API_KEY=
UNIPOST_INSTAGRAM_ACCOUNT_ID=
```

## Demo Script

### Customer AI Chat

Try:

```text
มีเมนูอะไรบ้าง
สั่งอาหาร
เอา Matcha Latte 2
ยืนยันออเดอร์
```

Expected result:

- Chat shows menu cards.
- Customer can add products to cart.
- Chat collects customer information.
- Order is submitted.
- Cart is cleared.
- Telegram receives a new order notification.

### Telegram Back Office

Try:

```text
/help
ช่วยบอกออเดอร์ที่ยังไม่จัดส่งที
สรุปยอดวันนี้
ออเดอร์ล่าสุด
```

Expected result:

- Telegram responds only for allowed admin chat IDs.
- Operational answers come from Supabase data.

### Daily Cron

Manual test:

```bash
curl "https://www.mmapp.me/api/cron/daily-sales-report" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected result:

```json
{
  "ok": true,
  "sent": true
}
```

## Security Notes

- `.env.local` is ignored by Git.
- `.env.example` is safe to commit because it contains no real secrets.
- Telegram webhook requires a secret header.
- Telegram back-office answers only configured admin chat IDs.
- Customer chat and Telegram back-office routes are separated.
- Production should not use the default admin password.

## Verification

Latest local checks:

```bash
npm.cmd run build
npx.cmd eslint app\api\telegram\webhook\route.ts
npx.cmd eslint app\api\orders\route.ts lib\telegram\notify.ts
```

Current known warning:

- `app/page.tsx` uses a small `<img>` for the local logo. Build still passes. It can be replaced with `next/image` later to remove the lint warning.

## Future Improvements

- Add `/api/health` for production environment checks.
- Add screenshots to this report.
- Add exportable order report CSV.
- Add richer Telegram natural-language intent classification if needed.
- Add payment slip upload and payment confirmation workflow.
- Improve delivery fee calculation using customer GPS coordinates in chat checkout.
