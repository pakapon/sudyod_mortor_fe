---
description: "Use when creating or editing ERP pages (list, detail, form). Enforces consistent page skeleton, filter/pagination behavior, actions, and UX states across modules."
applyTo: "src/pages/**"
---

# ERP Page Standards

## หน้า List (ทุก module)

โครงสร้างมาตรฐาน (เรียงจากบนลงล่าง):
1. **Page Header** — ชื่อหน้า (ภาษาไทย) + ปุ่ม action หลักอยู่ขวาบน (เช่น "สร้าง Role ใหม่")
2. **Filter/Search Bar** — search input + filter dropdowns ใน card/bar เดียวกัน
3. **Table** — พร้อม loading skeleton, empty state, error state เสมอ
4. **Pagination** — page, limit (default limit = 20)

**Query params มาตรฐานของ list API:**
- `search` — ค้นหาทั่วไป
- `page`, `limit` — pagination (default limit=20)
- `branch_id` — สาขา (ถ้า module รองรับ multi-branch)
- `is_active` — filter สถานะเปิด/ปิด (ถ้า module มี)
- `status` — filter workflow status (ถ้า module มี)

**Table columns มาตรฐาน:**
- คอลัมน์สุดท้ายเป็น action column (ขวาชิด) ประกอบด้วย icon-only buttons เท่านั้น
- ปุ่มแก้ไข: icon ดินสอ (pencil), `title="แก้ไข"` สี gray
- ปุ่มลบ: icon trash, `title="ลบ"` สี red
- ปุ่มกำหนดสิทธิ์/config: icon shield หรือ key, `title="กำหนดสิทธิ์"` สี red
- ขนาด icon button: `h-8 w-8` `rounded-md border`
- ห้ามใส่ label text บนปุ่ม action ใน table — ใช้ `title` attribute เป็น tooltip แทน

**Export button:** แสดงเฉพาะ permission `module.can_export` — เรียก `GET /resource/export`

## หน้า Detail (tab-based)

- ใช้ Tab layout เมื่อมีข้อมูลหลายหมวด
- Header แสดง: ชื่อเอกสาร/รายการ + status badge + ข้อมูลสรุปสำคัญ
- Action buttons แสดงตาม **status ปัจจุบัน + permission** — ไม่แสดงปุ่มที่ user ไม่มีสิทธิ์
- Tab "เอกสารที่เกี่ยวข้อง" — link ไปเอกสาร SO/QT/INV/DN/WR ที่ผูกกัน
- Tab "ประวัติ / Audit Log" — timeline การเปลี่ยน status + ผู้ทำ + เวลา

## หน้า Form (create/edit)

- ใช้ React Hook Form + Zod validation เสมอ
- แบ่ง fields เป็น **Sections** (card แต่ละ section) ตามหมวดข้อมูล
- Toggle `is_active` อยู่ **ขวาบน** ของ section header ที่เกี่ยวข้อง ไม่ใช่ท้ายฟอร์ม
- Autocomplete fields (ลูกค้า, สินค้า, พนักงาน) ใช้ `GET /resource?search=xxx`
- หลัง submit สำเร็จ → redirect ไปหน้า detail หรือ list ตาม flow

## Status Badge

status badge ของแต่ละ module ต้องใช้ mapping กลาง (label + Tailwind color class) ไม่ hardcode inline:

```ts
// ตัวอย่าง pattern mapping
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft:           { label: 'ร่าง',        color: 'bg-gray-100 text-gray-600' },
  pending_review:  { label: 'รอตรวจสอบ',   color: 'bg-yellow-100 text-yellow-700' },
  pending_quote:   { label: 'รอเสนอราคา',  color: 'bg-orange-100 text-orange-700' },
  approved:        { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
  in_progress:     { label: 'กำลังดำเนินการ', color: 'bg-purple-100 text-purple-700' },
  completed:       { label: 'เสร็จสิ้น',   color: 'bg-green-100 text-green-700' },
  pending_payment: { label: 'รอชำระ',       color: 'bg-red-100 text-red-700' },
  cancelled:       { label: 'ยกเลิก',       color: 'bg-gray-200 text-gray-500' },
  active:          { label: 'ใช้งาน',       color: 'bg-green-100 text-green-700' },
  inactive:        { label: 'ปิดใช้งาน',   color: 'bg-gray-100 text-gray-500' },
}
```

## ข้อกำหนดทั่วไป

- ข้อความใน UI ใช้ภาษาไทย ส่วนชื่อ variable/function ในโค้ดใช้ภาษาอังกฤษ
- Permission guard ทุกหน้า: ถ้าไม่มี `module.can_view` → redirect หรือแสดง 403
- ปุ่มสร้าง/แก้ไข/ลบ/export ต้อง check permission ก่อนแสดง
- ทุก list page รองรับ URL query params (search, filter) — สามารถ share link ได้
