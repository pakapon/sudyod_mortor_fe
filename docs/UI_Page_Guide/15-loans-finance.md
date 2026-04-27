# สินเชื่อ & การเงิน (Loans & Finance)

> ดู common conventions → [00-common.md](./00-common.md)

---

## ภาพรวม Flow

### Flow A — ไฟแนนซ์ภายนอก
> ลูกค้าขอสินเชื่อกับบริษัทไฟแนนซ์ **ไฟแนนซ์จ่ายเงินให้ร้าน** ลูกค้าผ่อนกับไฟแนนซ์โดยตรง — **ระบบไม่ติดตามการผ่อน**

```
1. สร้าง Loan Application           POST /loan-applications
2. แนบเอกสาร (บัตรประชาชน, บช, สลิปเงินเดือน ฯลฯ)
                                     POST /loan-applications/{id}/documents
3. เพิ่มผู้ค้ำ (ถ้ามี)              POST /loan-applications/{id}/guarantors
4. รอผลจากไฟแนนซ์ภายนอก
5a. อนุมัติ                         PATCH /loan-applications/{id}/approve
5b. ปฏิเสธ                         PATCH /loan-applications/{id}/reject
```

### Flow B — สินเชื่อร้าน
> ลูกค้าผ่อนชำระ **กับร้านโดยตรง** — **ระบบติดตามทุกงวด** เพราะร้านต้องรู้ว่าค้างชำระหรือไม่

```
1. คำนวณค่างวดก่อน (ไม่บังคับ)  GET /store-loans/0/calculate?principal=...&interest_rate=...&term_months=...
2. สร้างสัญญา                   POST /store-loans  (ใส่ monthly_payment จากขั้น 1)
3. ลูกค้ามาจ่ายทุกงวด           POST /store-loans/{id}/payments
4. Job ตรวจ 01:00 ทุกคืน        auto → overdue  (เลย due date ยังไม่จ่าย)
5. ชำระครบทุกงวด               auto → completed
```

---

## 15.1 สินเชื่อไฟแนนซ์ (Loan Applications)

**Route:** `/loan-applications`
**Permission:** `loan_applications.can_view`
**เลขที่สัญญา:** `LA-{ปี}-{เลขลำดับ}` เช่น `LA-2026-0031`

**เมื่อไหร่ใช้?** — บันทึกประวัติการขอสินเชื่อกับบริษัทไฟแนนซ์ภายนอก บริษัทไฟแนนซ์จ่ายเงินให้ร้านแทนลูกค้า

### Endpoints

| Method | URL | Permission | คำอธิบาย |
|--------|-----|------------|---------|
| GET | `/loan-applications` | `can_view` | รายการ |
| POST | `/loan-applications` | `can_create` | สร้าง |
| GET | `/loan-applications/{id}` | `can_view` | รายละเอียด + ผู้ค้ำ |
| PUT | `/loan-applications/{id}` | `can_edit` | แก้ไข (status=`pending` เท่านั้น) |
| PATCH | `/loan-applications/{id}/approve` | `can_approve` | อนุมัติ |
| PATCH | `/loan-applications/{id}/reject` | `can_approve` | ปฏิเสธ |
| PATCH | `/loan-applications/{id}/cancel` | `can_edit` | ยกเลิก |
| POST | `/loan-applications/{id}/guarantors` | `can_edit` | เพิ่มผู้ค้ำ |
| DELETE | `/loan-applications/{id}/guarantors/{gid}` | `can_edit` | ลบผู้ค้ำ |
| GET | `/loan-applications/{id}/documents` | `can_view` | รายการเอกสารแนบ |
| POST | `/loan-applications/{id}/documents` | `can_edit` | อัปโหลดเอกสารแนบ |
| DELETE | `/loan-applications/{id}/documents/{docId}` | `can_edit` | ลบเอกสารแนบ |

### List Filters (`GET /loan-applications`)

| Param | คำอธิบาย |
|-------|---------|
| `branch_id` | กรองตามสาขา |
| `status` | `pending` / `approved` / `rejected` / `cancelled` |
| `finance_company_id` | กรองตามบริษัทไฟแนนซ์ |
| `customer_id` | กรองตามลูกค้า |
| `date_from`, `date_to` | ช่วงวันที่ยื่น (YYYY-MM-DD) |
| `search` | ค้นชื่อ/เบอร์ |
| `page`, `limit` | pagination |

