---
description: "Use when creating or editing Zustand stores. Enforces state shape, async action patterns, loading/error handling, and token-safe auth state transitions."
applyTo: "src/stores/**"
---

# Store Standards (Zustand)

- store state ต้องประกอบด้วยข้อมูลหลัก + `isLoading` + `error` เมื่อเป็น async workflow
- แยก action เป็นกลุ่มชัดเจน: fetch/create/update/delete หรือ login/logout/checkAuth
- async action ต้องตั้งค่า loading ก่อนเริ่ม และ reset loading ใน `finally` หรือจุดจบที่ครอบคลุมทุก path
- การจับ error ให้ map เป็นข้อความที่แสดงผลได้ และเก็บรูปแบบเดียวกันทั้ง store
- ห้ามเคลียร์ auth token ในทุก error แบบเหมารวม ให้เคลียร์เฉพาะกรณี unauthorized หรือเงื่อนไขที่ยืนยันแล้ว
- state transition สำคัญ (เช่น auth) ต้องกำหนด deterministic outcome ชัดเจนทุกกรณี
- หลีกเลี่ยง side effects ที่ข้ามชั้นโดยไม่จำเป็น (เช่น redirect ตรงใน store)
- export เฉพาะ named exports และตั้งชื่อ store hook เป็น `useXxxStore`
