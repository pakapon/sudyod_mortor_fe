# 👤 Customer & Vehicles Flow — ฉบับสมบูรณ์

**ระบบลูกค้าและรถยนต์ · Customer & Vehicles Flow**
สุดยอดมอเตอร์ | สังเคราะห์จาก API Design v1.1 + v2.0 + System Overview v2.0 | เมษายน 2026

---

## ภาพรวมระบบ

ระบบลูกค้ารองรับทั้ง **บุคคลธรรมดา** และ **นิติบุคคล** ในหน้าจอเดียวกัน 1 ลูกค้ามีได้หลายเบอร์โทร หลายรถ และมีแท็บประวัติครบทุกอย่างในที่เดียว

```
Customer (ลูกค้า)
  ├── phones[]        — เบอร์โทรหลายเบอร์
  ├── documents[]     — เอกสารแนบ (สัญญา, สำเนาบัตร ฯลฯ)
  ├── timeline[]      — บันทึกเหตุการณ์ ("โทรติดตาม", "นัดนำรถเข้า")
  └── vehicles[]      — รถของลูกค้า (1 คันขึ้นไป)
        └── service_orders[] — ประวัติซ่อมต่อรถแต่ละคัน
```

---

## ประเภทลูกค้า (Customer Type)

| type | ชื่อ | ข้อมูลพิเศษ |
|------|-----|-----------|
| **personal** | บุคคลธรรมดา | prefix (นาย/นาง/นางสาว), first_name, last_name, id_card |
| **corporate** | นิติบุคคล | บริษัท/ห้างหุ้นส่วน, tax_id, ที่อยู่ออกใบกำกับภาษี, ผู้ติดต่อหลาย-คน, สาขาบริษัท |

---

## Schema หลัก — customers table

| Field | Type | Required | คำอธิบาย |
|-------|------|---------|---------|
| `type` | ENUM | ✅ | personal / corporate |
| `prefix` | VARCHAR | ✅ | นาย / นาง / นางสาว / บริษัท / ห้างหุ้นส่วน |
| `first_name` | VARCHAR | ✅ | ชื่อ (บุคคล) หรือชื่อบริษัท (นิติบุคคล) |
| `last_name` | VARCHAR | — | นามสกุล (บุคคลเท่านั้น) |
| `id_card` | VARCHAR | — | เลขบัตรปชช. (บุคคล) / เลขทะเบียนนิติบุคคล |
| `tax_id` | VARCHAR | — | เลขประจำตัวผู้เสียภาษี (นิติบุคคล) |
| `email` | VARCHAR | — | อีเมล |
| `line_id` | VARCHAR | — | LINE ID |
| `address` | VARCHAR(500) | — | ที่อยู่ |
| `province` | VARCHAR(100) | — | จังหวัด |
| `district` | VARCHAR(100) | — | อำเภอ/เขต |
| `sub_district` | VARCHAR(100) | — | ตำบล/แขวง |
| `postal_code` | VARCHAR(10) | — | รหัสไปรษณีย์ |
| `note` | TEXT | — | หมายเหตุ |
| `photo_url` | VARCHAR | — | URL รูปโปรไฟล์ |
| `is_active` | BOOLEAN | ✅ | สถานะ active/inactive |
| `branch_id` | BIGINT | ✅ | FK → branches (สาขาที่ลูกค้าสังกัด) |
| `deleted_at` | DATETIME | — | Soft delete |

---

## Schema — customer_billing_addresses table (★ NEW — นิติบุคคล)

| Field | Type | Required | คำอธิบาย |
|-------|------|---------|----------|
| `id` | BIGINT PK | ✅ | auto-increment |
| `customer_id` | BIGINT | ✅ | FK → customers |
| `label` | VARCHAR(100) | ✅ | เช่น "สำนักงานใหญ่", "สาขาที่ 2" |
| `address` | VARCHAR(500) | ✅ | ที่อยู่ออกบิล |
| `province` | VARCHAR(100) | ✅ | จังหวัด |
| `district` | VARCHAR(100) | ✅ | อำเภอ/เขต |
| `sub_district` | VARCHAR(100) | ✅ | ตำบล/แขวง |
| `postal_code` | VARCHAR(10) | ✅ | รหัสไปรษณีย์ |
| `is_default` | BOOLEAN | ✅ | ที่อยู่หลัก (default false) |
| `created_at` | DATETIME | ✅ | |
| `updated_at` | DATETIME | ✅ | |

