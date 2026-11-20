import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReceiptDto } from '@pos/shared';
import { createSale, errorMessage, getOutletDashboard, getOutletMenu, getReceipt } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useAuth } from '../providers/AuthProvider';
import { QueryState } from '../components/QueryState';
import { InventoryPanel } from '../components/staff/InventoryPanel';
import { ReceiptModal } from '../components/staff/ReceiptModal';
import { SalesHistoryPanel } from '../components/staff/SalesHistoryPanel';

type Section = 'pos' | 'inventory' | 'history';

export function PosPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('pos');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const idempotencyKeyRef = useRef<string | null>(null);

  const menuQuery = useQuery({ queryKey: ['outlet-menu'], queryFn: () => getOutletMenu() });
  const dashboardQuery = useQuery({ queryKey: ['outlet-dashboard'], queryFn: getOutletDashboard });

  const menu = menuQuery.data?.items ?? [];
  const filteredMenu = menu.filter((item) =>
    `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase())
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const item = menu.find((candidate) => candidate.id === id);
          return item ? { item, quantity, lineTotal: item.priceCents * quantity } : null;
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [cart, menu]
  );

  const totalCents = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);

  function increase(itemId: string, stock: number): void {
    setCart((current) => {
      const quantity = current[itemId] ?? 0;
      if (quantity >= stock) {
        return current;
      }
      return { ...current, [itemId]: quantity + 1 };
    });
  }

  function decrease(itemId: string): void {
    setCart((current) => {
      const quantity = current[itemId] ?? 0;
      if (quantity <= 1) {
        const next = { ...current };
        delete next[itemId];
        return next;
      }
      return { ...current, [itemId]: quantity - 1 };
    });
  }

  const checkout = useMutation({
    mutationFn: () => {
      idempotencyKeyRef.current ??= crypto.randomUUID();
      return createSale(
        cartLines.map((line) => ({
          outletMenuItemId: line.item.id,
          quantity: line.quantity
        })),
        idempotencyKeyRef.current
      );
    },
    onSuccess: async (sale) => {
      idempotencyKeyRef.current = null;
      setCart({});
      setCheckoutError('');

      try {
        setReceipt(await getReceipt(sale.id));
      } catch (receiptError) {
        setCheckoutError(`Sale completed, but the receipt could not be loaded: ${errorMessage(receiptError)}`);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['outlet-menu'] }),
        queryClient.invalidateQueries({ queryKey: ['outlet-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['outlet-sales'] }),
        queryClient.invalidateQueries({ queryKey: ['outlet-inventory'] })
      ]);
    },
    onError: (error: unknown) => setCheckoutError(errorMessage(error))
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Outlet POS</h1>
            <p className="text-xs text-slate-400">
              {dashboardQuery.data?.outletName ?? 'Loading outlet...'} · {user?.fullName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-1 rounded-lg border border-slate-800 p-1">
              <SectionButton label="POS" active={section === 'pos'} onClick={() => setSection('pos')} />
              <SectionButton
                label="Inventory"
                active={section === 'inventory'}
                onClick={() => setSection('inventory')}
              />
              <SectionButton
                label="Sales history"
                active={section === 'history'}
                onClick={() => setSection('history')}
              />
            </nav>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <QueryState
          isLoading={dashboardQuery.isLoading}
          error={dashboardQuery.error}
          loadingMessage="Loading outlet overview..."
        >
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Sales today" value={String(dashboardQuery.data?.todaySalesCount ?? 0)} />
            <MetricCard
              label="Revenue today"
              value={formatMoney(dashboardQuery.data?.todayRevenueCents ?? 0)}
            />
            <MetricCard
              label="Low stock items"
              value={String(dashboardQuery.data?.lowStockItemCount ?? 0)}
            />
          </section>
        </QueryState>

        {section === 'pos' ? (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, SKU, or category"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 sm:w-72"
                />
              </div>

              <div className="mt-5">
                <QueryState
                  isLoading={menuQuery.isLoading}
                  error={menuQuery.error}
                  isEmpty={filteredMenu.length === 0}
                  emptyMessage={
                    search ? 'No menu items match your search.' : 'No menu items are assigned to this outlet.'
                  }
                  loadingMessage="Loading menu..."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredMenu.map((item) => {
                      const disabled = !item.isAvailable || item.quantity <= 0;
                      return (
                        <article
                          key={item.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium">{item.name}</h3>
                              <span className="text-sm font-semibold text-emerald-400">
                                {formatMoney(item.priceCents)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{item.sku}</p>
                            <p className="mt-1 text-xs text-slate-400">{item.category}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <span
                              className={`text-xs ${item.quantity <= item.lowStockThreshold ? 'text-amber-400' : 'text-slate-500'}`}
                            >
                              {item.quantity} in stock
                            </span>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => increase(item.id, item.quantity)}
                              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                            >
                              {item.quantity <= 0 ? 'Out of stock' : 'Add'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </QueryState>
              </div>
            </div>

            <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold">Current sale</h2>
              <div className="mt-4 space-y-3">
                {cartLines.length === 0 ? (
                  <p className="text-sm text-slate-500">Add items from the menu to start a sale.</p>
                ) : (
                  cartLines.map((line) => (
                    <div key={line.item.id} className="rounded-lg border border-slate-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{line.item.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatMoney(line.item.priceCents)} each
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{formatMoney(line.lineTotal)}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decrease(line.item.id)}
                          className="h-7 w-7 rounded border border-slate-700 text-sm hover:border-slate-500"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => increase(line.item.id, line.item.quantity)}
                          disabled={line.quantity >= line.item.quantity}
                          className="h-7 w-7 rounded border border-slate-700 text-sm hover:border-slate-500 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-sm text-slate-400">Total</span>
                <span className="text-xl font-semibold text-emerald-400">{formatMoney(totalCents)}</span>
              </div>

              {checkoutError ? <p className="mt-3 text-sm text-rose-400">{checkoutError}</p> : null}

              <button
                type="button"
                disabled={cartLines.length === 0 || checkout.isPending}
                onClick={() => checkout.mutate()}
                className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {checkout.isPending ? 'Processing...' : 'Complete sale'}
              </button>
            </aside>
          </section>
        ) : null}

        {section === 'inventory' ? <InventoryPanel /> : null}

        {section === 'history' ? <SalesHistoryPanel onReceipt={setReceipt} /> : null}
      </main>

      {receipt ? <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} /> : null}
    </div>
  );
}

function SectionButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
