---
name: api-integration
description: "เชื่อมต่อ API กับ React frontend. Use when connecting REST APIs, creating service layers, generating TypeScript types from API specs, setting up Axios interceptors, building custom hooks for data fetching, or working with Postman collections. Covers CRUD operations, authentication, error handling, and pagination."
argument-hint: "API endpoint หรือ feature ที่ต้องการเชื่อมต่อ"
---

# API Integration Skill

เชื่อมต่อ React frontend กับ REST API โดยใช้ Axios + custom hooks

## When to Use
- สร้าง service layer สำหรับ API endpoint ใหม่
- สร้าง TypeScript types จาก API specification
- สร้าง custom hooks สำหรับ data fetching
- ตั้งค่า Axios instance, interceptors, error handling
- Import API specification จาก Postman collection

## Procedure

### 1. รวบรวม API Specification

#### จาก Postman MCP (ถ้ามี)
- ใช้ Postman MCP tools เพื่อดึง API collection
- ดูรายละเอียด endpoints: method, path, request/response schema
- ดู example responses

#### จากเอกสาร
- อ่าน API documentation / Swagger / OpenAPI spec
- ระบุ base URL, authentication method, endpoints

### 2. สร้าง Types

สร้างไฟล์ types ใน `src/types/` หรือ `src/features/<feature>/types.ts`

```tsx
// src/types/api.ts — Shared API types
export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
```

```tsx
// src/features/products/types.ts — Feature types
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;
```

### 3. สร้าง Axios Instance

```tsx
// src/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 4. สร้าง Service Functions

สร้างใน `src/api/` — 1 ไฟล์ต่อ 1 resource

```tsx
// src/api/productService.ts
import { apiClient } from './client';
import type { Product, CreateProductPayload, UpdateProductPayload } from '@/features/products/types';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export const productService = {
  getAll: (params?: { page?: number; pageSize?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<Product>>('/products', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/${id}`),

  create: (payload: CreateProductPayload) =>
    apiClient.post<ApiResponse<Product>>('/products', payload),

  update: (id: string, payload: UpdateProductPayload) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/products/${id}`),
};
```

### 5. สร้าง Custom Hooks

```tsx
// src/features/products/hooks/useProducts.ts
import { useState, useEffect, useCallback } from 'react';
import { productService } from '@/api/productService';
import type { Product } from '../types';

interface UseProductsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const useProducts = (options: UseProductsOptions = {}) => {
  const [data, setData] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productService.getAll(options);
      setData(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  }, [options.page, options.pageSize, options.search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { data, total, isLoading, error, refetch: fetchProducts };
};
```

```tsx
// src/features/products/hooks/useProductMutation.ts
import { useState } from 'react';
import { productService } from '@/api/productService';
import type { CreateProductPayload, UpdateProductPayload } from '../types';

export const useProductMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = async (payload: CreateProductPayload) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productService.create(payload);
      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (id: string, payload: UpdateProductPayload) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productService.update(id, payload);
      return response.data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await productService.delete(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { createProduct, updateProduct, deleteProduct, isLoading, error };
};
```

### 6. Checklist
- [ ] TypeScript types ตรงกับ API response
- [ ] Service function ครบทุก endpoint (CRUD)
- [ ] Custom hooks จัดการ loading, error, data states
- [ ] Error handling — แสดง toast notification เมื่อ error
- [ ] Authentication token ส่งผ่าน interceptor
- [ ] Environment variable สำหรับ base URL
- [ ] ไม่ hardcode API URLs
- [ ] Pagination support (ถ้า API รองรับ)

## Postman MCP Integration
เมื่อ Postman MCP พร้อมใช้งาน:
1. ดึง collection จาก Postman workspace
2. อ่าน endpoint details (method, path, headers, body schema)
3. ดู example request/response
4. Generate TypeScript types จาก response schema
5. สร้าง service functions จาก endpoints
