import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CompWeek {
  id: number; weekNumber: number; totalSets: number; completedSets: number;
  completionRate: number; totalVolume: number; activeDays: number;
  cardioSessions: number; totalDistanceKm: number; topExercise: string | null;
  focus: string[]; createdAt: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayWorkout, setTodayWorkout] = useState<{ focus: string; completed: number; total: number; activityType: string; cardio: any | null } | null>(null);
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [streak, setStreak] = useState(0);
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [compilation, setCompilation] = useState<CompWeek[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchAll = () => {
    api.get('/weeks').then(({ data }) => {
      if (!data.length) return;
      const todayDay = DAY_NAMES[new Date().getDay()];
      const latestWeek = data[data.length - 1];
      const day = latestWeek.days?.find((d: any) => d.dayOfWeek === todayDay);
      if (day) {
        const allSets = day.exercises?.flatMap((e: any) => e.sets) || [];
        setTodayWorkout({
          focus: day.focus || 'Rest',
          completed: allSets.filter((s: any) => s.completed).length,
          total: allSets.length,
          activityType: day.activityType || 'WORKOUT',
          cardio: day.cardioSession || null,
        });
      }
      let streakCount = 0;
      const allDays = data.flatMap((w: any) => w.days || []);
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dayName = DAY_NAMES[checkDate.getDay()];
        const matchDay = allDays.find((d: any) => d.dayOfWeek === dayName);
        if (matchDay) {
          const completed = matchDay.exercises?.some((e: any) => e.sets?.some((s: any) => s.completed));
          if (completed) streakCount++;
          else if (i > 0) break;
        } else if (i > 0) break;
      }
      setStreak(streakCount);
      const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const vol = dayOrder.map((dn) => {
        const d = latestWeek.days?.find((dd: any) => dd.dayOfWeek === dn);
        return d ? d.exercises?.reduce((sum: number, e: any) => sum + (e.sets?.length || 0), 0) || 0 : 0;
      });
      setWeeklyVolume(vol);
    });

    api.get('/weeks/compilation').then(({ data }) => setCompilation(data));

    const today = new Date().toISOString().split('T')[0];
    api.get(`/meals?date=${today}`).then(({ data }) => {
      setNutrition({
        calories: data.reduce((s: number, m: any) => s + m.calories, 0),
        protein: data.reduce((s: number, m: any) => s + m.proteinG, 0),
        carbs: data.reduce((s: number, m: any) => s + m.carbsG, 0),
        fat: data.reduce((s: number, m: any) => s + m.fatG, 0),
      });
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const deleteAllWeeks = async () => {
    if (!confirm('Are you sure? This will permanently delete all your workout data.')) return;
    setDeleting(true);
    await api.delete('/weeks/all');
    setDeleting(false);
    window.location.reload();
  };

  const resetAndLoadTemplate = async () => {
    if (!confirm("This will delete all your current weeks and load Jakob's plan. Continue?")) return;
    setResetting(true);
    await api.delete('/weeks/all');
    await api.post('/weeks/load-template');
    setResetting(false);
    navigate('/workout');
  };

  const calTarget = user?.calorieTarget || 2000;
  const calRemaining = Math.max(0, calTarget - nutrition.calories);
  const calPct = Math.min(100, (nutrition.calories / calTarget) * 100);
  const proPct = Math.min(100, (nutrition.protein / (user?.proteinTarget || 150)) * 100);
  const carbPct = Math.min(100, (nutrition.carbs / (user?.carbsTarget || 200)) * 100);
  const fatPct = Math.min(100, (nutrition.fat / (user?.fatTarget || 65)) * 100);
  const maxVolume = Math.max(...weeklyVolume, 1);
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (calPct / 100) * ringCircumference;

  const fmtVol = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-surface-container-low p-6 lg:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 hearth-glow opacity-10 rounded-full blur-3xl pointer-events-none" />
          <p className="font-label text-sm uppercase tracking-widest text-primary mb-1 relative">Daily Summary</p>
          <h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-on-surface relative">Welcome back, {user?.username}!</h2>
          <p className="text-sm text-on-surface-variant font-body mt-1 mb-4 relative">Today is {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="grid grid-cols-3 gap-4 relative mb-4">
            <div><p className="font-headline text-3xl font-black text-primary">{calRemaining.toLocaleString()}</p><p className="text-sm text-on-surface-variant font-label mt-1">Calories Remaining</p></div>
            <div><p className="font-headline text-3xl font-black text-tertiary">{todayWorkout ? todayWorkout.completed : 0}</p><p className="text-sm text-on-surface-variant font-label mt-1">Sets Completed</p></div>
            <div><p className="font-headline text-3xl font-black text-secondary">{streak}</p><p className="text-sm text-on-surface-variant font-label mt-1">Day Streak</p></div>
          </div>

          {/* Today's workout status card */}
          {todayWorkout ? (
            <div className={`rounded-2xl p-5 relative ${todayWorkout.completed === todayWorkout.total && todayWorkout.total > 0 ? 'bg-green-50 border border-green-200' : 'bg-primary-fixed/30 border border-primary-fixed'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl hearth-glow flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-[20px]">
                    {todayWorkout.activityType === 'RUN' ? 'directions_run' : todayWorkout.activityType === 'CYCLING' ? 'directions_bike' : 'fitness_center'}
                  </span>
                </div>
                <div className="flex-1">
                  {todayWorkout.activityType === 'WORKOUT' ? (() => {
                    const allDone = todayWorkout.total > 0 && todayWorkout.completed === todayWorkout.total;
                    const partial = todayWorkout.completed > 0 && todayWorkout.completed < todayWorkout.total;
                    return (
                      <>
                        <p className="font-headline font-bold text-lg text-on-surface capitalize">
                          {allDone ? `You completed ${todayWorkout.focus} today \u2014 good job! \ud83c\udf89` : partial ? `Keep going with ${todayWorkout.focus} today` : `You have ${todayWorkout.focus} scheduled today`}
                        </p>
                        <p className="text-sm text-on-surface-variant font-body">
                          {todayWorkout.total === 0 ? 'No sets added yet' : allDone ? `All ${todayWorkout.total} sets complete \ud83d\udd25` : `${todayWorkout.completed} / ${todayWorkout.total} sets completed`}
                        </p>
                      </>
                    );
                  })() : (() => {
                    const hasData = todayWorkout.cardio && (todayWorkout.cardio.distanceKm || todayWorkout.cardio.durationMinutes);
                    const activity = todayWorkout.activityType === 'RUN' ? 'Run' : 'Cycling';
                    return (
                      <>
                        <p className="font-headline font-bold text-lg text-on-surface">
                          {hasData ? `You completed your ${activity.toLowerCase()} today \u2014 good job! \ud83c\udf89` : `You have a ${activity} session scheduled today`}
                        </p>
                        <p className="text-sm text-on-surface-variant font-body">
                          {hasData ? `${todayWorkout.cardio.distanceKm || '?'} km \u00b7 ${todayWorkout.cardio.durationMinutes || '?'} min` : 'Not started yet'}
                        </p>
                      </>
                    );
                  })()}
                </div>
                <Link to="/workout" className={`rounded-full px-5 py-2 text-sm font-headline font-bold transition-opacity flex-shrink-0 ${todayWorkout.total > 0 && todayWorkout.completed === todayWorkout.total ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest' : 'hearth-glow text-white hover:opacity-90'}`}>
                  {todayWorkout.total > 0 && todayWorkout.completed === todayWorkout.total ? 'View workout \u2192' : 'Go to workout \u2192'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-2xl p-5 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">self_improvement</span>
                </div>
                <div className="flex-1">
                  <p className="font-headline font-bold text-lg text-on-surface-variant">Rest day today</p>
                  <p className="text-sm text-on-surface-variant font-body">No workout scheduled &mdash; enjoy the recovery</p>
                </div>
                <Link to="/workout" className="border border-outline text-on-surface-variant rounded-full px-5 py-2 text-sm font-headline font-bold hover:bg-surface-container-high transition-colors flex-shrink-0">Add a session &rarr;</Link>
              </div>
            </div>
          )}
        </div>
        <div className="md:col-span-4 bg-surface-container-lowest p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined filled text-secondary text-[28px]">local_fire_department</span>
            <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant">Burn Goal</span>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm font-body mb-1"><span className="text-on-surface-variant">Progress</span><span className="font-headline font-bold text-on-surface">{nutrition.calories} / {calTarget} kcal</span></div>
            <div className="w-full bg-surface-container-high rounded-full h-2"><div className="gradient-bar h-2 rounded-full transition-all duration-500" style={{ width: `${calPct}%` }} /></div>
          </div>
          <Link to="/nutrition" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-headline font-medium hover:gap-2 transition-all">View Nutrition <span className="material-symbols-outlined text-[18px]">arrow_forward</span></Link>
        </div>
      </div>

      {/* Bento: Workout + Nutrition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-xl font-bold text-on-surface">Today's Session</h3>
            <Link to="/workout" className="text-sm text-primary font-headline font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span></Link>
          </div>
          {todayWorkout ? (
            <div className="bg-surface-container-lowest p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl hearth-glow flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[24px]">{todayWorkout.activityType === 'RUN' ? 'directions_run' : todayWorkout.activityType === 'CYCLING' ? 'directions_bike' : 'fitness_center'}</span>
              </div>
              <div className="flex-1">
                <p className="font-headline font-bold text-lg text-on-surface capitalize">{todayWorkout.focus}</p>
                {todayWorkout.activityType === 'WORKOUT' ? (
                  <p className="text-sm text-on-surface-variant font-body">{todayWorkout.completed} / {todayWorkout.total} sets completed</p>
                ) : todayWorkout.cardio ? (
                  <p className="text-sm text-on-surface-variant font-body">{todayWorkout.cardio.distanceKm ? `${todayWorkout.cardio.distanceKm} km` : ''}{todayWorkout.cardio.durationMinutes ? ` \u00b7 ${todayWorkout.cardio.durationMinutes} min` : ''}</p>
                ) : (
                  <p className="text-sm text-on-surface-variant font-body">{todayWorkout.activityType === 'RUN' ? 'Run' : 'Cycling'} \u2014 not logged yet</p>
                )}
              </div>
              <Link to="/workout" className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">chevron_right</span></Link>
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-6 rounded-3xl text-center">
              <p className="text-on-surface-variant font-body">No workout scheduled today</p>
              <Link to="/workout" className="mt-2 inline-block text-sm text-primary font-headline font-medium">Start one &rarr;</Link>
            </div>
          )}
          <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-3xl">
            <h4 className="font-headline font-bold text-on-surface mb-6">Workout Intensity Trend</h4>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyVolume.map((vol, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full max-w-[40px] rounded-t-lg transition-all duration-500"
                    style={{ height: `${Math.max(4, (vol / maxVolume) * 100)}%`, background: vol > 0 ? `linear-gradient(135deg, rgba(161,64,0,${0.4 + (vol / maxVolume) * 0.6}) 0%, rgba(242,109,33,${0.4 + (vol / maxVolume) * 0.6}) 100%)` : '#eae7e7' }} />
                  <span className="text-[10px] font-label text-on-surface-variant">{WEEK_SHORT[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <h3 className="font-headline text-xl font-bold text-on-surface">Daily Fuel</h3>
          <div className="bg-surface-container-lowest p-6 rounded-3xl">
            <div className="flex justify-center mb-4">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <defs><linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a14000" /><stop offset="100%" stopColor="#f26d21" /></linearGradient></defs>
                  <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="#eae7e7" strokeWidth="8" />
                  <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="url(#calGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-2xl font-black text-on-surface">{Math.round(calPct)}%</span>
                  <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">consumed</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <MacroRow label="Protein" current={nutrition.protein} target={user?.proteinTarget || 150} pct={proPct} color="bg-tertiary" />
              <MacroRow label="Carbs" current={nutrition.carbs} target={user?.carbsTarget || 200} pct={carbPct} color="bg-secondary" />
              <MacroRow label="Fats" current={nutrition.fat} target={user?.fatTarget || 65} pct={fatPct} color="bg-primary" />
            </div>
            <Link to="/nutrition" className="mt-4 w-full bg-surface-container-high rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-headline font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span> Log a Meal
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly Compilation Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">Training Journal</p>
            <h3 className="font-headline text-2xl font-bold text-on-surface">Weekly Compilation</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={resetAndLoadTemplate} disabled={resetting}
              className="border border-outline text-on-surface-variant rounded-full px-4 py-1.5 text-sm font-headline font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50 flex items-center gap-1">
              {resetting && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
              Reset &amp; Load Jakob's Plan
            </button>
            <button onClick={deleteAllWeeks} disabled={deleting}
              className="border border-error text-error rounded-full px-4 py-1.5 text-sm font-headline font-medium hover:bg-error-container/20 transition-colors disabled:opacity-50 flex items-center gap-1">
              {deleting && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
              Delete All Weeks
            </button>
          </div>
        </div>

        {compilation.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-10 text-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">calendar_month</span>
            <p className="text-on-surface-variant font-body mb-4">No weeks logged yet</p>
            <div className="flex justify-center gap-3">
              <button onClick={resetAndLoadTemplate} disabled={resetting}
                className="hearth-glow text-white rounded-full px-6 py-2.5 font-headline font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                Load Jakob's Plan
              </button>
              <Link to="/workout" className="border border-outline text-on-surface-variant rounded-full px-6 py-2.5 font-headline font-bold text-sm hover:bg-surface-container-high transition-colors">
                Start Fresh
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {compilation.map((w) => (
              <WeekCard key={w.id} week={w} fmtVol={fmtVol} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Week compilation card ---
function WeekCard({ week: w, fmtVol }: { week: CompWeek; fmtVol: (v: number) => string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (w.completionRate / 100) * c;
  const badge = w.completionRate >= 80
    ? { label: 'On fire', bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]' }
    : w.completionRate >= 50
    ? { label: 'Solid', bg: 'bg-secondary-container', text: 'text-on-secondary-container' }
    : { label: 'In progress', bg: 'bg-surface-container-high', text: 'text-on-surface-variant' };

  return (
    <div className="min-w-[260px] bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-headline font-black text-lg text-on-surface">Week {w.weekNumber}</span>
        <span className={`${badge.bg} ${badge.text} text-[10px] font-bold font-label px-2.5 py-1 rounded-full uppercase tracking-wider`}>{badge.label}</span>
      </div>

      {/* Ring */}
      <div className="flex justify-center mb-3">
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
            <defs><linearGradient id={`wg${w.id}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a14000" /><stop offset="100%" stopColor="#f26d21" /></linearGradient></defs>
            <circle cx="30" cy="30" r={r} fill="none" stroke="#e4e2e1" strokeWidth="6" />
            <circle cx="30" cy="30" r={r} fill="none" stroke={`url(#wg${w.id})`} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-headline font-black text-sm text-on-surface">{w.completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div>
          <p className="font-headline font-bold text-base text-on-surface">{w.completedSets}/{w.totalSets}</p>
          <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">Sets Done</p>
        </div>
        <div>
          <p className="font-headline font-bold text-base text-on-surface">{w.activeDays}</p>
          <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">Active Days</p>
        </div>
        <div>
          <p className="font-headline font-bold text-base text-on-surface">{fmtVol(w.totalVolume)}</p>
          <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">Volume</p>
        </div>
      </div>

      {/* Focus tags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {w.focus.slice(0, 3).map((f) => (
          <span key={f} className="bg-primary-fixed text-primary text-[10px] rounded-full px-2 py-0.5 font-bold">{f}</span>
        ))}
        {w.focus.length > 3 && <span className="bg-surface-container-high text-on-surface-variant text-[10px] rounded-full px-2 py-0.5 font-bold">+{w.focus.length - 3}</span>}
      </div>

      {/* Cardio */}
      {w.cardioSessions > 0 && (
        <div className="flex gap-3 mt-3">
          <span className="text-[11px] text-on-surface-variant bg-surface-container-low rounded-full px-2.5 py-0.5">{w.totalDistanceKm > 0 ? `\ud83c\udfc3 ${w.totalDistanceKm}km` : `\ud83c\udfc3 ${w.cardioSessions} session${w.cardioSessions > 1 ? 's' : ''}`}</span>
        </div>
      )}

      {/* Top exercise */}
      {w.topExercise && (
        <p className="text-[11px] text-on-surface-variant mt-3">Best lift: {w.topExercise}</p>
      )}
    </div>
  );
}

function MacroRow({ label, current, target, pct, color }: { label: string; current: number; target: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1 h-8 rounded-full ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between text-sm"><span className="font-label text-on-surface-variant">{label}</span><span className="font-headline font-medium text-on-surface">{Math.round(current)}g / {target}g</span></div>
        <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-1"><div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} /></div>
      </div>
      <span className="text-xs font-headline font-bold text-on-surface-variant w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
}
