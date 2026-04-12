import { useEffect, useState } from 'react';
import api from '../lib/api';

interface SetData {
  id: number;
  reps: number | null;
  weightKg: number | null;
  notes: string | null;
  feedback: string | null;
  completed: boolean;
}

interface ExerciseData {
  id: number;
  name: string;
  order: number;
  sets: SetData[];
}

interface DayData {
  id: number;
  dayOfWeek: string;
  focus: string;
  exercises: ExerciseData[];
}

interface WeekData {
  id: number;
  weekNumber: number;
  days: DayData[];
}

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat' } as Record<string, string>;

export default function Workout() {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newExName, setNewExName] = useState('');

  const fetchWeeks = async () => {
    const { data } = await api.get('/weeks');
    setWeeks(data);
    if (data.length > 0) setWeekIdx(data.length - 1);
    setLoading(false);
  };

  useEffect(() => { fetchWeeks(); }, []);

  const currentWeek = weeks[weekIdx];
  const sortedDays = currentWeek?.days?.slice().sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)) || [];
  const currentDay = sortedDays[selectedDay];

  const createEmptyWeek = async () => {
    await api.post('/weeks');
    await fetchWeeks();
  };

  const generateNext = async () => {
    if (!currentWeek) return;
    setGenerating(true);
    try {
      await api.post(`/weeks/${currentWeek.id}/generate-next`);
      await fetchWeeks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Generation failed');
    }
    setGenerating(false);
  };

  const addExercise = async () => {
    if (!currentDay || !newExName.trim()) return;
    const order = currentDay.exercises.length;
    await api.post('/exercises', { dayId: currentDay.id, name: newExName.trim(), order });
    setNewExName('');
    await fetchWeeks();
  };

  const deleteExercise = async (exId: number) => {
    await api.delete(`/exercises/${exId}`);
    await fetchWeeks();
  };

  const addSet = async (exercise: ExerciseData) => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    await api.post('/sets', {
      exerciseId: exercise.id,
      reps: lastSet?.reps ?? null,
      weightKg: lastSet?.weightKg ?? null,
    });
    await fetchWeeks();
  };

  const updateSet = async (setId: number, field: string, value: any) => {
    await api.put(`/sets/${setId}`, { [field]: value });
    await fetchWeeks();
  };

  const deleteSet = async (setId: number) => {
    await api.delete(`/sets/${setId}`);
    await fetchWeeks();
  };

  const updateExerciseName = async (exId: number, name: string) => {
    await api.put(`/exercises/${exId}`, { name });
    await fetchWeeks();
  };

  if (loading) return <p className="text-outline font-body">Loading...</p>;

  const isLatestWeek = weekIdx === weeks.length - 1;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))} disabled={weekIdx === 0}
            className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center disabled:opacity-40 transition-colors text-on-surface-variant">&larr;</button>
          <span className="font-heading font-bold text-lg text-on-surface">
            {currentWeek ? `Week ${currentWeek.weekNumber}` : 'No weeks'}
          </span>
          <button onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))} disabled={weekIdx >= weeks.length - 1}
            className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center disabled:opacity-40 transition-colors text-on-surface-variant">&rarr;</button>
        </div>
        <div className="flex gap-2">
          <button onClick={createEmptyWeek} className="px-4 py-1.5 border-2 border-outline text-on-surface-variant rounded-full text-sm font-heading font-medium hover:bg-surface-container-high transition-colors">
            + New Week
          </button>
          {isLatestWeek && currentWeek && (
            <button onClick={generateNext} disabled={generating}
              className="px-4 py-1.5 gradient-primary text-on-primary rounded-full text-sm font-heading font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
              {generating ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Generating...
                </span>
              ) : 'Generate Next Week'}
            </button>
          )}
        </div>
      </div>

      {!currentWeek && <p className="text-outline font-body">Create a week to get started.</p>}

      {currentWeek && (
        <>
          {/* Day tabs */}
          <div className="flex gap-1.5">
            {sortedDays.map((day, i) => {
              const totalSets = day.exercises.flatMap((e) => e.sets).length;
              const doneSets = day.exercises.flatMap((e) => e.sets).filter((s) => s.completed).length;
              return (
                <button key={day.id} onClick={() => setSelectedDay(i)}
                  className={`flex-1 py-2.5 px-1 rounded-full text-sm font-heading font-medium transition-all ${
                    i === selectedDay ? 'gradient-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}>
                  <div>{DAY_SHORT[day.dayOfWeek]}</div>
                  <div className="text-xs capitalize opacity-80">{day.focus || '\u2014'}</div>
                  <div className="text-xs opacity-60">{doneSets}/{totalSets}</div>
                </button>
              );
            })}
          </div>

          {/* Exercises */}
          {currentDay && (
            <div className="space-y-3">
              {currentDay.exercises.length === 0 && <p className="text-sm text-outline font-body">No exercises yet.</p>}
              {currentDay.exercises
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((ex) => (
                <div key={ex.id} className="bg-surface-container-lowest rounded-xl p-4 border-l-4 border-l-primary border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-2">
                    <EditableText value={ex.name} onSave={(v) => updateExerciseName(ex.id, v)} className="font-heading font-semibold text-on-surface" />
                    <button onClick={() => deleteExercise(ex.id)} className="text-red-400 hover:text-red-600 text-sm font-body">Delete</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-on-surface-variant text-xs font-body uppercase tracking-widest">
                        <th className="text-left w-8">#</th>
                        <th className="text-left">Reps</th>
                        <th className="text-left">Weight (kg)</th>
                        <th className="text-left">Notes</th>
                        <th className="text-left">Feedback</th>
                        <th className="w-8"></th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((s, si) => (
                        <tr key={s.id} className="border-t border-outline-variant/20">
                          <td className="py-1.5 text-outline font-body">{si + 1}</td>
                          <td>
                            <EditableNumber value={s.reps} onSave={(v) => updateSet(s.id, 'reps', v)} />
                          </td>
                          <td>
                            <EditableNumber value={s.weightKg} onSave={(v) => updateSet(s.id, 'weightKg', v)} decimal />
                          </td>
                          <td className="text-outline text-xs font-body">{s.notes || ''}</td>
                          <td>
                            <FeedbackInput value={s.feedback} onSave={(v) => updateSet(s.id, 'feedback', v)} />
                          </td>
                          <td>
                            <input type="checkbox" checked={s.completed}
                              onChange={(e) => updateSet(s.id, 'completed', e.target.checked)}
                              className="accent-primary w-4 h-4" />
                          </td>
                          <td>
                            <button onClick={() => deleteSet(s.id)} className="text-red-300 hover:text-red-500">&times;</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addSet(ex)} className="mt-2 text-xs text-primary font-heading font-medium border border-primary/30 px-3 py-1 rounded-full hover:bg-primary/5 transition-colors">+ Add set</button>
                </div>
              ))}

              <div className="flex gap-2">
                <input value={newExName} onChange={(e) => setNewExName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                  placeholder="Exercise name" className="border border-outline-variant rounded-lg px-3 py-2 text-sm flex-1 font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface" />
                <button onClick={addExercise} className="px-4 py-2 gradient-primary text-on-primary rounded-full text-sm font-heading font-medium hover:opacity-90 transition-opacity">
                  Add Exercise
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EditableText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (editing) {
    return (
      <input value={text} onChange={(e) => setText(e.target.value)}
        onBlur={() => { onSave(text); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onSave(text); setEditing(false); } }}
        autoFocus className="border-b-2 border-primary outline-none px-1 text-sm font-heading bg-transparent text-on-surface" />
    );
  }
  return <span onClick={() => setEditing(true)} className={`cursor-pointer hover:text-primary transition-colors ${className}`}>{value}</span>;
}

function EditableNumber({ value, onSave, decimal }: { value: number | null; onSave: (v: number | null) => void; decimal?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() ?? '');

  if (editing) {
    return (
      <input value={text} onChange={(e) => setText(e.target.value)} type="number" step={decimal ? '0.5' : '1'}
        onBlur={() => {
          const v = text === '' ? null : decimal ? parseFloat(text) : parseInt(text);
          onSave(v);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = text === '' ? null : decimal ? parseFloat(text) : parseInt(text);
            onSave(v);
            setEditing(false);
          }
        }}
        autoFocus className="w-16 border-b-2 border-primary outline-none px-1 text-sm font-heading bg-transparent text-on-surface" />
    );
  }
  return (
    <span onClick={() => { setText(value?.toString() ?? ''); setEditing(true); }}
      className="cursor-pointer hover:text-primary text-sm font-heading transition-colors">
      {value !== null && value !== undefined ? value : '\u2014'}
    </span>
  );
}

function FeedbackInput({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');

  const save = () => {
    const trimmed = text.trim();
    onSave(trimmed || null);
    setEditing(false);
  };

  if (editing) {
    return (
      <input value={text} onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        placeholder="How did this feel? (optional)"
        autoFocus className="w-36 border-b border-outline-variant outline-none px-1 text-xs text-on-surface-variant font-body bg-transparent" />
    );
  }
  return (
    <span onClick={() => { setText(value ?? ''); setEditing(true); }}
      className="cursor-pointer text-xs text-outline italic hover:text-primary font-body transition-colors">
      {value || 'add feedback'}
    </span>
  );
}
