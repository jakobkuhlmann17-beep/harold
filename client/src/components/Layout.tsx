import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { timeAgo } from '../utils/timeAgo';

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
  '/admin': 'Admin',
  '/profile': 'Profile',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s
  useEffect(() => {
    const fetch = () => api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count)).catch(() => {});
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, []);

  const openNotifs = async () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) { const { data } = await api.get('/notifications'); setNotifs(data); }
  };

  const markAllRead = async () => { await api.put('/notifications/read-all'); setUnreadCount(0); setNotifs(n => n.map(x => ({ ...x, read: true }))); };

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
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
          {/* Admin button — only for kuhli1712 */}
          {user?.username === 'kuhli1712' && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 mx-0 mt-4 px-4 py-3 rounded-xl font-headline font-bold text-sm transition-colors ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`
              }>
              <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Bottom section */}
        <div className="p-4 space-y-3">
          <button onClick={() => navigate('/workout?start=true')} className="hearth-glow text-on-primary rounded-full py-3 px-6 text-sm font-headline font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity w-full">
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            Start Workout
          </button>
          <div className="flex items-center justify-between px-2 pt-2 border-t border-outline-variant/20">
            <NavLink to={`/profile/${user?.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full hearth-glow flex items-center justify-center text-on-primary text-xs font-bold font-headline">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-label text-on-surface-variant">{user?.username}</span>
            </NavLink>
            <button onClick={logout} className="text-on-surface-variant hover:text-primary transition-colors p-1" title="Logout">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop top-right notification bell */}
      <div ref={notifRef} className="hidden lg:block fixed top-4 right-6 z-[45]">
        <button onClick={openNotifs} className="bg-surface-container-lowest hover:bg-surface-container-low shadow-md border border-outline-variant/20 rounded-full w-11 h-11 flex items-center justify-center relative transition-colors" title="Notifications">
          <span className="material-symbols-outlined text-[22px] text-on-surface-variant">notifications</span>
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] font-black w-5 h-5 flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        {notifOpen && (
          <div className="absolute top-12 right-0 w-80 bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/20 z-50 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-surface-container-lowest p-4 border-b border-outline-variant/20 flex items-center justify-between rounded-t-3xl">
              <span className="font-headline font-bold text-sm">Notifications</span>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary font-headline font-bold hover:underline">Mark all read</button>}
            </div>
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-sm font-body">No notifications yet</div>
            ) : notifs.map(n => (
              <button key={n.id} onClick={async () => { await api.put(`/notifications/${n.id}/read`); setNotifOpen(false); setUnreadCount(c => Math.max(0, c - (n.read ? 0 : 1))); if (n.postId) navigate(`/community`); }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low transition-colors ${!n.read ? 'bg-primary-fixed/20' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold font-headline text-on-surface-variant flex-shrink-0">
                  {n.fromUsername?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-body ${!n.read ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{n.message}</p>
                  <p className="text-[10px] text-outline font-label mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Top Bar */}
      <header className="lg:hidden frosted-glass fixed top-0 left-0 right-0 z-50 border-b border-outline-variant/20">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="font-headline font-bold text-lg text-primary">{pageTitle}</span>
          <div className="flex items-center gap-1">
            <button onClick={openNotifs} className="text-on-surface-variant hover:text-primary transition-colors p-1 relative">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] font-black w-4 h-4 flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <button onClick={logout} className="text-on-surface-variant hover:text-primary transition-colors p-1">
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile notification dropdown */}
      {notifOpen && (
        <div className="lg:hidden fixed top-14 right-2 left-2 z-[55] bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/20 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-surface-container-lowest p-4 border-b border-outline-variant/20 flex items-center justify-between rounded-t-3xl">
            <span className="font-headline font-bold text-sm">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary font-headline font-bold hover:underline">Mark all read</button>}
          </div>
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-sm font-body">No notifications yet</div>
          ) : notifs.map(n => (
            <button key={n.id} onClick={async () => { await api.put(`/notifications/${n.id}/read`); setNotifOpen(false); setUnreadCount(c => Math.max(0, c - (n.read ? 0 : 1))); if (n.postId) navigate(`/community`); }}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low transition-colors ${!n.read ? 'bg-primary-fixed/20' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold font-headline text-on-surface-variant flex-shrink-0">
                {n.fromUsername?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-body ${!n.read ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{n.message}</p>
                <p className="text-[10px] text-outline font-label mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

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
