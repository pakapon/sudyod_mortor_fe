---
description: "เขียน tests — สร้าง unit, component, integration, หรือ E2E tests สำหรับ component/feature"
agent: "frontend-dev"
tools: [read, edit, search, execute]
---

เขียน tests สำหรับ component หรือ feature ที่ระบุ

## ขั้นตอน
1. อ่าน source code ของ component/feature ที่ต้องการทดสอบ
2. ระบุ test cases ที่ต้องเขียน (happy path, edge cases, error cases)
3. เขียน tests ตามประเภท:
   - Unit: hooks, utilities → Vitest
   - Component: UI interaction → React Testing Library
   - Integration: API calls → MSW + Vitest
   - E2E: user flows → Playwright
4. Run tests เพื่อตรวจสอบ
5. ตรวจสอบ coverage

## Input
- component/feature path ที่ต้องการทดสอบ
- ประเภท test (unit/component/integration/e2e)
