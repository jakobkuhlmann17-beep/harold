import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import ExerciseAutocomplete from '../components/ExerciseAutocomplete';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

interface SetData { id: number; reps: number | null; weightKg: number | null; notes: string | null; feedback: string | null; completed: boolean; }
interface ExerciseData { id: number; name: string; order: number; sets: SetData[]; }
interface CardioData { id: number; dayId: number; type: string; distanceKm: number | null; durationMinutes: number | null; avgHeartRate: number | null; elevationM: number | null; avgPaceMinKm: number | null; avgSpeedKmh: number | null; calories: number | null; notes: string | null; }
interface DayData { id: number; dayOfWeek: string; focus: string; activityType: string; exercises: ExerciseData[]; cardioSession: CardioData | null; }
interface WeekData { id: number; weekNumber: number; days: DayData[]; }

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_SHORT: Record<string, string> = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
const ACCENT_COLORS = ['border-l-primary', 'border-l-tertiary', 'border-l-secondary', 'border-l-primary-container', 'border-l-tertiary-container', 'border-l-outline'];
const ACTIVITY_TYPES = [
  { value: 'WORKOUT', label: 'Workout', icon: '\ud83c\udfcb\ufe0f' },
  { value: 'RUN', label: 'Run', icon: '\ud83c\udfc3' },
  { value: 'CYCLING', label: 'Cycling', icon: '\ud83d\udeb4' },
];

