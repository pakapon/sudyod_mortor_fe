# แผนการทำงาน — ระบบสุดยอดมอเตอร์ (Frontend)

> สร้างจาก Figma Design: [สุดยอดมอเตอร์](https://www.figma.com/design/lrofb6rryq8u3fKUC9qQJ7)
> วันที่สร้าง: 14 เมษายน 2026

---

## ภาพรวมระบบ (System Overview)

ระบบจัดการร้านมอเตอร์ไซค์ครบวงจร ประกอบด้วย 10 โมดูลหลัก:

| # | โมดูล | Figma Frames | Priority |
|---|-------|-------------|----------|
| 0 | Authentication (Login/Forgot Password) | `0/Login` | 🔴 P0 |
| 1.1 | แดชบอร์ด | `1.1.x` | 🔴 P0 |
| 1.2 | จัดการลูกค้า (CRM) | `1.2.x` | 🔴 P0 |
| 2.1 | ผู้จัดจำหน่าย (Vendors) | `2.1.x` | 🟡 P1 |
| 2.2 | แบรนด์ (Brands) | `2.2.x` | 🟡 P1 |
| 2.3 | กลุ่มสินค้า (Categories) | `2.3.x` | 🟡 P1 |
| 2.4 | สินค้า & SKU (Products) | `2.4.x` | 🔴 P0 |
| 3.1 | คลังสินค้า (Warehouses) | `3.1.x` | 🟡 P1 |
| 3.2 | รับสินค้าเข้า (Goods Receipt) | `3.2.x` | 🟡 P1 |
| 3.3 | จัดการสินค้า/นับสต็อก (Stock Count) | `3.3.x` | 🟡 P1 |
| 3.4 | โอนย้ายสินค้า (Stock Transfer) | `3.4.x` | 🟡 P1 |
| 3.5 | รายการสินค้าคงเหลือ (Stock Balance) | `3.5.x` | 🟡 P1 |
| 4.1 | ไฟแนนซ์ สินเชื่อ (Finance/Credit) | `4.1.x` | 🟢 P2 |
| 5 | บริการ & ซ่อม (Service & Repair) | ใบรับรถ, ซ่อมบำรุง | 🟡 P1 |
| 6 | เอกสารการเงิน (Financial Docs) | ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ | 🟡 P1 |
| 7 | ถ่ายภาพ GPS (Photo Capture) | Mobile frames | 🟢 P2 |
| 8 | รายงาน (Reports) | รายงาน & การวิเคราะห์ | 🟢 P2 |
| 9 | การจัดการพนักงาน (HR) | การจัดการพนักงาน | 🟢 P2 |
| 10 | ตั้งค่าระบบ (Settings/Permissions) | เมนู/สิทธิ์ | 🟢 P2 |

---

## Phase 1: Foundation & Core (P0)

### Module 0: Authentication
**Figma**: `0/Login`, `หน้า Login`, `ค้นหาชื่อผู้ใช้`

#### API Endpoints ที่ต้องการ
```
POST   /api/auth/login              # เข้าสู่ระบบ
POST   /api/auth/logout             # ออกจากระบบ
POST   /api/auth/refresh-token      # Refresh JWT
POST   /api/auth/forgot-password    # ส่ง OTP/reset link
POST   /api/auth/reset-password     # รีเซ็ตรหัสผ่าน
GET    /api/auth/me                 # ดึงข้อมูลผู้ใช้ปัจจุบัน
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 0.1 | ตั้งค่า Axios instance + interceptors (JWT, refresh) | `src/api/client.ts` |
| 0.2 | สร้าง Auth types & service | `src/types/auth.ts`, `src/api/authService.ts` |
| 0.3 | สร้าง Auth store (Zustand) | `src/stores/authStore.ts` |
| 0.4 | สร้าง LoginPage | `src/pages/LoginPage.tsx` |
| 0.5 | สร้าง ForgotPasswordPage | `src/pages/ForgotPasswordPage.tsx` |
| 0.6 | สร้าง ProtectedRoute component | `src/routes/ProtectedRoute.tsx` |
| 0.7 | สร้าง Route configuration | `src/routes/index.tsx` |
| 0.8 | เขียน Tests | `__tests__/` |

---

### Module 1.1: แดชบอร์ด (Dashboard)
**Figma**: `1.1.1 แดชบอร์ด`, `1.1.2 ดูโปรไฟล์`, `1.1.3 ดูแจ้งเตือน`

#### API Endpoints ที่ต้องการ
```
GET    /api/dashboard/summary       # สรุปข้อมูลแดชบอร์ด
GET    /api/dashboard/stats         # สถิติ (ยอดขาย, งานซ่อม, สต็อก)
GET    /api/notifications           # รายการแจ้งเตือน
PATCH  /api/notifications/:id/read  # อ่านแจ้งเตือน
GET    /api/users/profile           # ดูโปรไฟล์ตัวเอง
PATCH  /api/users/profile           # แก้ไขโปรไฟล์
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 1.1.1 | สร้าง Layout หลัก (Sidebar + Navbar + Content) | `src/components/layout/` |
| 1.1.2 | สร้าง DashboardPage + stat cards | `src/pages/DashboardPage.tsx` |
| 1.1.3 | สร้าง NotificationDropdown | `src/components/ui/NotificationDropdown.tsx` |
| 1.1.4 | สร้าง ProfileDrawer / ProfileModal | `src/components/ui/ProfileDrawer.tsx` |
| 1.1.5 | สร้าง Dashboard service & hooks | `src/api/dashboardService.ts` |
| 1.1.6 | เขียน Tests | `__tests__/` |

---

### Module 1.2: จัดการลูกค้า (CRM)
**Figma**: `1.2.1` – `1.2.9` (ค้นหา, โปรไฟล์บุคคล/นิติบุคคล, แก้ไข, CRUD, แท็บข้อมูล)

#### API Endpoints ที่ต้องการ
```
GET    /api/customers               # รายการลูกค้า (search, filter, pagination)
GET    /api/customers/:id           # รายละเอียดลูกค้า
POST   /api/customers               # สร้างลูกค้าใหม่
PATCH  /api/customers/:id           # แก้ไขลูกค้า
DELETE /api/customers/:id           # ลบลูกค้า

# Sub-resources (แท็บต่างๆ)
GET    /api/customers/:id/documents          # เอกสาร
GET    /api/customers/:id/timeline           # ไทม์ไลน์/บันทึกเหตุการณ์
GET    /api/customers/:id/finance            # การเงิน/ใบเสร็จ
GET    /api/customers/:id/purchase-history   # ประวัติการซื้อ
GET    /api/customers/:id/repair-history     # ประวัติซ่อมบำรุง
GET    /api/customers/:id/warranty           # ประวัติรับประกัน
POST   /api/customers/:id/addresses          # เพิ่มที่อยู่
PATCH  /api/customers/:id/addresses/:addrId  # แก้ไขที่อยู่
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 1.2.1 | สร้าง Customer types | `src/features/customers/types.ts` |
| 1.2.2 | สร้าง Customer service | `src/api/customerService.ts` |
| 1.2.3 | สร้าง CustomerListPage (ค้นหา + ฟิลเตอร์ + ตาราง) | `src/pages/customers/CustomerListPage.tsx` |
| 1.2.4 | สร้าง CustomerCreatePage (บุคคล/นิติบุคคล) | `src/pages/customers/CustomerCreatePage.tsx` |
| 1.2.5 | สร้าง CustomerDetailPage (แท็บ: ข้อมูล/เอกสาร/ไทม์ไลน์/การเงิน/ซื้อ/ซ่อม/รับประกัน) | `src/pages/customers/CustomerDetailPage.tsx` |
| 1.2.6 | สร้าง CustomerEditPage | `src/pages/customers/CustomerEditPage.tsx` |
| 1.2.7 | สร้าง AddressForm component | `src/features/customers/components/AddressForm.tsx` |
| 1.2.8 | สร้าง CustomerFilter component | `src/features/customers/components/CustomerFilter.tsx` |
| 1.2.9 | สร้าง Custom hooks | `src/features/customers/hooks/` |
| 1.2.10 | เขียน Tests | `__tests__/` |

---

### Module 2.4: สินค้า & SKU (Products)
**Figma**: `2.4.1` – `2.4.20` (รายการ, ดู, แก้ไข, ต้นทุน/ราคา, ชุดอะไหล่, อะไหล่)

#### API Endpoints ที่ต้องการ
```
GET    /api/products                # รายการสินค้า (search, filter, pagination)
GET    /api/products/:id            # รายละเอียดสินค้า
POST   /api/products                # สร้างสินค้า
PATCH  /api/products/:id            # แก้ไขสินค้า
DELETE /api/products/:id            # ลบสินค้า

# SKU Management
GET    /api/products/:id/skus       # รายการ SKU ของสินค้า
GET    /api/skus/:skuId             # รายละเอียด SKU
POST   /api/products/:id/skus       # สร้าง SKU
PATCH  /api/skus/:skuId             # แก้ไข SKU
DELETE /api/skus/:skuId             # ลบ SKU

# SKU Sub-resources
GET    /api/skus/:skuId/pricing     # ต้นทุน/ราคาขาย
PATCH  /api/skus/:skuId/pricing     # แก้ไขต้นทุน/ราคาขาย
GET    /api/skus/:skuId/parts       # ชุดอะไหล่
PATCH  /api/skus/:skuId/parts       # แก้ไขชุดอะไหล่
GET    /api/skus/:skuId/spareparts  # อะไหล่
PATCH  /api/skus/:skuId/spareparts  # แก้ไขอะไหล่
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 2.4.1 | สร้าง Product & SKU types | `src/features/products/types.ts` |
| 2.4.2 | สร้าง Product service | `src/api/productService.ts` |
| 2.4.3 | สร้าง SKU service | `src/api/skuService.ts` |
| 2.4.4 | สร้าง ProductListPage | `src/pages/products/ProductListPage.tsx` |
| 2.4.5 | สร้าง ProductDetailPage (ดูข้อมูลทั่วไป) | `src/pages/products/ProductDetailPage.tsx` |
| 2.4.6 | สร้าง SKU Detail (tabs: รหัส/แบบ, ต้นทุน/ราคา, ชุดอะไหล่, อะไหล่) | `src/features/products/components/SkuDetail.tsx` |
| 2.4.7 | สร้าง SKU Edit Forms (แต่ละ tab) | `src/features/products/components/SkuEditForm.tsx` |
| 2.4.8 | สร้าง PricingForm component | `src/features/products/components/PricingForm.tsx` |
| 2.4.9 | สร้าง PartsForm component | `src/features/products/components/PartsForm.tsx` |
| 2.4.10 | สร้าง Custom hooks | `src/features/products/hooks/` |
| 2.4.11 | เขียน Tests | `__tests__/` |

---

## Phase 2: Business Operations (P1)

### Module 2.1: ผู้จัดจำหน่าย (Vendors)
**Figma**: `2.1.1` – `2.1.4`

#### API Endpoints ที่ต้องการ
```
GET    /api/vendors                 # รายการผู้จัดจำหน่าย
GET    /api/vendors/:id             # รายละเอียด
POST   /api/vendors                 # สร้าง
PATCH  /api/vendors/:id             # แก้ไข
DELETE /api/vendors/:id             # ลบ
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 2.1.1 | สร้าง Vendor CRUD (types, service, hooks) | `src/features/vendors/` |
| 2.1.2 | สร้าง VendorListPage | `src/pages/vendors/VendorListPage.tsx` |
| 2.1.3 | สร้าง VendorDetailPage | `src/pages/vendors/VendorDetailPage.tsx` |
| 2.1.4 | สร้าง VendorEditPage | `src/pages/vendors/VendorEditPage.tsx` |
| 2.1.5 | เขียน Tests | `__tests__/` |

---

### Module 2.2: แบรนด์ (Brands)
**Figma**: `2.2.1` – `2.2.5`

#### API Endpoints ที่ต้องการ
```
GET    /api/brands                  # รายการแบรนด์
GET    /api/brands/:id              # รายละเอียด
POST   /api/brands                  # สร้าง
PATCH  /api/brands/:id              # แก้ไข
DELETE /api/brands/:id              # ลบ
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 2.2.1 | สร้าง Brand CRUD (types, service, hooks) | `src/features/brands/` |
| 2.2.2 | สร้าง BrandListPage + modal CRUD | `src/pages/brands/BrandListPage.tsx` |
| 2.2.3 | เขียน Tests | `__tests__/` |

---

### Module 2.3: กลุ่มสินค้า (Categories)
**Figma**: `2.3.1` – `2.3.5`

#### API Endpoints ที่ต้องการ
```
GET    /api/categories              # รายการกลุ่มสินค้า (tree structure)
GET    /api/categories/:id          # รายละเอียด
POST   /api/categories              # สร้าง
PATCH  /api/categories/:id          # แก้ไข
DELETE /api/categories/:id          # ลบ (กฎ: ห้ามลบถ้ามีสินค้าใช้งาน)
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 2.3.1 | สร้าง Category CRUD | `src/features/categories/` |
| 2.3.2 | สร้าง CategoryListPage + modal CRUD | `src/pages/categories/CategoryListPage.tsx` |
| 2.3.3 | เขียน Tests | `__tests__/` |

---

### Module 3.1: คลังสินค้า (Warehouses)
**Figma**: `3.1.1` – `3.1.7` (รายการ, ดู, แก้ไข, เพิ่มตำแหน่ง/Bin Location)

#### API Endpoints ที่ต้องการ
```
GET    /api/warehouses              # รายการคลังสินค้า
GET    /api/warehouses/:id          # รายละเอียด
POST   /api/warehouses              # สร้างคลัง
PATCH  /api/warehouses/:id          # แก้ไข
DELETE /api/warehouses/:id          # ลบ/ปิดใช้งาน

# Bin Location
GET    /api/warehouses/:id/bins     # รายการ Bin
POST   /api/warehouses/:id/bins     # เพิ่ม Bin
PATCH  /api/bins/:binId             # แก้ไข Bin
DELETE /api/bins/:binId             # ลบ Bin
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 3.1.1 | สร้าง Warehouse types & service | `src/features/warehouse/` |
| 3.1.2 | สร้าง WarehouseListPage | `src/pages/warehouse/WarehouseListPage.tsx` |
| 3.1.3 | สร้าง WarehouseDetailPage | `src/pages/warehouse/WarehouseDetailPage.tsx` |
| 3.1.4 | สร้าง WarehouseEditPage (+ Bin Location form) | `src/pages/warehouse/WarehouseEditPage.tsx` |
| 3.1.5 | สร้าง BinLocationForm | `src/features/warehouse/components/BinLocationForm.tsx` |
| 3.1.6 | เขียน Tests | `__tests__/` |

---

### Module 3.2: รับสินค้าเข้า (Goods Receipt)
**Figma**: `3.2.1` – `3.2.5`
**สถานะเอกสาร**: Draft → Received → Posted → Cancelled

#### API Endpoints ที่ต้องการ
```
GET    /api/goods-receipts          # รายการใบรับสินค้า (filter, pagination)
GET    /api/goods-receipts/:id      # รายละเอียด
POST   /api/goods-receipts          # สร้างใบรับเข้า
PATCH  /api/goods-receipts/:id      # แก้ไข
PATCH  /api/goods-receipts/:id/status  # เปลี่ยนสถานะ
DELETE /api/goods-receipts/:id      # ยกเลิก

# Lines
POST   /api/goods-receipts/:id/lines     # เพิ่มรายการสินค้า
PATCH  /api/goods-receipts/:id/lines/:lineId  # แก้ไขรายการ
DELETE /api/goods-receipts/:id/lines/:lineId  # ลบรายการ
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 3.2.1 | สร้าง GoodsReceipt types & service | `src/features/goods-receipt/` |
| 3.2.2 | สร้าง GoodsReceiptListPage | `src/pages/warehouse/GoodsReceiptListPage.tsx` |
| 3.2.3 | สร้าง GoodsReceiptDetailPage | `src/pages/warehouse/GoodsReceiptDetailPage.tsx` |
| 3.2.4 | สร้าง GoodsReceiptForm (header + line items) | `src/pages/warehouse/GoodsReceiptFormPage.tsx` |
| 3.2.5 | สร้าง LineItemTable component | `src/features/goods-receipt/components/LineItemTable.tsx` |
| 3.2.6 | เขียน Tests | `__tests__/` |

---

### Module 3.3: จัดการสินค้า / นับสต็อก (Stock Count)
**Figma**: `3.3.1` – `3.3.4`

#### API Endpoints ที่ต้องการ
```
GET    /api/stock-counts            # รายการนับสต็อก
GET    /api/stock-counts/:id        # รายละเอียด
POST   /api/stock-counts            # สร้าง
PATCH  /api/stock-counts/:id        # แก้ไข (พร้อมเหตุผล)
POST   /api/stock-counts/:id/confirm # ยืนยัน
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 3.3.1 | สร้าง StockCount types & service | `src/features/stock-count/` |
| 3.3.2 | สร้าง StockCountListPage | `src/pages/warehouse/StockCountListPage.tsx` |
| 3.3.3 | สร้าง StockCountDetailPage | `src/pages/warehouse/StockCountDetailPage.tsx` |
| 3.3.4 | สร้าง StockCountForm | `src/pages/warehouse/StockCountFormPage.tsx` |
| 3.3.5 | เขียน Tests | `__tests__/` |

---

### Module 3.4: โอนย้ายสินค้า (Stock Transfer)
**Figma**: `3.4.1` – `3.4.12`
**สถานะ**: Draft → รออนุมัติ → กำลังย้าย → ย้ายเสร็จสิ้น / ยกเลิก

#### API Endpoints ที่ต้องการ
```
GET    /api/stock-transfers          # รายการโอนย้าย (filter: all/draft/pending/moving/complete)
GET    /api/stock-transfers/:id      # รายละเอียด
POST   /api/stock-transfers          # สร้างการโอน
PATCH  /api/stock-transfers/:id      # แก้ไข (เฉพาะ draft)
PATCH  /api/stock-transfers/:id/submit   # ส่งอนุมัติ
PATCH  /api/stock-transfers/:id/approve  # อนุมัติ (admin)
PATCH  /api/stock-transfers/:id/reject   # ปฏิเสธ (admin)
PATCH  /api/stock-transfers/:id/complete # เสร็จสิ้น
DELETE /api/stock-transfers/:id      # ยกเลิก
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 3.4.1 | สร้าง StockTransfer types & service | `src/features/stock-transfer/` |
| 3.4.2 | สร้าง StockTransferListPage (filter + tabs) | `src/pages/warehouse/StockTransferListPage.tsx` |
| 3.4.3 | สร้าง StockTransferDetailPage | `src/pages/warehouse/StockTransferDetailPage.tsx` |
| 3.4.4 | สร้าง StockTransferForm (ต้นทาง/ปลายทาง/สินค้า/ผู้อนุมัติ) | `src/pages/warehouse/StockTransferFormPage.tsx` |
| 3.4.5 | สร้าง ApprovalActions (admin) | `src/features/stock-transfer/components/ApprovalActions.tsx` |
| 3.4.6 | เขียน Tests | `__tests__/` |

---

### Module 3.5: รายการสินค้าคงเหลือ (Stock Balance)
**Figma**: `3.5.1` – `3.5.4`

#### API Endpoints ที่ต้องการ
```
GET    /api/stock-balance            # สินค้าคงเหลือ (filter: SKU/ชื่อ/กลุ่ม/UOM/คลัง/วันที่)
GET    /api/stock-balance/:skuId     # รายละเอียดคงเหลือตาม SKU
GET    /api/stock-balance/:skuId/history  # ประวัติรับเข้า/โอนย้าย/ปรับปรุง
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 3.5.1 | สร้าง StockBalance types & service | `src/features/stock-balance/` |
| 3.5.2 | สร้าง StockBalancePage (filter + table + expiry highlight) | `src/pages/warehouse/StockBalancePage.tsx` |
| 3.5.3 | สร้าง StockBalanceDetail (ข้อมูลสินค้า + คงเหลือ/คลัง + ประวัติ) | `src/pages/warehouse/StockBalanceDetailPage.tsx` |
| 3.5.4 | เขียน Tests | `__tests__/` |

---

### Module 5: บริการ & ซ่อม (Service & Repair)
**Figma**: `ใบรับรถ - *`, `ซ่อมบำรุง`, `บริการ & ซ่อม`, `ใบส่งมอบรถ`, `การรับประกัน`, `บริการล้างรถ`

#### API Endpoints ที่ต้องการ
```
# ใบรับรถ (Vehicle Receiving)
GET    /api/service-orders           # รายการใบรับรถ
GET    /api/service-orders/:id       # รายละเอียด
POST   /api/service-orders           # สร้างใบรับรถ
PATCH  /api/service-orders/:id       # แก้ไข
PATCH  /api/service-orders/:id/status # เปลี่ยนสถานะ

# Pre-assessment / Checklist
GET    /api/service-orders/:id/assessment  # ข้อมูลตรวจประเมิน
POST   /api/service-orders/:id/assessment  # บันทึกการตรวจ

# Repair Jobs
GET    /api/service-orders/:id/jobs  # รายการงานซ่อม
POST   /api/service-orders/:id/jobs  # เพิ่มงานซ่อม
PATCH  /api/jobs/:jobId              # อัปเดตสถานะงาน

# Delivery (ใบส่งมอบ)
POST   /api/service-orders/:id/delivery  # สร้างใบส่งมอบ
GET    /api/service-orders/:id/delivery  # ดูใบส่งมอบ

# Warranty (รับประกัน)
GET    /api/warranties               # รายการรับประกัน
POST   /api/warranties               # สร้างรับประกัน
GET    /api/warranties/:id           # รายละเอียด

# Photo Comparison (ภาพก่อน-หลัง)
GET    /api/service-orders/:id/photos  # รูปก่อน-หลังซ่อม
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 5.1 | สร้าง Service types & service layer | `src/features/service/` |
| 5.2 | สร้าง ServiceOrderListPage | `src/pages/service/ServiceOrderListPage.tsx` |
| 5.3 | สร้าง VehicleReceivingForm (ใบรับรถ - ก่อนตรวจประเมิน) | `src/pages/service/VehicleReceivingFormPage.tsx` |
| 5.4 | สร้าง PreAssessmentChecklist | `src/features/service/components/PreAssessmentChecklist.tsx` |
| 5.5 | สร้าง RepairJobBoard (บอร์ดงานซ่อม) | `src/pages/service/RepairJobBoardPage.tsx` |
| 5.6 | สร้าง DeliveryForm (ใบส่งมอบรถ) | `src/pages/service/DeliveryFormPage.tsx` |
| 5.7 | สร้าง WarrantyPage | `src/pages/service/WarrantyPage.tsx` |
| 5.8 | สร้าง PhotoComparison (side-by-side ก่อน-หลัง) | `src/features/service/components/PhotoComparison.tsx` |
| 5.9 | เขียน Tests | `__tests__/` |

---

### Module 6: เอกสารการเงิน (Financial Documents)
**Figma**: `ใบเสนอราคา`, `ใบเสนอราคา-นิติบุคคล`, `ใบแจ้งหนี้/ชำระเงิน`, `ใบเสร็จรับเงิน`, `การเงิน & ใบเสร็จ`, `การชำระเงิน`

#### API Endpoints ที่ต้องการ
```
# ใบเสนอราคา (Quotation)
GET    /api/quotations               # รายการใบเสนอราคา
GET    /api/quotations/:id           # รายละเอียด
POST   /api/quotations               # สร้าง
PATCH  /api/quotations/:id           # แก้ไข
DELETE /api/quotations/:id           # ยกเลิก
POST   /api/quotations/:id/pdf       # สร้าง PDF

# ใบแจ้งหนี้ (Invoice)
GET    /api/invoices                 # รายการใบแจ้งหนี้
GET    /api/invoices/:id             # รายละเอียด
POST   /api/invoices                 # สร้าง
PATCH  /api/invoices/:id             # แก้ไข

# ใบเสร็จรับเงิน (Receipt)
GET    /api/receipts                 # รายการใบเสร็จ
GET    /api/receipts/:id             # รายละเอียด
POST   /api/receipts                 # สร้าง
POST   /api/receipts/:id/pdf         # สร้าง PDF

# การชำระเงิน (Payment)
POST   /api/payments                 # บันทึกการชำระ
GET    /api/payments                 # รายการชำระเงิน
GET    /api/payments/:id             # รายละเอียด
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 6.1 | สร้าง Financial doc types | `src/features/finance/types.ts` |
| 6.2 | สร้าง Service layer (quotation, invoice, receipt, payment) | `src/api/finance*.ts` |
| 6.3 | สร้าง QuotationListPage + Form | `src/pages/finance/QuotationPage.tsx` |
| 6.4 | สร้าง InvoiceListPage + Form | `src/pages/finance/InvoicePage.tsx` |
| 6.5 | สร้าง ReceiptListPage + Form | `src/pages/finance/ReceiptPage.tsx` |
| 6.6 | สร้าง PaymentForm (เงินสด/โอนบัญชี/อื่นๆ) | `src/features/finance/components/PaymentForm.tsx` |
| 6.7 | สร้าง PDF Preview component | `src/features/finance/components/PdfPreview.tsx` |
| 6.8 | สร้าง Customer Finance Tab (การเงิน & ใบเสร็จ บุคคล/นิติบุคคล) | `src/features/finance/components/CustomerFinanceTab.tsx` |
| 6.9 | เขียน Tests | `__tests__/` |

---

## Phase 3: Advanced Features (P2)

### Module 4.1: ไฟแนนซ์ สินเชื่อ (Finance/Credit)
**Figma**: `4.1.1 ไฟแนนซ์ สินเชื่อ`

#### API Endpoints ที่ต้องการ
```
GET    /api/credits                  # รายการสินเชื่อ
GET    /api/credits/:id              # รายละเอียด
POST   /api/credits                  # สร้างสินเชื่อ
PATCH  /api/credits/:id              # แก้ไข
GET    /api/credits/:id/installments # งวดผ่อน
POST   /api/credits/:id/installments/:installId/pay  # ชำระงวด
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 4.1.1 | สร้าง Credit types & service | `src/features/credit/` |
| 4.1.2 | สร้าง CreditListPage | `src/pages/finance/CreditListPage.tsx` |
| 4.1.3 | สร้าง CreditDetailPage (+ ตารางงวดผ่อน) | `src/pages/finance/CreditDetailPage.tsx` |
| 4.1.4 | เขียน Tests | `__tests__/` |

---

### Module 7: ถ่ายภาพ GPS / Photo Capture (Mobile)
**Figma**: `[Mobile] Create invoice`, Photo Capture spec
**เป้าหมาย**: Mobile-responsive / PWA

#### API Endpoints ที่ต้องการ
```
POST   /api/photo-sessions          # สร้าง capture session
POST   /api/photo-sessions/:id/photos  # อัปโหลดรูป (พร้อม GPS metadata)
GET    /api/photo-sessions/:id       # รายละเอียด session
PATCH  /api/photo-sessions/:id/submit  # ส่งตรวจ
PATCH  /api/photo-sessions/:id/approve # อนุมัติ
GET    /api/photo-sessions/:id/compare # เปรียบเทียบภาพก่อน-หลัง
GET    /api/photo-history            # ประวัติและค้นหา

# Settings
GET    /api/photo-settings/watermark  # ตั้งค่าลายน้ำ
PATCH  /api/photo-settings/watermark  # แก้ไขลายน้ำ
GET    /api/photo-settings/policy     # นโยบายกล้อง
PATCH  /api/photo-settings/policy     # แก้ไขนโยบาย
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 7.1 | สร้าง Photo Capture types & service | `src/features/photo-capture/` |
| 7.2 | สร้าง CameraCapture component (getUserMedia) | `src/features/photo-capture/components/CameraCapture.tsx` |
| 7.3 | สร้าง HandoverCapturePage | `src/pages/mobile/HandoverCapturePage.tsx` |
| 7.4 | สร้าง PhotoComparisonPage (side-by-side + slider) | `src/pages/mobile/PhotoComparisonPage.tsx` |
| 7.5 | สร้าง PhotoHistoryPage | `src/pages/mobile/PhotoHistoryPage.tsx` |
| 7.6 | สร้าง WatermarkSettingsPage | `src/pages/settings/WatermarkSettingsPage.tsx` |
| 7.7 | เขียน Tests | `__tests__/` |

---

### Module 8: รายงาน (Reports & Analytics)
**Figma**: `รายงาน & การวิเคราะห์ข้อมูล`, `รายงานใบเสร็จ`, `รายงานด่วน`

#### API Endpoints ที่ต้องการ
```
GET    /api/reports/sales            # รายงานยอดขาย
GET    /api/reports/inventory        # รายงานสินค้าคงคลัง
GET    /api/reports/receipts         # รายงานใบเสร็จ
GET    /api/reports/service          # รายงานงานซ่อม
GET    /api/reports/quick            # รายงานด่วน
POST   /api/reports/export           # Export CSV/PDF
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 8.1 | สร้าง Report types & service | `src/features/reports/` |
| 8.2 | สร้าง ReportDashboardPage | `src/pages/reports/ReportDashboardPage.tsx` |
| 8.3 | สร้าง Charts components (line, bar, pie) | `src/features/reports/components/Charts.tsx` |
| 8.4 | สร้าง ReportExport utilities | `src/features/reports/utils/export.ts` |
| 8.5 | เขียน Tests | `__tests__/` |

---

### Module 9: การจัดการพนักงาน (HR/Employee)
**Figma**: `การจัดการพนักงาน`

#### API Endpoints ที่ต้องการ
```
GET    /api/employees                # รายการพนักงาน
GET    /api/employees/:id            # รายละเอียด
POST   /api/employees                # สร้าง
PATCH  /api/employees/:id            # แก้ไข
DELETE /api/employees/:id            # ลบ/ปิดใช้งาน
GET    /api/roles                    # รายการ roles
POST   /api/roles                    # สร้าง role
PATCH  /api/roles/:id               # แก้ไข role
GET    /api/permissions              # รายการ permissions
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 9.1 | สร้าง Employee types & service | `src/features/employees/` |
| 9.2 | สร้าง EmployeeListPage | `src/pages/hr/EmployeeListPage.tsx` |
| 9.3 | สร้าง EmployeeForm | `src/pages/hr/EmployeeFormPage.tsx` |
| 9.4 | สร้าง RoleManagementPage | `src/pages/hr/RoleManagementPage.tsx` |
| 9.5 | เขียน Tests | `__tests__/` |

---

### Module 10: ตั้งค่าระบบ (Settings/Permissions)
**Figma**: `เมนู / สิทธิ์การกระทำ`, `การตั้งค่าต้นทุน`

#### API Endpoints ที่ต้องการ
```
GET    /api/settings                 # ตั้งค่าระบบ
PATCH  /api/settings                 # แก้ไขตั้งค่า
GET    /api/settings/cost            # การตั้งค่าต้นทุน
PATCH  /api/settings/cost            # แก้ไขตั้งค่าต้นทุน
GET    /api/menus                    # เมนู/สิทธิ์
PATCH  /api/roles/:id/permissions    # กำหนดสิทธิ์
```

#### Frontend Tasks
| # | Task | Files |
|---|------|-------|
| 10.1 | สร้าง Settings types & service | `src/features/settings/` |
| 10.2 | สร้าง GeneralSettingsPage | `src/pages/settings/GeneralSettingsPage.tsx` |
| 10.3 | สร้าง CostSettingsPage | `src/pages/settings/CostSettingsPage.tsx` |
| 10.4 | สร้าง PermissionMatrixPage | `src/pages/settings/PermissionMatrixPage.tsx` |
| 10.5 | เขียน Tests | `__tests__/` |

---

## Shared Components (สร้างก่อนเริ่ม Phase 1)

| Component | Location | ใช้ใน |
|-----------|----------|-------|
| `AppLayout` (Sidebar + Navbar) | `src/components/layout/AppLayout.tsx` | ทุกหน้า |
| `Sidebar` (เมนูด้านข้าง) | `src/components/layout/Sidebar.tsx` | ทุกหน้า |
| `DataTable` (ตาราง + sort + pagination) | `src/components/ui/DataTable.tsx` | ทุกหน้า list |
| `FilterPanel` (ตัวกรอง) | `src/components/ui/FilterPanel.tsx` | ทุกหน้า list |
| `SearchInput` | `src/components/ui/SearchInput.tsx` | ทุกหน้า list |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | เอกสารทุกประเภท |
| `ConfirmModal` (ยืนยัน/ลบ) | `src/components/ui/ConfirmModal.tsx` | ทุกหน้า CRUD |
| `SuccessModal` | `src/components/ui/SuccessModal.tsx` | ทุกหน้า CRUD |
| `FileUpload` | `src/components/forms/FileUpload.tsx` | แนบเอกสาร/รูป |
| `DateRangePicker` | `src/components/forms/DateRangePicker.tsx` | ฟิลเตอร์วันที่ |
| `AddressForm` | `src/components/forms/AddressForm.tsx` | ลูกค้า, คลังสินค้า |
| `cn()` utility | `src/lib/utils.ts` | ทุก component |

---

## ลำดับการพัฒนา (Recommended Order)

```
Week 1-2: Foundation
  ├── Project setup (Vite + React + TS + Tailwind + Flowbite)
  ├── Shared components (Layout, DataTable, modals, utils)
  ├── Auth module (Module 0)
  └── Route configuration

Week 3-4: Phase 1 Core
  ├── Dashboard (Module 1.1)
  ├── Customer CRM (Module 1.2)
  └── Products & SKU (Module 2.4)

Week 5-6: Phase 2a — Master Data
  ├── Vendors (Module 2.1)
  ├── Brands (Module 2.2)
  └── Categories (Module 2.3)

Week 7-9: Phase 2b — Inventory
  ├── Warehouses (Module 3.1)
  ├── Goods Receipt (Module 3.2)
  ├── Stock Count (Module 3.3)
  ├── Stock Transfer (Module 3.4)
  └── Stock Balance (Module 3.5)

Week 10-12: Phase 2c — Business
  ├── Service & Repair (Module 5)
  └── Financial Documents (Module 6)

Week 13-15: Phase 3 — Advanced
  ├── Finance/Credit (Module 4.1)
  ├── Photo Capture Mobile (Module 7)
  ├── Reports (Module 8)
  ├── HR (Module 9)
  └── Settings (Module 10)

Week 16: Polish & QA
  ├── E2E testing
  ├── Performance optimization
  └── Documentation
```

---

## วิธีใช้แผนนี้ในการพัฒนา

เมื่อต้องการเริ่มทำแต่ละ module ให้ใช้ Copilot agents/prompts:

1. **ดึง Design**: `@frontend-dev` วาง Figma URL ของ frame ที่ต้องการ
2. **สร้าง API Service**: `/create-api-service` ตาม endpoints ในแผน
3. **สร้าง Components**: `/create-crud-page` หรือ `/figma-to-code`
4. **เขียน Tests**: `/write-tests` สำหรับ component ที่สร้าง
5. **สร้างเอกสาร**: `/create-docs` สำหรับ module ที่เสร็จ
