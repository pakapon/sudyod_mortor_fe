# 🔐 Permission Flow — ฉบับสมบูรณ์

**ระบบสิทธิ์การเข้าถึง · Permission & Authentication Flow**
สุดยอดมอเตอร์ | รวม v1.0 + v2.0 | เมษายน 2026

---

## ภาพรวมระบบ

ระบบใช้ **PBAC (Permission-Based Access Control)** — กำหนดสิทธิ์ละเอียดระดับ module ต่อ action ต่อ role

**โครงสร้าง:**

```
Employee → employee_roles → Role → role_permissions
role_permissions เก็บ: module + can_view + can_create + can_edit + can_delete + can_approve + can_export
```

**★ v2.0: Permissions ไม่ฝังใน JWT — Query จาก DB + In-memory cache TTL 5 นาที**

---

## Login System

| รายการ | รายละเอียด |
|--------|-----------|
| วิธี Login | Email หรือ เบอร์โทรศัพท์ (auto-detect: มี @ = email) |
| ★ ไม่ใช้ username | ลบออกจาก schema แล้วตั้งแต่ v2.0 |
| JWT Payload | employee_id + branch_id เท่านั้น — ไม่ฝัง permissions |
| Token refresh | POST /auth/refresh-token |

**JWT Payload (v2.0):**

```json
{
  "sub": 42,
  "employee_id": 42,
  "branch_id": 1,
  "iat": 1712500000,
  "exp": 1712586400
}
```

> v1.0 ฝัง permissions map ใน JWT โดยตรง / v2.0 query DB + cache แทน

---

## Permission Check Flow

```
Request เข้า
  → JWT Middleware ตรวจ token (ดึง employee_id + branch_id)
  → Permission Middleware query DB (+ in-memory cache 5 min)
  → ตรวจ permissions[module][action] → 403 ถ้าไม่ผ่าน
  → ตรวจ branch_id ∈ accessible branches → 403 ถ้าข้ามสาขา
```

| ขั้น | ชื่อ | รายละเอียด |
|-----|-----|-----------|
| 1 | JWT Middleware | ตรวจ signature + expiry → decode → set employee_id, branch_id ใน context |
| 2 | Permission Middleware | query role_permissions จาก DB → ใช้ cache 5 นาที |
| 3 | Permission Check | ตรวจ permissions[module][action] = 1 → ผ่าน / = 0 → 403 Forbidden |
| 4 | Branch Check | ตรวจ branch_id อยู่ใน accessible branches → 403 ถ้าข้ามสาขา |
| 5 | Handler | รับ context ที่ผ่าน auth แล้ว → ดำเนินการต่อ |

**Cache Policy:**

| รายการ | รายละเอียด |
|--------|-----------|
| TTL | 5 นาที (in-memory) |
| Invalidate | ทันทีเมื่อแก้ไข role_permissions ของ employee คนนั้น |
| วัตถุประสงค์ | ลด DB load — ไม่ query DB ทุก request |

---

## 6 Permission Actions

| Permission | ความหมาย | HTTP Method |
|-----------|---------|------------|
| can_view | ดูรายการ / ดูรายละเอียด | GET (list + detail) |
| can_create | สร้าง record ใหม่ | POST |
| can_edit | แก้ไข record | PUT / PATCH |
| can_delete | ลบ record (soft delete) | DELETE |
| can_approve | อนุมัติ (เปลี่ยน status) | PATCH .../approve |
| can_export | Export ข้อมูล CSV/Excel/PDF | GET .../export |

> ถ้าไม่มี can_view → 403 แม้แต่จะเข้าหน้า list

---

## 33 Permission Modules (v2.0)

