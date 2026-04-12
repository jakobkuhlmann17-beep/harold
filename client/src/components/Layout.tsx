import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/workout', label: 'Workout', icon: 'fitness_center' },
  { to: '/trends', label: 'Trends', icon: 'insights' },
  { to: '/nutrition', label: 'Nutrition', icon: 'restaurant' },
  { to: '/community', label: 'Community', icon: 'group' },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Daily Pulse',
  '/workout': 'Workout Log',
  '/trends': 'Trends',
  '/nutrition': 'Nutrition',
  '/community': 'Community',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Harold';

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-surface-container-lowest border-r border-outline-variant/20 z-40">
        {/* Logo */}
        <div className="p-6 pb-2">
          <h1 className="font-headline text-2xl font-bold uppercase tracking-wider text-primary">Harold</h1>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-r-full transition-all duration-300 ease-in-out group ${
                  isActive
                    ? 'bg-primary-container/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:translate-x-1 hover:bg-surface-container-low'
                }`
              }
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="font-headline text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 space-y-3">
          <NavLink to="/workout" className="hearth-glow text-on-primary rounded-full py-3 px-6 text-sm font-headline font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            Start Workout
          </NavLink>
          <div className="flex items-center justify-between px-2 pt-2 border-t border-outline-variant/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full hearth-glow flex items-center justify-center text-on-primary text-xs font-bold font-headline">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-label text-on-surface-variant">{user?.username}</span>
            </div>
            <button onClick={logout} className="text-on-surface-variant hover:text-primary transition-colors p-1" title="Logout">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden frosted-glass fixed top-0 left-0 right-0 z-50 border-b border-outline-variant/20">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="font-headline font-bold text-lg text-primary">{pageTitle}</span>
          <button onClick={logout} className="text-on-surface-variant hover:text-primary transition-colors p-1">
            <span className="material-symbols-outlined text-[22px]">logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant/20 safe-bottom">
        <div className="flex items-center justify-around h-16 relative">
          {NAV_ITEMS.map((item, idx) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => {
                if (idx === 1) {
                  // Center workout button — always elevated
                  return `flex flex-col items-center justify-center -mt-8 w-14 h-14 rounded-full hearth-glow text-on-primary shadow-lg ${isActive ? 'ring-4 ring-primary-fixed' : ''}`;
                }
                return `flex flex-col items-center justify-center gap-0.5 py-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`;
              }}
            >
              <span className={`material-symbols-outlined text-[24px] ${idx === 1 ? '' : ''}`}>{item.icon}</span>
              {idx !== 1 && <span className="text-[10px] font-label">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
