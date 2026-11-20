import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  errorMessage,
  getDailySales,
  getLowStock,
  getRevenueByOutlet,
  getSalesSummary,
  getTopSellingItems,
  getTransactionCountByOutlet
} from '../../lib/api';
import { QueryState } from '../QueryState';
import { daysAgo, formatMoney, Panel, toDateInput } from './ui';

export function ReportsPanel() {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const summaryQuery = useQuery({
    queryKey: ['admin-summary', from, to],
    queryFn: () => getSalesSummary(from, to)
  });
  const dailyQuery = useQuery({
    queryKey: ['admin-daily', from, to],
    queryFn: () => getDailySales(from, to)
  });
  const revenueQuery = useQuery({
    queryKey: ['admin-revenue-by-outlet', from, to],
    queryFn: () => getRevenueByOutlet(from, to)
  });
  const transactionsQuery = useQuery({
    queryKey: ['admin-transactions-by-outlet', from, to],
    queryFn: () => getTransactionCountByOutlet(from, to)
  });
  const topItemsQuery = useQuery({
    queryKey: ['admin-top-items', from, to],
    queryFn: () => getTopSellingItems(from, to)
  });
  const lowStockQuery = useQuery({ queryKey: ['admin-low-stock'], queryFn: () => getLowStock() });

  return (
    <div className="space-y-6">
      <Panel title="Sales report" description="All figures are calculated from completed sales.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs text-slate-400">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-lg border border-slate-800 px-4 py-2 text-sm sm:ml-auto">
            {summaryQuery.isLoading ? 'Loading summary...' : `${summaryQuery.data?.salesCount ?? 0} sales · ${formatMoney(summaryQuery.data?.revenueCents ?? 0)}`}
          </div>
        </div>

        {summaryQuery.error ? (
          <p className="mt-3 text-sm text-rose-400">{errorMessage(summaryQuery.error)}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <QueryState
            isLoading={dailyQuery.isLoading}
            error={dailyQuery.error}
            isEmpty={!dailyQuery.data?.length}
            emptyMessage="No sales in the selected date range."
            loadingMessage="Loading daily sales..."
          >
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Outlet</th>
                  <th className="pb-2 text-right">Sales</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(dailyQuery.data ?? []).map((row) => (
                  <tr key={`${row.outletId}-${row.date}`} className="border-t border-slate-800">
                    <td className="py-2">{row.date.slice(0, 10)}</td>
                    <td className="py-2">{row.outletName}</td>
                    <td className="py-2 text-right">{row.salesCount}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(row.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Revenue by outlet">
          <div className="overflow-x-auto">
            <QueryState
              isLoading={revenueQuery.isLoading}
              error={revenueQuery.error}
              isEmpty={!revenueQuery.data?.length}
              emptyMessage="No outlet revenue in the selected date range."
              loadingMessage="Loading revenue..."
            >
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2">Outlet</th>
                    <th className="pb-2 text-right">Transactions</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(revenueQuery.data ?? []).map((row) => (
                    <tr key={row.outletId} className="border-t border-slate-800">
                      <td className="py-2">{row.outletName}</td>
                      <td className="py-2 text-right text-slate-400">{row.transactionCount}</td>
                      <td className="py-2 text-right font-medium text-emerald-400">
                        {formatMoney(row.revenueCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </QueryState>
          </div>
        </Panel>

        <Panel title="Transactions by outlet">
          <div className="overflow-x-auto">
            <QueryState
              isLoading={transactionsQuery.isLoading}
              error={transactionsQuery.error}
              isEmpty={!transactionsQuery.data?.length}
              emptyMessage="No transactions in the selected date range."
              loadingMessage="Loading transaction counts..."
            >
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2">Outlet</th>
                    <th className="pb-2 text-right">Completed sales</th>
                  </tr>
                </thead>
                <tbody>
                  {(transactionsQuery.data ?? []).map((row) => (
                    <tr key={row.outletId} className="border-t border-slate-800">
                      <td className="py-2">{row.outletName}</td>
                      <td className="py-2 text-right font-medium">{row.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </QueryState>
          </div>
        </Panel>
      </div>

      <Panel
        title="Top-selling items"
        description="Top five items per outlet, ranked by units sold from sale-time snapshots."
      >
        <div className="overflow-x-auto">
          <QueryState
            isLoading={topItemsQuery.isLoading}
            error={topItemsQuery.error}
            isEmpty={!topItemsQuery.data?.length}
            emptyMessage="No items sold in the selected date range."
            loadingMessage="Loading top-selling items..."
          >
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Outlet</th>
                  <th className="pb-2 text-right">#</th>
                  <th className="pb-2">Item</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(topItemsQuery.data ?? []).map((row) => (
                  <tr
                    key={`${row.outletId}-${row.rank}`}
                    className="border-t border-slate-800"
                  >
                    <td className="py-2">{row.outletName}</td>
                    <td className="py-2 text-right text-slate-500">{row.rank}</td>
                    <td className="py-2 font-medium">{row.menuItemName}</td>
                    <td className="py-2 text-slate-400">{row.menuItemSku}</td>
                    <td className="py-2 text-right">{row.quantitySold}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(row.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>
      </Panel>

      <Panel title="Low stock alerts">
        <div className="overflow-x-auto">
          <QueryState
            isLoading={lowStockQuery.isLoading}
            error={lowStockQuery.error}
            isEmpty={!lowStockQuery.data?.items.length}
            emptyMessage="All outlet inventory is above its low-stock threshold."
            loadingMessage="Loading low-stock alerts..."
          >
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Outlet</th>
                  <th className="pb-2">Item</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2 text-right">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {(lowStockQuery.data?.items ?? []).map((item) => (
                  <tr key={item.outletMenuItemId} className="border-t border-slate-800">
                    <td className="py-2">{item.outletName}</td>
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-slate-400">{item.sku}</td>
                    <td className="py-2 text-right text-amber-400">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-400">{item.lowStockThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>
      </Panel>
    </div>
  );
}