> ★ 1 นิติบุคคล มีได้หลายที่อยู่ออกบิล — billing fields ย้ายจาก customers table มาที่นี่

---

## Schema — customer_phones table (เบอร์โทรหลายเบอร์)

| Field | Type | คำอธิบาย |
|-------|------|---------|
| `customer_id` | BIGINT | FK → customers |
| `type` | VARCHAR | มือถือ / บ้าน / ที่ทำงาน |
| `number` | VARCHAR | เบอร์โทร |
| `is_primary` | BOOLEAN | เบอร์หลัก (ใช้ค้นหาและแสดงก่อน) |

> 1 ลูกค้ามีได้หลายเบอร์ — เบอร์ primary ใช้ค้นหาด่วนหน้าร้าน

---

## Schema — customer_vehicles table (รถลูกค้า)

| Field | Type | Required | คำอธิบาย |
|-------|------|---------|---------|
| `customer_id` | BIGINT | ✅ | FK → customers |
| `plate_number` | VARCHAR | ✅ | ทะเบียนรถ |
| `brand` | VARCHAR | — | ยี่ห้อ เช่น Honda, Toyota, Yamaha |
| `model` | VARCHAR | — | รุ่น เช่น Wave 125, Camry, N-MAX |
| `year` | YEAR | — | ปีรถ เช่น 2023 |
| `color` | VARCHAR | — | สี |
| `engine_number` | VARCHAR | — | เลขเครื่อง |
| `chassis_number` | VARCHAR | — | เลขตัวถัง |
| `current_mileage` | INT | — | เลขไมล์ปัจจุบัน (อัปเดตทุกครั้งที่นำรถเข้าซ่อม) |
| `last_service_date` | DATE | — | วันที่ซ่อมล่าสุด |
| `note` | TEXT | — | หมายเหตุ เช่น "รถบริษัท สีเทาอ่อน" |
| `is_purchased_here` | BOOLEAN | — | ซื้อจากร้านนี้หรือเปล่า |
| `deleted_at` | DATETIME | — | Soft delete |

> ★ รถที่ **ไม่ได้ซื้อจากร้าน** ก็เก็บประวัติซ่อมได้ — `is_purchased_here=false`

---

## แท็บประวัติลูกค้า (Customer History Tabs)

| แท็บ | Endpoint | รายละเอียดที่แสดง |
|-----|---------|-----------------|
| **ประวัติการซื้อ** | `GET /customers/:id/purchase-history` | ใบเสนอราคา/ใบแจ้งหนี้ประเภท sale — สินค้าที่เคยซื้อ ราคา วันที่ |
| **ประวัติการซ่อม** | `GET /customers/:id/service-history` | SO ทุกใบ — วันที่, รถ, อาการ, สถานะ, ราคา |
| **ประวัติการรับประกัน** | `GET /customers/:id/warranty-history` | ใบรับประกันที่ยังมีผล + หมดอายุ |
| **การเงิน / ใบเสร็จ** | `GET /customers/:id/invoices` | ใบแจ้งหนี้, ยอดค้างชำระ, ใบเสร็จ |
| **เอกสารแนบ** | `GET /customers/:id/documents` | ไฟล์แนบ: สำเนาบัตร, สัญญา, ใบอนุญาต |
| **ไทม์ไลน์** | `GET /customers/:id/timeline` | บันทึกเหตุการณ์: "โทรติดตาม", "นัดนำรถเข้า 15/04" |

---

## Scenario A — สร้างลูกค้าใหม่ (บุคคลธรรมดา)

```
กรอกข้อมูลลูกค้า → เพิ่มเบอร์โทร → บันทึก → เพิ่มรถ (ถ้ามี)
```

**ตัวอย่าง — นายสมชาย นำรถ Honda Wave เข้าซ่อมครั้งแรก:**

