import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Crosshair, ScanLine, ShieldCheck, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/targets', label: 'Targets', icon: Crosshair },
  { to: '/scans', label: 'Scans', icon: ScanLine },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 py-6">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-[#04141f] shadow-lg shadow-sky-500/30">
        <ShieldCheck className="h-5 w-5" />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-bg bg-ok" />
      </div>
      <div>
        <p className="text-base font-bold leading-none tracking-tight text-fg">AegisScan</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
          DAST Console
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line-soft bg-gradient-to-b from-surface/70 to-bg/40 backdrop-blur-xl md:flex">
        <Brand />

        <div className="px-5 pb-2 pt-1">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
            Menu
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-accent/15 to-transparent text-fg'
                    : 'text-muted hover:bg-surface-2/60 hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 transition-all',
                      isActive ? 'w-1 opacity-100' : 'w-0 opacity-0',
                    )}
                  />
                  <item.icon
                    className={cn('h-[18px] w-[18px]', isActive ? 'text-accent' : 'text-muted group-hover:text-fg')}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-xl border border-line-soft bg-surface-2/40 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-indigo-400/20 text-sm font-bold text-accent ring-1 ring-inset ring-accent/20">
              {(user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-fg">{user?.email ?? 'User'}</p>
              <p className="text-[10px] text-faint">{user?.is_superuser ? 'Administrator' : 'Member'}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-crit/10 hover:text-crit"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line-soft bg-surface/40 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="text-sm font-bold">AegisScan</span>
          </div>
          <button onClick={handleLogout} className="text-muted hover:text-crit">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl animate-fade-up px-4 py-8 sm:px-6 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
