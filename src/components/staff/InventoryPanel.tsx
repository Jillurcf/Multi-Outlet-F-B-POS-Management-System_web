import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OutletInventoryDto, StockMovementDto } from '@pos/shared';
import { addStock, errorMessage, getOutletInventory, getStockMovements, updateInventory } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { QueryState } from '../QueryState';

export function InventoryPanel() {
  const queryClient = useQueryClient();
  const [inventoryPage, setInventoryPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [filterItemId, setFilterItemId] = useState('');

  const inventoryQuery = useQuery({
    queryKey: ['outlet-inventory', inventoryPage],
    queryFn: () => getOutletInventory(inventoryPage, 10)
  });
  const movementsQuery = useQuery({
    queryKey: ['outlet-movements', movementPage, filterItemId],
    queryFn: () => getStockMovements(movementPage, 10, filterItemId || undefined)
  });

  async function refresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['outlet-inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['outlet-menu'] }),
      queryClient.invalidateQueries({ queryKey: ['outlet-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['outlet-movements'] })
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="mt-1 text-xs text-slate-400">
          Restock items or adjust stock levels and low-stock thresholds.
        </p>

        <div className="mt-4 overflow-x-auto">
          <QueryState
            isLoading={inventoryQuery.isLoading}
            error={inventoryQuery.error}
            isEmpty={!inventoryQuery.data?.items.length}
            emptyMessage="No inventory items found."
            loadingMessage="Loading inventory..."
          >
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2 text-right">Threshold</th>
                  <th className="pb-2">Restock</th>
                  <th className="pb-2">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {(inventoryQuery.data?.items ?? []).map((item) => (
                  <InventoryRow key={item.id} item={item} onChanged={refresh} />
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>

        <Pagination
          page={inventoryQuery.data?.page ?? 1}
          totalPages={inventoryQuery.data?.totalPages ?? 1}
          onPageChange={setInventoryPage}
        />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Stock movements</h2>
            <p className="mt-1 text-xs text-slate-400">Audit trail of stock changes.</p>
          </div>
          <select
            value={filterItemId}
            onChange={(event) => {
              setFilterItemId(event.target.value);
              setMovementPage(1);
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:w-64"
          >
            <option value="">All items</option>
            {(inventoryQuery.data?.items ?? []).map((item) => (
              <option key={item.outletMenuItemId} value={item.outletMenuItemId}>
                {item.sku} - {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <QueryState
            isLoading={movementsQuery.isLoading}
            error={movementsQuery.error}
            isEmpty={!movementsQuery.data?.items.length}
            emptyMessage="No stock movements recorded."
            loadingMessage="Loading stock movements..."
          >
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Change</th>
                  <th className="pb-2 text-right">After</th>
                  <th className="pb-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {(movementsQuery.data?.items ?? []).map((movement) => (
                  <MovementRow key={movement.id} movement={movement} />
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>

        <Pagination
          page={movementsQuery.data?.page ?? 1}
          totalPages={movementsQuery.data?.totalPages ?? 1}
          onPageChange={setMovementPage}
        />
      </section>
    </div>
  );
}

function InventoryRow({ item, onChanged }: { item: OutletInventoryDto; onChanged: () => Promise<void> }) {
  const [restockQuantity, setRestockQuantity] = useState('');
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [threshold, setThreshold] = useState(String(item.lowStockThreshold));
  const [error, setError] = useState('');

  const restock = useMutation({
    mutationFn: () => addStock(item.outletMenuItemId, Number(restockQuantity), note.trim() || undefined),
    onSuccess: async () => {
      setRestockQuantity('');
      setNote('');
      setError('');
      await onChanged();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  const adjust = useMutation({
    mutationFn: () =>
      updateInventory(item.outletMenuItemId, {
        quantity: Number(quantity),
        lowStockThreshold: Number(threshold)
      }),
    onSuccess: async () => {
      setError('');
      await onChanged();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  return (
    <tr className="border-t border-slate-800 align-top">
      <td className="py-3">
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-slate-500">{item.sku}</p>
        {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
      </td>
      <td className="py-3 text-right">
        <span className={item.quantity <= item.lowStockThreshold ? 'text-amber-400' : ''}>
          {item.quantity}
        </span>
      </td>
      <td className="py-3 text-right text-slate-400">{item.lowStockThreshold}</td>
      <td className="py-3">
        <div className="flex flex-col gap-2">
          <input
            type="number"
            min="1"
            value={restockQuantity}
            onChange={(event) => setRestockQuantity(event.target.value)}
            placeholder="Quantity"
            className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optional)"
            className="w-40 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={restock.isPending}
            onClick={() => {
              const amount = Number(restockQuantity);
              if (!Number.isInteger(amount) || amount <= 0) {
                setError('Restock quantity must be a positive whole number.');
                return;
              }
              restock.mutate();
            }}
            className="w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {restock.isPending ? 'Adding...' : 'Add stock'}
          </button>
        </div>
      </td>
      <td className="py-3">
        <div className="flex flex-col gap-2">
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Quantity"
            className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
          />
          <input
            type="number"
            min="0"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="Threshold"
            className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={adjust.isPending}
            onClick={() => {
              const nextQuantity = Number(quantity);
              const nextThreshold = Number(threshold);
              if (
                !Number.isInteger(nextQuantity) ||
                nextQuantity < 0 ||
                !Number.isInteger(nextThreshold) ||
                nextThreshold < 0
              ) {
                setError('Quantity and threshold must be whole numbers of zero or more.');
                return;
              }
              adjust.mutate();
            }}
            className="w-fit rounded border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200 disabled:opacity-50"
          >
            {adjust.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function MovementRow({ movement }: { movement: StockMovementDto }) {
  const color =
    movement.movementType === 'RESTOCK'
      ? 'text-emerald-400'
      : movement.movementType === 'SALE'
        ? 'text-rose-400'
        : 'text-amber-400';

  return (
    <tr className="border-t border-slate-800">
      <td className="py-2 text-slate-400">{formatDateTime(movement.createdAt)}</td>
      <td className="py-2">
        <span className="font-medium">{movement.name}</span>
        <span className="ml-2 text-xs text-slate-500">{movement.sku}</span>
      </td>
      <td className={`py-2 text-xs font-medium ${color}`}>{movement.movementType}</td>
      <td className={`py-2 text-right ${color}`}>
        {movement.quantityChange > 0 ? '+' : ''}
        {movement.quantityChange}
      </td>
      <td className="py-2 text-right">{movement.quantityAfter}</td>
      <td className="py-2 text-slate-400">{movement.note ?? '-'}</td>
    </tr>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
      <span>
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
