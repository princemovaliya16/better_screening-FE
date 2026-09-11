import { clsx } from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';
import { NotificationsBell } from '@/components/patterns/NotificationsBell';
import { Logo } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';

const NAV = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/jobs', label: 'Jobs' },
  { to: '/app/candidates', label: 'Candidates' },
  { to: '/app/interviews', label: 'Interviews' },
  { to: '/app/settings', label: 'Settings' },
];

export function RecruiterShellLayout() {
  const { user, signOut } = useAuth();
  const { organization } = useOrg();

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-ink-800">
      <aside className="fixed inset-y-0 left-0 w-[240px] bg-white border-r border-ink-200 flex flex-col">
        <div className="px-5 h-16 flex items-center border-b border-ink-100">
          <Logo size={30} />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'block px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-ink-100">
          <div className="px-2 pb-2">
            <p className="text-[13px] font-semibold text-ink-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-ink-400 truncate">{organization?.name}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-ink-500 hover:bg-ink-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="pl-[240px] min-h-screen">
        <div className="h-16 flex items-center justify-end px-6 border-b border-ink-100 bg-white">
          <NotificationsBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
