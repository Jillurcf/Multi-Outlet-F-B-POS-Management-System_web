import type { ReactNode } from 'react';
import { errorMessage } from '../lib/api';

export function QueryState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No records found.',
  loadingMessage = 'Loading...',
  children
}: {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return <p className="py-4 text-sm text-slate-400">{loadingMessage}</p>;
  }

  if (error) {
    return <p className="py-4 text-sm text-rose-400">{errorMessage(error)}</p>;
  }

  if (isEmpty) {
    return <p className="py-4 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return <>{children}</>;
}
