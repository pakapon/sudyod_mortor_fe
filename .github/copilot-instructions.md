# Project Guidelines — Sudyod Mortor Frontend

# ⚠️ CRITICAL RULES — READ FIRST

## Scope Control (HIGHEST PRIORITY)
- ONLY modify what is explicitly requested. Nothing else.
- NEVER refactor, restructure, or reorganize code unless asked.
- NEVER modify files outside the current scope.
- NEVER rename variables, functions, classNames, or CSS unless asked.
- NEVER add comments unless explicitly asked.
- If unsure about scope, ASK before making changes.

## UI Rules
- NEVER restructure or reorganize UI components.
- NEVER change component layout, order, or nesting.
- Only modify the specific element or line requested.
- Keep all existing UI structure exactly as-is.

## React-Specific Rules
- NEVER convert between controlled/uncontrolled components unless asked.
- NEVER add useMemo, useCallback, or React.memo unless asked.
- NEVER split components into smaller ones unless asked.
- NEVER extract logic to custom hooks unless asked.
- NEVER add error handling, loading states, or edge cases unless asked.

---

## Tech Stack
- Framework: React 18+ with TypeScript
- UI Library: Flowbite React (Tailwind CSS)
- Styling: Tailwind CSS 3+
- State: Zustand or React Context (prefer simplicity)
- API: Axios with interceptors
- Routing: React Router v6+
- Forms: React Hook Form + Zod
- Testing: Vitest + React Testing Library + Playwright
- Build: Vite

## Code Style
- TypeScript strict mode เสมอ
- Functional components + hooks เท่านั้น
- Component: PascalCase, Hooks: camelCase ขึ้นต้น `use`
- ไฟล์ component: PascalCase (`UserProfile.tsx`)
- ไฟล์ hook/utility: camelCase (`useAuth.ts`)
- Named export เท่านั้น (ไม่ใช้ default export)
- Absolute imports ผ่าน `@/` alias

## Conventions
- API call ต้องผ่าน service layer ใน `src/api/`
- ใช้ Flowbite React ก่อนสร้าง custom component
- ทุก component ต้องมี TypeScript interface สำหรับ props
- ใช้ `cn()` utility (clsx + tailwind-merge) สำหรับ conditional classes
- Error handling ผ่าน Error Boundary + toast
- ภาษาไทยใน UI, ภาษาอังกฤษใน code

## Build & Test Commands
- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run test` — Unit tests
- `npm run test:e2e` — E2E tests
- `npm run lint` — ESLint
- `npm run type-check` — TypeScript check