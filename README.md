## YummyYummycafe

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## RAG Chatbot Backend

This project now includes a basic RAG backend at `POST /api/chat`.

### Knowledge source

Knowledge files are in `data/knowledge/*.md`:

- `store-profile.md`
- `menu-highlights.md`
- `order-policy.md`

Edit these files to update what the bot can answer about your shop.

### Environment variables

Copy `.env.example` to `.env.local` and set values as needed. Keep `.env.local` out of version control:

```bash
GOOGLE_API_KEY=your_google_key_here
RAG_GOOGLE_MODEL=gemini-2.0-flash
RAG_CONFIDENCE_THRESHOLD=0.18
```

This project is configured to use Gemini only. If you want OpenAI fallback, add `OPENAI_API_KEY` and `RAG_OPENAI_MODEL`.

If model API keys are missing, the endpoint still works with a local fallback answer generator.

`RAG_CONFIDENCE_THRESHOLD` is used as a guardrail. If retrieved confidence is lower than this threshold, the API will refuse to answer outside shop knowledge and return a guarded response.

### Telegram daily sales report

The app includes a Vercel Cron endpoint at `GET /api/cron/daily-sales-report`. It sends the previous Bangkok calendar day's sales report to Telegram every day at 07:00 Asia/Bangkok (`0 0 * * *` UTC in `vercel.json`).

Set these environment variables in Vercel:

```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_ORDER_CHAT_ID=optional_chat_id_for_new_order_alerts
CRON_SECRET=random_secret_at_least_16_chars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

`BOT_TOKEN` and `CHAT_ID` are also supported as fallback names. New order notifications are sent immediately after an order is created. They use `TELEGRAM_ORDER_CHAT_ID` when set, otherwise they fall back to `TELEGRAM_CHAT_ID`, `CHAT_ID`, and `TELEGRAM_ADMIN_CHAT_IDS`.

### Telegram back-office webhook

Telegram messages sent to `POST /api/telegram/webhook` are handled as back-office commands. The website chat remains customer-facing through `/api/chat`; Telegram is restricted to admin chat ids and can answer operational questions such as daily sales, pending orders, recent orders, and best-selling menu items.

Set these environment variables:

```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=random_secret_at_least_16_chars
TELEGRAM_CHAT_ID=your_admin_telegram_chat_id
TELEGRAM_ADMIN_CHAT_IDS=optional_extra_admin_chat_ids_comma_separated
```

Register the webhook after deployment:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://your-production-domain/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Supported admin prompts include:

```text
สรุปยอดวันนี้
สรุปยอดเมื่อวาน
สรุปยอด 7 วัน
ออเดอร์ค้าง
ออเดอร์ล่าสุด
เมนูขายดีวันนี้
```

### API request example

```bash
curl -X POST http://localhost:3000/api/chat \
	-H "Content-Type: application/json" \
	-d '{
		"message": "ร้านเปิดกี่โมง และมีเมนูแนะนำอะไรบ้าง",
		"history": []
	}'
```

Response shape:

```json
{
	"answer": "...",
	"sources": [
		{
			"id": "store-profile-1",
			"source": "store-profile.md",
			"title": "ข้อมูลร้าน YummyYummy Cafe",
			"score": 0.73,
			"excerpt": "..."
		}
	]
}
```
