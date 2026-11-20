import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOutlet,
  deactivateOutlet,
  errorMessage,
  listOutlets,
  updateOutlet
} from '../../lib/api';
import { QueryState } from '../QueryState';
import { buttonClass, Field, inputClass, Notice, Panel, secondaryButtonClass } from './ui';

export function OutletsPanel() {
  const queryClient = useQueryClient();
  const outletsQuery = useQuery({ queryKey: ['admin-outlets'], queryFn: () => listOutlets() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['admin-outlets'] });
  }

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? updateOutlet(editingId, { code, name, address: address || null })
        : createOutlet({ code, name, address: address || null }),
    onSuccess: async () => {
      setCode('');
      setName('');
      setAddress('');
      setEditingId(null);
      setError('');
      setSuccess(editingId ? 'Outlet updated.' : 'Outlet created.');
      await refresh();
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateOutlet(id),
    onSuccess: async () => {
      setSuccess('Outlet deactivated.');
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
      <Panel title={editingId ? 'Edit outlet' : 'Create outlet'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Code">
            <input value={code} onChange={(event) => setCode(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-3">
            <button type="submit" disabled={save.isPending} className={buttonClass}>
              {editingId ? 'Save changes' : 'Create outlet'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setCode('');
                  setName('');
                  setAddress('');
                }}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
            ) : null}
          </div>
          <div className="sm:col-span-3">
            <Notice error={error} success={success} />
          </div>
        </form>
      </Panel>

      <Panel title="Outlets">
        <QueryState
          isLoading={outletsQuery.isLoading}
          error={outletsQuery.error}
          isEmpty={!outletsQuery.data?.items.length}
          emptyMessage="No outlets yet. Create the first outlet above."
          loadingMessage="Loading outlets..."
        >
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">Code</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Address</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(outletsQuery.data?.items ?? []).map((outlet) => (
                <tr key={outlet.id} className="border-t border-slate-800">
                  <td className="py-2 font-medium">{outlet.code}</td>
                  <td className="py-2">{outlet.name}</td>
                  <td className="py-2 text-slate-400">{outlet.address ?? '-'}</td>
                  <td className="py-2">
                    <span className={outlet.isActive ? 'text-emerald-400' : 'text-slate-500'}>
                      {outlet.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(outlet.id);
                          setCode(outlet.code);
                          setName(outlet.name);
                          setAddress(outlet.address ?? '');
                          setError('');
                          setSuccess('');
                        }}
                        className={secondaryButtonClass}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!outlet.isActive || deactivate.isPending}
                        onClick={() => {
                          if (window.confirm(`Deactivate ${outlet.name}?`)) {
                            deactivate.mutate(outlet.id);
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
