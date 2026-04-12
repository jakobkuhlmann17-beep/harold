import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function Dashboard() {
  const { user } = useAuth();
  const [todayWorkout, setTodayWorkout] = useState<{ focus: string; completed: number; total: number } | null>(null);
  const [nutrition, setNutrition] = useState({ calories: 0 });
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Fetch weeks to find today's workout
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

      // Calculate streak: count consecutive days with completed sets going backwards
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
    });

    // Fetch today's meals
    const today = new Date().toISOString().split('T')[0];
    api.get(`/meals?date=${today}`).then(({ data }) => {
      const cals = data.reduce((sum: number, m: any) => sum + m.calories, 0);
      setNutrition({ calories: cals });
    });
  }, []);

  const calPct = Math.min(100, (nutrition.calories / (user?.calorieTarget || 2000)) * 100);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-on-surface">Welcome back, {user?.username}!</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Workout */}
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30">
          <h3 className="font-heading font-semibold text-on-surface-variant mb-2 text-sm uppercase tracking-widest">Today's Workout</h3>
          {todayWorkout ? (
            <>
              <p className="text-lg font-heading font-bold text-primary capitalize">{todayWorkout.focus}</p>
              <p className="text-sm text-on-surface-variant font-body">{todayWorkout.completed} / {todayWorkout.total} sets completed</p>
            </>
          ) : (
            <p className="text-sm text-outline font-body">No workout scheduled</p>
          )}
          <Link to="/workout" className="mt-3 inline-block text-sm text-primary font-medium font-body hover:underline">Go to workouts &rarr;</Link>
        </div>

        {/* Today's Nutrition */}
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30">
          <h3 className="font-heading font-semibold text-on-surface-variant mb-2 text-sm uppercase tracking-widest">Today's Nutrition</h3>
          <p className="text-lg font-heading font-bold text-on-surface">
            {nutrition.calories.toLocaleString()} / {(user?.calorieTarget || 2000).toLocaleString()} kcal
          </p>
          <div className="w-full bg-surface-container-highest rounded-full h-2.5 mt-2">
            <div
              className="gradient-bar h-2.5 rounded-full transition-all"
              style={{ width: `${calPct}%` }}
            />
          </div>
          <Link to="/nutrition" className="mt-3 inline-block text-sm text-primary font-medium font-body hover:underline">Go to nutrition &rarr;</Link>
        </div>

        {/* Streak */}
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30">
          <h3 className="font-heading font-semibold text-on-surface-variant mb-2 text-sm uppercase tracking-widest">Workout Streak</h3>
          <p className="text-3xl font-heading font-bold text-primary">{streak} days</p>
          <p className="text-sm text-on-surface-variant mt-1 font-body">Consecutive days with completed sets</p>
        </div>
      </div>
    </div>
  );
}
