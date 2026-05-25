# Google Sheet Order Export

ไฟล์นี้ใช้เตรียม Google Sheet สำหรับรับออเดอร์จาก YummyYummy Cafe

## สิ่งที่สร้างไว้ให้

- `scripts/google-sheets-webhook.gs` คือ Apps Script สำหรับตกแต่ง Sheet และรับ webhook
- `docs/google-sheet-order-template.csv` คือไฟล์ตัวอย่างหัวตารางและข้อมูล 1 แถว

## วิธีสร้าง Google Sheet

1. เปิด Google Sheet ใหม่
2. ตั้งชื่อไฟล์ เช่น `YummyYummy Orders`
3. ไปที่ `Extensions > Apps Script`
4. วางโค้ดจาก `scripts/google-sheets-webhook.gs`
5. แก้ค่า `CONFIG.secret` ให้ตรงกับ `GOOGLE_SHEET_WEBHOOK_SECRET` ใน Vercel
6. กด Run ฟังก์ชัน `setupYummyYummyOrderSheet`
7. กลับมาที่ Sheet จะมีหน้า `Orders` และ `Dashboard`

## วิธี deploy Apps Script เป็น Web App

1. ใน Apps Script กด `Deploy > New deployment`
2. เลือก type เป็น `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. กด Deploy แล้วคัดลอก Web App URL
6. นำ URL ไปใส่ใน Vercel env:

```env
GOOGLE_SHEET_WEBHOOK_URL=
GOOGLE_SHEET_WEBHOOK_SECRET=
```

## คอลัมน์หลัก

- `created_at` เวลาสั่งซื้อ
- `order_number` เลขออเดอร์
- `customer_name` ชื่อลูกค้า
- `phone_number` เบอร์โทร
- `items` รายการสินค้า
- `delivery_type` วิธีรับสินค้า
- `delivery_address` ที่อยู่จัดส่ง
- `subtotal` ยอดสินค้า
- `delivery_fee` ค่าส่ง
- `total_price` ยอดรวม
- `payment_method` วิธีชำระเงิน
- `payment_status` สถานะชำระเงิน
- `order_status` สถานะออเดอร์
- `notes` หมายเหตุ

## การทำงานในเว็บ

เมื่อสร้างออเดอร์สำเร็จ `/api/orders` จะส่งข้อมูลไปที่ `GOOGLE_SHEET_WEBHOOK_URL` อัตโนมัติผ่าน `lib/google-sheets/orders.ts`

ถ้ายังไม่ได้ตั้งค่า `GOOGLE_SHEET_WEBHOOK_URL` หรือ `GOOGLE_SHEET_WEBHOOK_SECRET` ระบบจะข้ามการส่งเข้า Sheet และยังสร้างออเดอร์ในเว็บได้ตามปกติ
