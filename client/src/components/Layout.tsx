import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-500'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="text-white font-bold text-lg tracking-tight">Harold</span>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/workout" className={linkClass}>Workout</NavLink>
            <NavLink to="/nutrition" className={linkClass}>Nutrition</NavLink>
          </div>
          <div className="flex items-center gap-3 text-indigo-100 text-sm">
            <span>{user?.username}</span>
            <button onClick={logout} className="bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded text-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
