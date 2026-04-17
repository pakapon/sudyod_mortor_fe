---
description: "Use when creating or editing test files. Enforces testing patterns with Vitest, React Testing Library, MSW, and Playwright."
applyTo: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "e2e/**"]
---

# Testing Standards

- ใช้ `describe` + `it` blocks พร้อม descriptive names (ภาษาอังกฤษ)
- ใช้ `userEvent` แทน `fireEvent` สำหรับ user interaction
- Mock API calls ด้วย MSW (ไม่ mock axios directly)
- ทุก component test ต้องทดสอบ: render, interaction, error state
- E2E tests ทดสอบเฉพาะ critical user flows
- ห้ามใช้ `data-testid` ถ้า accessible role/label ใช้ได้
