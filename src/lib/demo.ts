import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';
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
  SaleItemDto,
  SalesSummaryDto,
  StockMovementDto,
  TopSellingItemDto
} from '@pos/shared';

type Body = Record<string, unknown>;

interface DemoUser extends AuthUser {
  password: string;
}

interface MenuSeed {
  sku: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  stockMain: number;
  stockNorth: number;
  threshold: number;
}

export const demoEmails = {
  admin: 'admin@pos.local',
  staff: 'staff.main@pos.local'
};

const baseTime = new Date();
const minute = 60_000;
const day = 86_400_000;

function iso(minutesAgo: number): string {
  return new Date(baseTime.getTime() - minutesAgo * minute).toISOString();
}

function daysAgoIso(days: number): string {
  return new Date(baseTime.getTime() - days * day).toISOString();
}

let sequence = 0;
function uid(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence.toString().padStart(6, '0')}`;
}

const outlets: OutletDto[] = [
  {
    id: 'outlet-main',
    code: 'MAIN',
    name: 'Main Outlet',
    address: '1 Main Street, City Center',
    isActive: true,
    createdAt: daysAgoIso(90),
    updatedAt: iso(120)
  },
  {
    id: 'outlet-north',
    code: 'NORTH',
    name: 'North Outlet',
    address: '88 North Avenue, Northside',
    isActive: true,
    createdAt: daysAgoIso(60),
    updatedAt: iso(240)
  },
  {
    id: 'outlet-airport',
    code: 'AIRPORT',
    name: 'Airport Kiosk',
    address: 'Terminal 2, Gate 12',
    isActive: false,
    createdAt: daysAgoIso(30),
    updatedAt: iso(1_440)
  }
];

const menuSeeds: MenuSeed[] = [
  { sku: 'COF-001', name: 'Espresso', category: 'Beverages', description: 'Double shot', priceCents: 3500, stockMain: 48, stockNorth: 36, threshold: 12 },
  { sku: 'COF-002', name: 'Cafe Latte', category: 'Beverages', description: 'Espresso with steamed milk', priceCents: 4500, stockMain: 40, stockNorth: 28, threshold: 12 },
  { sku: 'COF-003', name: 'Cappuccino', category: 'Beverages', description: 'Foamy espresso classic', priceCents: 4200, stockMain: 32, stockNorth: 8, threshold: 10 },
  { sku: 'TEA-001', name: 'Green Tea', category: 'Beverages', description: 'Hot or iced', priceCents: 2800, stockMain: 30, stockNorth: 24, threshold: 10 },
  { sku: 'BTC-001', name: 'Bottled Water', category: 'Beverages', description: '500ml', priceCents: 1500, stockMain: 60, stockNorth: 45, threshold: 15 },
  { sku: 'BAK-001', name: 'Butter Croissant', category: 'Pastries', description: 'Fresh baked', priceCents: 3200, stockMain: 6, stockNorth: 18, threshold: 10 },
  { sku: 'BAK-002', name: 'Club Sandwich', category: 'Pastries', description: 'Chicken and bacon', priceCents: 7800, stockMain: 22, stockNorth: 7, threshold: 8 },
  { sku: 'DES-001', name: 'Chocolate Cake', category: 'Desserts', description: 'Rich chocolate slice', priceCents: 5500, stockMain: 16, stockNorth: 4, threshold: 8 }
];

const menuItems: MenuItemDto[] = menuSeeds.map((seed) => ({
  id: `item-${seed.sku.toLowerCase()}`,
  sku: seed.sku,
  name: seed.name,
  category: seed.category,
  description: seed.description,
  isActive: true,
  createdAt: daysAgoIso(90),
  updatedAt: iso(240)
}));

const outletMenu: OutletMenuItemDto[] = outlets
  .filter((outlet) => outlet.isActive)
  .flatMap((outlet) =>
    menuSeeds.map((seed) => ({
      id: `assign-${outlet.code.toLowerCase()}-${seed.sku.toLowerCase()}`,
      outletId: outlet.id,
      menuItemId: `item-${seed.sku.toLowerCase()}`,
      sku: seed.sku,
      name: seed.name,
      category: seed.category,
      description: seed.description,
      priceCents: seed.priceCents + (outlet.code === 'NORTH' ? 300 : 0),
      isAvailable: true,
      quantity: outlet.code === 'NORTH' ? seed.stockNorth : seed.stockMain,
      lowStockThreshold: seed.threshold,
      createdAt: daysAgoIso(60),
      updatedAt: iso(60)
    }))
  );

const users: DemoUser[] = [
  {
    id: 'user-admin',
    email: demoEmails.admin,
    password: 'admin',
    fullName: 'Demo HQ Admin',
    role: 'HQ_ADMIN',
    outletId: null
  },
  {
    id: 'user-staff-main',
    email: demoEmails.staff,
    password: 'staff',
    fullName: 'Main Outlet Cashier',
    role: 'OUTLET_STAFF',
    outletId: 'outlet-main'
  },
  {
    id: 'user-staff-north',
    email: 'staff.north@pos.local',
    password: 'staff',
    fullName: 'North Outlet Cashier',
    role: 'OUTLET_STAFF',
    outletId: 'outlet-north'
  }
];

const sales: SaleDto[] = [];
const movements: StockMovementDto[] = [];
const receiptCounters: Record<string, number> = {};
const idempotencyResults = new Map<string, SaleDto>();

for (const assignment of outletMenu) {
  movements.push({
    id: uid('movement'),
    outletId: assignment.outletId,
    outletMenuItemId: assignment.id,
    sku: assignment.sku,
    name: assignment.name,
    movementType: 'RESTOCK',
    quantityBefore: 0,
    quantityChange: assignment.quantity,
    quantityAfter: assignment.quantity,
    actorUserId: 'user-admin',
    saleId: null,
    note: 'Initial stock',
    createdAt: assignment.createdAt
  });
}

function buildSale(
  outlet: OutletDto,
  cashierName: string,
  createdAt: string,
  receiptNumber: number,
  lines: Array<{ assignment: OutletMenuItemDto; quantity: number }>
): SaleDto {
  const items: SaleItemDto[] = lines.map(({ assignment, quantity }) => ({
    id: uid('sale-item'),
    outletMenuItemId: assignment.id,
    menuItemName: assignment.name,
    menuItemSku: assignment.sku,
    quantity,
    unitPriceCents: assignment.priceCents,
    lineTotalCents: assignment.priceCents * quantity
  }));

  return {
    id: uid('sale'),
    outletId: outlet.id,
    outletName: outlet.name,
    cashierName,
    receiptNumber,
    totalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    createdAt,
    items
  };
}

for (let daysBack = 0; daysBack < 7; daysBack += 1) {
  for (let slot = 0; slot < 3; slot += 1) {
    for (const outlet of outlets.filter((candidate) => candidate.isActive)) {
      const assignments = outletMenu.filter((candidate) => candidate.outletId === outlet.id);
      const lineCount = 1 + ((daysBack + slot) % 3);
      const lines = Array.from({ length: lineCount }, (_, index) => {
        const assignment = assignments[(daysBack * 5 + slot * 3 + index * 2) % assignments.length];
        return { assignment, quantity: 1 + (index % 2) };
      });
      const createdAt =
        daysBack === 0
          ? new Date(baseTime.getTime() - (slot + 1) * 45 * minute).toISOString()
          : new Date(new Date(daysAgoIso(daysBack)).getTime() + (10 + slot * 3) * 3_600_000).toISOString();
      const receiptNumber = (receiptCounters[outlet.id] ?? 0) + 1;
      receiptCounters[outlet.id] = receiptNumber;

      const sale = buildSale(
        outlet,
        outlet.code === 'MAIN' ? 'Main Outlet Cashier' : 'North Outlet Cashier',
        createdAt,
        receiptNumber,
        lines
      );
      sales.push(sale);

      for (const line of lines) {
        movements.push({
          id: uid('movement'),
          outletId: outlet.id,
          outletMenuItemId: line.assignment.id,
          sku: line.assignment.sku,
          name: line.assignment.name,
          movementType: 'SALE',
          quantityBefore: line.assignment.quantity,
          quantityChange: -line.quantity,
          quantityAfter: Math.max(0, line.assignment.quantity - line.quantity),
          actorUserId: outlet.code === 'MAIN' ? 'user-staff-main' : 'user-staff-north',
          saleId: sale.id,
          note: `Receipt #${sale.receiptNumber}`,
          createdAt: sale.createdAt
        });
      }
    }
  }
}

