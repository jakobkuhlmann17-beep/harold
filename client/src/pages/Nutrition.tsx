import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import Toast from '../components/Toast';

interface Meal { id: number; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; }
interface Estimate { servingSize: string; calories: number; proteinG: number; carbsG: number; fatG: number; confidence: string; notes: string; }

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const toISO = (d: Date) => d.toISOString().split('T')[0];

const PRESETS = [
  { label: 'Balanced', p: 0.30, c: 0.40, f: 0.30 },
  { label: 'High Protein', p: 0.35, c: 0.40, f: 0.25 },
  { label: 'Low Carb', p: 0.30, c: 0.20, f: 0.50 },
  { label: 'Endurance', p: 0.20, c: 0.55, f: 0.25 },
];

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
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);

  // Meal form
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // AI estimation
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  // Targets
  const [calTarget, setCalTarget] = useState(user?.calorieTarget ?? 2000);
  const [proTarget, setProTarget] = useState(user?.proteinTarget ?? 150);
  const [carbTarget, setCarbTarget] = useState(user?.carbsTarget ?? 200);
  const [fatTarget, setFatTarget] = useState(user?.fatTarget ?? 65);
  const [activePreset, setActivePreset] = useState<string | null>(null);

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

  // AI estimate
  const estimateMacros = async () => {
    if (name.trim().length < 3) return;
    setEstimating(true);
    try {
      const { data } = await api.post('/meals/estimate-macros', { mealName: name, portionDescription: portion || undefined });
      setEstimate(data);
      setCalories(String(data.calories));
      setProtein(String(data.proteinG));
      setCarbs(String(data.carbsG));
      setFat(String(data.fatG));
    } catch { showToast('Failed to estimate macros'); }
    setEstimating(false);
  };

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/meals', { name, calories: Number(calories), proteinG: Number(protein), carbsG: Number(carbs), fatG: Number(fat), date: toISO(date) + 'T12:00:00.000Z' });
    setName(''); setPortion(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setEstimate(null); setShowForm(false);
    fetchMeals();
  };

  const deleteMeal = async (id: number) => { await api.delete(`/meals/${id}`); fetchMeals(); };

  const saveTargets = async () => {
    const { data } = await api.put('/user/targets', { calorieTarget: calTarget, proteinTarget: proTarget, carbsTarget: carbTarget, fatTarget: fatTarget });
    setUser(data);
    showToast('Targets updated!');
  };

  const shiftDate = (delta: number) => { const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d); };

  // Smart target calculations
  const macroCalories = (proTarget * 4) + (carbTarget * 4) + (fatTarget * 9);
  const diff = macroCalories - calTarget;
  const absDiff = Math.abs(diff);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    setProTarget(Math.round((calTarget * preset.p) / 4));
    setCarbTarget(Math.round((calTarget * preset.c) / 4));
    setFatTarget(Math.round((calTarget * preset.f) / 9));
  };

  const recalcMacrosFromCal = () => {
    const totalMacroCal = (proTarget * 4) + (carbTarget * 4) + (fatTarget * 9);
    if (totalMacroCal === 0) return;
    const pPct = (proTarget * 4) / totalMacroCal;
    const cPct = (carbTarget * 4) / totalMacroCal;
    const fPct = (fatTarget * 9) / totalMacroCal;
    setProTarget(Math.round((calTarget * pPct) / 4));
    setCarbTarget(Math.round((calTarget * cPct) / 4));
    setFatTarget(Math.round((calTarget * fPct) / 9));
  };

  const recalcCalFromMacros = () => {
    setCalTarget((proTarget * 4) + (carbTarget * 4) + (fatTarget * 9));
  };

  const inc = (val: number, set: (v: number) => void, step: number) => { set(val + step); setActivePreset(null); };
  const dec = (val: number, set: (v: number) => void, step: number) => { set(Math.max(0, val - step)); setActivePreset(null); };

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
        <div className="lg:col-span-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', val: totals.pro, target: user?.proteinTarget || 150, pctV: proPctVal, color: '#8f4e00' },
            { label: 'Carbs', val: totals.carb, target: user?.carbsTarget || 200, pctV: carbPctVal, color: '#735c00' },
            { label: 'Fats', val: totals.fat, target: user?.fatTarget || 65, pctV: fatPctVal, color: '#a14000' },
          ].map((m) => (
            <div key={m.label} className="bg-surface-container-lowest rounded-xl p-4 flex flex-col items-center">
              <div className="relative"><MiniRing pct={m.pctV} color={m.color} /><span className="absolute inset-0 flex items-center justify-center font-headline text-sm font-black text-on-surface">{Math.round(m.pctV)}%</span></div>
              <p className="font-headline font-bold text-sm text-on-surface mt-2">{m.label}</p>
              <p className="text-[11px] text-on-surface-variant font-label">{Math.round(m.val)}g / {m.target}g</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
        <span className="font-headline font-bold text-on-surface">{fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
      </div>

      {/* Add meal form */}
      {showForm && (
        <form onSubmit={addMeal} className="bg-surface-container-lowest rounded-xl p-5 space-y-3 border border-outline-variant/20">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">restaurant</span> Add Meal
          </h3>
          {/* Meal name + estimate button */}
          <div className="flex gap-2">
            <input value={name} onChange={(e) => { setName(e.target.value); setEstimate(null); }} placeholder="Meal name" required
              className="flex-1 border border-outline-variant rounded-xl px-4 py-3 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
            <button type="button" onClick={estimateMacros} disabled={estimating || name.trim().length < 3}
              className="bg-surface-container-low rounded-full px-4 py-2 text-sm font-headline flex items-center gap-2 hover:bg-surface-container-high border border-outline-variant/40 disabled:opacity-40 transition-colors flex-shrink-0">
              {estimating ? (
                <><span className="material-symbols-outlined animate-spin text-primary text-[16px]">progress_activity</span> Asking Claude...</>
              ) : (
                <><span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span> Estimate Macros</>
              )}
            </button>
          </div>
          {/* Portion size */}
          <input value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="e.g. large bowl, 200g, 2 slices (optional)"
            className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm font-body placeholder:text-outline text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />

          {/* AI Estimate result card */}
          {estimate && (
            <div className="bg-primary-fixed/20 rounded-2xl p-4 border border-primary-fixed">
              <p className="font-headline font-bold text-sm text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
                Claude's estimate for "{name}"
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">Based on: {estimate.servingSize}</p>
              <p className="font-headline font-black text-primary mt-2">
                {estimate.calories} kcal &bull; {estimate.proteinG}g protein &bull; {estimate.carbsG}g carbs &bull; {estimate.fatG}g fat
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  estimate.confidence === 'high' ? 'bg-[#e8f5e9] text-[#2e7d32]' :
                  estimate.confidence === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                  'bg-error-container text-on-error-container'
                }`}>
                  {estimate.confidence.charAt(0).toUpperCase() + estimate.confidence.slice(1)} confidence
                </span>
              </div>
              {estimate.notes && <p className="text-xs text-on-surface-variant italic mt-1">{estimate.notes}</p>}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setEstimate(null)}
                  className="hearth-glow text-white rounded-full px-4 py-2 text-xs font-headline font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span> Use these values
                </button>
                <button type="button" onClick={() => setEstimate(null)}
                  className="bg-surface-container rounded-full px-4 py-2 text-xs font-headline text-on-surface-variant">Edit manually</button>
              </div>
            </div>
          )}

          {/* Macro inputs */}
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
          <button type="submit" className="hearth-glow text-on-primary rounded-full px-6 py-2.5 text-sm font-headline font-bold hover:opacity-90 transition-opacity">Save Meal</button>
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
              <div className="flex gap-3 text-xs text-on-surface-variant font-label mt-0.5"><span>P: {m.proteinG}g</span><span>C: {m.carbsG}g</span><span>F: {m.fatG}g</span></div>
            </div>
            <span className="font-headline font-bold text-on-surface">{m.calories} <span className="text-xs text-on-surface-variant font-label">kcal</span></span>
            <button onClick={() => deleteMeal(m.id)} className="text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[18px]">delete</span></button>
          </div>
        ))}
      </div>

      {/* Smart Macro Targets */}
      <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
        <button onClick={() => setShowTargets(!showTargets)} className="font-headline font-semibold text-on-surface w-full text-left flex justify-between items-center">
          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant text-[20px]">tune</span> Macro Targets</span>
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{showTargets ? 'expand_less' : 'expand_more'}</span>
        </button>
        {showTargets && (
          <div className="mt-4 space-y-5">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-headline transition-all ${activePreset === p.label ? 'hearth-glow text-white' : 'bg-surface-container-low border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {p.label}
                  <span className="ml-1 opacity-60">{Math.round(p.p * 100)}P/{Math.round(p.c * 100)}C/{Math.round(p.f * 100)}F</span>
                </button>
              ))}
            </div>

            {/* Increment controls */}
            <div className="space-y-3">
              <IncrementRow label="Daily Calories" value={calTarget} onChange={(v) => { setCalTarget(v); setActivePreset(null); }} step={50} onInc={() => inc(calTarget, setCalTarget, 50)} onDec={() => dec(calTarget, setCalTarget, 50)} />
              <IncrementRow label="Protein (g)" value={proTarget} onChange={(v) => { setProTarget(v); setActivePreset(null); }} step={5} onInc={() => inc(proTarget, setProTarget, 5)} onDec={() => dec(proTarget, setProTarget, 5)} />
              <IncrementRow label="Carbs (g)" value={carbTarget} onChange={(v) => { setCarbTarget(v); setActivePreset(null); }} step={5} onInc={() => inc(carbTarget, setCarbTarget, 5)} onDec={() => dec(carbTarget, setCarbTarget, 5)} />
              <IncrementRow label="Fat (g)" value={fatTarget} onChange={(v) => { setFatTarget(v); setActivePreset(null); }} step={5} onInc={() => inc(fatTarget, setFatTarget, 5)} onDec={() => dec(fatTarget, setFatTarget, 5)} />
            </div>

            {/* Live breakdown */}
            <div className="bg-surface-container-lowest rounded-xl p-4 text-sm font-body space-y-1">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-2">Macro Breakdown</p>
              <div className="flex justify-between"><span className="text-on-surface-variant">Protein {proTarget}g &times; 4</span><span className="font-headline font-bold text-on-surface">{proTarget * 4} kcal <span className="text-on-surface-variant font-normal">({macroCalories > 0 ? Math.round((proTarget * 4) / macroCalories * 100) : 0}%)</span></span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Carbs {carbTarget}g &times; 4</span><span className="font-headline font-bold text-on-surface">{carbTarget * 4} kcal <span className="text-on-surface-variant font-normal">({macroCalories > 0 ? Math.round((carbTarget * 4) / macroCalories * 100) : 0}%)</span></span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Fat {fatTarget}g &times; 9</span><span className="font-headline font-bold text-on-surface">{fatTarget * 9} kcal <span className="text-on-surface-variant font-normal">({macroCalories > 0 ? Math.round((fatTarget * 9) / macroCalories * 100) : 0}%)</span></span></div>
              <div className="border-t border-outline-variant/20 mt-2 pt-2 flex justify-between">
                <span className="text-on-surface-variant">Total from macros</span>
                <span className="font-headline font-bold text-on-surface">{macroCalories.toLocaleString()} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Calorie target</span>
                <span className="font-headline font-bold text-on-surface">{calTarget.toLocaleString()} kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Difference</span>
                <span className={`font-headline font-bold flex items-center gap-1 ${absDiff <= 50 ? 'text-[#2e7d32]' : absDiff <= 150 ? 'text-secondary' : 'text-error'}`}>
                  {diff >= 0 ? '+' : ''}{diff} kcal
                  {absDiff <= 50 && <span className="material-symbols-outlined text-[14px]">check</span>}
                  {absDiff > 50 && <span className="material-symbols-outlined text-[14px]">warning</span>}
                </span>
              </div>
              {absDiff > 50 && (
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={recalcMacrosFromCal} className="text-primary text-xs font-bold underline underline-offset-2 cursor-pointer">Recalculate macros to match</button>
                  <button type="button" onClick={recalcCalFromMacros} className="text-primary text-xs font-bold underline underline-offset-2 cursor-pointer">Update calorie target to match</button>
                </div>
              )}
            </div>

            <button onClick={saveTargets} className="hearth-glow text-white rounded-full px-8 py-3 font-headline font-bold w-full hover:opacity-90 transition-opacity">Save Targets</button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function IncrementRow({ label, value, onChange, step, onInc, onDec }: {
  label: string; value: number; onChange: (v: number) => void; step: number; onInc: () => void; onDec: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onDec} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest font-headline font-bold text-lg flex items-center justify-center text-on-surface-variant transition-colors">&minus;</button>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} step={step}
        className="font-headline font-black text-2xl text-center w-20 bg-transparent border-none focus:outline-none text-on-surface" />
      <button type="button" onClick={onInc} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest font-headline font-bold text-lg flex items-center justify-center text-on-surface-variant transition-colors">+</button>
      <span className="text-sm text-on-surface-variant font-label flex-1">{label}</span>
    </div>
  );
}
