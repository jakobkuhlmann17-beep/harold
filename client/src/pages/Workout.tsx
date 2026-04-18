import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ExerciseAutocomplete from '../components/ExerciseAutocomplete';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import SwipeableSetRow from '../components/SwipeableSetRow';
import { useIsMobile } from '../hooks/useIsMobile';

const COMPOUND_KEYWORDS = ['barbell', 'squat', 'deadlift', 'row', 'pull-down', 'pulldown', 'bench', 'press', 'overhead'];
const BODYWEIGHT_KEYWORDS = ['dip', 'pull-up', 'pullup', 'sit-up', 'situp', 'push-up', 'pushup', 'crunch', 'hanging'];

function getRestTime(exerciseName: string): number {
  const saved = localStorage.getItem('harold-rest-times');
  const defaults = saved ? JSON.parse(saved) : { compound: 90, isolation: 60, bodyweight: 75 };
  const lower = exerciseName.toLowerCase();
  if (COMPOUND_KEYWORDS.some(k => lower.includes(k))) return defaults.compound;
  if (BODYWEIGHT_KEYWORDS.some(k => lower.includes(k))) return defaults.bodyweight;
  return defaults.isolation;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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
  const [shareMode, setShareMode] = useState<'day' | 'week'>('day');
  const [shareDay, setShareDay] = useState<string | null>(null);
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState('');
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayOfWeek, setNewDayOfWeek] = useState('MONDAY');
  const [newDayFocus, setNewDayFocus] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmLabel: string; confirmStyle: 'error' | 'primary'; onConfirm: () => Promise<void> } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showRestSettings, setShowRestSettings] = useState(false);
  const sessionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest timer
  const [restTimer, setRestTimer] = useState<{ exerciseName: string; total: number; remaining: number; done: boolean } | null>(null);
  const restInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quick log state
  const [qlExerciseIdx, setQlExerciseIdx] = useState(0);
  const [qlKg, setQlKg] = useState('');
  const [qlReps, setQlReps] = useState('');
  const [qlFeedback, setQlFeedback] = useState('');

  // Auto-start session from sidebar button
  useEffect(() => {
    if (searchParams.get('start') === 'true') {
      setSessionActive(true);
      setSessionSeconds(0);
      nav('/workout', { replace: true });
    }
  }, [searchParams, nav]);

  // Session timer effect
  useEffect(() => {
    if (sessionActive) {
      sessionInterval.current = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    } else {
      if (sessionInterval.current) clearInterval(sessionInterval.current);
    }
    return () => { if (sessionInterval.current) clearInterval(sessionInterval.current); };
  }, [sessionActive]);

  // Rest timer effect
  useEffect(() => {
    if (restTimer && !restTimer.done && restTimer.remaining > 0) {
      restInterval.current = setInterval(() => {
        setRestTimer(prev => {
          if (!prev || prev.remaining <= 1) {
            playBeep();
            return prev ? { ...prev, remaining: 0, done: true } : null;
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    } else {
      if (restInterval.current) clearInterval(restInterval.current);
    }
    return () => { if (restInterval.current) clearInterval(restInterval.current); };
  }, [restTimer?.remaining, restTimer?.done]);

  // Auto-dismiss rest timer after done
  useEffect(() => {
    if (restTimer?.done) {
      const t = setTimeout(() => setRestTimer(null), 2500);
      return () => clearTimeout(t);
    }
  }, [restTimer?.done]);

  const startSession = () => { setSessionActive(true); setSessionSeconds(0); };
  const endSession = () => { setShowEndModal(true); };
  const confirmEndSession = () => { setSessionActive(false); setSessionSeconds(0); setShowEndModal(false); setRestTimer(null); };

  const startRestTimer = (exerciseName: string) => {
    const total = getRestTime(exerciseName);
    setRestTimer({ exerciseName, total, remaining: total, done: false });
  };

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
  const updateSet = async (setId: number, field: string, value: any) => {
    // If completing a set during active session, start rest timer
    if (sessionActive && field === 'completed' && value === true) {
      // Find exercise name for this set
      for (const w of weeks) for (const d of w.days) for (const ex of d.exercises)
        if (ex.sets.some(s => s.id === setId)) { startRestTimer(ex.name); break; }
    }
    // Optimistic local update
    setWeeks(prev => prev.map(w => ({
      ...w,
      days: w.days.map(d => ({
        ...d,
        exercises: d.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s),
        })),
      })),
    })));
    await api.put(`/sets/${setId}`, { [field]: value });
  };
  const deleteSet = async (setId: number) => { await api.delete(`/sets/${setId}`); await fetchWeeks(); };
  const updateExerciseName = async (exId: number, name: string) => { await api.put(`/exercises/${exId}`, { name }); await fetchWeeks(); };

  const setActivityType = async (dayId: number, activityType: string) => {
    await api.put(`/days/${dayId}/activity-type`, { activityType });
    await fetchWeeks();
  };

  const saveFocus = async () => {
    if (!currentDay) return;
    await api.put(`/days/${currentDay.id}`, { focus: focusDraft.trim() });
    setEditingFocus(false);
    await fetchWeeks();
  };

  const addDay = async () => {
    if (!currentWeek) return;
    try {
      await api.post('/days', { weekId: currentWeek.id, dayOfWeek: newDayOfWeek, focus: newDayFocus.trim() });
      setShowAddDay(false); setNewDayFocus('');
      const { data } = await api.get('/weeks');
      setWeeks(data);
      // Navigate to the newly added day
      const updatedWeek = data[weekIdx];
      const sorted = updatedWeek?.days?.slice().sort((a: any, b: any) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)) || [];
      const newIdx = sorted.findIndex((d: any) => d.dayOfWeek === newDayOfWeek);
      if (newIdx >= 0) setSelectedDay(newIdx);
      showToast(`${newDayOfWeek.charAt(0) + newDayOfWeek.slice(1).toLowerCase()} added to Week ${currentWeek.weekNumber}`);
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to add day'); }
  };

  const removeDay = (day: any) => {
    setConfirmDialog({
      title: `Remove ${day.dayOfWeek.charAt(0) + day.dayOfWeek.slice(1).toLowerCase()}?`,
      message: `This will permanently delete all exercises, sets and cardio sessions for ${day.dayOfWeek.charAt(0) + day.dayOfWeek.slice(1).toLowerCase()}. This cannot be undone.`,
      confirmLabel: 'Remove Day',
      confirmStyle: 'error',
      onConfirm: async () => {
        await api.delete(`/days/${day.id}`);
        setConfirmDialog(null);
        showToast(`${day.dayOfWeek.charAt(0) + day.dayOfWeek.slice(1).toLowerCase()} removed`);
        setSelectedDay(Math.max(0, selectedDay - 1));
        await fetchWeeks();
      },
    });
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
  const hasCardioData = currentDay && (currentDay.activityType === 'RUN' || currentDay.activityType === 'CYCLING') && currentDay.cardioSession && (currentDay.cardioSession.distanceKm || currentDay.cardioSession.durationMinutes);
  const canShare = hasCompletedSets || hasCardioData;

  const shareWorkout = async () => {
    if (!currentWeek) return;
    setSharing(true);
    try {
      const selectedDayData = shareMode === 'day' && shareDay ? (currentWeek.days || []).find((d: any) => d.dayOfWeek === shareDay) : null;
      const isCardio = selectedDayData && (selectedDayData.activityType === 'RUN' || selectedDayData.activityType === 'CYCLING');
      const defaultContent = isCardio ? `Just finished a ${selectedDayData.activityType === 'RUN' ? 'run' : 'ride'}!` : `Just completed Week ${currentWeek.weekNumber}!`;
      const payload: any = { weekId: currentWeek.id, content: shareContent || defaultContent, category: shareCategory };
      if (shareMode === 'day' && shareDay) payload.dayOfWeek = shareDay;
      if (isCardio && selectedDayData.cardioSession) {
        payload.cardioSessionId = selectedDayData.cardioSession.id;
        payload.activityType = selectedDayData.activityType;
      }
      await api.post('/community/posts/share-workout', payload);
      setShareOpen(false); setShareContent(''); setShareCategory(null); setShareMode('day'); setShareDay(null);
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
          {currentDay && (
            editingFocus ? (
              <div className="flex items-center gap-1">
                <input value={focusDraft} onChange={(e) => setFocusDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveFocus(); if (e.key === 'Escape') setEditingFocus(false); }}
                  autoFocus className="bg-surface-container-low rounded-lg px-3 py-1.5 text-xs uppercase tracking-widest font-bold text-tertiary border border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none w-48" />
                <button onClick={saveFocus} className="text-[#2e7d32] hover:opacity-80 transition-opacity"><span className="material-symbols-outlined text-[18px]">check</span></button>
                <button onClick={() => setEditingFocus(false)} className="text-error hover:opacity-80 transition-opacity"><span className="material-symbols-outlined text-[18px]">close</span></button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group cursor-pointer" onClick={() => { setFocusDraft(currentDay.focus || ''); setEditingFocus(true); }}>
                <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">{currentDay.focus || 'Workout'}</p>
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 group-hover:text-primary transition-colors">edit</span>
              </div>
            )
          )}
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
          {!sessionActive ? (
            <button onClick={startSession} className="hearth-glow text-on-primary rounded-full px-3 py-1.5 text-xs font-headline font-bold hover:opacity-90 transition-opacity ml-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">play_arrow</span> Start
            </button>
          ) : (
            <button onClick={endSession} className="bg-error text-white rounded-full px-3 py-1.5 text-xs font-headline font-bold hover:opacity-90 transition-opacity ml-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">stop</span> End
            </button>
          )}
          <button onClick={createEmptyWeek} className="hearth-glow text-on-primary rounded-full px-3 py-1.5 text-xs font-headline font-bold hover:opacity-90 transition-opacity">+ New</button>
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
          {currentWeek && canShare && (
            <button onClick={() => { setShareOpen(true); setShareDay(currentDay?.dayOfWeek || null); setShareMode('day'); }} className="bg-surface-container-low rounded-full px-4 py-2 text-xs font-headline flex items-center gap-2 hover:bg-surface-container-high transition-colors text-on-surface-variant">
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
        const daysShareable = (currentWeek.days || []).filter((d: any) =>
          d.exercises?.some((e: any) => e.sets?.some((s: any) => s.completed)) ||
          ((d.activityType === 'RUN' || d.activityType === 'CYCLING') && d.cardioSession && (d.cardioSession.distanceKm || d.cardioSession.durationMinutes))
        );
        const selectedDayData = shareMode === 'day' && shareDay ? (currentWeek.days || []).find((d: any) => d.dayOfWeek === shareDay) : null;
        const isCardioDay = selectedDayData && (selectedDayData.activityType === 'RUN' || selectedDayData.activityType === 'CYCLING') && selectedDayData.cardioSession;
        const cardio = isCardioDay ? selectedDayData.cardioSession : null;

        // Preview data for workout days
        const previewDays = shareMode === 'day' && selectedDayData ? [selectedDayData] : currentWeek.days || [];
        const completedSets = previewDays.reduce((s: number, d: any) => s + (d.exercises?.flatMap((e: any) => e.sets).filter((st: any) => st.completed).length || 0), 0);
        const totalExercises = previewDays.reduce((s: number, d: any) => s + (d.exercises?.length || 0), 0);
        const exerciseNames = [...new Set(previewDays.flatMap((d: any) => d.exercises?.map((e: any) => e.name) || []))].slice(0, 5);
        const dayLabel = selectedDayData ? `${selectedDayData.dayOfWeek.charAt(0) + selectedDayData.dayOfWeek.slice(1).toLowerCase()}${selectedDayData.focus ? ' \u2014 ' + selectedDayData.focus.charAt(0).toUpperCase() + selectedDayData.focus.slice(1) : ''}` : '';
        const cardioIcon = selectedDayData?.activityType === 'RUN' ? '\ud83c\udfc3' : '\ud83d\udeb4';
        const paceStr = cardio?.avgPaceMinKm ? `${Math.floor(cardio.avgPaceMinKm)}:${String(Math.round((cardio.avgPaceMinKm % 1) * 60)).padStart(2, '0')} /km` : null;

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShareOpen(false)}>
            <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full mx-4 p-8 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-headline font-bold text-xl text-on-surface">Share your workout</h3>

              {/* Day / Week toggle */}
              <div className="bg-surface-container-low rounded-full p-1 flex gap-1 w-fit">
                <button onClick={() => setShareMode('day')} className={`rounded-full px-5 py-2 text-sm font-headline font-bold transition-all ${shareMode === 'day' ? 'hearth-glow text-white' : 'text-on-surface-variant'}`}>Single Day</button>
                <button onClick={() => setShareMode('week')} className={`rounded-full px-5 py-2 text-sm font-headline font-bold transition-all ${shareMode === 'week' ? 'hearth-glow text-white' : 'text-on-surface-variant'}`}>Full Week</button>
              </div>

              {/* Day selector (when single day mode) */}
              {shareMode === 'day' && (
                <div className="flex flex-wrap gap-2">
                  {daysShareable.map((d: any) => (
                    <button key={d.dayOfWeek} onClick={() => setShareDay(d.dayOfWeek)}
                      className={`rounded-full px-4 py-1.5 text-xs font-headline font-bold transition-all ${shareDay === d.dayOfWeek ? 'hearth-glow text-white' : 'bg-surface-container rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'}`}>
                      {DAY_SHORT[d.dayOfWeek]} &check;
                    </button>
                  ))}
                </div>
              )}

              {/* Preview card */}
              {isCardioDay && cardio ? (
                <div className={`rounded-2xl p-4 border ${selectedDayData.activityType === 'RUN' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                    {cardioIcon} {dayLabel}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm">
                    {cardio.distanceKm && <span className="font-headline font-black text-primary">{cardio.distanceKm} km</span>}
                    {cardio.durationMinutes && <span className="text-on-surface-variant">&bull; {cardio.durationMinutes} min</span>}
                    {selectedDayData.activityType === 'RUN' && paceStr && <span className="text-on-surface-variant">&bull; {paceStr}</span>}
                    {selectedDayData.activityType === 'CYCLING' && cardio.avgSpeedKmh && <span className="text-on-surface-variant">&bull; {cardio.avgSpeedKmh} km/h</span>}
                    {cardio.avgHeartRate && <span className="text-on-surface-variant">&bull; {cardio.avgHeartRate} bpm</span>}
                  </div>
                  {cardio.elevationM && <p className="text-xs text-on-surface-variant mt-1">+{cardio.elevationM}m elevation</p>}
                </div>
              ) : (
                <div className="bg-primary-fixed/30 rounded-2xl p-4 border border-primary-fixed">
                  <p className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">fitness_center</span>
                    {shareMode === 'day' ? dayLabel : `Week ${currentWeek.weekNumber} \u2014 Full Week`}
                  </p>
                  <p className="text-sm text-on-surface-variant font-body mt-1">
                    {shareMode === 'week' && `${daysShareable.length} days \u00b7 `}{completedSets} sets completed &middot; {totalExercises} exercises
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {exerciseNames.map((n: string) => (
                      <span key={n} className="bg-surface-container-lowest rounded-full px-2 py-0.5 text-[10px] font-label text-on-surface-variant">{n}</span>
                    ))}
                  </div>
                </div>
              )}

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
                <button onClick={shareWorkout} disabled={sharing || (shareMode === 'day' && !shareDay)}
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
              const isActive = i === selectedDay;
              return (
                <div key={day.id} onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-headline font-medium transition-all duration-300 cursor-pointer group flex items-center gap-1 ${
                    isActive ? 'hearth-glow text-on-primary shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}>
                  <span className="flex items-center gap-1">
                    {sessionActive && isActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                    {DAY_SHORT[day.dayOfWeek]}
                  </span>
                  <span className="text-xs opacity-70">{tabExtra}</span>
                  <span onClick={(e) => { e.stopPropagation(); removeDay(day); }}
                    className="w-4 h-4 rounded-full bg-error/20 text-error text-[10px] flex items-center justify-center ml-1 hover:bg-error/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    &times;
                  </span>
                </div>
              );
            })}
            {/* Add Day button */}
            {sortedDays.length < 7 && (
              <button onClick={() => {
                const existing = new Set(sortedDays.map(d => d.dayOfWeek));
                const firstAvailable = DAY_ORDER.find(d => !existing.has(d)) || 'MONDAY';
                setNewDayOfWeek(firstAvailable); setNewDayFocus(''); setShowAddDay(true);
              }} className="flex-shrink-0 bg-surface-container-low rounded-full px-4 py-2 text-sm font-headline border border-outline-variant/40 border-dashed hover:bg-surface-container-high flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">add</span> Add Day
              </button>
            )}
          </div>

          {/* Add Day modal */}
          {showAddDay && currentWeek && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddDay(false)}>
              <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full mx-4 p-8 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-headline font-bold text-xl text-on-surface">Add a day to Week {currentWeek.weekNumber}</h3>
                {(() => {
                  const existing = new Set(sortedDays.map(d => d.dayOfWeek));
                  const available = DAY_ORDER.filter(d => !existing.has(d));
                  if (available.length === 0) {
                    return <>
                      <p className="text-sm text-on-surface-variant font-body">All days are already added</p>
                      <button onClick={() => setShowAddDay(false)} className="bg-surface-container-high rounded-full px-6 py-3 text-sm font-headline font-bold w-full">Close</button>
                    </>;
                  }
                  return <>
                    <div>
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1 block">Day</label>
                      <select value={newDayOfWeek} onChange={(e) => setNewDayOfWeek(e.target.value)}
                        className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-headline font-bold text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
                        {available.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1 block">Focus</label>
                      <input value={newDayFocus} onChange={(e) => setNewDayFocus(e.target.value)} placeholder="e.g. chest, legs, cardio, rest"
                        className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => setShowAddDay(false)} className="bg-surface-container-high rounded-full px-6 py-3 text-sm font-headline font-bold text-on-surface">Cancel</button>
                      <button onClick={addDay} className="hearth-glow text-white rounded-full px-5 py-2 font-headline font-bold text-sm hover:opacity-90 transition-opacity">Add Day</button>
                    </div>
                  </>;
                })()}
              </div>
            </div>
          )}

          {/* Session timer bar */}
          {sessionActive && (
            <div className="bg-primary text-white rounded-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-headline font-medium">Session active</span>
              </div>
              <span className="font-headline font-black text-2xl">{fmtTime(sessionSeconds)}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowRestSettings(!showRestSettings)} className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">settings</span>
                </button>
                <button onClick={endSession} className="bg-white/20 rounded-full px-5 py-2 font-headline font-bold text-sm hover:bg-white/30 transition-colors">End Workout</button>
              </div>
            </div>
          )}

          {/* Rest timer settings popover */}
          {showRestSettings && (() => {
            const saved = localStorage.getItem('harold-rest-times');
            const d = saved ? JSON.parse(saved) : { compound: 90, isolation: 60, bodyweight: 75 };
            return (
              <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-lg space-y-3">
                <p className="font-headline font-bold text-sm text-on-surface">Rest Timer Defaults</p>
                {[['compound', 'Compound lifts'], ['isolation', 'Isolation'], ['bodyweight', 'Bodyweight']].map(([k, l]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant font-body">{l}</span>
                    <div className="flex items-center gap-1"><input type="number" defaultValue={d[k]} id={`rest-${k}`} className="w-14 font-headline font-bold text-center bg-surface-container-low rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /><span className="text-xs text-on-surface-variant">s</span></div>
                  </div>
                ))}
                <button onClick={() => {
                  const c = (document.getElementById('rest-compound') as HTMLInputElement)?.value;
                  const i = (document.getElementById('rest-isolation') as HTMLInputElement)?.value;
                  const b = (document.getElementById('rest-bodyweight') as HTMLInputElement)?.value;
                  localStorage.setItem('harold-rest-times', JSON.stringify({ compound: Number(c) || 90, isolation: Number(i) || 60, bodyweight: Number(b) || 75 }));
                  setShowRestSettings(false); showToast('Rest times saved');
                }} className="hearth-glow text-white rounded-full px-4 py-2 text-xs font-headline font-bold w-full">Save</button>
              </div>
            );
          })()}

          {/* Rest timer */}
          {restTimer && (
            <div className={`bg-surface-container-lowest rounded-2xl p-4 border shadow-lg transition-all ${restTimer.done ? 'border-green-400' : 'border-outline-variant/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-on-surface-variant tracking-widest">{restTimer.done ? 'Go! Next set' : 'Rest'}</span>
                <span className="font-headline font-black text-2xl text-primary">{restTimer.done ? '\u2714' : fmtTime(restTimer.remaining)}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all duration-1000 ${restTimer.done ? 'bg-green-400 w-full' : 'hearth-glow'}`}
                  style={restTimer.done ? {} : { width: `${(restTimer.remaining / restTimer.total) * 100}%` }} />
              </div>
              {!restTimer.done && (
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setRestTimer(null)} className="text-sm text-on-surface-variant underline">Skip rest</button>
                  <button onClick={() => setRestTimer(p => p ? { ...p, remaining: p.remaining + 30, total: p.total + 30 } : null)} className="bg-surface-container rounded-full px-3 py-1 text-xs font-headline font-bold">+30s</button>
                  <button onClick={() => setRestTimer(p => p && p.remaining > 15 ? { ...p, remaining: p.remaining - 15 } : p)} className="bg-surface-container rounded-full px-3 py-1 text-xs font-headline font-bold">-15s</button>
                </div>
              )}
            </div>
          )}

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
                exerciseHistory={exerciseHistory} sessionActive={sessionActive} isMobile={isMobile}
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

      {/* Quick Log FAB */}
      {sessionActive && currentDay && activityType === 'WORKOUT' && !showQuickLog && (
        <button onClick={() => {
          const exs = currentDay.exercises;
          if (exs.length > 0) {
            const last = exs[qlExerciseIdx]?.sets?.[exs[qlExerciseIdx].sets.length - 1];
            setQlKg(last?.weightKg?.toString() ?? ''); setQlReps(last?.reps?.toString() ?? '');
          }
          setShowQuickLog(true);
        }} className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 z-40 hearth-glow text-white rounded-full px-5 py-3 font-headline font-bold shadow-xl flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-[20px]">add</span> Quick Log
        </button>
      )}

      {/* Quick Log bottom sheet */}
      {showQuickLog && currentDay && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowQuickLog(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-container-lowest rounded-t-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-on-surface">Quick Log Set</h3>
              <button onClick={() => setShowQuickLog(false)} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>
            <select value={qlExerciseIdx} onChange={(e) => {
              const idx = Number(e.target.value);
              setQlExerciseIdx(idx);
              const last = currentDay.exercises[idx]?.sets?.[currentDay.exercises[idx].sets.length - 1];
              setQlKg(last?.weightKg?.toString() ?? ''); setQlReps(last?.reps?.toString() ?? '');
            }} className="w-full bg-surface-container-low rounded-xl px-4 py-3 font-headline font-bold text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
              {currentDay.exercises.map((ex, i) => <option key={ex.id} value={i}>{ex.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 justify-center">
                <button onClick={() => setQlKg(String(Math.max(0, (Number(qlKg) || 0) - 2.5)))} className="w-10 h-10 rounded-full bg-surface-container-high font-headline font-bold text-lg flex items-center justify-center">&minus;</button>
                <input type="number" value={qlKg} onChange={(e) => setQlKg(e.target.value)} className="w-16 font-headline font-black text-2xl text-center bg-transparent focus:outline-none text-on-surface" />
                <span className="text-sm text-on-surface-variant font-label">kg</span>
                <button onClick={() => setQlKg(String((Number(qlKg) || 0) + 2.5))} className="w-10 h-10 rounded-full bg-surface-container-high font-headline font-bold text-lg flex items-center justify-center">+</button>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <button onClick={() => setQlReps(String(Math.max(0, (Number(qlReps) || 0) - 1)))} className="w-10 h-10 rounded-full bg-surface-container-high font-headline font-bold text-lg flex items-center justify-center">&minus;</button>
                <input type="number" value={qlReps} onChange={(e) => setQlReps(e.target.value)} className="w-16 font-headline font-black text-2xl text-center bg-transparent focus:outline-none text-on-surface" />
                <span className="text-sm text-on-surface-variant font-label">reps</span>
                <button onClick={() => setQlReps(String((Number(qlReps) || 0) + 1))} className="w-10 h-10 rounded-full bg-surface-container-high font-headline font-bold text-lg flex items-center justify-center">+</button>
              </div>
            </div>
            <input value={qlFeedback} onChange={(e) => setQlFeedback(e.target.value)} placeholder="feedback (optional)"
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button onClick={async () => {
              const ex = currentDay.exercises[qlExerciseIdx];
              if (!ex) return;
              await api.post('/sets', { exerciseId: ex.id, reps: Number(qlReps) || null, weightKg: Number(qlKg) || null });
              const newSetRes = await api.get('/weeks');
              setWeeks(newSetRes.data);
              // Find the new set and mark it complete
              const updatedWeek = newSetRes.data[weekIdx];
              const updatedDay = updatedWeek?.days?.find((d: any) => d.id === currentDay.id);
              const updatedEx = updatedDay?.exercises?.find((e: any) => e.id === ex.id);
              const newSet = updatedEx?.sets?.[updatedEx.sets.length - 1];
              if (newSet) {
                await api.put(`/sets/${newSet.id}`, { completed: true, feedback: qlFeedback || null });
                setWeeks(prev => prev.map(w => ({ ...w, days: w.days.map(d => ({ ...d, exercises: d.exercises.map(e => ({ ...e, sets: e.sets.map(s => s.id === newSet.id ? { ...s, completed: true, feedback: qlFeedback || null } : s) })) })) })));
                startRestTimer(ex.name);
              }
              setShowQuickLog(false); setQlFeedback('');
            }} className="hearth-glow text-white rounded-full w-full py-4 font-headline font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check</span> Complete Set
            </button>
          </div>
        </>
      )}

      {/* End Session Summary */}
      {showEndModal && currentDay && (() => {
        const dayExercises = currentDay.exercises.filter((ex: ExerciseData) => ex.sets.length > 0);
        const daySets = currentDay.exercises.flatMap((e: ExerciseData) => e.sets);
        const done = daySets.filter((s: SetData) => s.completed).length;
        const total = daySets.length;
        const volume = daySets.reduce((sum: number, s: SetData) => sum + (s.completed && s.reps && s.weightKg ? s.reps * s.weightKg : 0), 0);
        const allComplete = total > 0 && done === total;
        const remaining = total - done;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEndModal(false)}>
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full mx-4 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-headline text-2xl font-black text-center text-on-surface mb-4">Workout Complete! \ud83d\udd25</h3>

              {/* Completion banner */}
              {allComplete ? (
                <div className="bg-green-50 rounded-xl p-3 text-center text-green-800 font-headline font-bold mb-4">All sets complete! Great session \ud83d\udd25</div>
              ) : remaining > 0 && (
                <div className="bg-secondary-container rounded-xl p-3 text-center text-on-secondary-container font-body text-sm mb-4">{remaining} sets remaining \u2014 mark them complete before finishing</div>
              )}

              {/* Stats — current day only */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center"><p className="font-headline text-2xl font-black text-primary">{fmtTime(sessionSeconds)}</p><p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">Duration</p></div>
                <div className="text-center"><p className="font-headline text-2xl font-black text-on-surface">{done}/{total}</p><p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">Sets Done</p></div>
                <div className="text-center"><p className="font-headline text-2xl font-black text-tertiary">{volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : volume}kg</p><p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">Volume</p></div>
              </div>

              {/* Exercise list — current day only */}
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Today's exercises</p>
              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {dayExercises.map((ex: ExerciseData) => {
                  const exDone = ex.sets.filter((s: SetData) => s.completed).length;
                  const exTotal = ex.sets.length;
                  const full = exDone === exTotal;
                  const partial = exDone > 0 && exDone < exTotal;
                  return (
                    <div key={ex.id} className="flex items-center gap-2 text-sm">
                      <span className={`material-symbols-outlined text-[16px] ${full ? 'text-[#2e7d32]' : partial ? 'text-secondary' : 'text-outline-variant'}`}>
                        {full ? 'check_circle' : partial ? 'pending' : 'radio_button_unchecked'}
                      </span>
                      <span className={`flex-1 ${full ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{ex.name}</span>
                      <span className={`text-xs font-label ${full ? 'text-[#2e7d32] font-bold' : partial ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>{exDone}/{exTotal} sets</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { confirmEndSession(); setShareOpen(true); setShareDay(currentDay?.dayOfWeek || null); setShareMode('day'); }}
                  className="hearth-glow text-white rounded-full px-6 py-3 text-sm font-headline font-bold flex-1 hover:opacity-90">Share as Pulse</button>
                <button onClick={confirmEndSession}
                  className="bg-surface-container-high rounded-full px-6 py-3 text-sm font-headline font-bold flex-1 hover:bg-surface-container-highest transition-colors">Done</button>
              </div>
            </div>
          </div>
        );
      })()}

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
function WorkoutContent({ currentDay, newExName, setNewExName, addExercise, deleteExercise, addSet, updateSet, deleteSet, updateExerciseName, exerciseHistory, sessionActive, isMobile }: {
  currentDay: any; newExName: string; setNewExName: (v: string) => void;
  addExercise: (nameOverride?: string) => void; deleteExercise: (id: number) => void; addSet: (ex: any) => void;
  updateSet: (id: number, f: string, v: any) => void; deleteSet: (id: number) => void; updateExerciseName: (id: number, n: string) => void;
  exerciseHistory: { name: string; count: number }[]; sessionActive: boolean; isMobile: boolean;
}) {
  const [hintShown, setHintShown] = useState(false);

  const handleRowClick = (e: React.MouseEvent, setId: number, completed: boolean) => {
    if (!sessionActive || isMobile || completed) return;
    // Don't trigger on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('textarea') || target.closest('button') || target.closest('[data-no-tap]')) return;
    updateSet(setId, 'completed', true);
    setHintShown(true);
  };

  return (
    <>
      {/* Mobile swipe hint */}
      {sessionActive && isMobile && !hintShown && currentDay.exercises.some((ex: any) => ex.sets.some((s: any) => !s.completed)) && (
        <div className="text-center text-xs text-on-surface-variant/50 font-body py-1">&larr; Swipe right to complete &rarr;</div>
      )}
      {/* Desktop tap hint */}
      {sessionActive && !isMobile && !hintShown && currentDay.exercises.some((ex: any) => ex.sets.some((s: any) => !s.completed)) && (
        <div className="text-center text-xs text-on-surface-variant/50 font-body py-1">Tap any incomplete set row to mark it done</div>
      )}
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
            {ex.sets.map((s: any, si: number) => {
              const setRow = (
                <div
                  key={s.id}
                  onClick={(e) => handleRowClick(e, s.id, s.completed)}
                  className={`grid grid-cols-12 gap-2 items-center py-2 border-t border-outline-variant/10 transition-colors duration-150 ${
                    sessionActive && !isMobile && !s.completed ? 'cursor-pointer hover:bg-primary-fixed/20' : ''
                  } ${s.completed && sessionActive ? 'bg-green-50/50' : ''}`}
                >
                  <div className="col-span-1 text-center">
                    {s.completed && sessionActive ? (
                      <span className="material-symbols-outlined text-[16px] text-[#2e7d32]">check</span>
                    ) : (
                      <span className="text-xs font-label text-outline">{si + 1}</span>
                    )}
                  </div>
                  <div className="col-span-3"><div className={`bg-surface-container-low rounded-lg p-2 ${isMobile ? 'min-h-[44px]' : ''}`}><span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">KG</span><EditableNumber value={s.weightKg} onSave={(v) => updateSet(s.id, 'weightKg', v)} decimal inputMode={isMobile ? 'decimal' : undefined} /></div></div>
                  <div className="col-span-3"><div className={`bg-surface-container-low rounded-lg p-2 ${isMobile ? 'min-h-[44px]' : ''}`}><span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">REPS</span><EditableNumber value={s.reps} onSave={(v) => updateSet(s.id, 'reps', v)} inputMode={isMobile ? 'numeric' : undefined} /></div></div>
                  <div className="col-span-3">{s.notes && <span className="text-[10px] text-outline font-body italic truncate block">{s.notes}</span>}<FeedbackInput value={s.feedback} onSave={(v) => updateSet(s.id, 'feedback', v)} /></div>
                  <div className="col-span-2 flex items-center justify-end gap-1" data-no-tap>
                    <button onClick={(e) => { e.stopPropagation(); updateSet(s.id, 'completed', !s.completed); }}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${s.completed ? 'bg-secondary-container border-secondary-container text-on-secondary-container' : 'border-outline-variant text-transparent hover:border-secondary'}`}>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSet(s.id); }} className="text-outline-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                  </div>
                </div>
              );

              // Wrap in swipeable on mobile during active session
              if (isMobile && sessionActive) {
                return (
                  <SwipeableSetRow key={s.id} onComplete={() => { updateSet(s.id, 'completed', true); setHintShown(true); }} onDelete={() => deleteSet(s.id)} isCompleted={s.completed} enabled={!s.completed}>
                    {setRow}
                  </SwipeableSetRow>
                );
              }
              return setRow;
            })}
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
  // Sync text with prop when not editing
  useEffect(() => { if (!editing) setText(value); }, [value, editing]);
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

function EditableNumber({ value, onSave, decimal, inputMode }: { value: number | null; onSave: (v: number | null) => void; decimal?: boolean; inputMode?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() ?? '');
  // Sync text with prop when not editing
  useEffect(() => { if (!editing) setText(value?.toString() ?? ''); }, [value, editing]);
  if (editing) {
    return <input value={text} onChange={(e) => setText(e.target.value)} type="number" step={decimal ? '0.5' : '1'}
      inputMode={inputMode as any}
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
  // Sync text with prop when not editing
  useEffect(() => { if (!editing) setText(value ?? ''); }, [value, editing]);
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