sales.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
movements.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

function toAuthUser(user: DemoUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    outletId: user.outletId
  };
}

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * limit, current * limit),
    total,
    page: current,
    limit,
    totalPages
  };
}

function fail(status: number, code: string, message: string, config: InternalAxiosRequestConfig): never {
  const response: AxiosResponse = {
    data: { error: { code, message } },
    status,
    statusText: 'Demo error',
    headers: new AxiosHeaders(),
    config
  };
  throw new AxiosError(message, code, config, undefined, response);
}

function parseBody(config: InternalAxiosRequestConfig): Body {
  if (!config.data) {
    return {};
  }

  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as Body;
    } catch {
      return {};
    }
  }

  return config.data as Body;
}

function query(config: InternalAxiosRequestConfig, key: string): string | undefined {
  const params = config.params as Record<string, unknown> | undefined;
  const value = params?.[key];
  return value === undefined || value === null ? undefined : String(value);
}

function pageNumber(config: InternalAxiosRequestConfig): number {
  return Number(query(config, 'page') ?? 1) || 1;
}

function limitNumber(config: InternalAxiosRequestConfig): number {
  return Number(query(config, 'limit') ?? 100) || 100;
}

function stringValue(body: Body, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(body: Body, key: string): number {
  const value = body[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function requireUser(config: InternalAxiosRequestConfig): DemoUser {
  const headers = config.headers as AxiosHeaders;
  const authorization = String(headers.get('Authorization') ?? '');
  const token = authorization.startsWith('Bearer demo:') ? authorization.slice('Bearer demo:'.length) : '';
  const user = users.find((candidate) => candidate.id === token);

  if (!user) {
    fail(401, 'UNAUTHORIZED', 'Please sign in to continue.', config);
  }

  return user;
}

function requireAdmin(config: InternalAxiosRequestConfig): DemoUser {
  const user = requireUser(config);

  if (user.role !== 'HQ_ADMIN') {
    fail(403, 'FORBIDDEN', 'Admin access is required.', config);
  }

  return user;
}

function requireStaff(config: InternalAxiosRequestConfig): DemoUser {
  const user = requireUser(config);

  if (user.role !== 'OUTLET_STAFF' || !user.outletId) {
    fail(403, 'FORBIDDEN', 'Outlet staff access is required.', config);
  }

  return user;
}

function salesInRange(from?: string, to?: string): SaleDto[] {
  const start = from ? `${from}T00:00:00.000Z` : '';
  const end = to ? `${to}T23:59:59.999Z` : '';
  return sales.filter(
    (sale) => (!start || sale.createdAt >= start) && (!end || sale.createdAt <= end)
  );
}

function salesToday(): SaleDto[] {
  const today = baseTime.toISOString().slice(0, 10);
  return sales.filter((sale) => sale.createdAt.startsWith(today));
}

function lowStockItems(): LowStockItemDto[] {
  return outletMenu
    .filter((assignment) => assignment.quantity <= assignment.lowStockThreshold)
    .map((assignment) => ({
      outletMenuItemId: assignment.id,
      outletId: assignment.outletId,
      outletName: outlets.find((outlet) => outlet.id === assignment.outletId)?.name ?? '',
      sku: assignment.sku,
      name: assignment.name,
      quantity: assignment.quantity,
      lowStockThreshold: assignment.lowStockThreshold
    }));
}

function hqDashboard(): HqDashboardDto {
  const today = salesToday();
  return {
    totalOutlets: outlets.length,
    activeOutlets: outlets.filter((outlet) => outlet.isActive).length,
    activeMenuItems: menuItems.filter((item) => item.isActive).length,
    lowStockItemCount: lowStockItems().length,
    todaySalesCount: today.length,
    todayRevenueCents: today.reduce((sum, sale) => sum + sale.totalCents, 0),
    latestSales: sales.slice(0, 8)
  };
}

function outletDashboard(user: DemoUser): OutletDashboardDto {
  const outlet = outlets.find((candidate) => candidate.id === user.outletId);
  const ownSales = sales.filter((sale) => sale.outletId === user.outletId);
  const today = salesToday().filter((sale) => sale.outletId === user.outletId);

  return {
    outletId: user.outletId ?? '',
    outletName: outlet?.name ?? 'Outlet',
    todaySalesCount: today.length,
    todayRevenueCents: today.reduce((sum, sale) => sum + sale.totalCents, 0),
    lowStockItemCount: lowStockItems().filter((item) => item.outletId === user.outletId).length,
    latestSales: ownSales.slice(0, 8)
  };
}

function dailySales(range: SaleDto[]): DailySalesDto[] {
  const grouped = new Map<string, DailySalesDto>();

  for (const sale of range) {
    const date = sale.createdAt.slice(0, 10);
    const key = `${date}|${sale.outletId}`;
    const row = grouped.get(key) ?? {
      date,
      outletId: sale.outletId,
      outletName: sale.outletName,
      salesCount: 0,
      revenueCents: 0
    };
    row.salesCount += 1;
    row.revenueCents += sale.totalCents;
    grouped.set(key, row);
  }

  return [...grouped.values()].sort((left, right) =>
    `${left.date}|${left.outletId}`.localeCompare(`${right.date}|${right.outletId}`)
  );
}

function topItems(range: SaleDto[]): TopSellingItemDto[] {
  const grouped = new Map<string, TopSellingItemDto>();

  for (const sale of range) {
    for (const item of sale.items) {
      const key = `${sale.outletId}|${item.menuItemSku}`;
      const row = grouped.get(key) ?? {
        outletId: sale.outletId,
        outletName: sale.outletName,
        rank: 0,
        menuItemSku: item.menuItemSku,
        menuItemName: item.menuItemName,
        quantitySold: 0,
        revenueCents: 0
      };
      row.quantitySold += item.quantity;
      row.revenueCents += item.lineTotalCents;
      grouped.set(key, row);
    }
  }

  const result: TopSellingItemDto[] = [];
  for (const outlet of outlets) {
    const ranked = [...grouped.values()]
      .filter((row) => row.outletId === outlet.id)
      .sort((left, right) => right.quantitySold - left.quantitySold)
      .slice(0, 5);
    ranked.forEach((row, index) => {
      result.push({ ...row, rank: index + 1 });
    });
  }

  return result;
}

function toInventory(assignment: OutletMenuItemDto): OutletInventoryDto {
  return {
    id: assignment.id,
    outletMenuItemId: assignment.id,
    menuItemId: assignment.menuItemId,
    sku: assignment.sku,
    name: assignment.name,
    priceCents: assignment.priceCents,
    quantity: assignment.quantity,
    lowStockThreshold: assignment.lowStockThreshold,
    updatedAt: assignment.updatedAt
  };
}

function handleRequest(config: InternalAxiosRequestConfig): unknown {
  const method = (config.method ?? 'get').toLowerCase();
  const path = (config.url ?? '').split('?')[0].replace(/^\/api/, '');
  const parts = path.split('/').filter(Boolean);
  const body = parseBody(config);

  if (path === '/auth/login' && method === 'post') {
    const email = stringValue(body, 'email').toLowerCase();
    const user = users.find((candidate) => candidate.email.toLowerCase() === email);

    if (!user) {
      fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.', config);
    }

    const response: LoginResponse = { token: `demo:${user.id}`, user: toAuthUser(user) };
    return response;
  }

  const user = requireUser(config);

  if (path === '/auth/me' && method === 'get') {
    return toAuthUser(user);
  }

  if (path === '/outlet/menu-items' && method === 'get') {
    const staff = requireStaff(config);
    return paginate(
      outletMenu.filter((assignment) => assignment.outletId === staff.outletId),
      pageNumber(config),
      limitNumber(config)
    );
  }

  if (path === '/dashboard/outlet' && method === 'get') {
    return outletDashboard(requireStaff(config));
  }

  if (path === '/outlet/sales' && method === 'get') {
    const staff = requireStaff(config);
    const ownSales = sales.filter((sale) => sale.outletId === staff.outletId);
    return paginate(ownSales, pageNumber(config), limitNumber(config));
  }

  if (path === '/outlet/sales' && method === 'post') {
    const staff = requireStaff(config);
    const rawItems = body.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      fail(400, 'VALIDATION_ERROR', 'Add at least one item to the sale.', config);
    }

    const headers = config.headers as AxiosHeaders;
    const key = String(headers.get('Idempotency-Key') ?? '');
    const previous = key ? idempotencyResults.get(key) : undefined;

    if (previous) {
      return previous;
    }

    const lines: Array<{ assignment: OutletMenuItemDto; quantity: number }> = [];

    for (const raw of rawItems) {
      const entry = raw as Body;
      const assignment = outletMenu.find(
        (candidate) => candidate.id === entry.outletMenuItemId && candidate.outletId === staff.outletId
      );
      const quantity = numberValue(entry, 'quantity');

      if (!assignment) {
        fail(404, 'NOT_FOUND', 'One of the selected menu items is unavailable.', config);
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        fail(400, 'VALIDATION_ERROR', 'Item quantities must be positive whole numbers.', config);
      }

      if (quantity > assignment.quantity) {
        fail(409, 'INSUFFICIENT_STOCK', `Not enough stock for ${assignment.name}.`, config);
      }

      lines.push({ assignment, quantity });
    }

    const receiptNumber = (receiptCounters[staff.outletId ?? ''] ?? 0) + 1;
    const outlet = outlets.find((candidate) => candidate.id === staff.outletId);
    const sale = buildSale(
      outlet ?? { ...outlets[0], id: staff.outletId ?? '', code: 'OUTLET' },
      staff.fullName,
      new Date().toISOString(),
      receiptNumber,
      lines
    );

    for (const { assignment, quantity } of lines) {
      const before = assignment.quantity;
      assignment.quantity -= quantity;
      assignment.updatedAt = sale.createdAt;
      movements.unshift({
        id: uid('movement'),
        outletId: assignment.outletId,
        outletMenuItemId: assignment.id,
        sku: assignment.sku,
        name: assignment.name,
        movementType: 'SALE',
        quantityBefore: before,
        quantityChange: -quantity,
        quantityAfter: assignment.quantity,
        actorUserId: staff.id,
        saleId: sale.id,
        note: `Receipt #${sale.receiptNumber}`,
        createdAt: sale.createdAt
      });
    }

    receiptCounters[staff.outletId ?? ''] = receiptNumber;
    sales.unshift(sale);

    if (key) {
      idempotencyResults.set(key, sale);
    }

    return sale;
  }

  if (parts[0] === 'outlet' && parts[1] === 'sales' && parts[3] === 'receipt' && method === 'get') {
    const staff = requireStaff(config);
    const sale = sales.find(
      (candidate) => candidate.id === parts[2] && candidate.outletId === staff.outletId
    );

    if (!sale) {
      fail(404, 'NOT_FOUND', 'Receipt not found.', config);
    }

    const receipt: ReceiptDto = { ...sale, receiptTitle: 'Official Receipt' };
    return receipt;
  }

  if (parts[0] === 'outlet' && parts[1] === 'inventory' && parts[2] === 'movements' && method === 'get') {
    const staff = requireStaff(config);
    const itemId = query(config, 'outletMenuItemId');
    const filtered = movements.filter(
      (movement) =>
        movement.outletId === staff.outletId && (!itemId || movement.outletMenuItemId === itemId)
    );
    return paginate(filtered, pageNumber(config), limitNumber(config));
  }

  if (parts[0] === 'outlet' && parts[1] === 'inventory' && parts[3] === 'stock' && method === 'post') {
    const staff = requireStaff(config);
    const assignment = outletMenu.find(
      (candidate) => candidate.id === parts[2] && candidate.outletId === staff.outletId
    );

    if (!assignment) {
      fail(404, 'NOT_FOUND', 'Inventory item not found.', config);
    }

    const quantity = numberValue(body, 'quantity');

    if (!Number.isInteger(quantity) || quantity <= 0) {
      fail(400, 'VALIDATION_ERROR', 'Restock quantity must be a positive whole number.', config);
    }

    const before = assignment.quantity;
    assignment.quantity += quantity;
    assignment.updatedAt = new Date().toISOString();
    movements.unshift({
      id: uid('movement'),
      outletId: assignment.outletId,
      outletMenuItemId: assignment.id,
      sku: assignment.sku,
      name: assignment.name,
      movementType: 'RESTOCK',
      quantityBefore: before,
      quantityChange: quantity,
      quantityAfter: assignment.quantity,
      actorUserId: staff.id,
      saleId: null,
      note: stringValue(body, 'note') || null,
      createdAt: assignment.updatedAt
    });
    return toInventory(assignment);
  }

  if (parts[0] === 'outlet' && parts[1] === 'inventory' && parts.length === 3 && method === 'patch') {
    const staff = requireStaff(config);
    const assignment = outletMenu.find(
      (candidate) => candidate.id === parts[2] && candidate.outletId === staff.outletId
    );

    if (!assignment) {
      fail(404, 'NOT_FOUND', 'Inventory item not found.', config);
    }

    if ('quantity' in body) {
      const quantity = numberValue(body, 'quantity');
      if (!Number.isInteger(quantity) || quantity < 0) {
        fail(400, 'VALIDATION_ERROR', 'Quantity must be a whole number of zero or more.', config);
      }
      const change = quantity - assignment.quantity;
      assignment.quantity = quantity;
      movements.unshift({
        id: uid('movement'),
        outletId: assignment.outletId,
        outletMenuItemId: assignment.id,
        sku: assignment.sku,
        name: assignment.name,
        movementType: 'ADJUSTMENT',
        quantityBefore: quantity - change,
        quantityChange: change,
        quantityAfter: quantity,
        actorUserId: staff.id,
        saleId: null,
        note: 'Manual adjustment',
        createdAt: new Date().toISOString()
      });
    }

    if ('lowStockThreshold' in body) {
      const threshold = numberValue(body, 'lowStockThreshold');
      if (!Number.isInteger(threshold) || threshold < 0) {
        fail(400, 'VALIDATION_ERROR', 'Threshold must be a whole number of zero or more.', config);
      }
      assignment.lowStockThreshold = threshold;
    }

    assignment.updatedAt = new Date().toISOString();
    return toInventory(assignment);
  }

  if (path === '/outlet/inventory' && method === 'get') {
    const staff = requireStaff(config);
    const items = outletMenu
      .filter((assignment) => assignment.outletId === staff.outletId)
      .map(toInventory);
    return paginate(items, pageNumber(config), limitNumber(config));
  }

  requireAdmin(config);

  if (path === '/outlets' && method === 'get') {
    return paginate(outlets, pageNumber(config), limitNumber(config));
  }

  if (path === '/outlets' && method === 'post') {
    const code = stringValue(body, 'code').toUpperCase();
    const name = stringValue(body, 'name');

    if (!code || !name) {
      fail(400, 'VALIDATION_ERROR', 'Outlet code and name are required.', config);
    }

    if (outlets.some((outlet) => outlet.code === code)) {
      fail(409, 'CONFLICT', 'An outlet with this code already exists.', config);
    }

    const timestamp = new Date().toISOString();
    const outlet: OutletDto = {
      id: uid('outlet'),
      code,
      name,
      address: stringValue(body, 'address') || null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    outlets.push(outlet);
    return outlet;
  }

  if (parts[0] === 'outlets' && parts[2] === 'menu-items') {
    const outlet = outlets.find((candidate) => candidate.id === parts[1]);

    if (!outlet) {
      fail(404, 'NOT_FOUND', 'Outlet not found.', config);
    }

    if (parts.length === 3 && method === 'get') {
      return paginate(
        outletMenu.filter((assignment) => assignment.outletId === outlet.id),
        pageNumber(config),
        limitNumber(config)
      );
    }

    if (parts.length === 3 && method === 'post') {
      const menuItem = menuItems.find((candidate) => candidate.id === stringValue(body, 'menuItemId'));

      if (!menuItem) {
        fail(404, 'NOT_FOUND', 'Menu item not found.', config);
      }

      if (
        outletMenu.some(
          (assignment) => assignment.outletId === outlet.id && assignment.menuItemId === menuItem.id
        )
      ) {
        fail(409, 'CONFLICT', 'This item is already assigned to the outlet.', config);
      }

      const priceCents = numberValue(body, 'priceCents');
      if (!Number.isInteger(priceCents) || priceCents <= 0) {
        fail(400, 'VALIDATION_ERROR', 'Price must be greater than zero.', config);
      }

      const timestamp = new Date().toISOString();
      const assignment: OutletMenuItemDto = {
        id: uid('assign'),
        outletId: outlet.id,
        menuItemId: menuItem.id,
        sku: menuItem.sku,
        name: menuItem.name,
        category: menuItem.category,
        description: menuItem.description,
        priceCents,
        isAvailable: body.isAvailable === undefined ? true : Boolean(body.isAvailable),
        quantity: 0,
        lowStockThreshold: 10,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      outletMenu.push(assignment);
      return assignment;
    }

    if (parts.length === 4 && method === 'patch') {
      const assignment = outletMenu.find(
        (candidate) => candidate.outletId === outlet.id && candidate.menuItemId === parts[3]
      );

      if (!assignment) {
        fail(404, 'NOT_FOUND', 'Assignment not found.', config);
      }

      if ('priceCents' in body) {
        const priceCents = numberValue(body, 'priceCents');
        if (!Number.isInteger(priceCents) || priceCents <= 0) {
          fail(400, 'VALIDATION_ERROR', 'Price must be greater than zero.', config);
        }
        assignment.priceCents = priceCents;
      }

      if ('isAvailable' in body) {
        assignment.isAvailable = Boolean(body.isAvailable);
      }

      assignment.updatedAt = new Date().toISOString();
      return assignment;
    }

    if (parts.length === 4 && method === 'delete') {
      const assignment = outletMenu.find(
        (candidate) => candidate.outletId === outlet.id && candidate.menuItemId === parts[3]
      );

      if (!assignment) {
        fail(404, 'NOT_FOUND', 'Assignment not found.', config);
      }

      assignment.isAvailable = false;
      assignment.updatedAt = new Date().toISOString();
      return undefined;
    }
  }

  if (parts[0] === 'outlets' && parts.length === 2) {
    const outlet = outlets.find((candidate) => candidate.id === parts[1]);

    if (!outlet) {
      fail(404, 'NOT_FOUND', 'Outlet not found.', config);
    }

    if (method === 'patch') {
      if ('code' in body) {
        const code = stringValue(body, 'code').toUpperCase();
        if (!code) {
          fail(400, 'VALIDATION_ERROR', 'Outlet code is required.', config);
        }
        if (outlets.some((candidate) => candidate.code === code && candidate.id !== outlet.id)) {
          fail(409, 'CONFLICT', 'An outlet with this code already exists.', config);
        }
        outlet.code = code;
      }

      if ('name' in body) {
        const name = stringValue(body, 'name');
        if (!name) {
          fail(400, 'VALIDATION_ERROR', 'Outlet name is required.', config);
        }
        outlet.name = name;
      }

      if ('address' in body) {
        outlet.address = stringValue(body, 'address') || null;
      }

      outlet.updatedAt = new Date().toISOString();
      return outlet;
    }

    if (method === 'delete') {
      outlet.isActive = false;
      outlet.updatedAt = new Date().toISOString();
      return undefined;
    }
  }

  if (path === '/menu-items' && method === 'get') {
    return paginate(menuItems, pageNumber(config), limitNumber(config));
  }

  if (path === '/menu-items' && method === 'post') {
    const sku = stringValue(body, 'sku').toUpperCase();
    const name = stringValue(body, 'name');
    const category = stringValue(body, 'category');

    if (!sku || !name || !category) {
      fail(400, 'VALIDATION_ERROR', 'SKU, name, and category are required.', config);
    }

    if (menuItems.some((item) => item.sku === sku)) {
      fail(409, 'CONFLICT', 'A menu item with this SKU already exists.', config);
    }

    const timestamp = new Date().toISOString();
    const item: MenuItemDto = {
      id: uid('item'),
      sku,
      name,
      category,
      description: stringValue(body, 'description') || null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    menuItems.push(item);
    return item;
  }

  if (parts[0] === 'menu-items' && parts.length === 2) {
    const item = menuItems.find((candidate) => candidate.id === parts[1]);

    if (!item) {
      fail(404, 'NOT_FOUND', 'Menu item not found.', config);
    }

    if (method === 'patch') {
      if ('sku' in body) {
        const sku = stringValue(body, 'sku').toUpperCase();
        if (!sku) {
          fail(400, 'VALIDATION_ERROR', 'SKU is required.', config);
        }
        if (menuItems.some((candidate) => candidate.sku === sku && candidate.id !== item.id)) {
          fail(409, 'CONFLICT', 'A menu item with this SKU already exists.', config);
        }
        item.sku = sku;
      }

      if ('name' in body) {
        const name = stringValue(body, 'name');
        if (!name) {
          fail(400, 'VALIDATION_ERROR', 'Name is required.', config);
        }
        item.name = name;
      }

      if ('category' in body) {
        const category = stringValue(body, 'category');
        if (!category) {
          fail(400, 'VALIDATION_ERROR', 'Category is required.', config);
        }
        item.category = category;
      }

      if ('description' in body) {
        item.description = stringValue(body, 'description') || null;
      }

      item.updatedAt = new Date().toISOString();
      return item;
    }

    if (method === 'delete') {
      item.isActive = false;
      item.updatedAt = new Date().toISOString();
      return undefined;
    }
  }

  if (path === '/users/staff' && method === 'post') {
    const email = stringValue(body, 'email').toLowerCase();
    const fullName = stringValue(body, 'fullName');
    const outletId = stringValue(body, 'outletId');
    const password = stringValue(body, 'password');

    if (!email || !fullName || !outletId || !password) {
      fail(400, 'VALIDATION_ERROR', 'Email, name, password, and outlet are required.', config);
    }

    if (users.some((candidate) => candidate.email.toLowerCase() === email)) {
      fail(409, 'CONFLICT', 'A user with this email already exists.', config);
    }

    if (!outlets.some((candidate) => candidate.id === outletId)) {
      fail(404, 'NOT_FOUND', 'Outlet not found.', config);
    }

    const created: DemoUser = {
      id: uid('user'),
      email,
      password,
      fullName,
      role: 'OUTLET_STAFF',
      outletId
    };
    users.push(created);
    return toAuthUser(created);
  }

  if (path === '/dashboard/hq' && method === 'get') {
    return hqDashboard();
  }

  if (path === '/reports/sales/summary' && method === 'get') {
    const from = query(config, 'from');
    const to = query(config, 'to');
    const range = salesInRange(from, to);
    const summary: SalesSummaryDto = {
      from: from ?? '',
      to: to ?? '',
      salesCount: range.length,
      revenueCents: range.reduce((sum, sale) => sum + sale.totalCents, 0)
    };
    return summary;
  }

  if (path === '/reports/sales/daily' && method === 'get') {
    return dailySales(salesInRange(query(config, 'from'), query(config, 'to')));
  }

  if (path === '/reports/low-stock' && method === 'get') {
    return paginate(lowStockItems(), pageNumber(config), limitNumber(config));
  }

  if (path === '/reports/revenue/by-outlet' && method === 'get') {
    const range = salesInRange(query(config, 'from'), query(config, 'to'));
    const grouped = new Map<string, OutletRevenueDto>();

    for (const sale of range) {
      const row = grouped.get(sale.outletId) ?? {
        outletId: sale.outletId,
        outletName: sale.outletName,
        revenueCents: 0,
        transactionCount: 0
      };
      row.revenueCents += sale.totalCents;
      row.transactionCount += 1;
      grouped.set(sale.outletId, row);
    }

    return [...grouped.values()];
  }

  if (path === '/reports/transactions/by-outlet' && method === 'get') {
    const range = salesInRange(query(config, 'from'), query(config, 'to'));
    const grouped = new Map<string, OutletTransactionCountDto>();

    for (const sale of range) {
      const row = grouped.get(sale.outletId) ?? {
        outletId: sale.outletId,
        outletName: sale.outletName,
        transactionCount: 0
      };
      row.transactionCount += 1;
      grouped.set(sale.outletId, row);
    }

    return [...grouped.values()];
  }

  if (path === '/reports/top-items' && method === 'get') {
    return topItems(salesInRange(query(config, 'from'), query(config, 'to')));
  }

  return fail(404, 'NOT_FOUND', `Demo mode has no endpoint for ${method.toUpperCase()} ${path}.`, config);
}

export const demoAdapter: AxiosAdapter = async (config) => {
  const response: AxiosResponse<unknown> = {
    data: handleRequest(config),
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config
  };
  return response;
};
