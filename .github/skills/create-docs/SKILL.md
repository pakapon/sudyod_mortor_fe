---
name: create-docs
description: "สร้างเอกสารการใช้งานระบบ. Use when creating user documentation, component documentation, API documentation, feature guides, README files, developer guides, or usage examples. ครอบคลุม user manual, developer docs, component storybook docs."
argument-hint: "ประเภทเอกสารและ feature/component ที่ต้องการ"
---

# Create Documentation Skill

สร้างเอกสารการใช้งานระบบสำหรับ frontend project

## When to Use
- สร้าง README สำหรับ project หรือ feature
- สร้าง User Manual (คู่มือผู้ใช้งาน)
- สร้าง Developer Guide (คู่มือนักพัฒนา)
- สร้าง Component Documentation
- สร้าง API Integration Guide

## Document Types & Templates

### 1. Feature README

สร้างใน `src/features/<feature>/README.md`

```markdown
# ชื่อ Feature

## Overview
อธิบายภาพรวมของ feature

## Components
| Component | Description | Location |
|-----------|-------------|----------|
| ComponentName | อธิบาย | `./components/ComponentName.tsx` |

## Hooks
| Hook | Description | Location |
|------|-------------|----------|
| useHookName | อธิบาย | `./hooks/useHookName.ts` |

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/resource` | ดึงข้อมูล |
| POST | `/api/resource` | สร้างข้อมูล |

## Usage
\```tsx
import { ComponentName } from '@/features/featureName';
// ตัวอย่างการใช้งาน
\```

## State Management
อธิบาย state ที่ใช้ (Zustand store / React Context)
```

### 2. Component Documentation

สร้างใน `docs/components/<ComponentName>.md`

```markdown
# ComponentName

## Description
อธิบาย component

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| propName | `string` | Yes | - | อธิบาย |

## Usage Examples

### Basic Usage
\```tsx
<ComponentName propName="value" />
\```

### With Custom Styling
\```tsx
<ComponentName className="custom-class" />
\```

### Advanced Usage
\```tsx
// ตัวอย่างการใช้งานขั้นสูง
\```

## Accessibility
- อธิบาย keyboard navigation
- อธิบาย screen reader support

## Related Components
- `RelatedComponent1`
- `RelatedComponent2`
```

### 3. User Manual (คู่มือผู้ใช้งาน)

สร้างใน `docs/user-guide/`

```markdown
# คู่มือการใช้งาน — ชื่อระบบ

## สารบัญ
1. [เริ่มต้นใช้งาน](#getting-started)
2. [การเข้าสู่ระบบ](#login)
3. [หน้าหลัก](#dashboard)

## เริ่มต้นใช้งาน {#getting-started}

### ข้อกำหนดของระบบ
- Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- หน้าจอ: รองรับ 320px ขึ้นไป

### การเข้าถึงระบบ
1. เปิด browser แล้วไปที่ URL: `https://...`
2. กรอก username และ password
3. คลิก "เข้าสู่ระบบ"

## การเข้าสู่ระบบ {#login}
[รูปภาพหน้า login]

### ขั้นตอน
1. ...
2. ...

### กรณีลืมรหัสผ่าน
1. คลิก "ลืมรหัสผ่าน"
2. ...
```

### 4. Developer Guide

สร้างใน `docs/developer-guide.md`

```markdown
# Developer Guide

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
\```bash
git clone <repo-url>
cd sudyod-mortor-fe
npm install
cp .env.example .env.local
npm run dev
\```

## Project Structure
อธิบาย folder structure

## Development Workflow

### Creating a New Feature
1. สร้าง folder ใน `src/features/<feature-name>/`
2. สร้าง components, hooks, types
3. สร้าง API service ใน `src/api/`
4. เพิ่ม route ใน `src/routes/`
5. เขียน tests
6. สร้าง documentation

### Code Conventions
- อธิบาย naming conventions
- อธิบาย patterns ที่ใช้

### Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `http://localhost:3000/api` |

## Testing
อธิบายวิธี run tests
```

### 5. API Integration Guide

สร้างใน `docs/api-guide.md`

```markdown
# API Integration Guide

## Base Configuration
- Base URL: `VITE_API_BASE_URL`
- Authentication: Bearer Token (JWT)

## Endpoints

### Resource Name

#### List Resources
\```
GET /api/resources?page=1&pageSize=10&search=keyword
\```

**Response:**
\```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
\```

#### Get Resource by ID
\```
GET /api/resources/:id
\```

## Error Handling
| Status Code | Description | Action |
|-------------|-------------|--------|
| 400 | Bad Request | แสดง validation errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | แสดง access denied |
| 404 | Not Found | แสดง not found message |
| 500 | Server Error | แสดง generic error |
```

## Procedure

### 1. ระบุประเภทเอกสาร
- ถามผู้ใช้ว่าต้องการเอกสารประเภทใด
- ดู existing docs เพื่อไม่ซ้ำ

### 2. รวบรวมข้อมูล
- อ่าน source code ของ feature/component
- ดู TypeScript types/interfaces
- ดู API endpoints ที่ใช้
- ดู test cases สำหรับ usage examples

### 3. สร้างเอกสาร
- ใช้ template ตามประเภท
- เขียนเป็นภาษาไทย (สำหรับ user manual)
- เขียนเป็นภาษาอังกฤษ (สำหรับ developer docs)
- ใส่ code examples ที่ถูกต้องและ run ได้

### 4. Checklist
- [ ] สารบัญชัดเจน
- [ ] Code examples ถูกต้อง
- [ ] Screenshots/diagrams (ถ้าจำเป็น)
- [ ] ครบทุก use case หลัก
- [ ] Links ไปยังเอกสารที่เกี่ยวข้อง
- [ ] วันที่อัปเดตล่าสุด
