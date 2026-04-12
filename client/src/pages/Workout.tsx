import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface SetData { id: number; reps: number | null; weightKg: number | null; notes: string | null; feedback: string | null; completed: boolean; }
interface ExerciseData { id: number; name: string; order: number; sets: SetData[]; }
interface DayData { id: number; dayOfWeek: string; focus: string; exercises: ExerciseData[]; }
interface WeekData { id: number; weekNumber: number; days: DayData[]; }

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_SHORT: Record<string, string> = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat' };

const ACCENT_COLORS = ['border-l-primary', 'border-l-tertiary', 'border-l-secondary', 'border-l-primary-container', 'border-l-tertiary-container', 'border-l-outline'];

export default function Workout() {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newExName, setNewExName] = useState('');

  const fetchWeeks = async () => { const { data } = await api.get('/weeks'); setWeeks(data); if (data.length > 0) setWeekIdx(data.length - 1); setLoading(false); };
  useEffect(() => { fetchWeeks(); }, []);

  const currentWeek = weeks[weekIdx];
  const sortedDays = currentWeek?.days?.slice().sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)) || [];
  const currentDay = sortedDays[selectedDay];

  const createEmptyWeek = async () => { await api.post('/weeks'); await fetchWeeks(); };
  const generateNext = async () => { if (!currentWeek) return; setGenerating(true); try { await api.post(`/weeks/${currentWeek.id}/generate-next`); await fetchWeeks(); } catch (err: any) { alert(err.response?.data?.error || 'Generation failed'); } setGenerating(false); };
  const addExercise = async () => { if (!currentDay || !newExName.trim()) return; await api.post('/exercises', { dayId: currentDay.id, name: newExName.trim(), order: currentDay.exercises.length }); setNewExName(''); await fetchWeeks(); };
  const deleteExercise = async (exId: number) => { await api.delete(`/exercises/${exId}`); await fetchWeeks(); };
  const addSet = async (exercise: ExerciseData) => { const last = exercise.sets[exercise.sets.length - 1]; await api.post('/sets', { exerciseId: exercise.id, reps: last?.reps ?? null, weightKg: last?.weightKg ?? null }); await fetchWeeks(); };
  const updateSet = async (setId: number, field: string, value: any) => { await api.put(`/sets/${setId}`, { [field]: value }); await fetchWeeks(); };
  const deleteSet = async (setId: number) => { await api.delete(`/sets/${setId}`); await fetchWeeks(); };
  const updateExerciseName = async (exId: number, name: string) => { await api.put(`/exercises/${exId}`, { name }); await fetchWeeks(); };

  if (loading) return <div className="flex items-center justify-center h-64"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>;

  const isLatestWeek = weekIdx === weeks.length - 1;

  // Stats for right sidebar
  const totalSetsDay = currentDay?.exercises.flatMap(e => e.sets).length || 0;
  const completedSetsDay = currentDay?.exercises.flatMap(e => e.sets).filter(s => s.completed).length || 0;
  const totalReps = currentDay?.exercises.flatMap(e => e.sets).reduce((sum, s) => sum + (s.completed && s.reps ? s.reps : 0), 0) || 0;
  const volumePct = totalSetsDay > 0 ? Math.round((completedSetsDay / totalSetsDay) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          {currentDay && <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">{currentDay.focus || 'Workout'}</p>}
          <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface">
            Workout <span className="text-primary">Log</span>
          </h2>
        </div>
        {/* Week nav pill */}
        <div className="bg-surface-container-low p-1.5 rounded-full flex items-center gap-1 flex-wrap">
          <button onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))} disabled={weekIdx === 0}
            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center disabled:opacity-30 transition-all text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="font-headline font-bold text-sm text-on-surface px-2">
            {currentWeek ? `Week ${currentWeek.weekNumber}` : 'No weeks'}
          </span>
          <button onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))} disabled={weekIdx >= weeks.length - 1}
            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center disabled:opacity-30 transition-all text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          <button onClick={createEmptyWeek} className="hearth-glow text-on-primary rounded-full px-3 py-1.5 text-xs font-headline font-bold hover:opacity-90 transition-opacity ml-1">
            + New
          </button>
          {isLatestWeek && currentWeek && (
            <button onClick={generateNext} disabled={generating}
              className="hearth-glow text-on-primary rounded-full px-3 py-1.5 text-xs font-headline font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1">
              {generating && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
              {generating ? 'Generating...' : 'Generate Next'}
            </button>
          )}
        </div>
      </div>

      {!currentWeek && (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">fitness_center</span>
          <p className="text-on-surface-variant font-body text-lg">Create a week to get started.</p>
        </div>
      )}

      {currentWeek && (
        <>
          {/* Day tabs — horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {sortedDays.map((day, i) => {
              const total = day.exercises.flatMap(e => e.sets).length;
              const done = day.exercises.flatMap(e => e.sets).filter(s => s.completed).length;
              return (
                <button key={day.id} onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-headline font-medium transition-all duration-300 ${
                    i === selectedDay ? 'hearth-glow text-on-primary shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}>
                  <span>{DAY_SHORT[day.dayOfWeek]}</span>
                  <span className="ml-1 text-xs opacity-70">{done}/{total}</span>
                </button>
              );
            })}
          </div>

          {/* Main grid: exercises + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Exercise cards */}
            <div className="lg:col-span-8 space-y-4">
              {currentDay && currentDay.exercises.length === 0 && (
                <div className="bg-surface-container-lowest rounded-xl p-8 text-center">
                  <p className="text-on-surface-variant font-body">No exercises yet. Add one below.</p>
                </div>
              )}

              {currentDay?.exercises.slice().sort((a, b) => a.order - b.order).map((ex, eIdx) => (
                <div key={ex.id} className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm relative border-l-4 ${ACCENT_COLORS[eIdx % ACCENT_COLORS.length]}`}>
                  {/* Exercise header */}
                  <div className="p-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <EditableText value={ex.name} onSave={(v) => updateExerciseName(ex.id, v)}
                        className="text-xl font-bold font-headline text-on-surface" />
                    </div>
                    <button onClick={() => deleteExercise(ex.id)} className="text-error/60 hover:text-error text-sm font-label flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span> Remove
                    </button>
                  </div>

                  {/* Set rows */}
                  <div className="px-4 pb-2">
                    {ex.sets.map((s, si) => (
                      <div key={s.id} className="grid grid-cols-12 gap-2 items-center py-2 border-t border-outline-variant/10">
                        {/* Set number */}
                        <div className="col-span-1 text-center">
                          <span className="text-xs font-label text-outline">{si + 1}</span>
                        </div>
                        {/* Weight */}
                        <div className="col-span-3">
                          <div className="bg-surface-container-low rounded-lg p-2">
                            <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">KG</span>
                            <EditableNumber value={s.weightKg} onSave={(v) => updateSet(s.id, 'weightKg', v)} decimal />
                          </div>
                        </div>
                        {/* Reps */}
                        <div className="col-span-3">
                          <div className="bg-surface-container-low rounded-lg p-2">
                            <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">REPS</span>
                            <EditableNumber value={s.reps} onSave={(v) => updateSet(s.id, 'reps', v)} />
                          </div>
                        </div>
                        {/* Notes (compact) */}
                        <div className="col-span-3">
                          {s.notes && <span className="text-[10px] text-outline font-body italic truncate block">{s.notes}</span>}
                          <FeedbackInput value={s.feedback} onSave={(v) => updateSet(s.id, 'feedback', v)} />
                        </div>
                        {/* Complete toggle + delete */}
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <button onClick={() => updateSet(s.id, 'completed', !s.completed)}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              s.completed ? 'bg-secondary-container border-secondary-container text-on-secondary-container' : 'border-outline-variant text-transparent hover:border-secondary'
                            }`}>
                            <span className="material-symbols-outlined text-[18px]">check</span>
                          </button>
                          <button onClick={() => deleteSet(s.id)} className="text-outline-variant hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add set */}
                  <div className="px-4 pb-3">
                    <button onClick={() => addSet(ex)} className="text-primary font-bold text-sm font-headline flex items-center gap-1 hover:translate-x-1 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">add</span> Add Set
                    </button>
                  </div>
                </div>
              ))}

              {/* Add exercise input */}
              {currentDay && (
                <div className="flex gap-2">
                  <input value={newExName} onChange={(e) => setNewExName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                    placeholder="Add new exercise..."
                    className="border border-outline-variant rounded-xl px-4 py-3 text-sm flex-1 font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
                  <button onClick={addExercise} className="hearth-glow text-on-primary rounded-xl px-5 py-3 text-sm font-headline font-bold hover:opacity-90 transition-opacity flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">add</span> Add
                  </button>
                </div>
              )}
            </div>

            {/* Right sidebar: session stats */}
            <div className="lg:col-span-4 space-y-4">
              {/* Session energy */}
              <div className="hearth-glow text-on-primary rounded-xl p-6 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <h4 className="font-headline font-bold text-lg mb-4 relative">Session Energy</h4>
                <div className="relative mb-4">
                  <div className="flex justify-between text-xs mb-1 opacity-80">
                    <span>Volume Progress</span>
                    <span>{volumePct}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${volumePct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 relative">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="font-headline text-2xl font-black">{totalReps}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-70">Total Reps</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="font-headline text-2xl font-black">{completedSetsDay}/{totalSetsDay}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-70">Sets Done</p>
                  </div>
                </div>
              </div>

              {/* Quick tip */}
              {currentDay?.focus && (
                <div className="border-l-4 border-secondary bg-surface-container-low rounded-xl p-4">
                  <p className="font-headline font-bold text-sm text-on-surface mb-1">
                    <span className="material-symbols-outlined text-secondary text-[16px] mr-1 align-text-bottom">tips_and_updates</span>
                    Post-Workout Tip
                  </p>
                  <p className="text-xs text-on-surface-variant font-body">
                    Remember to log your nutrition after training. Protein intake within 2 hours of training optimizes recovery.
                  </p>
                  <Link to="/nutrition" className="mt-2 inline-block text-xs text-primary font-headline font-medium">Log a meal &rarr;</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Inline-edit components (unchanged logic, updated styling) ---

function EditableText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  if (editing) {
    return <input value={text} onChange={(e) => setText(e.target.value)}
      onBlur={() => { onSave(text); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(text); setEditing(false); } }}
      autoFocus className="border-b-2 border-primary outline-none px-1 text-lg font-headline font-bold bg-transparent text-on-surface" />;
  }
  return <span onClick={() => setEditing(true)} className={`cursor-pointer hover:text-primary transition-colors ${className}`}>{value}</span>;
}

function EditableNumber({ value, onSave, decimal }: { value: number | null; onSave: (v: number | null) => void; decimal?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() ?? '');
  if (editing) {
    return <input value={text} onChange={(e) => setText(e.target.value)} type="number" step={decimal ? '0.5' : '1'}
      onBlur={() => { onSave(text === '' ? null : decimal ? parseFloat(text) : parseInt(text)); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(text === '' ? null : decimal ? parseFloat(text) : parseInt(text)); setEditing(false); } }}
      autoFocus className="w-full border-b-2 border-primary outline-none text-lg font-headline font-bold bg-transparent text-on-surface" />;
  }
  return (
    <span onClick={() => { setText(value?.toString() ?? ''); setEditing(true); }}
      className="cursor-pointer hover:text-primary text-lg font-headline font-bold transition-colors block">
      {value !== null && value !== undefined ? value : '\u2014'}
    </span>
  );
}

function FeedbackInput({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const save = () => { onSave(text.trim() || null); setEditing(false); };
  if (editing) {
    return <input value={text} onChange={(e) => setText(e.target.value)} onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
      placeholder="How did it feel?"
      autoFocus className="w-full border-b border-outline-variant outline-none text-[11px] text-on-surface-variant font-body bg-transparent italic" />;
  }
  return (
    <span onClick={() => { setText(value ?? ''); setEditing(true); }}
      className="cursor-pointer text-[11px] text-outline italic hover:text-primary font-body transition-colors">
      {value || 'feedback'}
    </span>
  );
}