| # | Module | คำอธิบาย |
|---|--------|---------|
| 1 | branches | สาขา |
| 2 | dashboard | หน้าแดชบอร์ด |
| 3 | employees | พนักงาน |
| 4 | positions | ตำแหน่งงาน |
| 5 | roles | บทบาท / สิทธิ์ |
| 6 | work_schedules | ตารางเวลาทำงาน |
| 7 | attendance | เวลาทำงาน |
| 8 | holidays | วันหยุด |
| 9 | customers | ลูกค้า |
| 10 | vehicles | รถลูกค้า |
| 11 | vendors | ผู้จัดจำหน่าย |
| 12 | brands | แบรนด์ |
| 13 | product_categories | กลุ่มสินค้า |
| 14 | products | สินค้า / SKU |
| 15 | warehouses | คลังสินค้า |
| 16 | inventory | สต็อก |
| 17 | goods_receipts | ใบรับสินค้า |
| 18 | stock_transfers | โอนย้ายสินค้า |
| 19 | purchase_orders | ใบสั่งซื้อ |
| 20 | service_orders | ใบรับรถ |
| 21 | quotations | ใบเสนอราคา |
| 22 | deposits | มัดจำ |
| 23 | invoices | ใบแจ้งหนี้ |
| 24 | payments | การชำระเงิน |
| 25 | delivery_notes | ใบส่งมอบ |
| 26 | warranties | การรับประกัน |
| 27 | finance_companies | บริษัทไฟแนนซ์ |
| 28 | loan_applications | สินเชื่อไฟแนนซ์ |
| 29 | store_loans | สินเชื่อร้าน |
| 30 | product_units | หน่วยนับ / แบบสินค้า |
| 31 | notifications | การแจ้งเตือน |
| 32 | audit_logs | ประวัติการใช้งาน |
| 33 | vehicle_inspection_checklists | แม่แบบรายการตรวจสอบรถ |

**รวมทั้งหมด: 33 × 6 = 198 permissions per role**

---

## ตัวอย่าง Role และสิทธิ์หลัก

| Role | สิทธิ์หลัก |
|------|----------|
| ผู้จัดการสาขา | ดูได้ทุก module, อนุมัติได้ทุก module, export ได้ |
| บัญชี / การเงิน | ดู invoices/payments/loans ครบ, สร้าง/แก้ไข invoice, export ได้ |
| ช่าง (Technician) | ดู service_orders, สร้าง/แก้ไข quotation (service), อัปโหลด GPS photos |
| เซลล์ (Sales) | ดู customers/products/quotations, สร้าง quotation, ไม่เห็น invoices |
| คลังสินค้า | ครบทุก action ใน warehouses/goods_receipts/inventory/stock_transfers |
| HR | ดู/แก้ไข employees, positions, attendance |
| Admin ระบบ | ทุก action ทุก module รวมถึง roles management |

> ★ Role เหล่านี้เป็นตัวอย่าง — Admin สร้างเองได้ไม่จำกัด ไม่ hardcode

---

## Permission Matrix (5 Module หลัก)

✅ = มีสิทธิ์ | — = ไม่มีสิทธิ์

| Module | Action | ผู้จัดการ | ช่าง | เซลล์ | บัญชี | คลัง | Admin |
|--------|--------|----------|------|-------|-------|------|-------|
| customers | view | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| | create | ✅ | — | — | — | — | ✅ |
| | edit | ✅ | ✅ | ✅ | — | — | ✅ |
| | delete | ✅ | — | — | — | — | ✅ |
| | approve | — | — | — | — | — | ✅ |
| | export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| service_orders | view | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| | create | ✅ | ✅ | — | — | — | ✅ |
| | edit | ✅ | ✅ | — | — | — | ✅ |
| | delete | ✅ | — | — | — | — | ✅ |
| | approve | — | — | — | ✅ | — | ✅ |
| | export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| quotations | view | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| | create | ✅ | ✅ | ✅ | — | — | ✅ |
| | edit | ✅ | ✅ | ✅ | — | — | ✅ |
| | delete | ✅ | — | — | — | — | ✅ |
| | approve | — | — | — | ✅ | — | ✅ |
| | export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| invoices | view | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| | create | ✅ | — | — | ✅ | — | ✅ |
| | edit | ✅ | — | — | ✅ | — | ✅ |
| | delete | ✅ | — | — | — | — | ✅ |
| | approve | — | — | — | ✅ | — | ✅ |
| | export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory | view | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| | create | ✅ | ✅ | — | — | ✅ | ✅ |
| | edit | ✅ | — | — | — | ✅ | ✅ |
| | delete | ✅ | — | — | — | ✅ | ✅ |
| | approve | — | — | — | — | ✅ | ✅ |
| | export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## OTP Flow — Forgot Password (★ NEW)

