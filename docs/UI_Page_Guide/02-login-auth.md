# Login & Auth

> ดู common conventions → [00-common.md](./00-common.md)

---

## 2.1 หน้า Login

**Route:** `/login`

**Components:**
- Input: `identifier` (placeholder: "อีเมลหรือเบอร์โทร") — รับทั้ง email และ phone
- Input: `password` (type: password, toggle show/hide)
- Button: "เข้าสู่ระบบ"
- Link: "ลืมรหัสผ่าน?" → ไปหน้า Forgot Password

**API:**
```
POST /auth/login
Body: { identifier, password }
→ เก็บ token ใน localStorage/cookie
→ เรียก GET /permissions/me → เก็บสิทธิ์ไว้ใน state
→ redirect ไป Dashboard
```

**Logic:**
- ถ้า identifier มี `@` → server query email, ไม่มี → query phone
- Token expired → redirect กลับ Login
- Auto refresh token ก่อนหมดอายุ ด้วย `POST /auth/refresh-token`

---

## 2.2 หน้า Forgot Password (3 ขั้นตอน)

**Route:** `/forgot-password`

**Step 1 — ส่ง OTP:**
- Input: `phone` (เบอร์โทร)
- Button: "ส่งรหัส OTP"
- API: `POST /auth/forgot-password { phone }`

**Step 2 — กรอก OTP:**
- Input: OTP 6 หลัก (auto-focus, ตัวต่อตัว)
- Countdown: 5 นาที (ส่งใหม่ได้เมื่อหมดเวลา)
- API: `POST /auth/verify-otp { phone, otp_code }`
- ได้ `reset_token` กลับมา

**Step 3 — ตั้งรหัสใหม่:**
- Input: `new_password` + `confirm_password`
- Button: "ตั้งรหัสผ่านใหม่"
- API: `POST /auth/reset-password { reset_token, new_password }`
- สำเร็จ → redirect ไป Login

---

## 2.3 หน้า Change Password

**Route:** `/settings/change-password` (ใน layout หลัก)

- Input: `current_password`
- Input: `new_password` + `confirm_password`
- API: `PUT /auth/change-password`

---

## 2.4 Session Management

**เข้าถึงจาก:** Profile dropdown → "จัดการ Session"

- แสดงรายการ session ที่ login อยู่ (device, เวลา, IP)
- ปุ่ม "Kick" ตัดออกจากระบบ
- API: `GET /auth/sessions`, `DELETE /auth/sessions/{id}`