### Create Body (`POST /loan-applications`)

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `branch_id` | ✅ | |
| `finance_company_id` | ✅ | dropdown `GET /finance-companies` |
| `applicant_name` | ✅ | ชื่อผู้กู้ |
| `amount_requested` | ✅ | ยอดที่ขอกู้ |
| `applied_date` | ✅ | วันที่ยื่น (YYYY-MM-DD) |
| `applicant_phone` | ❌ | เบอร์โทรผู้กู้ |
| `applicant_id_card` | ❌ | เลขบัตรประชาชนผู้กู้ |
| `down_payment` | ❌ | เงินดาวน์ |
| `customer_id` | ❌ | ผูกกับลูกค้าในระบบ |
| `vehicle_id` | ❌ | ผูกรถ |
| `quotation_id` | ❌ | ผูก QT |
| `invoice_id` | ❌ | ผูก Invoice |
| `note` | ❌ | |

**ส่ง guarantors พร้อมกัน create ได้:** `"guarantors": [{ "name": "...", "phone": "...", "id_card": "...", "relationship": "..." }]`

### Approve Body (`PATCH /loan-applications/{id}/approve`)

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `amount_approved` | ❌ | ยอดที่อนุมัติ |
| `approved_date` | ❌ | วันที่อนุมัติ (YYYY-MM-DD) |
| `loan_amount` | ❌ | ยอดเงินกู้ (หักดาวน์) |
| `interest_rate` | ❌ | ดอกเบี้ย % ต่อปี |
| `term_months` | ❌ | จำนวนงวด |
| `monthly_payment` | ❌ | ค่างวดต่อเดือน |
| `note` | ❌ | |

### Reject Body (`PATCH /loan-applications/{id}/reject`)

```json
{ "note": "เหตุผลที่ปฏิเสธ" }
```

### Cancel (`PATCH /loan-applications/{id}/cancel`)

ไม่ต้องส่ง body

### Add Guarantor Body (`POST /loan-applications/{id}/guarantors`)

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `name` | ✅ | ชื่อผู้ค้ำ |
| `phone` | ❌ | |
| `id_card` | ❌ | เลขบัตรประชาชน |
| `address` | ❌ | |
| `relationship` | ❌ | ความสัมพันธ์ เช่น `spouse`, `parent`, `sibling` |

### Upload Document Body (`POST /loan-applications/{id}/documents`)

ส่งเป็น `multipart/form-data`

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `file` | ✅ | ไฟล์เอกสาร (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX) |
| `document_type` | ✅ | ประเภทเอกสาร ดูค่าที่รองรับด้านล่าง |
| `file_name` | ❌ | ชื่อไฟล์ที่จะแสดง (ถ้าไม่ส่ง ใช้ชื่อไฟล์จริง) |
| `note` | ❌ | หมายเหตุ |

**`document_type` ที่รองรับ:**

| ค่า | คำอธิบาย |
|-----|---------|
| `id_card` | สำเนาบัตรประชาชน |
| `bank_statement` | Statement บัญชีธนาคาร (บช.) |
| `salary_slip` | สลิปเงินเดือน / หลักฐานรายได้ |
| `house_registration` | สำเนาทะเบียนบ้าน |
| `vehicle_registration` | สำเนาทะเบียนรถ |
| `other` | เอกสารอื่น ๆ |

### Status Flow

```
pending → approved
        → rejected
        → cancelled
```

---

## 15.2 สินเชื่อร้าน (Store Loans)

**Route:** `/store-loans`
**Permission:** `store_loans.can_view`
**เลขที่สัญญา:** `SL-{ปี}-{เลขลำดับ}` เช่น `SL-2026-0005`

**เมื่อไหร่ใช้?** — ลูกค้าผ่อนชำระกับทางร้านโดยตรง ร้านกำหนดเงื่อนไขเอง

### Endpoints

| Method | URL | Permission | คำอธิบาย |
|--------|-----|------------|---------|
| GET | `/store-loans` | `can_view` | รายการ |
| POST | `/store-loans` | `can_create` | สร้างสัญญา |
| GET | `/store-loans/{id}` | `can_view` | รายละเอียด |
| PATCH | `/store-loans/{id}/cancel` | `can_edit` | ยกเลิกสัญญา |
| GET | `/store-loans/{id}/calculate` | `can_view` | คำนวณ PMT (ก่อนสร้าง) |
| POST | `/store-loans/{id}/payments` | `can_edit` | บันทึกชำระงวด |
| GET | `/store-loans/{id}/payments` | `can_view` | ประวัติชำระ |
| GET | `/store-loans/{id}/documents` | `can_view` | รายการเอกสารแนบ |
| POST | `/store-loans/{id}/documents` | `can_edit` | อัปโหลดเอกสารแนบ |
| DELETE | `/store-loans/{id}/documents/{docId}` | `can_edit` | ลบเอกสารแนบ |