| ขั้น | ข้อมูล | รายละเอียด |
|-----|--------|-----------|
| **① สร้างลูกค้า** | POST /customers | type=personal, prefix="นาย", first_name="สมชาย", last_name="มีสุข" |
| **② เบอร์โทร** | phones[] | { type="มือถือ", number="081-234-5678", is_primary=true } |
| **③ บันทึก** | customers.id=125 | branch_id=1, is_active=true |
| **④ เพิ่มรถ** | POST /customers/125/vehicles | plate="กข 1234 กรุงเทพ", brand="Honda", model="Wave 125", year=2022, color="แดง" |
| **⑤ รถบันทึก** | vehicles.id=88 | customer_id=125, is_purchased_here=false |

---

## Scenario B — สร้างลูกค้าใหม่ (นิติบุคคล)

**ตัวอย่าง — บริษัท ABC จำกัด ส่งรถบริษัทมาซ่อม:**

| ขั้น | ข้อมูล | รายละเอียด |
|-----|--------|-----------|
| **① สร้างลูกค้า** | POST /customers | type=corporate, prefix="บริษัท", first_name="ABC จำกัด" |
| **② ข้อมูลภาษี** | tax_id, address | tax_id="0105XXXXXXXXX", address="123 ถ.สุขุมวิท" province="กรุงเทพ" |
| **③ ผู้ติดต่อ** | phones[] | { type="ที่ทำงาน", number="02-XXX-XXXX" }, { type="มือถือ", number="081-XXX-XXXX" } |
| **④ เพิ่มรถ** | POST /customers/126/vehicles | plate="บจ 9999 กรุงเทพ", brand="Toyota", model="Camry", year=2024, is_purchased_here=false |
| **⑤ note** | vehicles.note | "รถบริษัท — ติดต่อคุณวิชัย 081-XXX-XXXX" |

---

## Scenario C — ค้นหาลูกค้าที่มีอยู่แล้ว

```
พนักงานรับรถ → ค้นหาลูกค้า → พบ → เลือก → สร้าง SO ผูกลูกค้า + รถได้ทันที
```

| ค้นหาด้วย | หมายเหตุ |
|----------|---------|
| ชื่อ / นามสกุล | partial match |
| เบอร์โทร | ค้นจาก customer_phones |
| อีเมล | exact match |
| ทะเบียนรถ | ค้นจาก customer_vehicles |

> GET `/customers?search=081-234-5678` → คืน customers ที่มีเบอร์นี้

---

## Scenario D — เพิ่มรถคันใหม่ให้ลูกค้าเดิม

```
ลูกค้าเดิม customers.id=125 → นำรถคันที่ 2 มาซ่อม → เพิ่ม vehicle ใหม่
```

**ตัวอย่าง:**

| ขั้น | รายละเอียด |
|-----|-----------|
| **① ค้นหา** | search "สมชาย" หรือ "081-234-5678" → พบ id=125 |
| **② ดูรถ** | GET /customers/125/vehicles → มี Honda Wave id=88 |
| **③ เพิ่มรถใหม่** | POST /customers/125/vehicles: plate="ขค 5678", brand="Yamaha", model="N-MAX 155" |
| **④ สร้าง SO** | ใช้ customer_id=125, vehicle_id=91 (รถใหม่) |

---

## Timeline — บันทึกเหตุการณ์

Timeline ใช้เพื่อบันทึกการติดตามลูกค้า เช่น โทรหา, นัดหมาย, โน้ตพิเศษ

| Field | คำอธิบาย |
|-------|---------|
| `customer_id` | FK → customers |
| `event_type` | call / appointment / note / other |
| `description` | รายละเอียด เช่น "โทรติดตามอาการหลังซ่อม ลูกค้าพอใจ" |
| `event_date` | วันที่เกิดเหตุการณ์ |
| `created_by` | employee_id ที่บันทึก |

---

## API Endpoints

