import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { errorMessage, getDailySales, getHqDashboard, getSalesSummary } from '../../lib/api';
import { QueryState } from '../QueryState';
import { daysAgo, formatDateTime, formatMoney, Panel, toDateInput } from './ui';

export function AdminDashboardPanel() {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const dashboardQuery = useQuery({ queryKey: ['hq-dashboard'], queryFn: getHqDashboard });
  const summaryQuery = useQuery({
    queryKey: ['hq-summary', from, to],
    queryFn: () => getSalesSummary(from, to)
  });
  const dailyQuery = useQuery({
    queryKey: ['hq-daily', from, to],
    queryFn: () => getDailySales(from, to)
  });

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <QueryState
        isLoading={dashboardQuery.isLoading}
        error={dashboardQuery.error}
        loadingMessage="Loading overview..."
      >
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Outlets" value={`${dashboard?.activeOutlets ?? 0} / ${dashboard?.totalOutlets ?? 0}`} hint="active / total" />
          <Metric label="Menu items" value={String(dashboard?.activeMenuItems ?? 0)} hint="active" />
          <Metric label="Sales today" value={String(dashboard?.todaySalesCount ?? 0)} hint={formatMoney(dashboard?.todayRevenueCents ?? 0)} />
          <Metric label="Low stock" value={String(dashboard?.lowStockItemCount ?? 0)} hint="items below threshold" />
        </section>
      </QueryState>

      <Panel title="Latest sales">
        <div className="overflow-x-auto">
          <QueryState
            isLoading={dashboardQuery.isLoading}
            error={dashboardQuery.error}
            isEmpty={!dashboard?.latestSales.length}
            emptyMessage="No sales recorded yet."
            loadingMessage="Loading latest sales..."
          >
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Receipt</th>
                  <th className="pb-2">Outlet</th>
                  <th className="pb-2">Cashier</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.latestSales ?? []).map((sale) => (
                  <tr key={sale.id} className="border-t border-slate-800">
                    <td className="py-2">#{sale.receiptNumber}</td>
                    <td className="py-2">{sale.outletName}</td>
                    <td className="py-2 text-slate-400">{sale.cashierName}</td>
                    <td className="py-2 text-slate-400">{formatDateTime(sale.createdAt)}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(sale.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>
      </Panel>

      <Panel title="Sales in selected range">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs text-slate-400">
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-400">
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
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
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
