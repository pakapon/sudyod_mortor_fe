---
description: "สร้าง API service layer — สร้าง types, service functions, และ custom hooks สำหรับเชื่อมต่อ API endpoint"
agent: "frontend-dev"
tools: [read, edit, search, execute]
---

สร้าง API integration layer สำหรับ endpoint ที่ระบุ

## ขั้นตอน
1. วิเคราะห์ API specification (endpoint, method, request/response schema)
2. สร้าง TypeScript types ใน `src/types/` หรือ feature types
3. สร้าง service function ใน `src/api/`
4. สร้าง custom hooks สำหรับ data fetching
5. จัดการ loading, error, empty states

## Input
- API endpoint URL, method, request/response schema
- หรือ Postman collection / Swagger URL
