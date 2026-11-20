import { useState } from 'react';
import { AdminDashboardPanel } from '../components/admin/AdminDashboardPanel';
import { AssignmentsPanel } from '../components/admin/AssignmentsPanel';
import { MenuItemsPanel } from '../components/admin/MenuItemsPanel';
import { OutletsPanel } from '../components/admin/OutletsPanel';
import { ReportsPanel } from '../components/admin/ReportsPanel';
import { StaffPanel } from '../components/admin/StaffPanel';
import { useAuth } from '../providers/AuthProvider';

type Tab = 'dashboard' | 'outlets' | 'menu' | 'assignments' | 'staff' | 'reports';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'outlets', label: 'Outlets' },
  { id: 'menu', label: 'Master menu' },
  { id: 'assignments', label: 'Outlet menu' },
  { id: 'staff', label: 'Staff' },
  { id: 'reports', label: 'Reports' }
];

export function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">HQ Admin</h1>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-fit rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === item.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' ? <AdminDashboardPanel /> : null}
        {tab === 'outlets' ? <OutletsPanel /> : null}
        {tab === 'menu' ? <MenuItemsPanel /> : null}
        {tab === 'assignments' ? <AssignmentsPanel /> : null}
        {tab === 'staff' ? <StaffPanel /> : null}
        {tab === 'reports' ? <ReportsPanel /> : null}
      </main>
    </div>
  );
}
