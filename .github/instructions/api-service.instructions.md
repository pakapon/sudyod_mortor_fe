---
description: "Use when creating or editing API service files, Axios configuration, or data fetching hooks. Enforces service layer patterns, error handling, and TypeScript types."
applyTo: "src/api/**"
---

# API Service Standards

## โครงสร้าง Service

- ทุก service function ต้องมี TypeScript generic type สำหรับ response
- ใช้ `apiClient` instance จาก `src/api/client.ts`
- ห้าม hardcode API URLs — ใช้ environment variables
- จัดการ error handling ผ่าน interceptor
- ใช้ pattern: `resourceService.method()` (e.g., `hrService.getRoles()`)
- ทุก endpoint ต้องมี corresponding TypeScript type ใน `src/types/`

## Headers มาตรฐาน

- ทุก request ส่ง `Accept-Language: th` (default) ผ่าน Axios interceptor
- JWT token ส่งใน `Authorization: Bearer {token}` header อัตโนมัติผ่าน interceptor

## List API Query Params มาตรฐาน

```ts
interface ListParams {
  search?: string        // ค้นหาทั่วไป
  page?: number          // default 1
  limit?: number         // default 20
  branch_id?: number     // กรองตามสาขา (ถ้า module รองรับ)
  is_active?: boolean    // กรองสถานะ (ถ้า module มี)
  [key: string]: unknown // filter เพิ่มเติมตาม module
}
```

## Pagination Response

```ts
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
```

## Permission-based Endpoints

- `GET /permissions/me` — โหลดสิทธิ์หลัง login สำเร็จ เก็บไว้ใน auth store
- `GET /permissions/roles` — list roles
- `PUT /permissions/roles/{id}` — อัปเดต permission matrix ของ role (ส่งทุก module)
- สิทธิ์ต่อ module: `can_view`, `can_create`, `can_edit`, `can_delete`, `can_approve`, `can_export`

## Export Endpoints

- ทุก module ที่มี export ใช้รูปแบบ: `GET /{resource}/export?{same filter params}`
- แสดงปุ่ม export เฉพาะเมื่อ `module.can_export = true`
