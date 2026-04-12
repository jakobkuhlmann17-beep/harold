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

  const bar = (val: number, max: number, color: string) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(100, (val / max) * 100)}%` }} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">&larr;</button>
        <span className="font-bold text-lg text-gray-800">{fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">&rarr;</button>
      </div>

      {/* Macro summary */}
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Calories</span>
          <span className="font-bold text-lg">{totals.cal.toLocaleString()} / {(user?.calorieTarget || 2000).toLocaleString()} kcal</span>
        </div>
        {bar(totals.cal, user?.calorieTarget || 2000, 'bg-emerald-500')}

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Protein</span><span>{totals.pro.toFixed(0)}g / {user?.proteinTarget}g</span></div>
            {bar(totals.pro, user?.proteinTarget || 150, 'bg-blue-500')}
          </div>
          <div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Carbs</span><span>{totals.carb.toFixed(0)}g / {user?.carbsTarget}g</span></div>
            {bar(totals.carb, user?.carbsTarget || 200, 'bg-amber-500')}
          </div>
          <div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Fat</span><span>{totals.fat.toFixed(0)}g / {user?.fatTarget}g</span></div>
            {bar(totals.fat, user?.fatTarget || 65, 'bg-rose-500')}
          </div>
        </div>
      </div>

      {/* Meal list */}
      <div className="space-y-2">
        {meals.map((m) => (
          <div key={m.id} className="bg-white rounded-lg shadow p-3 flex justify-between items-center">
            <div>
              <span className="font-medium text-gray-800">{m.name}</span>
              <span className="text-sm text-gray-400 ml-3">{m.calories} kcal</span>
              <span className="text-xs text-gray-400 ml-2">P:{m.proteinG}g C:{m.carbsG}g F:{m.fatG}g</span>
            </div>
            <button onClick={() => deleteMeal(m.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
          </div>
        ))}
        {meals.length === 0 && <p className="text-gray-400 text-sm">No meals logged for this day.</p>}
      </div>

      {/* Add meal form */}
      <form onSubmit={addMeal} className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Add Meal</h3>
        <div className="grid grid-cols-5 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" required
            className="border rounded px-2 py-1.5 text-sm col-span-5" />
          <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" type="number" required
            className="border rounded px-2 py-1.5 text-sm" />
          <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein (g)" type="number" required
            className="border rounded px-2 py-1.5 text-sm" />
          <input value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbs (g)" type="number" required
            className="border rounded px-2 py-1.5 text-sm" />
          <input value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Fat (g)" type="number" required
            className="border rounded px-2 py-1.5 text-sm" />
          <button type="submit" className="bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 py-1.5">Add</button>
        </div>
      </form>

      {/* Targets */}
      <div className="bg-white rounded-xl shadow p-4">
        <button onClick={() => setShowTargets(!showTargets)} className="font-semibold text-gray-700 w-full text-left flex justify-between">
          Set My Targets <span>{showTargets ? '−' : '+'}</span>
        </button>
        {showTargets && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-500">Calories</label>
              <input value={calTarget} onChange={(e) => setCalTarget(Number(e.target.value))} type="number" className="border rounded px-2 py-1 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Protein (g)</label>
              <input value={proTarget} onChange={(e) => setProTarget(Number(e.target.value))} type="number" className="border rounded px-2 py-1 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Carbs (g)</label>
              <input value={carbTarget} onChange={(e) => setCarbTarget(Number(e.target.value))} type="number" className="border rounded px-2 py-1 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fat (g)</label>
              <input value={fatTarget} onChange={(e) => setFatTarget(Number(e.target.value))} type="number" className="border rounded px-2 py-1 text-sm w-full" />
            </div>
            <button onClick={saveTargets} className="col-span-4 bg-indigo-600 text-white rounded py-1.5 text-sm hover:bg-indigo-700 mt-1">
              Save Targets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
