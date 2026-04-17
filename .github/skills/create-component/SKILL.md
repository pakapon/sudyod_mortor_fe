---
name: create-component
description: "สร้าง React component ด้วย Flowbite React + Tailwind CSS. Use when creating new UI components, pages, forms, layouts, modals, tables, or wrapping Flowbite components. Includes TypeScript props interface, responsive design, and accessibility."
argument-hint: "ชื่อ component และรายละเอียดที่ต้องการ"
---

# Create Component Skill

สร้าง React component ใหม่ตาม project conventions โดยใช้ Flowbite React + Tailwind CSS

## When to Use
- สร้าง UI component ใหม่ (Button, Card, Modal, Table, Form ฯลฯ)
- สร้าง page component
- Wrap Flowbite React component เพื่อ customize
- สร้าง layout component

## Procedure

### 1. วิเคราะห์ความต้องการ
- ตรวจสอบว่า component ที่ต้องการมีอยู่แล้วใน project หรือไม่
- ตรวจสอบ Flowbite React docs ว่ามี component ที่ใกล้เคียงหรือไม่
- กำหนด props interface

### 2. เลือก Location
| ประเภท | Location |
|--------|----------|
| Shared UI | `src/components/ui/` |
| Form | `src/components/forms/` |
| Layout | `src/components/layout/` |
| Feature-specific | `src/features/<feature>/components/` |
| Page | `src/pages/` |

### 3. สร้าง Component

#### Template: Basic Component
```tsx
import { type FC } from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  className?: string;
  children?: React.ReactNode;
}

export const ComponentName: FC<ComponentNameProps> = ({ className, children }) => {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
};
```

#### Template: Form Component (React Hook Form + Zod)
```tsx
import { type FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Label, TextInput } from 'flowbite-react';

const formSchema = z.object({
  fieldName: z.string().min(1, 'กรุณากรอกข้อมูล'),
});

type FormValues = z.infer<typeof formSchema>;

interface FormNameProps {
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
}

export const FormName: FC<FormNameProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="fieldName" value="ชื่อฟิลด์" />
        <TextInput
          id="fieldName"
          {...register('fieldName')}
          color={errors.fieldName ? 'failure' : undefined}
          helperText={errors.fieldName?.message}
        />
      </div>
      <Button type="submit" isProcessing={isLoading}>
        บันทึก
      </Button>
    </form>
  );
};
```

#### Template: Data Table Component
```tsx
import { type FC } from 'react';
import { Table, Spinner } from 'flowbite-react';

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export const DataTable = <T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  emptyMessage = 'ไม่พบข้อมูล',
}: DataTableProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Table hoverable>
      <Table.Head>
        {columns.map((col) => (
          <Table.HeadCell key={String(col.key)}>{col.header}</Table.HeadCell>
        ))}
      </Table.Head>
      <Table.Body className="divide-y">
        {data.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={columns.length} className="text-center text-gray-500">
              {emptyMessage}
            </Table.Cell>
          </Table.Row>
        ) : (
          data.map((row, idx) => (
            <Table.Row key={idx}>
              {columns.map((col) => (
                <Table.Cell key={String(col.key)}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </Table.Cell>
              ))}
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table>
  );
};
```

### 4. Checklist
- [ ] TypeScript interface สำหรับ props
- [ ] ใช้ named export
- [ ] รองรับ `className` prop สำหรับ custom styling
- [ ] ใช้ Flowbite React components เป็นหลัก
- [ ] ใช้ `cn()` สำหรับ conditional classes
- [ ] Responsive design (mobile-first)
- [ ] Accessibility (aria labels, keyboard navigation)
- [ ] Loading / Error / Empty states (ถ้า applicable)

## Flowbite React Quick Reference
- Layout: `Navbar`, `Sidebar`, `Footer`, `Breadcrumb`
- Data: `Table`, `Card`, `ListGroup`, `Timeline`, `Accordion`
- Forms: `TextInput`, `Textarea`, `Select`, `Checkbox`, `Radio`, `FileInput`, `ToggleSwitch`
- Feedback: `Alert`, `Toast`, `Modal`, `Spinner`, `Progress`
- Navigation: `Tabs`, `Pagination`, `Dropdown`
- Actions: `Button`, `ButtonGroup`