### List Filters (`GET /store-loans`)

| Param | คำอธิบาย |
|-------|---------|
| `branch_id` | กรองตามสาขา |
| `status` | `active` / `completed` / `overdue` / `cancelled` |
| `customer_id` | กรองตามลูกค้า |
| `search` | ค้นชื่อ/เบอร์ |
| `page`, `limit` | pagination |

### คำนวณค่างวดก่อนสร้าง (`GET /store-loans/{id}/calculate`)

⚠️ ส่ง **query string** (ไม่ใช่ body)

```
GET /store-loans/{id}/calculate?principal=60000&interest_rate=12&term_months=12
```

> ⚠️ `{id}` ต้องเป็นตัวเลข (route pattern บังคับ) แต่ค่า ID ไม่ถูกนำไปใช้ — ส่ง `0` หรือตัวเลขใดก็ได้

| Param | Required | คำอธิบาย |
|-------|----------|---------|
| `principal` | ✅ | ยอดเงินกู้ (หลังหักดาวน์) |
| `interest_rate` | ✅ | % ต่อปี |
| `term_months` | ✅ | จำนวนงวด |
| `start_date` | ❌ | วันชำระงวดแรก (YYYY-MM-DD) ถ้าไม่ส่งใช้วันที่ 1 ของเดือนถัดไป |

**Response:**
```json
{
  "summary": {
    "principal": 60000,
    "interest_rate": 12,
    "term_months": 12,
    "monthly_payment": 5330.07,
    "total_paid": 63960.84,
    "total_interest": 3960.84,
    "total_principal_paid": 60000,
    "first_payment_date": "2026-05-01",
    "last_payment_date": "2027-04-01"
  },
  "schedule": [
    {
      "installment": 1,
      "payment_date": "2026-05-01",
      "beginning_balance": 60000,
      "payment": 5330.07,
      "principal": 4730.07,
      "interest": 600.00,
      "ending_balance": 55269.93
    },
    {
      "installment": 2,
      "payment_date": "2026-06-01",
      "beginning_balance": 55269.93,
      "payment": 5330.07,
      "principal": 4777.37,
      "interest": 552.70,
      "ending_balance": 50492.56
    },
    "..."
  ]
}
```

| Field (summary) | คำอธิบาย |
|-----------------|---------|
| `monthly_payment` | ค่างวดคงที่ทุกเดือน (ยกเว้นงวดสุดท้ายอาจต่างเล็กน้อย) |
| `total_paid` | ยอดชำระรวมทั้งสัญญา |
| `total_interest` | ดอกเบี้ยรวมทั้งสัญญา |
| `total_principal_paid` | เงินต้นรวม |
| `first_payment_date` | วันชำระงวดที่ 1 |
| `last_payment_date` | วันชำระงวดสุดท้าย |

| Field (schedule แต่ละงวด) | คำอธิบาย |
|--------------------------|---------|
| `installment` | งวดที่ |
| `payment_date` | วันครบกำหนดชำระ |
| `beginning_balance` | ยอดหนี้ต้นงวด |
| `payment` | ค่างวด (เงินต้น + ดอกเบี้ย) |
| `principal` | ส่วนที่ตัดเงินต้น |
| `interest` | ส่วนที่เป็นดอกเบี้ย |
| `ending_balance` | ยอดหนี้คงเหลือหลังชำระ |

### Create Body (`POST /store-loans`)

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `branch_id` | ✅ | |
| `customer_id` | ✅ | |
| `customer_name` | ✅ | ชื่อลูกค้า (เก็บ snapshot) |
| `total_amount` | ✅ | ราคาสินค้า/บริการ |
| `interest_rate` | ✅ | % ต่อปี |
| `term_months` | ✅ | จำนวนงวด |
| `monthly_payment` | ✅ | ค่างวดต่อเดือน (ใช้ค่าจาก `/calculate`) |
| `start_date` | ✅ | วันเริ่มสัญญา (YYYY-MM-DD) |
| `next_due_date` | ✅ | วันครบกำหนดงวดแรก (YYYY-MM-DD) |
| `down_payment` | ❌ | เงินดาวน์ |
| `principal` | ❌ | ยอดกู้จริง (= `total_amount` − `down_payment`) ถ้าไม่ส่งระบบคำนวณเอง |
| `customer_phone` | ❌ | |
| `customer_id_card` | ❌ | |
| `invoice_id` | ❌ | ผูก Invoice |
| `note` | ❌ | |

