---
description: "Use when creating or editing route configuration, route guards, navigation permission filtering, or auth bootstrap logic. Enforces route naming, permission checks, and guard behavior consistency."
applyTo: ["src/routes/**", "src/components/layout/Sidebar.tsx", "src/App.tsx"]
---

# Routes and Permissions Standards

## Route Naming Convention

- path ใช้ kebab-case เสมอ
- รูปแบบ resource: `/resource` (list), `/resource/create`, `/resource/:id`, `/resource/:id/edit`
- route ของ Settings: `/settings/roles`, `/settings/roles/:id`, `/settings/positions` ฯลฯ
- route ของ HR: `/hr/employees`, `/hr/employees/create`, `/hr/employees/:id/edit`

## Route Guards

- ทุก protected route ครอบด้วย `<ProtectedRoute>` เดียวกัน
- guard รองรับ 3 สถานะ: loading (แสดง spinner), authenticated, unauthenticated (redirect `/login`)
- bootstrap auth ที่จุดเดียวใน `App.tsx` — ห้ามกระจายหลายที่

## Permission Guard

- ทุกหน้าตรวจ permission จาก `useAuthStore` state (`permissions.me`)
- ห้าม hardcode permission check รายหน้า — อ้างอิง module key เดียวกันเสมอ
- ถ้าไม่มี `module.can_view` → redirect ไปหน้า 403 หรือ dashboard
- เมนู Sidebar ซ่อน/แสดงตาม permission — ถ้า `customers.can_view = false` → ไม่แสดงเมนูลูกค้า

## Permission Module Keys (จาก API /permissions/me)

```
dashboard, employees, positions, roles, attendance, holidays,
customers, vehicles, vendors, brands, product_categories, products,
warehouses, inventory, goods_receipts, stock_transfers,
service_orders, quotations, invoices, loan_applications, store_loans,
notifications
```

## Auth Bootstrap Flow

```
App mount
  → ตรวจ token ใน localStorage
  → ถ้ามี token → GET /auth/me + GET /permissions/me
  → เก็บ employee + permissions ใน authStore
  → แสดง app (authenticated)
  → ถ้าไม่มี token → redirect /login
```

## Navigation

- ห้าม redirect ด้วย `window.location.href` — ใช้ `useNavigate()` จาก react-router-dom
- route ที่ยังไม่พร้อมใช้งาน ปิดในเมนูและเพิ่ม `// TODO:` ชัดเจนใน route file
- Auto refresh token ก่อนหมดอายุ ด้วย `POST /auth/refresh-token` ผ่าน Axios interceptor