**Customers:**

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/customers` | รายการลูกค้า (search, filter type/status, paginate) |
| POST | `/customers` | สร้างลูกค้าใหม่ (personal/corporate) |
| GET | `/customers/:id` | ข้อมูลลูกค้ารายบุคคล |
| PUT | `/customers/:id` | แก้ไขข้อมูลลูกค้า |
| DELETE | `/customers/:id` | Soft Delete (ต้องตรวจก่อน) |
| PATCH | `/customers/:id/status` | เปิด/ปิดใช้งาน |
| GET | `/customers/export` | Export CSV |
| GET | `/customers/summary` | Summary Cards (ทั้งหมด/ใหม่เดือนนี้/Active) |

**Customer Sub-resources:**

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET/POST | `/customers/:id/phones` | เบอร์โทร |
| GET/POST | `/customers/:id/documents` | เอกสารแนบ |
| DELETE | `/customers/:id/documents/:doc_id` | ลบเอกสาร |
| GET/POST | `/customers/:id/timeline` | บันทึกเหตุการณ์ |
| GET | `/customers/:id/billing-addresses` | ★ ที่อยู่ออกบิล (corporate) |
| POST | `/customers/:id/billing-addresses` | ★ เพิ่มที่อยู่ออกบิล |
| PUT | `/customers/:id/billing-addresses/:aid` | ★ แก้ไขที่อยู่ออกบิล |
| GET | `/customers/:id/purchase-history` | ประวัติการซื้อ |
| GET | `/customers/:id/service-history` | ประวัติการซ่อม |
| GET | `/customers/:id/warranty-history` | ประวัติใบรับประกัน |
| GET | `/customers/:id/invoices` | ประวัติการเงิน |

**Vehicles:**

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/customers/:id/vehicles` | รายการรถของลูกค้า |
| POST | `/customers/:id/vehicles` | เพิ่มรถใหม่ |
| GET | `/customers/:id/vehicles/:vid` | รายละเอียดรถ + ประวัติซ่อมของรถคันนั้น |
| PUT | `/customers/:id/vehicles/:vid` | แก้ไขข้อมูลรถ |
| DELETE | `/customers/:id/vehicles/:vid` | Soft Delete รถ |

---

## Query Parameters — GET /customers

| Parameter | Type | คำอธิบาย |
|-----------|------|---------|
| `search` | string | ค้นหาจาก ชื่อ / เบอร์โทร / อีเมล / ทะเบียนรถ |
| `type` | string | personal / corporate |
| `status` | string | active / inactive / all |
| `date_from` | YYYY-MM-DD | วันที่สร้างเริ่มต้น |
| `date_to` | YYYY-MM-DD | วันที่สร้างสิ้นสุด |
| `sort` | string | updated_at / created_at / first_name |
| `order` | string | asc / desc |
| `page` | number | default 1 |
| `limit` | number | default 10 |

---

## Dashboard Summary Cards

| ข้อมูล | คำอธิบาย |
|--------|---------|
| ลูกค้าทั้งหมด | จำนวน customers ทั้งหมดใน branch |
| ลูกค้าใหม่เดือนนี้ | created_at >= ต้นเดือน |
| ลูกค้า Active | is_active=true |
| ลูกค้าค้างชำระ | มี invoice.status=overdue |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| **ชื่อ + เบอร์ไม่ซ้ำ** | first_name + phone (primary) ต้องไม่ซ้ำในระบบ |
| **ห้ามลบถ้ามีประวัติ** | ลูกค้าที่มี SO หรือ invoice.status=overdue ห้าม hard delete |
| **Soft Delete** | deleted_at field — ข้อมูลยังอยู่ใน DB |
| **รถไม่ต้องซื้อจากร้าน** | is_purchased_here=false ก็เก็บประวัติซ่อมได้ |
| **1 ลูกค้า หลายรถ** | ไม่จำกัดจำนวนรถต่อลูกค้า |
| **Branch Isolation** | ลูกค้าผูก branch_id — ข้ามสาขาได้ถ้ามี permission |
| **ค้นหา realtime** | search ด้วย ชื่อ / เบอร์ / อีเมล / ทะเบียนรถ |
| **Export ได้** | Export รายชื่อลูกค้าเป็น CSV |
| **Timeline ไม่ลบ** | timeline records ไม่ hard delete — ประวัติการติดต่อต้องเก็บตลอด |
| **Corporate ออกใบกำกับ** | นิติบุคคล ต้องมี tax_id + address สำหรับออกใบกำกับภาษี |

---

*สุดยอดมอเตอร์ — Customer & Vehicles Flow (สังเคราะห์จาก API v1.1+v2.0+System Overview v2.0) | เมษายน 2026*
