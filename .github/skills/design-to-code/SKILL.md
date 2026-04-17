---
name: design-to-code
description: "แปลง Figma design เป็น React code. Use when converting Figma designs to React components, implementing UI from Figma URLs, mapping Figma layers to Flowbite React components, extracting design tokens, or building pixel-perfect layouts from mockups."
argument-hint: "Figma URL หรือรายละเอียด design ที่ต้องการแปลง"
---

# Design to Code Skill (Figma → React + Flowbite React)

แปลง Figma design เป็น React component โดยใช้ Flowbite React + Tailwind CSS

## When to Use
- ได้รับ Figma URL และต้องการสร้าง React component
- ต้องการ implement UI ตาม design mockup
- ต้องการ extract design tokens จาก Figma
- ต้องการ map Figma components กับ Flowbite React

## Procedure

### 1. ดึง Design จาก Figma

#### มี Figma URL
1. Parse URL เพื่อดึง `fileKey` และ `nodeId`
   - `figma.com/design/:fileKey/:fileName?node-id=:nodeId`
   - แปลง `-` เป็น `:` ใน nodeId
2. ใช้ `get_design_context` เพื่อดึง design data + screenshot
3. ใช้ `get_screenshot` สำหรับดู visual reference เพิ่มเติม

#### ไม่มี Figma URL
- ใช้ข้อมูลจาก user description
- ดู reference screenshots/wireframes ที่ให้มา

### 2. วิเคราะห์ Design

จาก design context ที่ได้:
- **Layout structure**: Flex/Grid, spacing, alignment
- **Components**: ระบุ Flowbite React components ที่ตรงกัน
- **Typography**: Font sizes, weights, colors
- **Colors**: Map กับ Tailwind color palette
- **Spacing**: Map กับ Tailwind spacing scale
- **Responsive**: Breakpoints ที่ต้องการ

### 3. Map Figma → Flowbite React

| Figma Pattern | Flowbite React Component |
|---------------|--------------------------|
| Navigation bar | `Navbar` |
| Side menu | `Sidebar` |
| Data table | `Table` |
| Card layout | `Card` |
| Form inputs | `TextInput`, `Select`, `Textarea` |
| Dialog/popup | `Modal` |
| Dropdown menu | `Dropdown` |
| Tab navigation | `Tabs` |
| Alert/notification | `Alert`, `Toast` |
| Action button | `Button` |
| Badge/tag | `Badge` |
| Breadcrumb | `Breadcrumb` |
| Avatar/profile | `Avatar` |
| File upload | `FileInput` |
| Toggle switch | `ToggleSwitch` |
| Progress indicator | `Progress`, `Spinner` |
| Pagination | `Pagination` |
| Accordion | `Accordion` |
| Tooltip | `Tooltip` |

### 4. สร้าง Component

1. **Structure first**: วาง layout ด้วย Tailwind flex/grid
2. **Components**: ใส่ Flowbite React components
3. **Styling**: Tailwind utilities ให้ตรงกับ design
4. **Responsive**: เพิ่ม responsive classes (sm:, md:, lg:, xl:)
5. **Props interface**: กำหนด TypeScript types

### 5. Design Token Mapping

```
Figma Spacing → Tailwind
4px  → p-1, m-1, gap-1
8px  → p-2, m-2, gap-2
12px → p-3, m-3, gap-3
16px → p-4, m-4, gap-4
24px → p-6, m-6, gap-6
32px → p-8, m-8, gap-8

Figma Font Size → Tailwind
12px → text-xs
14px → text-sm
16px → text-base
18px → text-lg
20px → text-xl
24px → text-2xl

Figma Border Radius → Tailwind
4px  → rounded-sm
8px  → rounded-lg
12px → rounded-xl
full → rounded-full
```

### 6. Checklist
- [ ] ใช้ Flowbite React components ให้มากที่สุด
- [ ] Tailwind classes ตรงกับ design tokens
- [ ] Responsive layout (mobile-first)
- [ ] TypeScript props interface
- [ ] Semantic HTML elements
- [ ] Accessibility (aria-labels, alt text)
- [ ] Dark mode support (ถ้า design มี)
- [ ] ตรวจสอบ pixel accuracy กับ screenshot

## Tips
- Figma Auto Layout → Tailwind `flex` + `gap`
- Figma Fill Container → `w-full` หรือ `flex-1`
- Figma Hug Contents → `w-fit` หรือ default
- Figma Fixed Size → `w-[XXpx]` (avoid ถ้าเป็นไปได้ ใช้ Tailwind scale แทน)
- ถ้า design ใช้สีที่ไม่มีใน Tailwind default → เพิ่มใน `tailwind.config.ts`
