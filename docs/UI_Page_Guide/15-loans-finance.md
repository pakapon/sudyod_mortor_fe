# สินเชื่อ & การเงิน (Loans & Finance)

> ดู common conventions → [00-common.md](./00-common.md)

---

## 15.1 สินเชื่อไฟแนนซ์ (Loan Applications)

**Route:** `/loan-applications`
**Permission:** `loan_applications.can_view`

**เมื่อไหร่ใช้?** — ลูกค้าซื้อรถ/สินค้าผ่านไฟแนนซ์ บริษัทไฟแนนซ์จ่ายให้ร้าน

**สร้าง:**
- Fields:
  | Field | Required | หมายเหตุ |
  |-------|----------|---------|
  | `finance_company_id` | ✅ | dropdown `GET /finance-companies` |
  | `applicant_name` | ✅ | ชื่อผู้กู้ |
  | `id_card_number` | ✅ | |
  | `phone` | ✅ | |
  | `amount_requested` | ✅ | |
  | `applied_date` | ✅ | |
  | `note` | ❌ | |
- API: `POST /loan-applications`

**Guarantors (ผู้ค้ำ):**
- เพิ่มผู้ค้ำ: `POST /loan-applications/{id}/guarantors`
- ลบ: `DELETE /loan-applications/{id}/guarantors/{gid}`

**Detail + Actions:**
- "อนุมัติ" → `PATCH /loan-applications/{id}/approve`
- "ปฏิเสธ" → `PATCH /loan-applications/{id}/reject { reason }`
- "ยกเลิก" → `PATCH /loan-applications/{id}/cancel`

**Status:** `pending → approved / rejected / cancelled`

---

## 15.2 สินเชื่อร้าน (Store Loans)

**Route:** `/store-loans`
**Permission:** `store_loans.can_view`

**เมื่อไหร่ใช้?** — ลูกค้าผ่อนชำระกับทางร้านโดยตรง

**สร้าง:**
- Fields:
  | Field | Required | หมายเหตุ |
  |-------|----------|---------|
  | `customer_id` | ✅ | |
  | `invoice_id` | ✅ | Invoice ที่ผ่อน |
  | `total_amount` | ✅ | ยอดรวม |
  | `down_payment` | ✅ | เงินดาวน์ |
  | `monthly_payment` | ✅ | ค่างวดต่อเดือน |
  | `interest_rate` | ✅ | % ต่อปี |
  | `term_months` | ✅ | จำนวนงวด |
  | `start_date` | ✅ | |
  | `next_due_date` | ✅ | |
- API: `POST /store-loans`

**Detail:**
- คลิก "ดูตารางผ่อน" → `GET /store-loans/{id}/calculate` → แสดงตารางรายงวด
- บันทึกชำระ: `POST /store-loans/{id}/payments`
- ดูประวัติชำระ: `GET /store-loans/{id}/payments`
- ⚠️ Job `check-overdue` ตรวจทุกคืน — เปลี่ยน status เป็น `overdue` อัตโนมัติ

**Status:** `active → completed / overdue / cancelled`

---

## 15.3 ค้นหาสินเชื่อ (Loan Search)

**Route:** `/loans/search`

- Input: เบอร์โทร หรือ เลขบัตรประชาชน
- ค้นพร้อมกัน 3 index: ผู้กู้ + ผู้ค้ำ + สินเชื่อร้าน
- ⚠️ ใช้ **Elasticsearch 8** — ไม่ใช่ MySQL LIKE
- API: `GET /loans/search?q=0812345678`
- แสดงผลลัพธ์จากทุก index รวมกัน

---

## ดูเพิ่มเติม
- [08-invoices.md](./08-invoices.md) — วิธีชำระผ่านไฟแนนซ์ / ผ่อนร้าน
- [17-settings.md](./17-settings.md) — จัดการบริษัทไฟแนนซ์ (Finance Companies)
- [20-flows.md](./20-flows.md) — Flow ไฟแนนซ์ + Flow Store Loan
