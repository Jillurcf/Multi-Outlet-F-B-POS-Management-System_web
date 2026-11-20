import axios from 'axios';
import type {
  AuthUser,
  DailySalesDto,
  HqDashboardDto,
  LoginResponse,
  LowStockItemDto,
  MenuItemDto,
  OutletDashboardDto,
  OutletDto,
  OutletInventoryDto,
  OutletMenuItemDto,
  OutletRevenueDto,
  OutletTransactionCountDto,
  Paginated,
  ReceiptDto,
  SaleDto,
  SalesSummaryDto,
  StockMovementDto,
  TopSellingItemDto
} from '@pos/shared';
import { demoAdapter } from './demo';

const TOKEN_KEY = 'pos_token';
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const api = axios.create({
  baseURL,
  ...(demoMode ? { adapter: demoAdapter } : {})
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.url !== '/auth/login' &&
      tokenStorage.get()
    ) {
      tokenStorage.clear();

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function getOutletMenu(page = 1, limit = 100): Promise<Paginated<OutletMenuItemDto>> {
  const { data } = await api.get<Paginated<OutletMenuItemDto>>('/outlet/menu-items', {
    params: { page, limit }
  });
  return data;
}

export async function getOutletDashboard(): Promise<OutletDashboardDto> {
  const { data } = await api.get<OutletDashboardDto>('/dashboard/outlet');
  return data;
}

export async function getSales(page = 1, limit = 10): Promise<Paginated<SaleDto>> {
  const { data } = await api.get<Paginated<SaleDto>>('/outlet/sales', {
    params: { page, limit }
  });
  return data;
}

export async function createSale(
  items: Array<{ outletMenuItemId: string; quantity: number }>,
  idempotencyKey: string
): Promise<SaleDto> {
  const { data } = await api.post<SaleDto>(
    '/outlet/sales',
    { items },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
  return data;
}

export async function getReceipt(saleId: string): Promise<ReceiptDto> {
  const { data } = await api.get<ReceiptDto>(`/outlet/sales/${saleId}/receipt`);
  return data;
}

export async function getOutletInventory(
  page = 1,
  limit = 100
): Promise<Paginated<OutletInventoryDto>> {
  const { data } = await api.get<Paginated<OutletInventoryDto>>('/outlet/inventory', {
    params: { page, limit }
  });
  return data;
}

export async function getStockMovements(
  page = 1,
  limit = 20,
  outletMenuItemId?: string
): Promise<Paginated<StockMovementDto>> {
  const { data } = await api.get<Paginated<StockMovementDto>>('/outlet/inventory/movements', {
    params: { page, limit, ...(outletMenuItemId ? { outletMenuItemId } : {}) }
  });
  return data;
}

export async function addStock(
  outletMenuItemId: string,
  quantity: number,
  note?: string
): Promise<OutletInventoryDto> {
  const { data } = await api.post<OutletInventoryDto>(
    `/outlet/inventory/${outletMenuItemId}/stock`,
    { quantity, ...(note ? { note } : {}) }
  );
  return data;
}

export async function updateInventory(
  outletMenuItemId: string,
  input: { quantity?: number; lowStockThreshold?: number }
): Promise<OutletInventoryDto> {
  const { data } = await api.patch<OutletInventoryDto>(
    `/outlet/inventory/${outletMenuItemId}`,
    input
  );
  return data;
}

export interface OutletInput {
  code: string;
  name: string;
  address?: string | null;
}

export interface MenuItemInput {
  sku: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface OutletMenuInput {
  menuItemId: string;
  priceCents: number;
  isAvailable?: boolean;
}

export interface StaffInput {
  email: string;
  password: string;
  fullName: string;
  outletId: string;
}

export async function listOutlets(page = 1, limit = 100): Promise<Paginated<OutletDto>> {
  const { data } = await api.get<Paginated<OutletDto>>('/outlets', { params: { page, limit } });
  return data;
}

export async function createOutlet(input: OutletInput): Promise<OutletDto> {
  const { data } = await api.post<OutletDto>('/outlets', input);
  return data;
}

export async function updateOutlet(id: string, input: Partial<OutletInput>): Promise<OutletDto> {
  const { data } = await api.patch<OutletDto>(`/outlets/${id}`, input);
  return data;
}

export async function deactivateOutlet(id: string): Promise<void> {
  await api.delete(`/outlets/${id}`);
}

export async function listMenuItems(page = 1, limit = 100): Promise<Paginated<MenuItemDto>> {
  const { data } = await api.get<Paginated<MenuItemDto>>('/menu-items', { params: { page, limit } });
  return data;
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItemDto> {
  const { data } = await api.post<MenuItemDto>('/menu-items', input);
  return data;
}

export async function updateMenuItem(
  id: string,
  input: Partial<MenuItemInput>
): Promise<MenuItemDto> {
  const { data } = await api.patch<MenuItemDto>(`/menu-items/${id}`, input);
  return data;
}

export async function deactivateMenuItem(id: string): Promise<void> {
  await api.delete(`/menu-items/${id}`);
}

export async function listOutletMenu(
  outletId: string,
  page = 1,
  limit = 100
): Promise<Paginated<OutletMenuItemDto>> {
  const { data } = await api.get<Paginated<OutletMenuItemDto>>(`/outlets/${outletId}/menu-items`, {
    params: { page, limit }
  });
  return data;
}

export async function assignOutletMenuItem(
  outletId: string,
  input: OutletMenuInput
): Promise<OutletMenuItemDto> {
  const { data } = await api.post<OutletMenuItemDto>(`/outlets/${outletId}/menu-items`, input);
  return data;
}

export async function updateOutletMenuItem(
  outletId: string,
  menuItemId: string,
  input: { priceCents?: number; isAvailable?: boolean }
): Promise<OutletMenuItemDto> {
  const { data } = await api.patch<OutletMenuItemDto>(
    `/outlets/${outletId}/menu-items/${menuItemId}`,
    input
  );
  return data;
}

export async function deactivateOutletMenuItem(outletId: string, menuItemId: string): Promise<void> {
  await api.delete(`/outlets/${outletId}/menu-items/${menuItemId}`);
}

export async function createStaff(input: StaffInput): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/users/staff', input);
  return data;
}

export async function getHqDashboard(): Promise<HqDashboardDto> {
  const { data } = await api.get<HqDashboardDto>('/dashboard/hq');
  return data;
}

export async function getDailySales(from: string, to: string): Promise<DailySalesDto[]> {
  const { data } = await api.get<DailySalesDto[]>('/reports/sales/daily', {
    params: { from, to }
  });
  return data;
}

export async function getSalesSummary(from: string, to: string): Promise<SalesSummaryDto> {
  const { data } = await api.get<SalesSummaryDto>('/reports/sales/summary', {
    params: { from, to }
  });
  return data;
}

export async function getLowStock(page = 1, limit = 100): Promise<Paginated<LowStockItemDto>> {
  const { data } = await api.get<Paginated<LowStockItemDto>>('/reports/low-stock', {
    params: { page, limit }
  });
  return data;
}

export async function getRevenueByOutlet(from: string, to: string): Promise<OutletRevenueDto[]> {
  const { data } = await api.get<OutletRevenueDto[]>('/reports/revenue/by-outlet', {
    params: { from, to }
  });
  return data;
}

export async function getTransactionCountByOutlet(
  from: string,
  to: string
): Promise<OutletTransactionCountDto[]> {
  const { data } = await api.get<OutletTransactionCountDto[]>('/reports/transactions/by-outlet', {
    params: { from, to }
  });
  return data;
}

export async function getTopSellingItems(from: string, to: string): Promise<TopSellingItemDto[]> {
  const { data } = await api.get<TopSellingItemDto[]>('/reports/top-items', {
    params: { from, to }
  });
  return data;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { message?: string } } | undefined;
    return body?.error?.message ?? error.message;
  }

  return 'Unexpected error';
}
