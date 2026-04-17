---
description: "Use when creating or editing React component files (.tsx). Enforces Flowbite React usage, TypeScript props interface, named exports, and Tailwind CSS patterns."
applyTo: "**/*.tsx"
---

# React Component Standards

## โครงสร้าง Component

- ใช้ functional components + hooks เท่านั้น
- ทุก component ต้องมี TypeScript interface สำหรับ props
- ใช้ named export (ไม่ใช้ default export)
- ใช้ Flowbite React components ก่อนสร้าง custom component
- ใช้ Tailwind CSS classes — ห้ามใช้ inline styles
- ใช้ `cn()` utility สำหรับ conditional classes
- รองรับ `className` prop สำหรับ customization
- จัดการ loading, error, empty states เสมอ

## Icon-Only Action Buttons (Table Actions)

ปุ่ม action ในตาราง (แก้ไข, ลบ, config ฯลฯ) ต้องเป็น icon-only เท่านั้น:

```tsx
// ✅ ถูกต้อง — icon only + title tooltip
<button
  onClick={handleEdit}
  title="แก้ไข"
  className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
>
  <PencilIcon className="h-4 w-4" />
</button>

// ❌ ผิด — มี text label
<button className="...">
  <PencilIcon /> แก้ไข
</button>
```

สีตามประเภท action:
- แก้ไข: `border-gray-200 text-gray-500 hover:bg-gray-100`
- ลบ: `border-red-200 text-red-500 hover:bg-red-50`
- กำหนดสิทธิ์/config: `border-red-200 text-red-600 hover:bg-red-50`
- ดูรายละเอียด: `border-blue-200 text-blue-500 hover:bg-blue-50`

## Status Badge

ใช้ `<span>` พร้อม Tailwind color class จาก mapping กลาง — ไม่ใช้ Flowbite Badge component โดยตรงในตาราง:

```tsx
<span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColor)}>
  {statusLabel}
</span>
```

## Toggle (is_active)

- ใช้ `<ToggleSwitch>` จาก Flowbite React
- วางไว้ **ขวาบน** ของ section header ที่เกี่ยวข้อง (flex justify-between)
- ไม่วางไว้ท้ายฟอร์ม

## Tab Layout (Detail Pages)

- ใช้ `<Tabs>` จาก Flowbite React
- Tab แรกเป็นข้อมูลหลัก, tab สุดท้ายมักเป็น "ประวัติ/Audit Log"
- แต่ละ tab content แยกเป็น component ย่อยเพื่อ lazy load ได้

## Autocomplete / Search Select

- ใช้ `<TextInput>` + controlled dropdown list (ไม่ใช้ native `<select>` สำหรับ search)
- debounce 300ms ก่อน trigger API call
- แสดง loading spinner ขณะ search
- กรณีเลือกแล้ว แสดง badge ที่ clearable
