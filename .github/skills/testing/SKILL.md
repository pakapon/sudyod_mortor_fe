---
name: testing
description: "ทดสอบระบบ frontend. Use when writing unit tests, component tests, integration tests, E2E tests, testing React hooks, testing API integration, testing forms, or setting up test infrastructure. Covers Vitest, React Testing Library, and Playwright."
argument-hint: "component/feature ที่ต้องการทดสอบ หรือประเภท test"
---

# Testing Skill

ทดสอบระบบ frontend ด้วย Vitest + React Testing Library + Playwright

## When to Use
- เขียน unit tests สำหรับ hooks, utilities
- เขียน component tests
- เขียน integration tests สำหรับ API
- เขียน E2E tests สำหรับ user flows
- ตั้งค่า test infrastructure

## Test Strategy

| Layer | Tool | ทดสอบอะไร | Location |
|-------|------|-----------|----------|
| Unit | Vitest | Hooks, utilities, pure functions | `__tests__/` or `.test.ts` |
| Component | Vitest + RTL | React components, user interaction | `__tests__/` or `.test.tsx` |
| Integration | Vitest + MSW | API integration, data flow | `__tests__/integration/` |
| E2E | Playwright | Critical user flows | `e2e/` |

## Procedure

### 1. Unit Test — Hooks & Utilities

```tsx
// src/hooks/__tests__/useDebounce.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('world');
  });
});
```

### 2. Component Test — React Testing Library

```tsx
// src/features/products/components/__tests__/ProductCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../ProductCard';

const mockProduct = {
  id: '1',
  name: 'สินค้าทดสอบ',
  price: 1500,
  description: 'รายละเอียดสินค้า',
  imageUrl: '/test.jpg',
  category: 'electronics',
};

describe('ProductCard', () => {
  it('should render product information', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('สินค้าทดสอบ')).toBeInTheDocument();
    expect(screen.getByText('฿1,500')).toBeInTheDocument();
    expect(screen.getByText('รายละเอียดสินค้า')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ProductCard product={mockProduct} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /แก้ไข/i }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('should show confirmation before delete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ProductCard product={mockProduct} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /ลบ/i }));
    expect(screen.getByText(/ยืนยันการลบ/i)).toBeInTheDocument();
  });
});
```

### 3. Form Test

```tsx
// src/components/forms/__tests__/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/i }));

    await waitFor(() => {
      expect(screen.getByText(/กรุณากรอก username/i)).toBeInTheDocument();
      expect(screen.getByText(/กรุณากรอก password/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
      });
    });
  });

  it('should show loading state during submission', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading />);
    expect(screen.getByRole('button', { name: /เข้าสู่ระบบ/i })).toBeDisabled();
  });
});
```

### 4. API Integration Test (MSW)

```tsx
// src/api/__tests__/productService.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { productService } from '../productService';

const server = setupServer(
  http.get('*/products', () => {
    return HttpResponse.json({
      data: [{ id: '1', name: 'Product 1', price: 100 }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  }),

  http.post('*/products', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: { id: '2', ...body },
      message: 'Created',
      status: 201,
    });
  }),

  http.delete('*/products/:id', () => {
    return HttpResponse.json({
      data: null,
      message: 'Deleted',
      status: 200,
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('productService', () => {
  it('should fetch products', async () => {
    const response = await productService.getAll();
    expect(response.data.data).toHaveLength(1);
    expect(response.data.data[0].name).toBe('Product 1');
  });

  it('should create a product', async () => {
    const response = await productService.create({
      name: 'New Product',
      price: 200,
      description: 'Test',
      imageUrl: '/test.jpg',
      category: 'test',
    });
    expect(response.data.data.name).toBe('New Product');
  });

  it('should handle API errors', async () => {
    server.use(
      http.get('*/products', () => {
        return HttpResponse.json(
          { message: 'Server Error' },
          { status: 500 }
        );
      })
    );

    await expect(productService.getAll()).rejects.toThrow();
  });
});
```

### 5. E2E Test (Playwright)

```tsx
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/i }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/ยินดีต้อนรับ/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/username/i).fill('wrong');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/i }).click();

    await expect(page.getByText(/ข้อมูลไม่ถูกต้อง/i)).toBeVisible();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
```

```tsx
// e2e/products.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Products CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/i }).click();
    await page.waitForURL('/dashboard');
  });

  test('should display products list', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should create a new product', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('button', { name: /เพิ่มสินค้า/i }).click();

    await page.getByLabel(/ชื่อสินค้า/i).fill('สินค้าทดสอบ');
    await page.getByLabel(/ราคา/i).fill('1500');
    await page.getByRole('button', { name: /บันทึก/i }).click();

    await expect(page.getByText(/บันทึกสำเร็จ/i)).toBeVisible();
  });
});
```

### 6. Test Configuration

#### Vitest Setup
```tsx
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```tsx
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

#### Playwright Setup
```tsx
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Checklist
- [ ] Unit tests สำหรับ hooks และ utility functions
- [ ] Component tests สำหรับ UI components
- [ ] Form validation tests
- [ ] API integration tests ด้วย MSW
- [ ] E2E tests สำหรับ critical user flows
- [ ] Test coverage ≥ 80%
- [ ] ทุก test มี descriptive name (ภาษาอังกฤษ)
- [ ] Mock external dependencies อย่างถูกต้อง
- [ ] No flaky tests