### Record Payment Body (`POST /store-loans/{id}/payments`)

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `amount` | ✅ | จำนวนเงิน |
| `method` | ✅ | `cash` / `transfer` / `credit_card` / `cheque` |
| `reference_no` | ❌ | เลขอ้างอิงการโอน/เช็ค |
| `paid_at` | ❌ | วันเวลาชำระ (YYYY-MM-DDTHH:mm:ss) ถ้าไม่ส่งใช้เวลาปัจจุบัน |
| `receipt_url` | ❌ | URL ไฟล์สลิป/ใบเสร็จ |
| `note` | ❌ | |

### Upload Document Body (`POST /store-loans/{id}/documents`)

`Content-Type: multipart/form-data`

| Field | Required | คำอธิบาย |
|-------|----------|---------|
| `file` | ✅ | ไฟล์เอกสาร (PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX) |
| `document_type` | ❌ | `id_card` / `bank_statement` / `salary_slip` / `house_registration` / `vehicle_registration` / `other` (default: `other`) |
| `file_name` | ❌ | ชื่อไฟล์ที่ต้องการแสดง |
| `note` | ❌ | หมายเหตุ |

**Path บน DO Spaces:** `store-loans/{id}/documents/{hex}.{ext}`

### Status Flow

```
active → completed  (ชำระครบทุกงวด — อัตโนมัติ)
       → overdue    (Job 01:00 ทุกคืน — เลย due date ยังไม่ชำระ)
       → cancelled  (ยกเลิกโดยผู้จัดการ)
```

⚠️ **ไม่มี endpoint แก้ไขสัญญา** — ต้องยกเลิกแล้วสร้างใหม่หากเงื่อนไขเปลี่ยน

---

## 15.3 ค้นหาสินเชื่อ (Loan Search)

**API:** `GET /loans/search?q=<เบอร์หรือบัตรปชช.>`
**Permission:** `loan_applications.can_view`

⚠️ ใช้ **Elasticsearch 8** — ไม่ใช่ MySQL LIKE

**ทำไมถึงใช้ ES?**
- **ครอบคลุม** — ค้น 1 ครั้งได้ 3 อย่างพร้อมกัน (ผู้กู้ + ผู้ค้ำ + สินเชื่อร้าน) ถ้า MySQL ต้องยิง query แยก 3 ครั้ง
- **Partial match** — พิมพ์เบอร์ไม่ครบก็เจอ เช่น `081234` ค้นเจอ `0812345678` ได้ทันที
- **Score ranking** — ผลที่ match ดีกว่าขึ้นมาก่อน (เก็บ `score` ไว้ใน response)
- **Sync:** ทุก create/update loan หรือ guarantor → index เข้า ES ทันที (real-time)

- ค้นพร้อมกัน 3 index ใน request เดียว
- ค้นได้ทั้งเบอร์โทร และ เลขบัตรประชาชน ของทั้งผู้กู้และผู้ค้ำ

### Query Params

| Param | Required | คำอธิบาย |
|-------|----------|---------|
| `q` | ✅ | เบอร์โทร หรือ เลขบัตรประชาชน |

### Response Structure

```json
{
  "success": true,
  "data": {
    "as_applicant": [
      { "id": 1, "score": 9.2, "data": { ...loan_application fields... } }
    ],
    "as_guarantor": [
      { "id": 5, "score": 8.1, "data": { ...guarantor fields... } }
    ],
    "store_loans": [
      { "id": 3, "score": 7.5, "data": { ...store_loan fields... } }
    ]
  }..
}
```

- `as_applicant` — รายการที่คนนี้ยื่นขอสินเชื่อ
- `as_guarantor` — รายการที่คนนี้เป็นผู้ค้ำ (พร้อมข้อมูลว่าค้ำให้ใคร)
- `store_loans` — สินเชื่อร้านที่ตรงกับ phone/id_card

---

## ดูเพิ่มเติม
- [08-invoices.md](./08-invoices.md) — วิธีชำระผ่านไฟแนนซ์ / ผ่อนร้าน
- [17-settings.md](./17-settings.md) — จัดการบริษัทไฟแนนซ์ (Finance Companies)
- [20-flows.md](./20-flows.md) — Flow ไฟแนนซ์ + Flow Store Loan
