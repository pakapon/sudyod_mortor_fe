# 📷 GPS Photo Flow — ฉบับสมบูรณ์

**ระบบภาพถ่าย GPS · GPS Photo Flow**
สุดยอดมอเตอร์ | รวม v1.0 + v1.1 + v2.0 | เมษายน 2026

---

## ภาพรวมระบบ

ระบบ GPS Photo บันทึกภาพถ่ายพร้อม watermark อัตโนมัติสำหรับแต่ละจุดใน Service Order ทุกภาพต้องผูกกับ service_order_id เสมอ ไม่มีภาพลอย (orphan photo) และ watermark ทำฝั่ง server เท่านั้น

**ระบบมี 2 Scenario ตามวิธีอัปโหลด:**

```
Scenario A — ถ่ายจากแอปโดยตรง → GPS อัตโนมัติ
Scenario B — อัปโหลดภาพจาก camera roll → กรอก GPS เอง
```

---

## ประเภทภาพ 5 ชนิด (Photo Types)

| type | ชื่อ | ผู้ถ่าย | SO Status | บังคับ? |
|------|-----|--------|-----------|---------|
| **pre_intake** | ภาพรับรถ — สภาพก่อนเข้าอู่ | พนักงาน | draft | ★ บังคับก่อน draft→pending_review |
| **damage_spot** | ภาพจุดที่เสียหาย | ช่าง | pending_quote | แนะนำ |
| **pre_repair** | ภาพก่อนลงมือซ่อม | ช่าง | in_progress | แนะนำ |
| **pre_delivery** | ภาพหลังซ่อมเสร็จ | ช่าง | completed | แนะนำ |
| **delivery** | ภาพส่งมอบรถจริง | พนักงาน | pending_pickup | ★ บังคับก่อน pending_pickup→closed |

> ★ pre_intake ต้องถ่ายก่อน SO เปลี่ยนจาก draft → pending_review ได้
> ★ delivery ต้องถ่ายก่อน SO เปลี่ยนจาก pending_pickup → closed ได้

---

## ฟิลด์บังคับใน gps_photos table

| Field | Type | คำอธิบาย |
|-------|------|---------|
| service_order_id | BIGINT NOT NULL | ผูกกับใบรับรถเสมอ — FK → service_orders |
| type | VARCHAR(20) | pre_intake / damage_spot / pre_repair / pre_delivery / delivery |
| latitude | DECIMAL(10,7) | พิกัด GPS ณ เวลาถ่าย |
| longitude | DECIMAL(10,7) | พิกัด GPS ณ เวลาถ่าย |
| taken_at | DATETIME | เวลาที่ถ่าย ICT (ไม่มี Z) — จากอุปกรณ์หรือกรอกเอง |
| photo_url | VARCHAR(500) | ★ URL เดียว — watermarked image (ไม่เก็บ original) |
| note | TEXT | หมายเหตุเพิ่มเติม (optional) |
| deleted_at | DATETIME | Soft delete |

---

## Scenario A — ถ่ายภาพจากแอปโดยตรง

```
App ถ่ายภาพ (GPS auto) → Server รับ → Watermark → DO Spaces → DB gps_photos
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Input** | multipart/form-data: photo(file), type, latitude, longitude, taken_at, note(opt) |
| **Server Steps** | 1.Validate JWT+permission → 2.ตรวจ service_order_id → 3.ตรวจ SO.status ตรงกับ type → 4.อ่านไฟล์ → 5.Stamp watermark → 6.Upload watermarked → DO Spaces → 7.บันทึก photo_url |
| **GPS** | auto จากอุปกรณ์มือถือ |
| **taken_at** | auto จากอุปกรณ์ — format: YYYY-MM-DDTHH:mm:ss (ICT ไม่มี Z) |

**ตัวอย่าง Scenario A — pre_intake รับรถ Honda Wave:**

| ขั้น | ข้อมูล | รายละเอียด |
|-----|--------|-----------|
| ① ถ่ายภาพ | แอปมือถือ | ช่างถ่ายรูปรถ Honda Wave ตอนรับเข้าซ่อม — type=pre_intake |
| ② GPS | 13.7231N 100.5268E | แอปส่ง latitude=13.7231417, longitude=100.5268370 |
| ③ taken_at | 2026-04-09T10:35:22 | เวลาถ่ายจากอุปกรณ์ — ICT ไม่มี Z |
| ④ Watermark | server-side | "13.7231N 100.5268E | 09/04/2026 10:35:22 | SO-2026-0042 | สาขา A" |
| ⑤ DO Spaces | service-orders/42/ | wm_a3f1c2.jpg (watermarked only) |
| ⑥ DB | gps_photos.id=81 | photo_url=.../wm_a3f1c2.jpg |

---

## Scenario B — อัปโหลดภาพที่ถ่ายไว้ก่อน

```
เลือกภาพ (camera roll) → กรอก GPS manual → Server รับ → Watermark → DO Spaces → DB
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| **Input** | multipart/form-data: photo(file), type, latitude, longitude, taken_at — ทุก field บังคับ |
| **GPS** | manual — กรอกพิกัดปัจจุบันหรือพิกัดสาขา |
| **taken_at** | manual — ดูจาก EXIF metadata ของไฟล์ หรือกรอกเอง |
| **ข้อแตกต่าง** | taken_at อาจต่างจากเวลา upload — server ใช้ taken_at ที่รับมาเสมอ |
| **ขั้นตอน server** | เหมือน Scenario A ทุกขั้นตอนหลังรับ input |

