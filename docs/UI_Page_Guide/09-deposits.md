# มัดจำ (Deposits)

> ดู common conventions → [00-common.md](./00-common.md)
> ใช้เฉพาะ **Flow B2 (ขายมีมัดจำ)** เท่านั้น

---

**Route:** `/deposits`
**Permission:** `deposits.can_view`

## เมื่อไหร่ใช้?
- **เฉพาะ Flow B2 (ขายมีมัดจำ)** — ลูกค้าจ่ายมัดจำก่อนซื้อ
- สร้างจาก Quotation ที่ approved (type=sale)

## 9.1 หน้า List
- Table: เลข Deposit, QT ref, ลูกค้า, จำนวนเงิน, สถานะ (active/refunded)

## 9.2 สร้าง Deposit
- API: `POST /deposits { quotation_id, amount, method, reference_no }`
- ⚠️ ใบเสร็จมัดจำออกอัตโนมัติทันที (ไม่ต้องกดเหมือน Receipt ปกติ)

## 9.3 Detail
- แสดงข้อมูลมัดจำ + link ไป QT
- ปุ่ม "ดูใบเสร็จ" → `GET /deposits/{id}/receipt` (PDF)
- ปุ่ม "คืนมัดจำ" → `PATCH /deposits/{id}/refund`

---

## ดูเพิ่มเติม
- [07-quotations.md](./07-quotations.md) — QT approved ที่ใช้สร้าง Deposit
- [08-invoices.md](./08-invoices.md) — Invoice ที่หักยอดมัดจำ
- [20-flows.md](./20-flows.md) — Flow B2 ทั้งหมด
