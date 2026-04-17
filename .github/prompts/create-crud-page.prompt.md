---
description: "สร้าง CRUD page — สร้างหน้า list, create, edit, delete ครบวงจรพร้อม API integration"
agent: "frontend-dev"
tools: [read, edit, search, execute]
---

สร้าง CRUD page ครบวงจรสำหรับ resource ที่ระบุ

## ขั้นตอน
1. สร้าง TypeScript types สำหรับ resource
2. สร้าง API service functions (getAll, getById, create, update, delete)
3. สร้าง custom hooks (useResources, useResourceMutation)
4. สร้าง UI components:
   - List page พร้อม Table, Search, Pagination
   - Create/Edit form พร้อม validation (React Hook Form + Zod)
   - Delete confirmation modal
5. สร้าง route configuration
6. จัดการ loading, error, empty states, toast notifications

## Input
- ชื่อ resource (เช่น Product, User, Order)
- API endpoints
- Fields/columns ที่ต้องการ
