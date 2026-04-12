import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

interface Meal {
  id: number;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const toISO = (d: Date) => d.toISOString().split('T')[0];

export default function Nutrition() {
  const { user, setUser } = useAuth();
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showTargets, setShowTargets] = useState(false);

  // form
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // targets
  const [calTarget, setCalTarget] = useState(user?.calorieTarget ?? 2000);
  const [proTarget, setProTarget] = useState(user?.proteinTarget ?? 150);
  const [carbTarget, setCarbTarget] = useState(user?.carbsTarget ?? 200);
  const [fatTarget, setFatTarget] = useState(user?.fatTarget ?? 65);

  const fetchMeals = async () => {
    const { data } = await api.get(`/meals?date=${toISO(date)}`);
    setMeals(data);
  };

  useEffect(() => { fetchMeals(); }, [date]);

  useEffect(() => {
    if (user) {
      setCalTarget(user.calorieTarget);
      setProTarget(user.proteinTarget);
      setCarbTarget(user.carbsTarget);
      setFatTarget(user.fatTarget);
    }
  }, [user]);

  const totals = meals.reduce(
    (acc, m) => ({ cal: acc.cal + m.calories, pro: acc.pro + m.proteinG, carb: acc.carb + m.carbsG, fat: acc.fat + m.fatG }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  );

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/meals', {
      name, calories: Number(calories), proteinG: Number(protein), carbsG: Number(carbs), fatG: Number(fat),
      date: toISO(date) + 'T12:00:00.000Z',
    });
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    fetchMeals();
  };

  const deleteMeal = async (id: number) => {
    await api.delete(`/meals/${id}`);
    fetchMeals();
  };

  const saveTargets = async () => {
    const { data } = await api.put('/user/targets', {
      calorieTarget: calTarget, proteinTarget: proTarget, carbsTarget: carbTarget, fatTarget: fatTarget,
    });
    setUser(data);
  };

  const shiftDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const pct = (val: number, max: number) => Math.min(100, (val / max) * 100);

  return (
    <div className="space-y-5">
      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant">&larr;</button>
        <span className="font-heading font-bold text-lg text-on-surface">{fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant">&rarr;</button>
      </div>

      {/* Macro summary */}
      <div className="bg-surface-container-low rounded-xl p-5 space-y-4 border border-outline-variant/30">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-heading font-medium text-sm uppercase tracking-widest">Calories</span>
          <span className="font-heading font-bold text-lg text-on-surface">{totals.cal.toLocaleString()} / {(user?.calorieTarget || 2000).toLocaleString()} kcal</span>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-3">
          <div className="gradient-bar h-3 rounded-full transition-all" style={{ width: `${pct(totals.cal, user?.calorieTarget || 2000)}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <div className="flex justify-between text-sm font-body"><span className="text-on-surface-variant">Protein</span><span className="font-medium text-on-surface">{totals.pro.toFixed(0)}g / {user?.proteinTarget}g</span></div>
            <div className="w-full bg-surface-container-highest rounded-full h-2 mt-1">
              <div className="h-2 rounded-full transition-all bg-tertiary" style={{ width: `${pct(totals.pro, user?.proteinTarget || 150)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm font-body"><span className="text-on-surface-variant">Carbs</span><span className="font-medium text-on-surface">{totals.carb.toFixed(0)}g / {user?.carbsTarget}g</span></div>
            <div className="w-full bg-surface-container-highest rounded-full h-2 mt-1">
              <div className="h-2 rounded-full transition-all bg-secondary" style={{ width: `${pct(totals.carb, user?.carbsTarget || 200)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm font-body"><span className="text-on-surface-variant">Fat</span><span className="font-medium text-on-surface">{totals.fat.toFixed(0)}g / {user?.fatTarget}g</span></div>
            <div className="w-full bg-surface-container-highest rounded-full h-2 mt-1">
              <div className="h-2 rounded-full transition-all bg-primary" style={{ width: `${pct(totals.fat, user?.fatTarget || 65)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Meal list */}
      <div className="space-y-2">
        {meals.map((m) => (
          <div key={m.id} className="bg-surface-container-low rounded-xl p-3 flex justify-between items-center border border-outline-variant/20">
            <div className="font-body">
              <span className="font-medium text-on-surface">{m.name}</span>
              <span className="text-sm text-outline ml-3">{m.calories} kcal</span>
              <span className="text-xs text-outline ml-2">P:{m.proteinG}g C:{m.carbsG}g F:{m.fatG}g</span>
            </div>
            <button onClick={() => deleteMeal(m.id)} className="text-red-400 hover:text-red-600 text-sm font-body">Delete</button>
          </div>
        ))}
        {meals.length === 0 && <p className="text-outline text-sm font-body">No meals logged for this day.</p>}
      </div>

      {/* Add meal form */}
      <form onSubmit={addMeal} className="bg-surface-container-low rounded-xl p-4 space-y-3 border border-outline-variant/30">
        <h3 className="font-heading font-semibold text-on-surface">Add Meal</h3>
        <div className="grid grid-cols-5 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" required
            className="border border-outline-variant rounded-lg px-2 py-1.5 text-sm col-span-5 font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
          <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" type="number" required
            className="border border-outline-variant rounded-lg px-2 py-1.5 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
          <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein (g)" type="number" required
            className="border border-outline-variant rounded-lg px-2 py-1.5 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
          <input value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbs (g)" type="number" required
            className="border border-outline-variant rounded-lg px-2 py-1.5 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
          <input value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Fat (g)" type="number" required
            className="border border-outline-variant rounded-lg px-2 py-1.5 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
          <button type="submit" className="gradient-primary text-on-primary rounded-full text-sm font-heading font-medium hover:opacity-90 transition-opacity py-1.5">Add</button>
        </div>
      </form>

      {/* Targets */}
      <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30">
        <button onClick={() => setShowTargets(!showTargets)} className="font-heading font-semibold text-on-surface w-full text-left flex justify-between">
          Set My Targets <span className="text-on-surface-variant">{showTargets ? '\u2212' : '+'}</span>
        </button>
        {showTargets && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-on-surface-variant font-body uppercase tracking-widest">Calories</label>
              <input value={calTarget} onChange={(e) => setCalTarget(Number(e.target.value))} type="number" className="border border-outline-variant rounded-lg px-2 py-1 text-sm w-full font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant font-body uppercase tracking-widest">Protein (g)</label>
              <input value={proTarget} onChange={(e) => setProTarget(Number(e.target.value))} type="number" className="border border-outline-variant rounded-lg px-2 py-1 text-sm w-full font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant font-body uppercase tracking-widest">Carbs (g)</label>
              <input value={carbTarget} onChange={(e) => setCarbTarget(Number(e.target.value))} type="number" className="border border-outline-variant rounded-lg px-2 py-1 text-sm w-full font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant font-body uppercase tracking-widest">Fat (g)</label>
              <input value={fatTarget} onChange={(e) => setFatTarget(Number(e.target.value))} type="number" className="border border-outline-variant rounded-lg px-2 py-1 text-sm w-full font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <button onClick={saveTargets} className="col-span-4 gradient-primary text-on-primary rounded-full py-1.5 text-sm font-heading font-medium hover:opacity-90 transition-opacity mt-1">
              Save Targets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
