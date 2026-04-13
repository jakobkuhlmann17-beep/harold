import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { timeAgo } from '../utils/timeAgo';

interface Stats { totalUsers: number; newUsersLast7Days: number; newUsersLast30Days: number; totalWeeks: number; totalSets: number; completedSets: number; totalMeals: number; totalPosts: number; totalLikes: number; activeUsersLast7Days: number; activeUsersLast30Days: number; }
interface UserRow { id: number; username: string; email: string; createdAt: string; totalWeeks: number; totalSets: number; completedSets: number; totalMeals: number; totalPosts: number; lastActiveAt: string; status: string; }
interface GrowthDay { date: string; newUsers: number; }
interface ActivityDay { date: string; completedSets: number; activeUsers: number; }

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [growth, setGrowth] = useState<GrowthDay[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);

  if (user?.username !== 'kuhli1712') return <Navigate to="/dashboard" />;

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'), api.get('/admin/users'),
      api.get('/admin/growth'), api.get('/admin/activity'),
    ]).then(([s, u, g, a]) => {
      setStats(s.data); setUsers(u.data); setGrowth(g.data); setActivity(a.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-surface-container-high rounded animate-pulse" />
      <div className="grid grid-cols-3 gap-4">{[0,1,2,3,4,5].map(i => <div key={i} className="h-24 bg-surface-container-high rounded-2xl animate-pulse" />)}</div>
      <div className="h-64 bg-surface-container-high rounded-3xl animate-pulse" />
    </div>
  );

  if (!stats) return null;

  const completionRate = stats.totalSets > 0 ? Math.round((stats.completedSets / stats.totalSets) * 100) : 0;

  // Quick insights
  const mostActive = users.length > 0 ? users.reduce((best, u) => u.completedSets > best.completedSets ? u : best) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="uppercase tracking-widest text-xs font-bold text-blue-600 font-label">Platform Overview</p>
        <div className="flex items-center gap-3">
          <h2 className="font-headline text-3xl lg:text-4xl font-black text-on-surface">Harold Admin</h2>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold font-label px-2.5 py-1 rounded-full uppercase tracking-wider">Only visible to you</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { value: stats.totalUsers, label: 'registered users' },
          { value: stats.activeUsersLast7Days, label: 'active this week' },
          { value: stats.activeUsersLast30Days, label: 'active this month' },
          { value: stats.newUsersLast7Days, label: 'joined this week' },
          { value: stats.totalSets.toLocaleString(), label: 'sets logged' },
          { value: `${completionRate}%`, label: 'completion rate' },
        ].map((m, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
            <p className="font-headline font-black text-3xl text-primary">{m.value}</p>
            <p className="text-xs uppercase text-on-surface-variant font-bold tracking-widest mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth chart */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <h3 className="font-headline text-2xl font-bold text-on-surface">User Growth</h3>
          <p className="text-sm text-on-surface-variant font-body mb-4">Last 30 days</p>
          <BarChart data={growth.map(d => ({ label: d.date.slice(5), value: d.newUsers }))} color="hearth-glow" />
          <p className="text-sm font-headline font-bold text-primary mt-4">Total growth: +{stats.newUsersLast30Days} users in last 30 days</p>
        </div>

        {/* Activity chart */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Daily Activity</h3>
          <p className="text-sm text-on-surface-variant font-body mb-4">Completed sets per day</p>
          <BarChart data={activity.map(d => ({ label: d.date.slice(5), value: d.completedSets }))} color="hearth-glow" />
          <div className="flex gap-4 mt-4 text-xs font-label text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="w-3 h-3 hearth-glow rounded-sm" /> Completed sets</span>
          </div>
        </div>
      </div>

      {/* User table */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-headline text-2xl font-bold text-on-surface">All Users</h3>
          <span className="bg-primary-fixed text-primary text-xs font-bold rounded-full px-2.5 py-0.5">{users.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-on-surface-variant font-bold tracking-widest bg-surface-container-low">
                <th className="text-left px-3 py-2">Username</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Joined</th>
                <th className="text-left px-3 py-2">Weeks</th>
                <th className="text-left px-3 py-2">Sets</th>
                <th className="text-left px-3 py-2">Completion</th>
                <th className="text-left px-3 py-2">Meals</th>
                <th className="text-left px-3 py-2">Posts</th>
                <th className="text-left px-3 py-2">Last Active</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const cRate = u.totalSets > 0 ? Math.round((u.completedSets / u.totalSets) * 100) : 0;
                return (
                  <tr key={u.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                    <td className="px-3 py-3 font-headline font-bold text-primary">{u.username}</td>
                    <td className="px-3 py-3 text-on-surface-variant">{u.email}</td>
                    <td className="px-3 py-3 text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-3 py-3">{u.totalWeeks}</td>
                    <td className="px-3 py-3">{u.completedSets}/{u.totalSets}</td>
                    <td className="px-3 py-3"><span className={`font-bold ${cRate > 75 ? 'text-[#2e7d32]' : cRate >= 50 ? 'text-secondary' : 'text-error'}`}>{cRate}%</span></td>
                    <td className="px-3 py-3">{u.totalMeals}</td>
                    <td className="px-3 py-3">{u.totalPosts}</td>
                    <td className="px-3 py-3 text-on-surface-variant">{timeAgo(u.lastActiveAt)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' :
                        u.status === 'recent' ? 'bg-blue-100 text-blue-800' :
                        'bg-surface-container text-on-surface-variant'
                      }`}>{u.status === 'active' ? 'Active' : u.status === 'recent' ? 'Recent' : 'Inactive'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mostActive && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20">
            <p className="text-xs uppercase text-on-surface-variant font-bold tracking-widest mb-2">Most Active User</p>
            <p className="font-headline font-black text-2xl text-primary">{mostActive.username}</p>
            <p className="text-sm text-on-surface-variant font-body mt-1">{mostActive.completedSets} sets &middot; {mostActive.totalWeeks} weeks</p>
          </div>
        )}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20">
          <p className="text-xs uppercase text-on-surface-variant font-bold tracking-widest mb-2">Total Content</p>
          <p className="font-headline font-black text-2xl text-primary">{stats.totalPosts}</p>
          <p className="text-sm text-on-surface-variant font-body mt-1">posts &middot; {stats.totalLikes} likes &middot; {stats.totalMeals} meals</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="#eae7e7" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none" stroke={completionRate > 70 ? '#2e7d32' : completionRate >= 50 ? '#735c00' : '#ba1a1a'} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - completionRate / 100)} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-headline text-sm font-black">{completionRate}%</span>
          </div>
          <div>
            <p className="text-xs uppercase text-on-surface-variant font-bold tracking-widest">Platform Health</p>
            <p className="font-headline font-bold text-on-surface">Overall completion rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-0.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-inverse-surface text-inverse-on-surface text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap z-10">{d.label}: {d.value}</div>
          <div className={`w-full max-w-[12px] rounded-t ${color}`} style={{ height: `${Math.max(2, (d.value / maxVal) * 100)}%` }} />
          {i % 5 === 0 && <span className="text-[7px] font-label text-on-surface-variant">{d.label}</span>}
        </div>
      ))}
    </div>
  );
}
