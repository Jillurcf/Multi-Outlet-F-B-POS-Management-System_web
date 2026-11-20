import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createStaff, errorMessage, listOutlets } from '../../lib/api';
import { QueryState } from '../QueryState';
import { buttonClass, Field, inputClass, Notice, Panel } from './ui';

export function StaffPanel() {
  const outletsQuery = useQuery({ queryKey: ['admin-outlets'], queryFn: () => listOutlets() });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [outletId, setOutletId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const create = useMutation({
    mutationFn: () => createStaff({ email, password, fullName, outletId }),
    onSuccess: (user) => {
      setEmail('');
      setPassword('');
      setFullName('');
      setOutletId('');
      setError('');
      setSuccess(`Staff account created for ${user.email}.`);
    },
    onError: (mutationError: unknown) => setError(errorMessage(mutationError))
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSuccess('');
    create.mutate();
  }

  return (
    <Panel title="Create outlet staff" description="Staff accounts are bound to one active outlet.">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className={inputClass} />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Outlet">
          <QueryState
            isLoading={outletsQuery.isLoading}
            error={outletsQuery.error}
            isEmpty={!outletsQuery.data?.items.length}
            emptyMessage="No outlets available."
            loadingMessage="Loading outlets..."
          >
            <select value={outletId} onChange={(event) => setOutletId(event.target.value)} required className={inputClass}>
              <option value="">Select an outlet</option>
              {(outletsQuery.data?.items ?? []).map((outlet) => (
                <option key={outlet.id} value={outlet.id} disabled={!outlet.isActive}>
                  {outlet.code} - {outlet.name}
                </option>
              ))}
            </select>
          </QueryState>
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" disabled={create.isPending} className={buttonClass}>
            Create staff account
          </button>
          <Notice error={error} success={success} />
        </div>
      </form>
    </Panel>
  );
}
