import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { demoMode, errorMessage } from '../lib/api';
import { demoEmails } from '../lib/demo';
import { useAuth } from '../providers/AuthProvider';

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Checking session...
      </main>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'OUTLET_STAFF' ? '/pos' : '/admin'} replace />;
  }

  async function signIn(loginEmail: string, loginPassword: string): Promise<void> {
    setError('');
    setSubmitting(true);

    try {
      const signedInUser = await login(loginEmail, loginPassword);
      const home = signedInUser.role === 'OUTLET_STAFF' ? '/pos' : '/admin';
      const from = (location.state as { from?: string } | null)?.from;
      const allowedFrom = signedInUser.role === 'OUTLET_STAFF' ? '/pos' : '/admin';
      navigate(from === allowedFrom ? from : home, { replace: true });
    } catch (signInError) {
      setError(errorMessage(signInError));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void signIn(email, password);
  }

  if (demoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold">POS Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">
            Demo mode is on. No backend is needed — pick a role to continue.
          </p>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void signIn(demoEmails.admin, 'demo')}
            className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            Sign in as HQ Admin
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void signIn(demoEmails.staff, 'demo')}
            className="mt-3 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-50"
          >
            Sign in as Outlet Staff
          </button>

          {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-semibold">POS Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use your outlet staff or HQ admin account.</p>

        <label className="mt-6 block text-sm font-medium text-slate-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />

        <label className="mt-4 block text-sm font-medium text-slate-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
