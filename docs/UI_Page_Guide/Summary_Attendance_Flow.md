# 🕐 Attendance Flow — ฉบับสมบูรณ์

**ระบบเวลาทำงาน · Attendance & Work Schedule Flow**
สุดยอดมอเตอร์ | Version 1.0 | เมษายน 2026

---

## ภาพรวมระบบ

ระบบมี 4 Scenario ตามสถานะการเข้างาน:

| Scenario | status | ความหมาย |
|---------|--------|---------|
| 🟢 A | normal | Check-in / Check-out ปกติ — เข้างานทัน |
| 🟡 B | late | เข้างานสาย — เกิน scheduled_start + grace period |
| 🔴 C | absent | ขาดงาน — Job auto-mark 23:59 / HR override ได้ |
| 🔵 D | holiday | วันหยุด — ระบบ mark อัตโนมัติ ปิด check-in |

---

## 4 ตารางหลักในระบบ

| ตาราง | คำอธิบาย | Key Fields |
|-------|---------|-----------|
| work_schedules | ตาราง schedule — ผูก position (template) หรือ employee (override) | owner_type, owner_id, login_start_time, login_end_time |
| work_schedule_days | รายละเอียดรายวัน 7 rows ต่อ schedule (จ-อา) | day(0–6), start_time, end_time, is_day_off |
| employee_schedule_overrides | ★ Override รายคนรายวัน (temp schedule) | employee_id, override_date, start_time, end_time, is_day_off |
| holidays | วันหยุดนักขัตฤกษ์ / พิเศษ — กำหนดล่วงหน้ารายปี | branch_id(NULL=ทุกสาขา), date, name, is_active |
| attendance | บันทึกการเข้า-ออกงานรายคนรายวัน | employee_id, date, check_in_time, check_out_time, status, late_minutes, **scheduled_start**, **scheduled_end** |

---

## Work Schedule — ลำดับความสำคัญ

| ลำดับ | owner_type | ความหมาย |
|------|-----------|---------|
| ⬆ ใช้ก่อน | employee | Override รายคน — กำหนดเฉพาะพนักงานที่มีตารางพิเศษ |
| ⬇ fallback | position | Template ของตำแหน่ง — พนักงานทุกคนใน position นั้น inherit |

---

## ประเภท Status ใน attendance

| status | ความหมาย | check_in | late_minutes | สร้างโดย |
|--------|---------|---------|-------------|---------|
| normal | เข้างานทัน (≤ scheduled_start + grace) | ✓ | 0 | พนักงาน check-in |
| late | เข้างานสาย (> scheduled_start + grace) | ✓ | > 0 | พนักงาน check-in |
| absent | ไม่มาทำงาน ไม่ check-in | — | 0 | Job 23:59 auto |
| holiday | วันหยุด (holidays table หรือ is_day_off=1) | — | 0 | Job auto |

---

## Scenario A — Check-in / Check-out ปกติ

```
Login JWT → ดึง Schedule (override→fallback) → ตรวจ Holiday → ตรวจ Window → Check-in normal → Check-out (คำนวณ work_min)
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| เงื่อนไข status=normal | check_in_time ≤ scheduled_start + 15 นาที (grace period default) |
| scheduled_start/end | snapshot จาก work_schedule_days ของวันนั้น — บันทึกใน attendance record |
| scheduled_start/end | snapshot จาก work_schedule_days ของวันนั้น — บันทึกใน attendance record |
| late_minutes | 0 |
| work_minutes | TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) |
| allowed_ip_range | NULL = ไม่จำกัด IP / ตั้งค่าเป็น CIDR เช่น 192.168.1.0/24 |

**ตัวอย่าง Scenario A — นายสมชาย ช่างซ่อม สาขา A:**

| ขั้น | เวลา / ข้อมูล | รายละเอียด |
|-----|--------------|-----------|
| ① Login | 07:50 น. | นายสมชาย │ ช่างซ่อม สาขา A │ JWT token ออกมา |
| ② Schedule | position=ช่าง | จ–ศ 08:00–17:00 │ login_start 06:00 │ login_end 20:00 |
| ③ ตรวจวันหยุด | 9 เม.ย. 2026 | ไม่พบใน holidays + is_day_off=0 (วันพฤหัส) → ผ่าน |
| ④ Check-in | 07:55 น. | status=normal (≤ 08:00+15) │ late_minutes=0 │ IP=10.0.1.5 |
| ⑤ Check-out | 17:05 น. | work_minutes=550 (≈ 9.2 ชม.) │ check_out_time บันทึก |

---

## Scenario B — Check-in สาย

```
Login JWT → ตรวจวันหยุด (ผ่าน) → ตรวจ Window (ผ่าน) → เกิน Grace → Check-in late (บันทึก late_min) → Check-out
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| เงื่อนไข status=late | check_in_time > scheduled_start + grace_period (default 15 นาที) |
| late_minutes | TIMESTAMPDIFF(MINUTE, scheduled_start, check_in_time) — นับจาก scheduled_start เสมอ |
| หมายเหตุ | late_minutes ไม่หัก grace — นับจากเวลาเริ่มงานเสมอ |
| work_minutes | TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) — คำนวณจาก check_in จริง |