export default function Workout() {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [exerciseHistory, setExerciseHistory] = useState<{ name: string; count: number }[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContent, setShareContent] = useState('');
  const [shareCategory, setShareCategory] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmLabel: string; confirmStyle: 'error' | 'primary'; onConfirm: () => Promise<void> } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);

  const fetchWeeks = async (jumpToLatest = false) => {
    const { data } = await api.get('/weeks');
    setWeeks(data);
    if (jumpToLatest && data.length > 0) setWeekIdx(data.length - 1);
    setLoading(false);
  };
  useEffect(() => {
    fetchWeeks(true);
    api.get('/exercises/history').then(({ data }) => setExerciseHistory(data)).catch(() => {});
  }, []);

  const currentWeek = weeks[weekIdx];
  const sortedDays = currentWeek?.days?.slice().sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)) || [];
  const currentDay = sortedDays[selectedDay];

  const createEmptyWeek = async () => { await api.post('/weeks'); await fetchWeeks(); };
  const generateNext = async () => {
    if (!currentWeek) return;
    setGenerating(true);
    try {
      await api.post(`/weeks/${currentWeek.id}/generate-next`);
      await fetchWeeks();
      showToast(`Week ${currentWeek.weekNumber + 1} generated with progressive overload!`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Generation failed');
    }
    setGenerating(false);
  };
  const addExercise = async (nameOverride?: string) => { const name = (nameOverride || newExName).trim(); if (!currentDay || !name) return; await api.post('/exercises', { dayId: currentDay.id, name, order: currentDay.exercises.length }); setNewExName(''); await fetchWeeks(); api.get('/exercises/history').then(({ data }) => setExerciseHistory(data)).catch(() => {}); };
  const deleteExercise = async (exId: number) => { await api.delete(`/exercises/${exId}`); await fetchWeeks(); };
  const addSet = async (exercise: ExerciseData) => { const last = exercise.sets[exercise.sets.length - 1]; await api.post('/sets', { exerciseId: exercise.id, reps: last?.reps ?? null, weightKg: last?.weightKg ?? null }); await fetchWeeks(); };
  const updateSet = async (setId: number, field: string, value: any) => { await api.put(`/sets/${setId}`, { [field]: value }); await fetchWeeks(); };
  const deleteSet = async (setId: number) => { await api.delete(`/sets/${setId}`); await fetchWeeks(); };
  const updateExerciseName = async (exId: number, name: string) => { await api.put(`/exercises/${exId}`, { name }); await fetchWeeks(); };

  const setActivityType = async (dayId: number, activityType: string) => {
    await api.put(`/days/${dayId}/activity-type`, { activityType });
    await fetchWeeks();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>;

  const deleteWeek = () => {
    if (!currentWeek) return;
    const wn = currentWeek.weekNumber;
    setConfirmDialog({
      title: `Delete Week ${wn}?`,
      message: 'This will permanently delete all exercises, sets and cardio sessions for this week. This cannot be undone.',
      confirmLabel: 'Delete Week',
      confirmStyle: 'error',
      onConfirm: async () => {
        await api.delete(`/weeks/${currentWeek.id}`);
        setConfirmDialog(null);
        showToast(`Week ${wn} deleted`);
        const { data } = await api.get('/weeks');
        setWeeks(data);
        if (data.length > 0) setWeekIdx(data.length - 1);
        else setWeekIdx(0);
        setSelectedDay(0);
        setLoading(false);
      },
    });
  };

  const recreateWeek = () => {
    if (!currentWeek) return;
    const wn = currentWeek.weekNumber;
    setConfirmDialog({
      title: `Recreate Week ${wn} from scratch?`,
      message: 'This will delete all exercises and sets for this week but create a fresh empty week. You will start with empty days.',
      confirmLabel: 'Recreate',
      confirmStyle: 'primary',
      onConfirm: async () => {
        await api.delete(`/weeks/${currentWeek.id}`);
        await api.post('/weeks');
        setConfirmDialog(null);
        showToast(`Week recreated \u2014 ready to fill in your exercises`);
        const { data } = await api.get('/weeks');
        setWeeks(data);
        if (data.length > 0) setWeekIdx(data.length - 1);
        setSelectedDay(0);
        setLoading(false);
      },
    });
  };

  const isLatestWeek = weekIdx === weeks.length - 1;
  const activityType = currentDay?.activityType || 'WORKOUT';
  const hasCompletedSets = currentWeek?.days?.some((d: any) => d.exercises?.some((e: any) => e.sets?.some((s: any) => s.completed))) || false;

  const shareWorkout = async () => {
    if (!currentWeek) return;
    setSharing(true);
    try {
      await api.post('/community/posts/share-workout', { weekId: currentWeek.id, content: shareContent || `Just completed Week ${currentWeek.weekNumber}!`, category: shareCategory });
      setShareOpen(false); setShareContent(''); setShareCategory(null);
      showToast('Workout shared to your community wall!');
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to share'); }
    setSharing(false);
  };

  // Stats for right sidebar (workout mode)
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
          <button onClick={createEmptyWeek} className="hearth-glow text-on-primary rounded-full px-3 py-1.5 text-xs font-headline font-bold hover:opacity-90 transition-opacity ml-1">+ New</button>
          {isLatestWeek && currentWeek && (
            <button onClick={generateNext} disabled={generating}
              className="hearth-glow text-white rounded-full px-5 py-2 text-sm font-headline font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2">
              {generating ? (
                <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Generating...</>
              ) : (
                <><span className="material-symbols-outlined text-[16px]">auto_awesome</span> Generate Next Week</>
              )}
            </button>
          )}
          {currentWeek && hasCompletedSets && (
            <button onClick={() => setShareOpen(true)} className="bg-surface-container-low rounded-full px-4 py-2 text-xs font-headline flex items-center gap-2 hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">share</span> Share as Pulse
            </button>
          )}
          {currentWeek && (
            <button onClick={recreateWeek} className="bg-surface-container-low rounded-full px-3 py-1.5 text-xs font-headline flex items-center gap-1 hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">restart_alt</span> Recreate
            </button>
          )}
          {currentWeek && (
            <button onClick={deleteWeek} className="text-error border border-error/30 rounded-full px-3 py-1.5 text-xs font-headline flex items-center gap-1 hover:bg-error/5 transition-colors">
              <span className="material-symbols-outlined text-[14px]">delete</span> Delete
            </button>
          )}
        </div>
      </div>

      {/* AI generating info bar */}
      {generating && currentWeek && (
        <div className="bg-primary-fixed/30 rounded-xl px-4 py-3 text-sm text-primary font-body flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[18px]">auto_awesome</span>
          Claude is analysing your Week {currentWeek.weekNumber} feedback and applying progressive overload &mdash; this takes about 10 seconds...
        </div>
      )}

      {/* Share as Pulse modal */}
      {shareOpen && currentWeek && (() => {
        const completedSets = currentWeek.days?.reduce((s: number, d: any) => s + (d.exercises?.flatMap((e: any) => e.sets).filter((st: any) => st.completed).length || 0), 0) || 0;
        const totalExercises = currentWeek.days?.reduce((s: number, d: any) => s + (d.exercises?.length || 0), 0) || 0;
        const focusList = [...new Set(currentWeek.days?.map((d: any) => d.focus).filter(Boolean) || [])];
        const exerciseNames = [...new Set(currentWeek.days?.flatMap((d: any) => d.exercises?.map((e: any) => e.name) || []) || [])].slice(0, 5);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShareOpen(false)}>
            <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full mx-4 p-8 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-headline font-bold text-xl text-on-surface">Share your workout</h3>
              {/* Workout preview */}
              <div className="bg-primary-fixed/30 rounded-2xl p-4 border border-primary-fixed">
                <p className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">fitness_center</span>
                  Week {currentWeek.weekNumber}
                </p>
                <p className="text-sm text-on-surface-variant font-body mt-1">{completedSets} sets completed &middot; {totalExercises} exercises</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {focusList.slice(0, 4).map((f: string) => (
                    <span key={f} className="bg-surface-container rounded-full px-2 py-1 text-xs font-label text-on-surface-variant">{f}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {exerciseNames.map((n: string) => (
                    <span key={n} className="bg-surface-container-lowest rounded-full px-2 py-0.5 text-[10px] font-label text-on-surface-variant">{n}</span>
                  ))}
                  {[...new Set(currentWeek.days?.flatMap((d: any) => d.exercises?.map((e: any) => e.name) || []) || [])].length > 5 && (
                    <span className="text-[10px] text-on-surface-variant font-label">+{[...new Set(currentWeek.days?.flatMap((d: any) => d.exercises?.map((e: any) => e.name) || []) || [])].length - 5} more</span>
                  )}
                </div>
              </div>
              <textarea value={shareContent} onChange={(e) => setShareContent(e.target.value)} placeholder="Add a caption..."
                className="w-full bg-surface-container-low rounded-xl p-4 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none h-24" />
              <div>
                <p className="text-xs font-label text-on-surface-variant uppercase tracking-widest mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {['Strength Focus', 'Morning Grit', 'Recovery', 'Fueling'].map((c) => (
                    <button key={c} onClick={() => setShareCategory(shareCategory === c ? null : c)}
                      className={`text-xs px-3 py-1.5 rounded-full font-label transition-all ${shareCategory === c ? 'hearth-glow text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShareOpen(false)} className="bg-surface-container-high rounded-full px-6 py-3 text-sm font-headline font-bold text-on-surface hover:bg-surface-container-highest transition-colors">Cancel</button>
                <button onClick={shareWorkout} disabled={sharing}
                  className="hearth-glow text-white rounded-full px-6 py-3 text-sm font-headline font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {sharing && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                  Post to Community &rarr;
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {!currentWeek && (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">fitness_center</span>
          <p className="text-on-surface-variant font-body text-lg">Create a week to get started.</p>
        </div>
      )}

      {currentWeek && (
        <>
          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {sortedDays.map((day, i) => {
              const total = day.exercises.flatMap(e => e.sets).length;
              const done = day.exercises.flatMap(e => e.sets).filter(s => s.completed).length;
              const isCardio = day.activityType === 'RUN' || day.activityType === 'CYCLING';
              const tabExtra = isCardio ? (day.activityType === 'RUN' ? '\ud83c\udfc3' : '\ud83d\udeb4') : `${done}/${total}`;
              return (
                <button key={day.id} onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-headline font-medium transition-all duration-300 ${
                    i === selectedDay ? 'hearth-glow text-on-primary shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}>
                  <span>{DAY_SHORT[day.dayOfWeek]}</span>
                  <span className="ml-1 text-xs opacity-70">{tabExtra}</span>
                </button>
              );
            })}
          </div>

          {/* Activity type picker */}
          {currentDay && (
            <div className="flex gap-2">
              {ACTIVITY_TYPES.map((at) => (
                <button key={at.value} onClick={() => setActivityType(currentDay.id, at.value)}
                  className={`px-5 py-2 rounded-full font-headline font-bold text-sm transition-all duration-300 ${
                    activityType === at.value ? 'hearth-glow text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}>
                  {at.icon} {at.label}
                </button>
              ))}
            </div>
          )}

          {/* Content based on activity type */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              {activityType === 'WORKOUT' && currentDay && <WorkoutContent
                currentDay={currentDay} newExName={newExName} setNewExName={setNewExName}
                addExercise={addExercise} deleteExercise={deleteExercise} addSet={addSet}
                updateSet={updateSet} deleteSet={deleteSet} updateExerciseName={updateExerciseName}
                exerciseHistory={exerciseHistory}
              />}
              {activityType === 'RUN' && currentDay && <CardioContent dayId={currentDay.id} type="RUN" onSaved={fetchWeeks} existing={currentDay.cardioSession} />}
              {activityType === 'CYCLING' && currentDay && <CardioContent dayId={currentDay.id} type="CYCLING" onSaved={fetchWeeks} existing={currentDay.cardioSession} />}
            </div>

            {/* Right sidebar */}
            <div className="lg:col-span-4 space-y-4">
              {activityType === 'WORKOUT' ? (
                <div className="hearth-glow text-on-primary rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="font-headline font-bold text-lg mb-4 relative">Session Energy</h4>
                  <div className="relative mb-4">
                    <div className="flex justify-between text-xs mb-1 opacity-80"><span>Volume Progress</span><span>{volumePct}%</span></div>
                    <div className="w-full bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${volumePct}%` }} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 relative">
                    <div className="bg-white/10 rounded-xl p-3 text-center"><p className="font-headline text-2xl font-black">{totalReps}</p><p className="text-[10px] uppercase tracking-widest opacity-70">Total Reps</p></div>
                    <div className="bg-white/10 rounded-xl p-3 text-center"><p className="font-headline text-2xl font-black">{completedSetsDay}/{totalSetsDay}</p><p className="text-[10px] uppercase tracking-widest opacity-70">Sets Done</p></div>
                  </div>
                </div>
              ) : (
                <div className="hearth-glow text-on-primary rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="font-headline font-bold text-lg mb-4 relative">
                    {activityType === 'RUN' ? '\ud83c\udfc3 Run Session' : '\ud83d\udeb4 Cycling Session'}
                  </h4>
                  <p className="text-sm opacity-80">Log your {activityType === 'RUN' ? 'run' : 'ride'} data on the left. Distance, pace, and heart rate help track your cardio progress.</p>
                </div>
              )}
              {currentDay?.focus && (
                <div className="border-l-4 border-secondary bg-surface-container-low rounded-xl p-4">
                  <p className="font-headline font-bold text-sm text-on-surface mb-1">
                    <span className="material-symbols-outlined text-secondary text-[16px] mr-1 align-text-bottom">tips_and_updates</span>
                    Post-Workout Tip
                  </p>
                  <p className="text-xs text-on-surface-variant font-body">Remember to log your nutrition after training. Protein intake within 2 hours of training optimizes recovery.</p>
                  <Link to="/nutrition" className="mt-2 inline-block text-xs text-primary font-headline font-medium">Log a meal &rarr;</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmStyle={confirmDialog.confirmStyle}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// --- Workout exercises content ---
function WorkoutContent({ currentDay, newExName, setNewExName, addExercise, deleteExercise, addSet, updateSet, deleteSet, updateExerciseName, exerciseHistory }: {
  currentDay: any; newExName: string; setNewExName: (v: string) => void;
  addExercise: (nameOverride?: string) => void; deleteExercise: (id: number) => void; addSet: (ex: any) => void;
  updateSet: (id: number, f: string, v: any) => void; deleteSet: (id: number) => void; updateExerciseName: (id: number, n: string) => void;
  exerciseHistory: { name: string; count: number }[];
}) {
  return (
    <>
      {currentDay.exercises.length === 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-8 text-center"><p className="text-on-surface-variant font-body">No exercises yet. Add one below.</p></div>
      )}
      {currentDay.exercises.slice().sort((a: any, b: any) => a.order - b.order).map((ex: any, eIdx: number) => (
        <div key={ex.id} className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm relative border-l-4 ${ACCENT_COLORS[eIdx % ACCENT_COLORS.length]}`}>
          <div className="p-4 pb-2 flex items-center justify-between">
            <EditableText value={ex.name} onSave={(v) => updateExerciseName(ex.id, v)} className="text-xl font-bold font-headline text-on-surface" />
            <button onClick={() => deleteExercise(ex.id)} className="text-error/60 hover:text-error text-sm font-label flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[16px]">delete</span> Remove
            </button>
          </div>
          <div className="px-4 pb-2">
            {ex.sets.map((s: any, si: number) => (
              <div key={s.id} className="grid grid-cols-12 gap-2 items-center py-2 border-t border-outline-variant/10">
                <div className="col-span-1 text-center"><span className="text-xs font-label text-outline">{si + 1}</span></div>
                <div className="col-span-3"><div className="bg-surface-container-low rounded-lg p-2"><span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">KG</span><EditableNumber value={s.weightKg} onSave={(v) => updateSet(s.id, 'weightKg', v)} decimal /></div></div>
                <div className="col-span-3"><div className="bg-surface-container-low rounded-lg p-2"><span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">REPS</span><EditableNumber value={s.reps} onSave={(v) => updateSet(s.id, 'reps', v)} /></div></div>
                <div className="col-span-3">{s.notes && <span className="text-[10px] text-outline font-body italic truncate block">{s.notes}</span>}<FeedbackInput value={s.feedback} onSave={(v) => updateSet(s.id, 'feedback', v)} /></div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button onClick={(e) => { e.stopPropagation(); updateSet(s.id, 'completed', !s.completed); }}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${s.completed ? 'bg-secondary-container border-secondary-container text-on-secondary-container' : 'border-outline-variant text-transparent hover:border-secondary'}`}>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSet(s.id); }} className="text-outline-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-3">
            <button onClick={() => addSet(ex)} className="text-primary font-bold text-sm font-headline flex items-center gap-1 hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-[18px]">add</span> Add Set
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <ExerciseAutocomplete
          value={newExName}
          onChange={setNewExName}
          onSubmit={(name) => { addExercise(name); }}
          placeholder="Add exercise..."
          suggestions={exerciseHistory}
        />
        <button onClick={() => addExercise()} className="hearth-glow text-on-primary rounded-xl px-5 py-3 text-sm font-headline font-bold hover:opacity-90 transition-opacity flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">add</span> Add
        </button>
      </div>
    </>
  );
}

// --- Cardio content (Run / Cycling) ---
function CardioContent({ dayId, type, onSaved, existing }: { dayId: number; type: string; onSaved: () => void; existing: any | null }) {
  const [distance, setDistance] = useState(existing?.distanceKm?.toString() ?? '');
  const [duration, setDuration] = useState(existing?.durationMinutes?.toString() ?? '');
  const [hr, setHr] = useState(existing?.avgHeartRate?.toString() ?? '');
  const [elevation, setElevation] = useState(existing?.elevationM?.toString() ?? '');
  const [calories, setCalories] = useState(existing?.calories?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  // Reset when day changes
  useEffect(() => {
    setDistance(existing?.distanceKm?.toString() ?? '');
    setDuration(existing?.durationMinutes?.toString() ?? '');
    setHr(existing?.avgHeartRate?.toString() ?? '');
    setElevation(existing?.elevationM?.toString() ?? '');
    setCalories(existing?.calories?.toString() ?? '');
    setNotes(existing?.notes ?? '');
  }, [dayId, existing?.id]);

  const dist = parseFloat(distance) || 0;
  const dur = parseInt(duration) || 0;

  // Auto-calc
  const pace = dist > 0 && dur > 0 ? dur / dist : null;
  const speed = dist > 0 && dur > 0 ? Math.round((dist / dur) * 60 * 10) / 10 : null;
  const paceFormatted = pace ? `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')}` : null;

  const save = async () => {
    setSaving(true);
    await api.post(`/days/${dayId}/cardio`, {
      distanceKm: parseFloat(distance) || null,
      durationMinutes: parseInt(duration) || null,
      avgHeartRate: parseInt(hr) || null,
      elevationM: parseInt(elevation) || null,
      avgPaceMinKm: pace,
      avgSpeedKmh: speed,
      calories: parseInt(calories) || null,
      notes: notes || null,
    });
    setSaving(false);
    onSaved();
  };

  const isRun = type === 'RUN';
  const icon = isRun ? 'directions_run' : 'directions_bike';
  const title = isRun ? 'Run Log' : 'Cycling Log';

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {(dist > 0 || dur > 0) && (
        <div className="flex flex-wrap gap-3">
          {dist > 0 && <SummaryPill value={`${dist}`} unit="km" />}
          {dur > 0 && <SummaryPill value={dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}` : `${dur}`} unit={dur >= 60 ? 'min' : 'min'} />}
          {isRun && paceFormatted && <SummaryPill value={paceFormatted} unit="/km" />}
          {!isRun && speed && <SummaryPill value={`${speed}`} unit="km/h" />}
          {parseInt(hr) > 0 && <SummaryPill value={hr} unit="bpm" />}
        </div>
      )}

      {/* Input card */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <h3 className="font-headline font-bold text-xl text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[24px]">{icon}</span> {title}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <CardioField label="Distance" unit="km" value={distance} onChange={setDistance} step="0.1" />
          <CardioField label="Duration" unit="min" value={duration} onChange={setDuration} />
          {isRun ? (
            <div>
              <label className="text-xs uppercase font-bold text-outline tracking-widest font-label block mb-1">Avg Pace</label>
              <div className="bg-surface-container-low rounded-xl p-4"><span className="font-headline font-bold text-2xl text-on-surface">{paceFormatted || '\u2014'}</span><span className="text-sm text-on-surface-variant ml-1">min/km</span></div>
            </div>
          ) : (
            <div>
              <label className="text-xs uppercase font-bold text-outline tracking-widest font-label block mb-1">Avg Speed</label>
              <div className="bg-surface-container-low rounded-xl p-4"><span className="font-headline font-bold text-2xl text-on-surface">{speed || '\u2014'}</span><span className="text-sm text-on-surface-variant ml-1">km/h</span></div>
            </div>
          )}
          <CardioField label="Avg Heart Rate" unit="bpm" value={hr} onChange={setHr} />
          <CardioField label="Elevation Gain" unit="m" value={elevation} onChange={setElevation} />
          <CardioField label="Calories Burned" unit="kcal" value={calories} onChange={setCalories} />
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase font-bold text-outline tracking-widest font-label block mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder={isRun ? 'How did the run feel?' : 'How did the ride feel?'}
            className="w-full bg-surface-container-low rounded-xl p-4 font-body text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
        </div>
        <button onClick={save} disabled={saving}
          className="mt-4 hearth-glow rounded-full text-white font-headline font-bold px-8 py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
          {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
          Save {isRun ? 'Run' : 'Ride'}
        </button>
      </div>
    </div>
  );
}

function CardioField({ label, unit, value, onChange, step }: { label: string; unit: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <div>
      <label className="text-xs uppercase font-bold text-outline tracking-widest font-label block mb-1">{label}</label>
      <div className="relative">
        <input type="number" step={step || '1'} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-container-low rounded-xl p-4 font-headline font-bold text-2xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 pr-14" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant font-label">{unit}</span>
      </div>
    </div>
  );
}

function SummaryPill({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl px-5 py-3 shadow-sm">
      <span className="font-headline font-black text-xl text-primary">{value}</span>
      <span className="text-xs text-on-surface-variant font-label ml-1">{unit}</span>
    </div>
  );
}

// --- Inline-edit components ---
function EditableText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  if (editing) {
    return <input value={text} onChange={(e) => setText(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={() => { onSave(text); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(text); setEditing(false); } }}
      autoFocus className="border-b-2 border-primary outline-none px-1 text-lg font-headline font-bold bg-transparent text-on-surface" />;
  }
  return <span onClick={(e) => { e.stopPropagation(); setEditing(true); }} className={`cursor-pointer hover:text-primary transition-colors ${className}`}>{value}</span>;
}

function EditableNumber({ value, onSave, decimal }: { value: number | null; onSave: (v: number | null) => void; decimal?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() ?? '');
  if (editing) {
    return <input value={text} onChange={(e) => setText(e.target.value)} type="number" step={decimal ? '0.5' : '1'}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={() => { onSave(text === '' ? null : decimal ? parseFloat(text) : parseInt(text)); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(text === '' ? null : decimal ? parseFloat(text) : parseInt(text)); setEditing(false); } }}
      autoFocus className="w-full border-b-2 border-primary outline-none text-lg font-headline font-bold bg-transparent text-on-surface" />;
  }
  return (
    <span onClick={(e) => { e.stopPropagation(); setText(value?.toString() ?? ''); setEditing(true); }}
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
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
      placeholder="How did it feel?"
      autoFocus className="w-full border-b border-outline-variant outline-none text-[11px] text-on-surface-variant font-body bg-transparent italic" />;
  }
  return (
    <span onClick={(e) => { e.stopPropagation(); setText(value ?? ''); setEditing(true); }}
      className="cursor-pointer text-[11px] text-outline italic hover:text-primary font-body transition-colors">
      {value || 'feedback'}
    </span>
  );
}
