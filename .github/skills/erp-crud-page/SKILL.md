---
name: erp-crud-page
description: "สร้างหน้า ERP แบบ CRUD ครบชุด (list/detail/form) พร้อม service, types, route, และโครง test พื้นฐาน. Use when adding a new business module page quickly with consistent project conventions."
argument-hint: "ชื่อ module, endpoint หลัก, fields สำคัญ, และ permission key"
---

# ERP CRUD Page Skill

สร้างโมดูลหน้าใหม่ให้ครบ pattern เดียวกับโปรเจกต์นี้

## When to Use
- เพิ่ม module ใหม่ที่ต้องมี list + detail + create/edit form
- ต้องการขึ้นโครงทั้งหน้า, service, types, route แบบเร็วและสม่ำเสมอ
- ต้องการยึด UI guide + API flow guide โดยไม่พลาดจุดสำคัญ

## Inputs ที่ควรมี
- Module name: เช่น `finance-companies`
- Permission key: เช่น `finance_companies`
- Endpoints: list/get/create/update/delete
- Fields หลักของ entity
- Route target: เช่น `/settings/finance-companies`

## Procedure

### 1. Define Domain Contract
- สรุป entity type และ payload types ใน `src/types/` หรือ `src/features/<module>/types.ts`
- นิยาม list query params (`page`, `limit`, `search`, `branch_id` ถ้าเกี่ยวข้อง)

### 2. Create Service Layer
- สร้างไฟล์ใน `src/api/` ตาม pattern `resourceService`
- ใช้ `apiClient` และ typed response (`ApiResponse`, `PaginatedResponse`)

### 3. Build Pages
- List page: filter/search, table, pagination, icon action buttons
- Form page: React Hook Form + Zod, รองรับ create/edit mode
- Detail page: section หรือ tabs ตามโดเมน พร้อม action หลัก

### 4. Wire Routes + Permissions
- เพิ่ม routes ใน `src/routes/index.tsx`
- ผูก route กับ `ProtectedRoute`
- ซ่อน/แสดงเมนูตาม permission key

### 5. UX States Checklist
- loading, empty, error state ครบทุกหน้า
- success/error toast หลัง create/update/delete
- confirm dialog ก่อน delete

### 6. Tests Baseline
- เพิ่ม component test สำหรับ list/form interaction ที่สำคัญ
- เพิ่ม MSW integration test สำหรับ service อย่างน้อย list + create

## Output Checklist
- [ ] types พร้อมใช้งาน
- [ ] service functions ครบ CRUD
- [ ] list/detail/form pages ครบ
- [ ] routes + sidebar mapping ครบ
- [ ] permission gating ครบ
- [ ] tests ขั้นต่ำพร้อมรัน