ระบบส่ง OTP ผ่าน **THAIBULKSMS** สำหรับ forgot-password เท่านั้น (ไม่มี Push/LINE)

```
1. POST /auth/forgot-password { identifier: "0812345678" }
   → auto-detect (phone → SMS, email → email)
   → generate 6-digit OTP → hash → store otp_codes
   → send OTP via THAIBULKSMS HTTP API
   → response: 200 { message: "OTP sent" }

2. POST /auth/verify-otp { identifier: "0812345678", code: "123456" }
   → ค้น otp_codes ที่ยังไม่หมดอายุ (5 นาที) + ยังไม่ใช้
   → ตรวจ attempts < 5 → ถ้าผิด → attempts++ → 422
   → ถ้าถูก → set used_at → generate reset_token (temporary JWT 15 นาที)
   → response: 200 { reset_token: "xxx" }

3. POST /auth/reset-password { reset_token: "xxx", new_password: "xxx" }
   → verify reset_token → เปลี่ยน password_hash
   → invalidate ทุก session ของ employee
   → response: 200 { message: "Password changed" }
```

**Security Rules:**
| กฎ | รายละเอียด |
|----|-----------|
| OTP หมดอายุ | 5 นาที |
| ลองผิดสูงสุด | 5 ครั้งต่อ OTP |
| Rate limit | 1 OTP ต่อเบอร์ ต่อ 60 วินาที |
| OTP เก่ายังไม่หมดอายุ | ใช้ตัวเดิม ไม่ส่งใหม่ |

**otp_codes table (★ NEW):**
| Field | Type | คำอธิบาย |
|-------|------|---------|
| id | BIGINT PK | auto-increment |
| identifier | VARCHAR(100) | เบอร์โทร หรือ email |
| code | VARCHAR(6) | 6-digit OTP (hashed) |
| purpose | VARCHAR(20) | `forgot_password` |
| expires_at | DATETIME | หมดอายุ 5 นาที |
| used_at | DATETIME NULL | เวลาใช้สำเร็จ |
| attempts | INT DEFAULT 0 | จำนวนครั้งที่ลองผิด (max 5) |
| created_at | DATETIME | |

---

## API Endpoints — Auth & Permission

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| POST | /auth/login | Login ด้วย email หรือ phone |
| POST | /auth/logout | Logout |
| POST | /auth/refresh-token | Refresh JWT |
| GET | /auth/me | ดูข้อมูลตัวเอง |
| PUT | /auth/change-password | เปลี่ยนรหัสผ่าน |
| POST | /auth/forgot-password | ★ ส่ง OTP ผ่าน THAIBULKSMS |
| POST | /auth/verify-otp | ★ ตรวจ OTP → return reset_token |
| POST | /auth/reset-password | ★ ตั้งรหัสใหม่ (ต้องมี reset_token) |
| GET | /auth/sessions | ดู sessions/devices |
| DELETE | /auth/sessions/:id | Kick session ออก |
| GET/POST | /roles | จัดการ Role |
| GET/PUT | /roles/:id/permissions | แก้ไข permissions ของ role |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| Permissions ไม่ใน JWT | query DB + cache 5 min — ไม่ฝังใน token (v2.0) |
| Invalidate cache ทันที | เมื่อแก้ไข permissions — ไม่รอ TTL |
| Branch Isolation | ทุก request ตรวจ branch_id อยู่ใน accessible branches |
| No username | login ด้วย email หรือ phone เท่านั้น |
| Role สร้างได้เอง | Admin สร้าง Role ได้ไม่จำกัด — ไม่ hardcode |
| Soft Delete | พนักงานถูกลบ = deleted_at ≠ NULL — token หมดอายุตาม exp |
| 198 permissions | 33 module × 6 action = 198 permission points ต่อ role |

---

*สุดยอดมอเตอร์ — Permission Flow (รวม v1.0+v2.0) | เมษายน 2026*
