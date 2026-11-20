import type { ReceiptDto } from '@pos/shared';
import { formatDateTime, formatMoney } from '../../lib/format';

export function ReceiptModal({ receipt, onClose }: { receipt: ReceiptDto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="print-area w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-emerald-400">{receipt.receiptTitle}</h2>
          <p className="mt-1 text-sm font-medium">{receipt.outletName}</p>
          <p className="mt-1 text-xs text-slate-400">{formatDateTime(receipt.createdAt)}</p>
          <p className="text-xs text-slate-400">Cashier: {receipt.cashierName}</p>
        </div>

        <div className="mt-5 space-y-2 border-t border-slate-700 pt-4 text-sm">
          {receipt.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3">
              <span>
                {item.quantity} x {item.menuItemName}
              </span>
              <span>{formatMoney(item.lineTotalCents)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-between border-t border-slate-700 pt-4 text-lg font-semibold">
          <span>Total</span>
          <span>{formatMoney(receipt.totalCents)}</span>
        </div>

        <div className="mt-6 flex gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Print receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
