import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-full text-sm font-medium font-heading transition-all ${
      isActive
        ? 'gradient-primary text-on-primary shadow-sm'
        : 'text-on-surface-variant hover:bg-surface-container-high'
    }`;

  return (
    <div className="min-h-screen bg-surface">
      <nav className="frosted-glass fixed top-0 left-0 right-0 z-50 shadow-sm border-b border-outline-variant/30">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-heading font-bold text-xl gradient-text">Harold</span>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/workout" className={linkClass}>Workout</NavLink>
            <NavLink to="/nutrition" className={linkClass}>Nutrition</NavLink>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-on-surface-variant font-body">{user?.username}</span>
            <button onClick={logout} className="gradient-primary text-on-primary px-4 py-1.5 rounded-full text-sm font-heading font-medium hover:opacity-90 transition-opacity">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6 pt-20">
        <Outlet />
      </main>
    </div>
  );
}
