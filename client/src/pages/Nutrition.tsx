import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import Toast from '../components/Toast';

interface Meal { id: number; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; photoBase64?: string | null; }
interface Estimate { servingSize: string; calories: number; proteinG: number; carbsG: number; fatG: number; confidence: string; notes: string; }
interface PhotoEstimate { mealName: string; servingSize: string; calories: number; proteinG: number; carbsG: number; fatG: number; confidence: string; identifiedFoods: string[]; notes: string; adjustmentSuggestions?: string; }

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

  // Photo estimation
  const [formTab, setFormTab] = useState<'photo' | 'manual' | 'ai'>('manual');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState('image/jpeg');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoEstimating, setPhotoEstimating] = useState(false);
  const [photoEstimate, setPhotoEstimate] = useState<PhotoEstimate | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [savedPhotoBase64, setSavedPhotoBase64] = useState<string | null>(null);

  // Body weight
  const [bwEntries, setBwEntries] = useState<{ id: number; weightKg: number; date: string; notes: string | null }[]>([]);
  const [bwWeight, setBwWeight] = useState('');
  const [bwDate, setBwDate] = useState(new Date().toISOString().split('T')[0]);
  const [bwNotes, setBwNotes] = useState('');
  const [bwRange, setBwRange] = useState<'2w' | '1m' | '3m' | 'all'>('1m');

  const fetchBW = async () => { const { data } = await api.get('/trends/body-weight'); setBwEntries(data); };
  useEffect(() => { fetchBW(); }, []);

  const addBW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bwWeight) return;
    await api.post('/trends/body-weight', { weightKg: Number(bwWeight), date: bwDate, notes: bwNotes || undefined });
    setBwWeight(''); setBwNotes('');
    fetchBW();
    showToast('Weight logged!');
  };

  const deleteBW = async (id: number) => { await api.delete(`/trends/body-weight/${id}`); fetchBW(); };

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
    } catch (err: any) { showToast(err.response?.data?.error || 'Failed to estimate macros'); }
    setEstimating(false);
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo is too large. Please use a photo under 5MB.'); return; }
    setPhotoError(null); setPhotoEstimate(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPhotoBase64(result.split(',')[1]);
      setPhotoMime(file.type || 'image/jpeg');
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const analysePhoto = async () => {
    if (!photoBase64) return;
    setPhotoEstimating(true); setPhotoError(null);
    try {
      const { data } = await api.post('/meals/estimate-from-photo', { imageBase64: photoBase64, mimeType: photoMime, portionNotes: photoNotes || undefined });
      setPhotoEstimate(data);
      setName(data.mealName || '');
      setCalories(String(data.calories));
      setProtein(String(data.proteinG));
      setCarbs(String(data.carbsG));
      setFat(String(data.fatG));
      setSavedPhotoBase64(photoBase64);
    } catch (err: any) {
      setPhotoError(err.response?.data?.error || 'Something went wrong analysing the photo. Please try again or use manual entry.');
    }
    setPhotoEstimating(false);
  };

  const usePhotoValues = () => {
    setFormTab('manual'); setPhotoEstimate(null);
  };

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/meals', { name, calories: Number(calories), proteinG: Number(protein), carbsG: Number(carbs), fatG: Number(fat), date: toISO(date) + 'T12:00:00.000Z', photoBase64: savedPhotoBase64 || undefined });
    setName(''); setPortion(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setEstimate(null); setShowForm(false); setPhotoBase64(null); setPreviewUrl(null); setPhotoEstimate(null); setSavedPhotoBase64(null); setPhotoNotes('');
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

  // Current percentage split (derived from macros)
  const getCurrentSplit = () => {
    const total = (proTarget * 4) + (carbTarget * 4) + (fatTarget * 9);
    if (total === 0) return { p: 0.30, c: 0.40, f: 0.30 };
    return { p: (proTarget * 4) / total, c: (carbTarget * 4) / total, f: (fatTarget * 9) / total };
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    setProTarget(Math.round((calTarget * preset.p) / 4));
    setCarbTarget(Math.round((calTarget * preset.c) / 4));
    setFatTarget(Math.round((calTarget * preset.f) / 9));
  };

  // When calories change, auto-recalculate macros keeping current split
  const setCalTargetAndSync = (newCal: number) => {
    const split = getCurrentSplit();
    setCalTarget(newCal);
    setProTarget(Math.round((newCal * split.p) / 4));
    setCarbTarget(Math.round((newCal * split.c) / 4));
    setFatTarget(Math.round((newCal * split.f) / 9));
    setActivePreset(null);
  };

  // When a macro changes, auto-update calorie target to match
  const syncCalFromMacros = (p: number, c: number, f: number) => {
    setCalTarget((p * 4) + (c * 4) + (f * 9));
    setActivePreset(null);
  };

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
        <form onSubmit={addMeal} className="bg-surface-container-lowest rounded-xl p-5 space-y-4 border border-outline-variant/20">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">restaurant</span> Add Meal
          </h3>

          {/* Tab switcher */}
          <div className="bg-surface-container-low rounded-full p-1 flex gap-1 w-fit">
            {([['photo', '\ud83d\udcf7 Photo'], ['manual', '\u270d\ufe0f Manual'], ['ai', '\u2728 AI Estimate']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFormTab(k as any)}
                className={`rounded-full px-5 py-2 text-sm font-headline font-bold transition-all ${formTab === k ? 'hearth-glow text-white' : 'text-on-surface-variant'}`}>{l}</button>
            ))}
          </div>

          {/* PHOTO TAB */}
          {formTab === 'photo' && (
            <div className="space-y-3">
              {!previewUrl ? (
                <div className="border-2 border-dashed border-outline-variant rounded-3xl p-10 text-center hover:border-primary/50 hover:bg-primary-fixed/10 transition-all min-h-[200px] flex flex-col items-center justify-center"
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f?.type.startsWith('image/')) processFile(f); }}>
                  <span className="material-symbols-outlined text-primary text-[48px] mb-3">photo_camera</span>
                  <p className="text-on-surface-variant font-body mb-4">Take a photo or upload from your camera roll</p>
                  <div className="flex gap-3">
                    <label className="hearth-glow text-white rounded-full px-6 py-3 font-headline font-bold flex items-center gap-2 cursor-pointer hover:opacity-90">
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span> Take Photo
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                    </label>
                    <label className="bg-surface-container-low rounded-full px-6 py-3 font-headline font-bold border border-outline-variant/40 flex items-center gap-2 cursor-pointer hover:bg-surface-container-high">
                      <span className="material-symbols-outlined text-[18px]">upload</span> Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img src={previewUrl} alt="Meal preview" className="w-full max-h-64 rounded-2xl object-cover" />
                  <button type="button" onClick={() => { setPreviewUrl(null); setPhotoBase64(null); setPhotoEstimate(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <input value={photoNotes} onChange={(e) => setPhotoNotes(e.target.value)} placeholder="Any context? e.g. large portion, added extra sauce, restaurant meal..."
                className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-body placeholder:text-outline text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />

              {photoError && <div className="bg-error-container text-on-error-container rounded-xl p-4 text-sm font-body">{photoError}</div>}

              {!photoEstimate && (
                <button type="button" onClick={analysePhoto} disabled={!photoBase64 || photoEstimating}
                  className="hearth-glow text-white rounded-full px-8 py-4 font-headline font-bold w-full text-lg flex items-center justify-center gap-3 disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {photoEstimating ? (
                    <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Analysing your meal...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[20px]">auto_awesome</span> Analyse with Claude</>
                  )}
                </button>
              )}

              {/* Photo estimate results */}
              {photoEstimate && (
                <div className="bg-primary-fixed/20 rounded-3xl p-6 border border-primary-fixed">
                  <p className="font-headline font-bold text-lg text-on-surface">{photoEstimate.mealName}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">Estimated serving: {photoEstimate.servingSize}</p>
                  <p className="font-headline font-black text-2xl text-primary mt-2">{photoEstimate.calories} kcal</p>
                  <p className="font-headline font-bold text-sm text-on-surface mt-1">{photoEstimate.proteinG}g protein &bull; {photoEstimate.carbsG}g carbs &bull; {photoEstimate.fatG}g fat</p>
                  {photoEstimate.identifiedFoods?.length > 0 && (
                    <div className="mt-3"><p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">What Claude identified:</p>
                      <ul className="text-sm text-on-surface-variant font-body space-y-0.5">{photoEstimate.identifiedFoods.map((f, i) => <li key={i}>&bull; {f}</li>)}</ul>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${photoEstimate.confidence === 'high' ? 'bg-[#e8f5e9] text-[#2e7d32]' : photoEstimate.confidence === 'medium' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                      {photoEstimate.confidence.charAt(0).toUpperCase() + photoEstimate.confidence.slice(1)} confidence
                    </span>
                  </div>
                  {photoEstimate.notes && <p className="text-xs text-on-surface-variant italic mt-1">{photoEstimate.notes}</p>}
                  {photoEstimate.adjustmentSuggestions && <p className="text-xs text-secondary italic mt-1">{photoEstimate.adjustmentSuggestions}</p>}
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={usePhotoValues} className="hearth-glow text-white rounded-full px-6 py-3 font-headline font-bold flex items-center gap-1 flex-1 justify-center">
                      <span className="material-symbols-outlined text-[16px]">check</span> Use these values
                    </button>
                    <button type="button" onClick={usePhotoValues} className="bg-surface-container-high rounded-full px-6 py-3 font-headline font-bold flex-1 text-center hover:bg-surface-container-highest transition-colors">Edit before saving</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MANUAL TAB */}
          {formTab === 'manual' && (
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" required
                className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
              <div className="grid grid-cols-4 gap-2">
                <div><label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Calories</label>
                  <input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" required className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" /></div>
                <div><label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Protein (g)</label>
                  <input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" required className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" /></div>
                <div><label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Carbs (g)</label>
                  <input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" required className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" /></div>
                <div><label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Fat (g)</label>
                  <input value={fat} onChange={(e) => setFat(e.target.value)} type="number" required className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-headline font-bold bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" /></div>
              </div>
              <button type="submit" className="hearth-glow text-on-primary rounded-full px-6 py-2.5 text-sm font-headline font-bold hover:opacity-90 transition-opacity">Save Meal</button>
            </div>
          )}

          {/* AI ESTIMATE TAB */}
          {formTab === 'ai' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={name} onChange={(e) => { setName(e.target.value); setEstimate(null); }} placeholder="Meal name" required
                  className="flex-1 border border-outline-variant rounded-xl px-4 py-3 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
                <button type="button" onClick={estimateMacros} disabled={estimating || name.trim().length < 3}
                  className="bg-surface-container-low rounded-full px-4 py-2 text-sm font-headline flex items-center gap-2 hover:bg-surface-container-high border border-outline-variant/40 disabled:opacity-40 transition-colors flex-shrink-0">
                  {estimating ? <><span className="material-symbols-outlined animate-spin text-primary text-[16px]">progress_activity</span> Asking Claude...</> : <><span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span> Estimate</>}
                </button>
              </div>
              <input value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="e.g. large bowl, 200g, 2 slices (optional)"
                className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm font-body placeholder:text-outline text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
              {estimate && (
                <div className="bg-primary-fixed/20 rounded-2xl p-4 border border-primary-fixed">
                  <p className="font-headline font-bold text-sm text-on-surface flex items-center gap-1"><span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span> Claude's estimate</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Based on: {estimate.servingSize}</p>
                  <p className="font-headline font-black text-primary mt-2">{estimate.calories} kcal &bull; {estimate.proteinG}g protein &bull; {estimate.carbsG}g carbs &bull; {estimate.fatG}g fat</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold mt-2 inline-block ${estimate.confidence === 'high' ? 'bg-[#e8f5e9] text-[#2e7d32]' : estimate.confidence === 'medium' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>{estimate.confidence} confidence</span>
                  {estimate.notes && <p className="text-xs text-on-surface-variant italic mt-1">{estimate.notes}</p>}
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => { setEstimate(null); setFormTab('manual'); }} className="hearth-glow text-white rounded-full px-4 py-2 text-xs font-headline font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check</span> Use values</button>
                    <button type="button" onClick={() => setEstimate(null)} className="bg-surface-container rounded-full px-4 py-2 text-xs font-headline text-on-surface-variant">Edit manually</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
            {m.photoBase64 ? (
              <img src={`data:image/jpeg;base64,${m.photoBase64}`} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-1 h-10 rounded-full bg-secondary flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-on-surface truncate">{m.name}</p>
              <div className="flex gap-3 text-xs text-on-surface-variant font-label mt-0.5"><span>P: {m.proteinG}g</span><span>C: {m.carbsG}g</span><span>F: {m.fatG}g</span></div>
            </div>
            <span className="font-headline font-bold text-on-surface">{m.calories} <span className="text-xs text-on-surface-variant font-label">kcal</span></span>
            <button onClick={() => deleteMeal(m.id)} className="text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[18px]">delete</span></button>
          </div>
        ))}
      </div>

      {/* Body Weight Tracker */}
      <div>
        <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label mb-1">Body Composition</p>
        <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Body Weight Tracker</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <div className="flex gap-2 mb-4">
            {([['2w', '2 weeks'], ['1m', '1 month'], ['3m', '3 months'], ['all', 'All time']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setBwRange(k)}
                className={`rounded-full px-3 py-1 text-xs font-headline font-bold transition-all ${bwRange === k ? 'hearth-glow text-white' : 'bg-surface-container-low text-on-surface-variant'}`}>{l}</button>
            ))}
          </div>
          <BWChart entries={bwEntries} range={bwRange} />
        </div>
        {/* Log + stats */}
        <div className="lg:col-span-5 space-y-4">
          {bwEntries.length > 0 && (() => {
            const latest = bwEntries[bwEntries.length - 1];
            const first = bwEntries[0];
            const weekAgo = bwEntries.filter(e => new Date(e.date) <= new Date(Date.now() - 7 * 864e5)).pop();
            const changeSinceStart = latest.weightKg - first.weightKg;
            const changeSinceWeek = weekAgo ? latest.weightKg - weekAgo.weightKg : null;
            return (
              <div className="bg-surface-container-lowest rounded-2xl p-6">
                <p className="font-headline text-4xl font-black text-primary">{latest.weightKg} <span className="text-lg text-on-surface-variant">kg</span></p>
                <p className="text-xs text-on-surface-variant font-label mt-1">Last logged: {latest.date}</p>
                <div className="flex gap-4 mt-3">
                  <span className={`text-xs font-headline font-bold ${changeSinceStart <= 0 ? 'text-[#2e7d32]' : 'text-error'}`}>{changeSinceStart >= 0 ? '+' : ''}{changeSinceStart.toFixed(1)} kg since start</span>
                  {changeSinceWeek !== null && <span className={`text-xs font-headline font-bold ${changeSinceWeek <= 0 ? 'text-[#2e7d32]' : 'text-error'}`}>{changeSinceWeek >= 0 ? '+' : ''}{changeSinceWeek.toFixed(1)} kg this week</span>}
                </div>
              </div>
            );
          })()}
          <form onSubmit={addBW} className="bg-surface-container-lowest rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" value={bwWeight} onChange={(e) => setBwWeight(e.target.value)} placeholder="0.0" required
                className="font-headline font-black text-2xl bg-surface-container-low rounded-xl p-3 w-24 text-center focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface" />
              <span className="font-label text-on-surface-variant">kg</span>
            </div>
            <input type="date" value={bwDate} onChange={(e) => setBwDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input value={bwNotes} onChange={(e) => setBwNotes(e.target.value)} placeholder="Morning weigh-in, after breakfast, etc."
              className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm font-body placeholder:text-outline text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button type="submit" className="hearth-glow text-white rounded-full px-6 py-3 font-headline font-bold w-full hover:opacity-90 transition-opacity text-sm">Log Weight</button>
          </form>
          {bwEntries.length > 0 && (
            <div className="space-y-1">
              {bwEntries.slice(-5).reverse().map((e) => (
                <div key={e.id} className="bg-surface-container-low rounded-xl px-4 py-3 flex justify-between items-center group">
                  <div><span className="font-headline font-bold text-sm text-on-surface">{e.weightKg} kg</span><span className="text-xs text-on-surface-variant font-label ml-2">{e.date}</span>{e.notes && <span className="text-xs text-outline font-body ml-2 italic">{e.notes}</span>}</div>
                  <button onClick={() => deleteBW(e.id)} className="text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              ))}
            </div>
          )}
        </div>
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

            {/* Increment controls — calories auto-sync macros, macros auto-sync calories */}
            <div className="space-y-3">
              <IncrementRow label="Daily Calories" value={calTarget}
                onChange={(v) => setCalTargetAndSync(v)} step={50}
                onInc={() => setCalTargetAndSync(calTarget + 50)}
                onDec={() => setCalTargetAndSync(Math.max(0, calTarget - 50))} />
              <IncrementRow label="Protein (g)" value={proTarget}
                onChange={(v) => { setProTarget(v); syncCalFromMacros(v, carbTarget, fatTarget); }} step={5}
                onInc={() => { const v = proTarget + 5; setProTarget(v); syncCalFromMacros(v, carbTarget, fatTarget); }}
                onDec={() => { const v = Math.max(0, proTarget - 5); setProTarget(v); syncCalFromMacros(v, carbTarget, fatTarget); }} />
              <IncrementRow label="Carbs (g)" value={carbTarget}
                onChange={(v) => { setCarbTarget(v); syncCalFromMacros(proTarget, v, fatTarget); }} step={5}
                onInc={() => { const v = carbTarget + 5; setCarbTarget(v); syncCalFromMacros(proTarget, v, fatTarget); }}
                onDec={() => { const v = Math.max(0, carbTarget - 5); setCarbTarget(v); syncCalFromMacros(proTarget, v, fatTarget); }} />
              <IncrementRow label="Fat (g)" value={fatTarget}
                onChange={(v) => { setFatTarget(v); syncCalFromMacros(proTarget, carbTarget, v); }} step={5}
                onInc={() => { const v = fatTarget + 5; setFatTarget(v); syncCalFromMacros(proTarget, carbTarget, v); }}
                onDec={() => { const v = Math.max(0, fatTarget - 5); setFatTarget(v); syncCalFromMacros(proTarget, carbTarget, v); }} />
            </div>

            {/* Live breakdown — always in sync now */}
            <div className="bg-surface-container-lowest rounded-xl p-4 text-sm font-body space-y-1">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-2">Macro Breakdown</p>
              <div className="flex justify-between"><span className="text-on-surface-variant">Protein {proTarget}g &times; 4</span><span className="font-headline font-bold text-on-surface">{proTarget * 4} kcal <span className="text-on-surface-variant font-normal">({macroCalories > 0 ? Math.round((proTarget * 4) / macroCalories * 100) : 0}%)</span></span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Carbs {carbTarget}g &times; 4</span><span className="font-headline font-bold text-on-surface">{carbTarget * 4} kcal <span className="text-on-surface-variant font-normal">({macroCalories > 0 ? Math.round((carbTarget * 4) / macroCalories * 100) : 0}%)</span></span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Fat {fatTarget}g &times; 9</span><span className="font-headline font-bold text-on-surface">{fatTarget * 9} kcal <span className="text-on-surface-variant font-normal">({macroCalories > 0 ? Math.round((fatTarget * 9) / macroCalories * 100) : 0}%)</span></span></div>
              <div className="border-t border-outline-variant/20 mt-2 pt-2 flex justify-between">
                <span className="text-on-surface-variant">Total</span>
                <span className="font-headline font-bold text-on-surface flex items-center gap-1">
                  {calTarget.toLocaleString()} kcal
                  <span className="text-[#2e7d32]"><span className="material-symbols-outlined text-[14px]">check</span></span>
                </span>
              </div>
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

function BWChart({ entries, range }: { entries: { weightKg: number; date: string }[]; range: string }) {
  const now = Date.now();
  const rangeMs: Record<string, number> = { '2w': 14 * 864e5, '1m': 30 * 864e5, '3m': 90 * 864e5, all: Infinity };
  const cutoff = rangeMs[range] ?? Infinity;
  const filtered = cutoff === Infinity ? entries : entries.filter(e => now - new Date(e.date).getTime() < cutoff);

  if (filtered.length < 2) return (
    <div className="h-48 flex items-center justify-center"><p className="text-on-surface-variant font-body italic text-sm">Log your weight daily to see your trend</p></div>
  );

  const W = 600; const H = 200; const PAD = { t: 20, r: 20, b: 30, l: 45 };
  const cw = W - PAD.l - PAD.r; const ch = H - PAD.t - PAD.b;
  const weights = filtered.map(e => e.weightKg);
  const maxW = Math.max(...weights); const minW = Math.min(...weights);
  const range_ = maxW - minW || 1;

  const points = filtered.map((e, i) => ({
    x: PAD.l + (i / (filtered.length - 1)) * cw,
    y: PAD.t + ch - ((e.weightKg - minW) / range_) * ch,
    ...e,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${points[0].x},${PAD.t + ch} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${PAD.t + ch} Z`;
  const latest = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs><linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a14000" stopOpacity="0.1" /><stop offset="100%" stopColor="#a14000" stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map(f => <line key={f} x1={PAD.l} y1={PAD.t + ch * (1 - f)} x2={PAD.l + cw} y2={PAD.t + ch * (1 - f)} stroke="#e0c0b2" strokeOpacity="0.2" strokeWidth="1" />)}
      <path d={area} fill="url(#bwGrad)" />
      <polyline points={polyline} fill="none" stroke="#a14000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={latest.x} cy={latest.y} r="5" fill="#f26d21" />
      <rect x={latest.x - 24} y={latest.y - 28} width="48" height="20" rx="10" fill="#a14000" />
      <text x={latest.x} y={latest.y - 15} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Lexend">{latest.weightKg}kg</text>
      {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={H - 5} textAnchor="middle" fill="#8c7166" fontSize="8" fontFamily="Manrope">{p.date.slice(5)}</text>
      ))}
    </svg>
  );
}
