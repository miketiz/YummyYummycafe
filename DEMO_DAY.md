# Demo Day Release

## Pull Request Purpose

This release branch is prepared for the demo-day submission. It summarizes the project pivot and highlights the core workflow that changed YummyYummy Cafe from a simple bakery storefront into an AI-powered order operations system.

## Pivot Summary

YummyYummy Cafe pivoted from:

> Online bakery storefront

to:

> AI-powered cafe order operations system

The project now supports both customer-facing ordering and back-office operations.

## Demo Flow

1. Customer opens the storefront and browses menu items.
2. Customer asks the AI chat for menu suggestions.
3. AI chat can help add items to the cart and create an order.
4. New order is saved to Supabase.
5. New order is sent to Google Sheet.
6. Telegram notifies the owner about the new order.
7. Admin can update order status and payment status.
8. Admin can print an order slip for attaching to a bag or box.
9. Telegram back-office bot can answer operational questions.

## Back-office Examples

Telegram admin prompts:

```text
ช่วยบอกออเดอร์ที่ยังไม่จัดส่งที
ออเดอร์ที่ยังไม่ชำระ
สรุปยอดวันนี้
ชำระแล้ว ORD-20260524-001
ส่งแล้ว ORD-20260524-001
```

## Reviewer Checklist

- The pivot is clearly explained.
- The app supports real order creation.
- Admin can manage order and payment statuses.
- Telegram works as a back-office assistant.
- Google Sheet receives and updates order data.
- Printable order slips are useful for real shop operations.

## Reviewer Comment Prompt

Please leave at least one review comment about whether the pivot is clear and whether the current workflow supports a real small cafe operation.