**ตัวอย่าง Scenario B — นางสาวสุดา แคชเชียร์:**

| ขั้น | เวลา / ข้อมูล | รายละเอียด |
|-----|--------------|-----------|
| ① Login (ปกติ) | 09:10 น. | scheduled_start=09:00 │ 09:10 ≤ 09:15 → status=normal, late_minutes=0 |
| ② Login (สาย) | 09:28 น. | วันถัดมา │ 09:28 > 09:15 (09:00+15) → status=late |
| ③ late_minutes | 28 นาที | DIFF(09:00, 09:28) = 28 นาที |
| ④ Check-out | 18:00 น. | work_minutes = DIFF(09:28, 18:00) = 512 นาที |

---

## Scenario C — ขาดงาน (Job auto-mark absent / HR Override)

```
login_end ผ่านแล้ว → Job 23:59 → ตรวจ record → Mark absent → HR Override (ถ้าจำเป็น)
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| Job เงื่อนไข | วันทำงาน (is_day_off=0) AND ไม่พบใน holidays AND ไม่มี attendance record วันนั้น |
| สิ่งที่สร้าง | attendance: status=absent, check_in/out=NULL, late_minutes=0, work_minutes=0 |
| HR Override | PATCH /attendance/:id — แก้ status, check_in_time, check_out_time ได้ |
| Audit | note (required) + บันทึก updated_by เสมอ — ห้าม delete record |

**ตัวอย่าง Scenario C — HR Override นายวิชัย:**

| ขั้น | เวลา / ข้อมูล | รายละเอียด |
|-----|--------------|-----------|
| ① Job | 23:59 น. | นายวิชัย ไม่มี check-in → สร้าง attendance: status=absent |
| ② HR พบ | เช้าวันถัดไป | ตรวจ CCTV ยืนยันว่านายวิชัยมาทำงาน แต่ลืม check-in |
| ③ Override | PATCH /attendance/:id | check_in_time=08:05, status=late, note="ยืนยัน CCTV", updated_by=HR_id |
| ④ ผลลัพธ์ | — | status=late, late_minutes=5, work_minutes=คำนวณใหม่ (08:05–17:00) |

---

## Scenario D — วันหยุด (holidays table + is_day_off)

```
Job 00:00 → holidays table (date + branch) → is_day_off schedule → Mark holiday → Reject check-in วันนั้น
```

| หัวข้อ | รายละเอียด |
|--------|-----------|
| แหล่งที่ 1 — holidays | SELECT date=วันนี้ AND (branch_id IS NULL OR branch_id=สาขาพนักงาน) AND is_active=1 |
| แหล่งที่ 2 — schedule | work_schedule_days.is_day_off=1 สำหรับ day ของสัปดาห์นั้น |
| ลำดับตรวจ | holidays table ก่อน → ถ้าไม่พบ ค่อยตรวจ is_day_off |
| สิ่งที่สร้าง | attendance: status=holiday — Job 23:59 เดียวกันกับ absent check |
| Reject check-in | พนักงาน check-in วันหยุด → error "วันหยุด ไม่สามารถ check-in ได้" |
| Admin จัดการ | POST /holidays: date, name, branch_id (NULL=ทุกสาขา) — เพิ่มล่วงหน้าปีละครั้ง |

**ตัวอย่าง Scenario D — วันสงกรานต์:**

| ขั้น | เวลา / ข้อมูล | รายละเอียด |
|-----|--------------|-----------|
| ① Admin เพิ่ม | ต.ค. 2025 | POST /holidays: date=2026-04-13, name="วันสงกรานต์", branch_id=NULL |
| ② เพิ่มพิเศษ | ต.ค. 2025 | POST /holidays: date=2026-05-01, name="ปิดปรับปรุง", branch_id=2 (เฉพาะสาขา 2) |
| ③ Job 23:59 | 12 เม.ย. 2026 | ตรวจพนักงานทุกคน: 13 เม.ย. อยู่ใน holidays → mark status=holiday |
| ④ Check-in | 13 เม.ย. 2026 | พนักงานพยายาม check-in → ระบบ reject "วันสงกรานต์ วันหยุด" |

---

## สรุปเปรียบเทียบทุก Scenario

✓ = มี | — = ไม่มี | auto = อัตโนมัติ

| Scenario | status | check_in | check_out | late_min | work_min | สร้างโดย | override ได้? |
|---------|--------|---------|---------|---------|---------|---------|------------|
| A — ปกติ | normal | ✓ | ✓ | 0 | ✓ auto | พนักงาน | ✓ (HR) |
| B — สาย | late | ✓ | ✓ | > 0 | ✓ auto | พนักงาน | ✓ (HR) |
| C — ขาด (auto) | absent | — | — | 0 | — | Job 23:59 | ✓ (HR) |
| D — วันหยุด | holiday | — | — | 0 | — | Job auto | — |

---

## ลำดับ Validation ก่อน Check-in (6 ขั้น)

| ลำดับ | ตรวจ | ถ้าไม่ผ่าน |
|------|-----|----------|
| 1 | holidays table (date + branch_id) | reject "วันหยุด" |
| 2 | work_schedule_days.is_day_off=1 | reject "วันหยุด" |
| 3 | login_start_time ≤ เวลาปัจจุบัน ≤ login_end_time | reject "นอกช่วงเวลาทำงาน" |
| 4 | allowed_ip_range (ถ้าตั้งค่าไว้) | reject "IP ไม่ถูกต้อง" |
| 5 | ไม่มี attendance record วันนี้แล้ว | reject "check-in ซ้ำ" |
| 6 | คำนวณ late vs grace period | status=late พร้อม late_minutes |

---

## Job 23:59 — ลำดับ Auto-Create (ทำงานทุกคืน)

| ลำดับ | เงื่อนไข | Action |
|------|---------|--------|
| 1 | date อยู่ใน holidays (branch_id NULL or match) | สร้าง status=holiday |
| 2 | work_schedule_days.is_day_off=1 สำหรับวันนั้น | สร้าง status=holiday |
| 3 | is_day_off=0 AND ไม่มี attendance record วันนั้น | สร้าง status=absent |
| 4 | มี attendance record อยู่แล้ว (check-in แล้ว) | ข้าม — ไม่ทำอะไร |

---

## API Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| POST | /attendance/check-in | Check-in (validate → สร้าง/อัปเดต record) |
| POST | /attendance/check-out | Check-out (คำนวณ work_minutes) |
| GET | /attendance | รายการ attendance (filter: employee, date, status) |
| GET | /attendance/:id | รายละเอียด attendance record |
| PATCH | /attendance/:id | HR Override — แก้ status, check_in/out, note |
| GET | /work-schedules | รายการ work schedule |
| POST | /work-schedules | สร้าง schedule (position หรือ employee) |
| GET/PUT | /work-schedules/:id | ดู/แก้ไข schedule |
| GET | /holidays | รายการวันหยุด |
| POST | /holidays | เพิ่มวันหยุด |
| PUT | /holidays/:id | แก้ไขวันหยุด |
| DELETE | /holidays/:id | ลบวันหยุด (soft delete) |

---

## กฎสำคัญ

| กฎ | รายละเอียด |
|----|-----------|
| Override priority | employee schedule override position schedule เสมอ |
| Grace period default | 15 นาที — แก้ไขได้ต่อ work_schedule |
| late_minutes นับจาก scheduled_start | ไม่หัก grace — เช่น สาย 28 นาที ไม่ใช่ 13 นาที |
| Job 23:59 ทำงานทุกคืน | สร้าง absent/holiday สำหรับพนักงานที่ไม่มี record วันนั้น |
| HR Override ต้องมี note | note field required + บันทึก updated_by เสมอ |
| ห้าม delete attendance | soft delete เท่านั้น — ใช้ deleted_at |
| snapshot scheduled_start/end | บันทึกใน attendance record ณ เวลา check-in — ไม่ join กลับ schedule |

---

*สุดยอดมอเตอร์ — Attendance & Work Schedule Flow | Version 1.0 | เมษายน 2026*
