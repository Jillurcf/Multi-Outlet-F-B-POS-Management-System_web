import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMenuItem,
  deactivateMenuItem,
  errorMessage,
  listMenuItems,
  updateMenuItem
} from '../../lib/api';
import { QueryState } from '../QueryState';
import { buttonClass, Field, inputClass, Notice, Panel, secondaryButtonClass } from './ui';

export function MenuItemsPanel() {
  const queryClient = useQueryClient();
  const menuItemsQuery = useQuery({ queryKey: ['admin-menu-items'], queryFn: () => listMenuItems() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-master-items'] });
  }

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? updateMenuItem(editingId, { sku, name, category, description: description || null })
        : createMenuItem({ sku, name, category, description: description || null }),
    onSuccess: async () => {
      setSku('');
      setName('');
      setCategory('');
      setDescription('');
      setEditingId(null);
      setError('');
      setSuccess(editingId ? 'Menu item updated.' : 'Menu item created.');
      await refresh();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateMenuItem(id),
    onSuccess: async () => {
      setSuccess('Menu item deactivated.');
      await refresh();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSuccess('');
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <Panel title={editingId ? 'Edit menu item' : 'Create menu item'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SKU">
            <input value={sku} onChange={(event) => setSku(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Category">
            <input value={category} onChange={(event) => setCategory(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Description">
            <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="submit" disabled={save.isPending} className={buttonClass}>
              {editingId ? 'Save changes' : 'Create menu item'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setSku('');
                  setName('');
                  setCategory('');
                  setDescription('');
                }}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Notice error={error} success={success} />
          </div>
        </form>
      </Panel>

      <Panel title="Master menu">
        <QueryState
          isLoading={menuItemsQuery.isLoading}
          error={menuItemsQuery.error}
          isEmpty={!menuItemsQuery.data?.items.length}
          emptyMessage="No menu items yet. Create the first item above."
          loadingMessage="Loading menu items..."
        >
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(menuItemsQuery.data?.items ?? []).map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="py-2 font-medium">{item.sku}</td>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-slate-400">{item.category}</td>
                  <td className="py-2">
                    <span className={item.isActive ? 'text-emerald-400' : 'text-slate-500'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setSku(item.sku);
                          setName(item.name);
                          setCategory(item.category);
                          setDescription(item.description ?? '');
                          setError('');
                          setSuccess('');
                        }}
                        className={secondaryButtonClass}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!item.isActive || deactivate.isPending}
                        onClick={() => {
                          if (window.confirm(`Deactivate ${item.name}?`)) {
                            deactivate.mutate(item.id);
                          }
                        }}
                        className={secondaryButtonClass}
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </QueryState>
      </Panel>
    </div>
  );
}
