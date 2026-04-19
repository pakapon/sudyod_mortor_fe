# Cross-Page Flows & Quick Reference

> ดู common conventions → [00-common.md](./00-common.md)

---

## Flow A — ซ่อมรถ (19 ขั้นตอน)

```
1.  ค้นหา/สร้างลูกค้า          [05-customers.md]
2.  เลือกรถ                    [05-customers.md → Vehicles tab]
3.  สร้าง SO (draft)            [06-service-orders.md]
4.  ถ่าย GPS pre_intake ≥1     [06-service-orders.md → Tab GPS]
5.  ส่งตรวจสอบ → pending_review [06-service-orders.md]
6.  พร้อมเสนอราคา → pending_quote
7.  เพิ่ม SO Items (อะไหล่/ค่าแรง) [06-service-orders.md → Tab Items]
8.  สร้าง Quotation (service)   [07-quotations.md]
9.  อนุมัติ QT → approved
10. มอบหมายช่าง (technician)    [06-service-orders.md]
11. เริ่มซ่อม → in_progress     (★ ตัดสต็อกอะไหล่อัตโนมัติ)
12. ซ่อมเสร็จ → completed
13. รอชำระ → pending_payment
14. Issue Invoice               [08-invoices.md]
15. บันทึกชำระ + ออกใบเสร็จ (กดเอง)
16. สร้าง Delivery Note         [10-delivery-notes.md]
17. ลูกค้าเซ็น DN
18. ถ่าย GPS delivery ≥1
19. ปิดงาน → closed             [06-service-orders.md]
    (bonus) สร้าง Warranty      [11-warranties.md]
```

---

## Flow B1 — ขายอะไหล่/สินค้า (ไม่มีมัดจำ)

```
1. ค้นหา/สร้างลูกค้า
2. สร้าง Quotation (sale)       [07-quotations.md]
3. อนุมัติ QT → approved
4. Issue Invoice (sale)         [08-invoices.md]  ← (★ ตัดสต็อกตอน issue)
5. บันทึกชำระ + ออกใบเสร็จ
6. [สร้าง DN] (ไม่บังคับ)        [10-delivery-notes.md]
7. สร้าง Warranty (ถ้ามี)        [11-warranties.md]
```

---

## Flow B2 — ขายอะไหล่/สินค้า (มีมัดจำ)

```
1. ค้นหา/สร้างลูกค้า
2. สร้าง Quotation (sale)       [07-quotations.md]
3. อนุมัติ QT → approved
4. รับมัดจำ (Deposit)           [09-deposits.md]  ← ใบเสร็จมัดจำออกอัตโนมัติ
5. Issue Invoice (หักยอดมัดจำ)  [08-invoices.md]  ← (★ ตัดสต็อกตอน issue)
6. บันทึกชำระ + ออกใบเสร็จ
7. [สร้าง DN] (ไม่บังคับ)        [10-delivery-notes.md]
8. สร้าง Warranty (ถ้ามี)        [11-warranties.md]
```

---

## Flow C — ขายหน้าร้าน (Retail — ไม่ต้องมี QT)

```
1. Invoice retail (POS-style)   [08-invoices.md]  ← ลูกค้า optional
2. บันทึกชำระ + ออกใบเสร็จ
```

---

## Flow ไฟแนนซ์

```
1. สร้าง Loan Application        [15-loans-finance.md]
2. ไฟแนนซ์อนุมัติ → approved
3. บันทึกชำระ Invoice            [08-invoices.md]  ← Payment method = finance
```

---

## Flow Store Loan (ผ่อนร้าน)

```
1. สร้าง Store Loan              [15-loans-finance.md]
2. บันทึกชำระรายงวดทุกเดือน     [15-loans-finance.md → payments]
3. Job check-overdue ตรวจทุกคืน → เปลี่ยน status overdue ถ้าค้าง
```

---

## Flow รับสินค้าเข้าคลัง

```
1. สร้าง PO + ส่งให้ Supplier   [14-purchase-orders.md]
2. รับของ → สร้าง Goods Receipt อัตโนมัติ
3. อนุมัติ GR → สต็อกเข้าคลัง  [13-inventory.md]
```

---

## Flow โอนสต็อก

```
1. สร้าง Stock Transfer          [13-inventory.md]
2. อนุมัติ → สต็อกออกจาก from_warehouse
3. ปลายทางยืนยันรับ → สต็อกเข้า to_warehouse
```

---

## Quick Reference — API สำคัญ

| หน้า | GET (list) | POST (create) | PUT/PATCH (update) |
|------|-----------|---------------|-------------------|
| ลูกค้า | `GET /customers` | `POST /customers` | `PUT /customers/{id}` |
| รถ | `GET /customers/{id}/vehicles` | `POST /customers/{id}/vehicles` | `PUT /customers/{id}/vehicles/{vid}` |
| SO | `GET /service-orders` | `POST /service-orders` | `PATCH /service-orders/{id}/transition` |
| QT | `GET /quotations` | `POST /quotations` | `PATCH /quotations/{id}` |
| INV | `GET /invoices` | `POST /invoices/from-quotation` | `POST /invoices/{id}/issue` |
| Deposit | `GET /deposits` | `POST /deposits` | `PATCH /deposits/{id}/refund` |
| DN | `GET /delivery-notes` | `POST /delivery-notes` | `PATCH /delivery-notes/{id}/sign` |
| Warranty | `GET /warranties` | `POST /warranties` | — |
| Products | `GET /products` | `POST /products` | `PUT /products/{id}` |
| Inventory | `GET /inventory` | — | `PATCH /warehouses/{id}/inventory/adjust` |
| GR | `GET /goods-receipts` | `POST /goods-receipts` | `POST /goods-receipts/{id}/approve` |
| ST | `GET /stock-transfers` | `POST /stock-transfers` | `POST /stock-transfers/{id}/approve` |
| Loan App | `GET /loan-applications` | `POST /loan-applications` | `PATCH /loan-applications/{id}/approve` |
| Store Loan | `GET /store-loans` | `POST /store-loans` | — |
| Loan Search | `GET /loans/search?q=` | — | — |
| Employees | `GET /employees` | `POST /employees` | `PUT /employees/{id}` |
| Attendance | `GET /attendance` | `POST /attendance/check-in` | `PUT /attendance/{id}` |
| Roles | `GET /permissions/roles` | `POST /permissions/roles` | `PUT /permissions/roles/{id}` |