**ตัวอย่าง Scenario B — delivery ส่งมอบรถ:**

| ขั้น | ข้อมูล | รายละเอียด |
|-----|--------|-----------|
| ① เลือกภาพ | camera roll | รูปรถก่อนส่งมอบ type=delivery — ถ่ายไว้ก่อนหน้า |
| ② กรอก GPS | 13.7231, 100.5268 | กรอก latitude, longitude ของสาขา |
| ③ taken_at | 2026-04-11T15:30:00 | ดูจาก metadata ภาพ หรือกรอกเอง |
| ④ Watermark | server-side | stamp ด้วยค่าที่ส่งมาเหมือน Scenario A |
| ⑤ DO Spaces | service-orders/42/ | wm_b9f2e1.jpg (watermarked only) |
| ⑥ DB | gps_photos.id=99 | photo_url=.../wm_b9f2e1.jpg |

---

## Watermark Specification

**เนื้อหา 4 บรรทัด:**

| บรรทัด | เนื้อหา | ตัวอย่าง |
|--------|--------|---------|
| 1 | พิกัด GPS | 13.7231N  100.5268E |
| 2 | วันที่ + เวลา (DD/MM/YYYY HH:mm:ss) | 09/04/2026  10:35:22 |
| 3 | เลขที่ใบรับรถ | SO-2026-0042 |
| 4 | ชื่อสาขา | สาขา A — สุดยอดมอเตอร์ |

**Style:**

| รายการ | รายละเอียด |
|--------|-----------|
| ตำแหน่ง | มุมล่างซ้าย (bottom-left) ของภาพ |
| พื้นหลัง | แถบดำ semi-transparent ~60% ใต้ข้อความ |
| สี text | ขาว (#FFFFFF) มี shadow ดำ |
| Library | PHP: Intervention Image v3 (GD driver) |
| ทำฝั่ง | Server เท่านั้น — ห้าม client stamp |

---

## DO Spaces File Path

| ไฟล์ | Path |
|------|------|
| watermarked image | service-orders/{so_id}/gps-photos/wm_{uuid}.jpg |
| CDN prefix | https://baseocppimage.sgp1.cdn.digitaloceanspaces.com/ |

> ★ ชื่อไฟล์ใช้ UUID ป้องกัน collision — เก็บ URL เดียว (watermarked) ใน DB เสมอ ไม่เก็บ original

---

## Status → Photo Type Mapping

| SO Status | Photo Type ที่อนุญาต | หมายเหตุ |
|-----------|---------------------|---------|
| draft | pre_intake | ★ บังคับก่อนออกจาก draft |
| pending_quote | damage_spot | ช่างถ่ายจุดเสียหาย |
| in_progress | pre_repair | ก่อนลงมือซ่อม |
| completed | pre_delivery | หลังซ่อมเสร็จ |
| pending_pickup | delivery | ★ บังคับก่อนปิด |

> Server ตรวจ SO.status ก่อนรับภาพ — reject ถ้า status ไม่ตรงกับ photo type

---

## API Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| POST | /service-orders/:id/gps-photos | upload รูป GPS (5 types) |
| GET | /service-orders/:id/gps-photos | รายการภาพ (filter: ?type=pre_intake) |
| DELETE | /gps-photos/:id | Soft Delete (deleted_at) |

---

## สรุปเปรียบเทียบ 2 Scenarios

| รายการ | Scenario A (ถ่ายจากแอป) | Scenario B (อัปโหลด) |
|--------|------------------------|---------------------|
| วิธีอัปโหลด | ถ่ายจากแอปโดยตรง | ภาพจาก camera roll |
| GPS | auto จากอุปกรณ์ | manual กรอก |
| taken_at | auto จากอุปกรณ์ | manual กรอก |
| Watermark | server-side | server-side |
| DO Spaces | wm only (single URL) | wm only (single URL) |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| ผูก SO เสมอ | ทุกรูปต้องมี service_order_id — ไม่มี orphan photo |
| Server ตรวจ Status | reject ถ้า SO.status ไม่ตรงกับ photo type |
| pre_intake บังคับ | ≥ 1 รูป ก่อน draft→pending_review |
| delivery บังคับ | ≥ 1 รูป ก่อน pending_pickup→closed |
| Watermark server only | ห้าม client stamp — server ทำให้เสมอ |
| เก็บ URL เดียว | photo_url (watermarked) — ไม่เก็บ original → ประหยัด storage |
| ICT timezone | taken_at ไม่มี Z — เป็น Asia/Bangkok โดยตรง |
| UUID filename | ป้องกัน collision — ไม่ซ้ำกัน |
| Soft Delete | deleted_at field — ไม่ hard delete — เก็บเป็นหลักฐาน |
| Format | JPEG / PNG เท่านั้น — max 10 MB ต่อไฟล์ |

---

*สุดยอดมอเตอร์ — GPS Photo Flow (รวม v1.0+v1.1+v2.0) | เมษายน 2026*
