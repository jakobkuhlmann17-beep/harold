import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Dashboard() {
  const { user } = useAuth();
  const [todayWorkout, setTodayWorkout] = useState<{ focus: string; completed: number; total: number } | null>(null);
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [streak, setStreak] = useState(0);
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
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
        });
      }

      // Streak
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

      // Weekly volume from latest week (sets per day)
      const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const vol = dayOrder.map((dn) => {
        const d = latestWeek.days?.find((dd: any) => dd.dayOfWeek === dn);
        return d ? d.exercises?.reduce((sum: number, e: any) => sum + (e.sets?.length || 0), 0) || 0 : 0;
      });
      setWeeklyVolume(vol);
    });

    const today = new Date().toISOString().split('T')[0];
    api.get(`/meals?date=${today}`).then(({ data }) => {
      const cals = data.reduce((sum: number, m: any) => sum + m.calories, 0);
      const pro = data.reduce((sum: number, m: any) => sum + m.proteinG, 0);
      const carb = data.reduce((sum: number, m: any) => sum + m.carbsG, 0);
      const fat = data.reduce((sum: number, m: any) => sum + m.fatG, 0);
      setNutrition({ calories: cals, protein: pro, carbs: carb, fat });
    });
  }, []);

  const calTarget = user?.calorieTarget || 2000;
  const calRemaining = Math.max(0, calTarget - nutrition.calories);
  const calPct = Math.min(100, (nutrition.calories / calTarget) * 100);
  const proPct = Math.min(100, (nutrition.protein / (user?.proteinTarget || 150)) * 100);
  const carbPct = Math.min(100, (nutrition.carbs / (user?.carbsTarget || 200)) * 100);
  const fatPct = Math.min(100, (nutrition.fat / (user?.fatTarget || 65)) * 100);

  const maxVolume = Math.max(...weeklyVolume, 1);

  // SVG ring for calorie progress
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (calPct / 100) * ringCircumference;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main hero card */}
        <div className="md:col-span-8 bg-surface-container-low p-6 lg:p-8 rounded-3xl relative overflow-hidden">
          {/* Decorative blob */}
          <div className="absolute -top-12 -right-12 w-64 h-64 hearth-glow opacity-10 rounded-full blur-3xl pointer-events-none" />

          <p className="font-label text-sm uppercase tracking-widest text-primary mb-1 relative">Daily Summary</p>
          <h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-on-surface mb-6 relative">
            Welcome back, {user?.username}!
          </h2>

          <div className="grid grid-cols-3 gap-4 relative">
            <div>
              <p className="font-headline text-3xl font-black text-primary">{calRemaining.toLocaleString()}</p>
              <p className="text-sm text-on-surface-variant font-label mt-1">Calories Remaining</p>
            </div>
            <div>
              <p className="font-headline text-3xl font-black text-tertiary">
                {todayWorkout ? todayWorkout.completed : 0}
              </p>
              <p className="text-sm text-on-surface-variant font-label mt-1">Sets Completed</p>
            </div>
            <div>
              <p className="font-headline text-3xl font-black text-secondary">{streak}</p>
              <p className="text-sm text-on-surface-variant font-label mt-1">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Burn goal card */}
        <div className="md:col-span-4 bg-surface-container-lowest p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined filled text-secondary text-[28px]">local_fire_department</span>
            <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant">Burn Goal</span>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm font-body mb-1">
              <span className="text-on-surface-variant">Progress</span>
              <span className="font-headline font-bold text-on-surface">{nutrition.calories} / {calTarget} kcal</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2">
              <div className="gradient-bar h-2 rounded-full transition-all duration-500" style={{ width: `${calPct}%` }} />
            </div>
          </div>
          <Link to="/nutrition" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-headline font-medium hover:gap-2 transition-all">
            View Nutrition <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Bento Section: Workout + Nutrition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Workout info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's workout card */}
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-xl font-bold text-on-surface">Today's Session</h3>
            <Link to="/workout" className="text-sm text-primary font-headline font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
              View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          {todayWorkout ? (
            <div className="bg-surface-container-lowest p-6 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl hearth-glow flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[24px]">fitness_center</span>
              </div>
              <div className="flex-1">
                <p className="font-headline font-bold text-lg text-on-surface capitalize">{todayWorkout.focus}</p>
                <p className="text-sm text-on-surface-variant font-body">{todayWorkout.completed} / {todayWorkout.total} sets completed</p>
              </div>
              <Link to="/workout" className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </Link>
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-6 rounded-3xl text-center">
              <p className="text-on-surface-variant font-body">No workout scheduled today</p>
              <Link to="/workout" className="mt-2 inline-block text-sm text-primary font-headline font-medium">Start one &rarr;</Link>
            </div>
          )}

          {/* Weekly volume chart */}
          <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-3xl">
            <h4 className="font-headline font-bold text-on-surface mb-6">Workout Intensity Trend</h4>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyVolume.map((vol, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full max-w-[40px] rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(4, (vol / maxVolume) * 100)}%`,
                      background: vol > 0 ? `linear-gradient(135deg, rgba(161,64,0,${0.4 + (vol / maxVolume) * 0.6}) 0%, rgba(242,109,33,${0.4 + (vol / maxVolume) * 0.6}) 100%)` : '#eae7e7',
                    }}
                  />
                  <span className="text-[10px] font-label text-on-surface-variant">{WEEK_SHORT[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Nutrition ring */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="font-headline text-xl font-bold text-on-surface">Daily Fuel</h3>

          <div className="bg-surface-container-lowest p-6 rounded-3xl">
            {/* SVG Calorie ring */}
            <div className="flex justify-center mb-4">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a14000" />
                      <stop offset="100%" stopColor="#f26d21" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="#eae7e7" strokeWidth="8" />
                  <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="url(#calGrad)" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                    className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-2xl font-black text-on-surface">{Math.round(calPct)}%</span>
                  <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">consumed</span>
                </div>
              </div>
            </div>

            {/* Macro breakdown */}
            <div className="space-y-3">
              <MacroRow label="Protein" current={nutrition.protein} target={user?.proteinTarget || 150} pct={proPct} color="bg-tertiary" />
              <MacroRow label="Carbs" current={nutrition.carbs} target={user?.carbsTarget || 200} pct={carbPct} color="bg-secondary" />
              <MacroRow label="Fats" current={nutrition.fat} target={user?.fatTarget || 65} pct={fatPct} color="bg-primary" />
            </div>

            <Link to="/nutrition" className="mt-4 w-full bg-surface-container-high rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-headline font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Log a Meal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacroRow({ label, current, target, pct, color }: { label: string; current: number; target: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1 h-8 rounded-full ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between text-sm">
          <span className="font-label text-on-surface-variant">{label}</span>
          <span className="font-headline font-medium text-on-surface">{Math.round(current)}g / {target}g</span>
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-1">
          <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-xs font-headline font-bold text-on-surface-variant w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
}
