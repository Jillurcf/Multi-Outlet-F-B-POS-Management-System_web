import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ReceiptDto } from '@pos/shared';
import { errorMessage, getReceipt, getSales } from '../../lib/api';
import { formatDateTime, formatMoney } from '../../lib/format';
import { QueryState } from '../QueryState';

export function SalesHistoryPanel({ onReceipt }: { onReceipt: (receipt: ReceiptDto) => void }) {
  const [page, setPage] = useState(1);
  const [receiptError, setReceiptError] = useState('');
  const salesQuery = useQuery({ queryKey: ['outlet-sales', page], queryFn: () => getSales(page, 10) });

  const receipt = useMutation({
    mutationFn: (saleId: string) => getReceipt(saleId),
    onSuccess: (data) => {
      setReceiptError('');
      onReceipt(data);
    },
    onError: (error: unknown) => setReceiptError(errorMessage(error))
  });

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales history</h2>
          <p className="mt-1 text-xs text-slate-400">Completed sales at this outlet.</p>
        </div>
        <span className="text-xs text-slate-500">
          {salesQuery.data?.total ?? 0} total sales
        </span>
      </div>

      {receiptError ? <p className="mt-3 text-sm text-rose-400">{receiptError}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <QueryState
          isLoading={salesQuery.isLoading}
          error={salesQuery.error}
          isEmpty={!salesQuery.data?.items.length}
          emptyMessage="No sales have been recorded yet."
          loadingMessage="Loading sales history..."
        >
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">Receipt</th>
                <th className="pb-2">Time</th>
                <th className="pb-2">Cashier</th>
                <th className="pb-2 text-right">Items</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(salesQuery.data?.items ?? []).map((sale) => (
                <tr key={sale.id} className="border-t border-slate-800">
                  <td className="py-2 font-medium">#{sale.receiptNumber}</td>
                  <td className="py-2 text-slate-400">{formatDateTime(sale.createdAt)}</td>
                  <td className="py-2 text-slate-400">{sale.cashierName}</td>
                  <td className="py-2 text-right text-slate-400">
                    {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="py-2 text-right font-medium">{formatMoney(sale.totalCents)}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={receipt.isPending}
                      onClick={() => receipt.mutate(sale.id)}
                      className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
                    >
                      View receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueryState>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>
          Page {salesQuery.data?.page ?? 1} of {Math.max(salesQuery.data?.totalPages ?? 1, 1)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={(salesQuery.data?.page ?? 1) <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={(salesQuery.data?.page ?? 1) >= (salesQuery.data?.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
            className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
