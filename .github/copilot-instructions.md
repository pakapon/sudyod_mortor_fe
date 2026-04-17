# Project Guidelines — Sudyod Mortor Frontend

## Tech Stack
- **Framework**: React 18+ with TypeScript
- **UI Library**: Flowbite React (Tailwind CSS component library)
- **Styling**: Tailwind CSS 3+
- **State Management**: Zustand or React Context (prefer simplicity)
- **API Client**: Axios with interceptors
- **Routing**: React Router v6+
- **Form Handling**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + Playwright (E2E)
- **Build**: Vite

## Code Style
- ใช้ TypeScript strict mode เสมอ
- ใช้ functional components + hooks เท่านั้น (ไม่ใช้ class components)
- ตั้งชื่อ component เป็น PascalCase, hooks เป็น camelCase ขึ้นต้นด้วย `use`
- ตั้งชื่อไฟล์ component เป็น PascalCase (e.g., `UserProfile.tsx`)
- ตั้งชื่อไฟล์ hook/utility เป็น camelCase (e.g., `useAuth.ts`)
- Export component เป็น named export (ไม่ใช้ default export)
- ใช้ absolute imports ผ่าน `@/` alias

## Project Structure
```
src/
├── api/              # API service functions & Axios instance
├── assets/           # Static assets (images, fonts)
├── components/       # Shared/reusable components
│   ├── ui/           # Base UI components (wrapped Flowbite)
│   ├── forms/        # Form components
│   └── layout/       # Layout components (Header, Sidebar, Footer)
├── features/         # Feature modules (each has components, hooks, types)
├── hooks/            # Shared custom hooks
├── lib/              # Utility functions & helpers
├── pages/            # Route pages
├── providers/        # Context providers
├── routes/           # Route configuration
├── stores/           # State management stores
├── types/            # Shared TypeScript types/interfaces
└── styles/           # Global styles & Tailwind config
```

## Conventions
- ทุก API call ต้องผ่าน service layer ใน `src/api/`
- ใช้ Flowbite React components เป็นหลัก ก่อนสร้าง custom component
- ทุก component ต้องมี TypeScript interface สำหรับ props
- ใช้ `cn()` utility (clsx + tailwind-merge) สำหรับ conditional classes
- Error handling ผ่าน Error Boundary และ toast notifications
- ภาษาไทยใน UI, ภาษาอังกฤษใน code

## Build & Test
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run lint         # ESLint
npm run type-check   # TypeScript check
```
