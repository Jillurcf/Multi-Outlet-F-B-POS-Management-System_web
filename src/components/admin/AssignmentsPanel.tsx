import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OutletMenuItemDto } from '@pos/shared';
import {
  assignOutletMenuItem,
  deactivateOutletMenuItem,
  errorMessage,
  listMenuItems,
  listOutletMenu,
  listOutlets,
  updateOutletMenuItem
} from '../../lib/api';
import { QueryState } from '../QueryState';
import { buttonClass, Field, formatMoney, inputClass, Notice, Panel, secondaryButtonClass } from './ui';

export function AssignmentsPanel() {
  const queryClient = useQueryClient();
  const outletsQuery = useQuery({ queryKey: ['admin-outlets'], queryFn: () => listOutlets() });
  const masterQuery = useQuery({ queryKey: ['admin-master-items'], queryFn: () => listMenuItems() });
  const [outletId, setOutletId] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [price, setPrice] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const assignmentsQuery = useQuery({
    queryKey: ['admin-outlet-menu', outletId],
    queryFn: () => listOutletMenu(outletId),
    enabled: Boolean(outletId)
  });

  useEffect(() => {
    if (!outletId && outletsQuery.data?.items[0]) {
      setOutletId(outletsQuery.data.items[0].id);
    }
  }, [outletId, outletsQuery.data]);

  const assignedIds = new Set((assignmentsQuery.data?.items ?? []).map((item) => item.menuItemId));
  const availableItems = (masterQuery.data?.items ?? []).filter(
    (item) => item.isActive && !assignedIds.has(item.id)
  );

  async function refreshAssignments(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['admin-outlet-menu', outletId] });
    await queryClient.invalidateQueries({ queryKey: ['outlet-menu'] });
    await queryClient.invalidateQueries({ queryKey: ['outlet-dashboard'] });
  }

  const assign = useMutation({
    mutationFn: () =>
      assignOutletMenuItem(outletId, {
        menuItemId,
        priceCents: Math.round(Number(price) * 100),
        isAvailable
      }),
    onSuccess: async () => {
      setMenuItemId('');
      setPrice('');
      setIsAvailable(true);
      setError('');
      setSuccess('Menu item assigned to outlet.');
      await refreshAssignments();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const cents = Math.round(Number(price) * 100);

    if (!menuItemId) {
      setError('Select a menu item.');
      return;
    }

    if (!Number.isFinite(cents) || cents <= 0) {
      setError('Enter a price greater than zero.');
      return;
    }

    setSuccess('');
    assign.mutate();
  }

  return (
    <div className="space-y-6">
      <Panel title="Outlet menu assignments" description="Set outlet-specific prices and availability.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Outlet">
            <QueryState
              isLoading={outletsQuery.isLoading}
              error={outletsQuery.error}
              isEmpty={!outletsQuery.data?.items.length}
              emptyMessage="No outlets available."
              loadingMessage="Loading outlets..."
            >
              <select
                value={outletId}
                onChange={(event) => {
                  setOutletId(event.target.value);
                  setMenuItemId('');
                }}
                className={inputClass}
                required
              >
                <option value="">Select an outlet</option>
                {(outletsQuery.data?.items ?? []).map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.code} - {outlet.name}
                  </option>
                ))}
              </select>
            </QueryState>
          </Field>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Master menu item">
            <QueryState
              isLoading={masterQuery.isLoading}
              error={masterQuery.error}
              isEmpty={availableItems.length === 0 && Boolean(outletId)}
              emptyMessage="No unassigned items available."
              loadingMessage="Loading master menu..."
            >
              <select
                value={menuItemId}
                onChange={(event) => setMenuItemId(event.target.value)}
                disabled={!outletId || availableItems.length === 0}
                className={inputClass}
              >
                <option value="">Select an item</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} - {item.name}
                  </option>
                ))}
              </select>
            </QueryState>
          </Field>
          <Field label="Price">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={inputClass}
            />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
              className="h-4 w-4"
            />
            Available
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!outletId || assign.isPending}
              className={buttonClass}
            >
              Assign item
            </button>
          </div>
          <div className="sm:col-span-4">
            <Notice error={error} success={success} />
          </div>
        </form>
      </Panel>

      <Panel title="Assigned items">
        {!outletId ? (
          <p className="text-sm text-slate-500">Select an outlet to view its menu.</p>
        ) : (
          <QueryState
            isLoading={assignmentsQuery.isLoading}
            error={assignmentsQuery.error}
            isEmpty={!assignmentsQuery.data?.items.length}
            emptyMessage="This outlet has no assigned menu items yet."
            loadingMessage="Loading assignments..."
          >
            <div className="space-y-3">
              {(assignmentsQuery.data?.items ?? []).map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  outletId={outletId}
                  assignment={assignment}
                  onChanged={refreshAssignments}
                />
              ))}
            </div>
          </QueryState>
        )}
      </Panel>
    </div>
  );
}

function AssignmentRow({
  outletId,
  assignment,
  onChanged
}: {
  outletId: string;
  assignment: OutletMenuItemDto;
  onChanged: () => Promise<void>;
}) {
  const [price, setPrice] = useState((assignment.priceCents / 100).toFixed(2));
  const [isAvailable, setIsAvailable] = useState(assignment.isAvailable);
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () =>
      updateOutletMenuItem(outletId, assignment.menuItemId, {
        priceCents: Math.round(Number(price) * 100),
        isAvailable
      }),
    onSuccess: async () => {
      setError('');
      await onChanged();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateOutletMenuItem(outletId, assignment.menuItemId),
    onSuccess: onChanged,
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{assignment.name}</p>
          <p className="text-xs text-slate-500">
            {assignment.sku} · {formatMoney(assignment.priceCents)} · stock {assignment.quantity}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
              className="h-4 w-4"
            />
            Available
          </label>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              const cents = Math.round(Number(price) * 100);

              if (!Number.isFinite(cents) || cents <= 0) {
                setError('Enter a price greater than zero.');
                return;
              }

              save.mutate();
            }}
            className={secondaryButtonClass}
          >
            Save
          </button>
          <button
            type="button"
            disabled={deactivate.isPending}
            onClick={() => {
              if (window.confirm(`Remove ${assignment.name} from this outlet?`)) {
                deactivate.mutate();
              }
            }}
            className={secondaryButtonClass}
          >
            Remove
          </button>
        </div>
      </div>
      <Notice error={error} />
    </div>
  );
}
