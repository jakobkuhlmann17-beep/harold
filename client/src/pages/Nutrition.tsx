import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

interface Meal { id: number; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; }

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const toISO = (d: Date) => d.toISOString().split('T')[0];

function MiniRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eae7e7" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
    </svg>
  );
}

export default function Nutrition() {
  const { user, setUser } = useAuth();
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showTargets, setShowTargets] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [calTarget, setCalTarget] = useState(user?.calorieTarget ?? 2000);
  const [proTarget, setProTarget] = useState(user?.proteinTarget ?? 150);
  const [carbTarget, setCarbTarget] = useState(user?.carbsTarget ?? 200);
  const [fatTarget, setFatTarget] = useState(user?.fatTarget ?? 65);

  const fetchMeals = async () => { const { data } = await api.get(`/meals?date=${toISO(date)}`); setMeals(data); };
  useEffect(() => { fetchMeals(); }, [date]);
  useEffect(() => { if (user) { setCalTarget(user.calorieTarget); setProTarget(user.proteinTarget); setCarbTarget(user.carbsTarget); setFatTarget(user.fatTarget); } }, [user]);

  const totals = meals.reduce((a, m) => ({ cal: a.cal + m.calories, pro: a.pro + m.proteinG, carb: a.carb + m.carbsG, fat: a.fat + m.fatG }), { cal: 0, pro: 0, carb: 0, fat: 0 });
  const pct = (v: number, mx: number) => Math.min(100, (v / mx) * 100);

  const calPctVal = pct(totals.cal, user?.calorieTarget || 2000);
  const proPctVal = pct(totals.pro, user?.proteinTarget || 150);
  const carbPctVal = pct(totals.carb, user?.carbsTarget || 200);
  const fatPctVal = pct(totals.fat, user?.fatTarget || 65);
  const remaining = Math.max(0, (user?.calorieTarget || 2000) - totals.cal);

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/meals', { name, calories: Number(calories), proteinG: Number(protein), carbsG: Number(carbs), fatG: Number(fat), date: toISO(date) + 'T12:00:00.000Z' });
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setShowForm(false);
    fetchMeals();
  };

  const deleteMeal = async (id: number) => { await api.delete(`/meals/${id}`); fetchMeals(); };
  const saveTargets = async () => { const { data } = await api.put('/user/targets', { calorieTarget: calTarget, proteinTarget: proTarget, carbsTarget: carbTarget, fatTarget: fatTarget }); setUser(data); };
  const shiftDate = (delta: number) => { const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d); };

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main metric card */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 hearth-glow opacity-5 rounded-full blur-3xl pointer-events-none" />
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1 relative">Remaining Today</p>
          <p className="font-headline text-5xl lg:text-6xl font-extrabold text-primary relative">{remaining.toLocaleString()}</p>
          <p className="text-sm text-on-surface-variant font-body relative mt-1">of {(user?.calorieTarget || 2000).toLocaleString()} kcal goal</p>

          <div className="w-full bg-surface-container-highest rounded-full h-2.5 mt-4 relative">
            <div className="gradient-bar h-2.5 rounded-full transition-all duration-500" style={{ width: `${calPctVal}%` }} />
          </div>

          <button onClick={() => setShowForm(!showForm)}
            className="mt-5 hearth-glow text-on-primary rounded-full px-6 py-2.5 text-sm font-headline font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-2 relative">
            <span className="material-symbols-outlined text-[18px]">add</span> Log Meal
          </button>
        </div>

        {/* Macro rings */}
        <div className="lg:col-span-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', val: totals.pro, target: user?.proteinTarget || 150, pctV: proPctVal, color: '#8f4e00' },
            { label: 'Carbs', val: totals.carb, target: user?.carbsTarget || 200, pctV: carbPctVal, color: '#735c00' },
            { label: 'Fats', val: totals.fat, target: user?.fatTarget || 65, pctV: fatPctVal, color: '#a14000' },
          ].map((m) => (
            <div key={m.label} className="bg-surface-container-lowest rounded-xl p-4 flex flex-col items-center">
              <div className="relative">
                <MiniRing pct={m.pctV} color={m.color} />
                <span className="absolute inset-0 flex items-center justify-center font-headline text-sm font-black text-on-surface">{Math.round(m.pctV)}%</span>
              </div>
              <p className="font-headline font-bold text-sm text-on-surface mt-2">{m.label}</p>
              <p className="text-[11px] text-on-surface-variant font-label">{Math.round(m.val)}g / {m.target}g</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="font-headline font-bold text-on-surface">{fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* Add meal form (collapsible) */}
      {showForm && (
        <form onSubmit={addMeal} className="bg-surface-container-lowest rounded-xl p-5 space-y-3 border border-outline-variant/20">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">restaurant</span> Add Meal
          </h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" required
            className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Calories</label>
              <input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" required
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <div>
              <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Protein (g)</label>
              <input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" required
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <div>
              <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Carbs (g)</label>
              <input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" required
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
            <div>
              <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Fat (g)</label>
              <input value={fat} onChange={(e) => setFat(e.target.value)} type="number" required
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
            </div>
          </div>
          <button type="submit" className="hearth-glow text-on-primary rounded-full px-6 py-2.5 text-sm font-headline font-bold hover:opacity-90 transition-opacity">
            Save Meal
          </button>
        </form>
      )}

      {/* Meal list */}
      <div className="space-y-3">
        {meals.length === 0 && (
          <div className="bg-surface-container-lowest rounded-xl p-6 text-center border-2 border-dashed border-outline-variant/30">
            <p className="text-on-surface-variant font-body">No meals logged for this day.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-primary font-headline font-medium">Add your first meal &rarr;</button>
          </div>
        )}
        {meals.map((m) => (
          <div key={m.id} className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4 hover:translate-x-1 transition-transform duration-300 group">
            <div className="w-1 h-10 rounded-full bg-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-on-surface truncate">{m.name}</p>
              <div className="flex gap-3 text-xs text-on-surface-variant font-label mt-0.5">
                <span>P: {m.proteinG}g</span>
                <span>C: {m.carbsG}g</span>
                <span>F: {m.fatG}g</span>
              </div>
            </div>
            <span className="font-headline font-bold text-on-surface">{m.calories} <span className="text-xs text-on-surface-variant font-label">kcal</span></span>
            <button onClick={() => deleteMeal(m.id)} className="text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>

      {/* Targets */}
      <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
        <button onClick={() => setShowTargets(!showTargets)} className="font-headline font-semibold text-on-surface w-full text-left flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">tune</span>
            Macro Targets
          </span>
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{showTargets ? 'expand_less' : 'expand_more'}</span>
        </button>
        {showTargets && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { label: 'Calories', val: calTarget, set: setCalTarget },
              { label: 'Protein (g)', val: proTarget, set: setProTarget },
              { label: 'Carbs (g)', val: carbTarget, set: setCarbTarget },
              { label: 'Fat (g)', val: fatTarget, set: setFatTarget },
            ].map((t) => (
              <div key={t.label}>
                <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest">{t.label}</label>
                <input value={t.val} onChange={(e) => t.set(Number(e.target.value))} type="number"
                  className="border border-outline-variant rounded-lg px-3 py-2 text-sm w-full font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
              </div>
            ))}
            <button onClick={saveTargets} className="col-span-4 hearth-glow text-on-primary rounded-full py-2.5 text-sm font-headline font-bold hover:opacity-90 transition-opacity mt-1 uppercase tracking-widest">
              Save Targets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
