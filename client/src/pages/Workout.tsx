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

  if (loading) return <p className="text-gray-500">Loading...</p>;

  const isLatestWeek = weekIdx === weeks.length - 1;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))} disabled={weekIdx === 0}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40">&larr;</button>
          <span className="font-bold text-lg text-gray-800">
            {currentWeek ? `Week ${currentWeek.weekNumber}` : 'No weeks'}
          </span>
          <button onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))} disabled={weekIdx >= weeks.length - 1}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40">&rarr;</button>
        </div>
        <div className="flex gap-2">
          <button onClick={createEmptyWeek} className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
            + New Week
          </button>
          {isLatestWeek && currentWeek && (
            <button onClick={generateNext} disabled={generating}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
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

      {!currentWeek && <p className="text-gray-500">Create a week to get started.</p>}

      {currentWeek && (
        <>
          {/* Day tabs */}
          <div className="flex gap-1">
            {sortedDays.map((day, i) => {
              const totalSets = day.exercises.flatMap((e) => e.sets).length;
              const doneSets = day.exercises.flatMap((e) => e.sets).filter((s) => s.completed).length;
              return (
                <button key={day.id} onClick={() => setSelectedDay(i)}
                  className={`flex-1 py-2 px-1 rounded-t text-sm font-medium border-b-2 transition ${
                    i === selectedDay ? 'border-indigo-600 bg-white text-indigo-700' : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <div>{DAY_SHORT[day.dayOfWeek]}</div>
                  <div className="text-xs capitalize">{day.focus || '—'}</div>
                  <div className="text-xs text-gray-400">{doneSets}/{totalSets}</div>
                </button>
              );
            })}
          </div>

          {/* Exercises */}
          {currentDay && (
            <div className="space-y-3">
              {currentDay.exercises.length === 0 && <p className="text-sm text-gray-400">No exercises yet.</p>}
              {currentDay.exercises
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((ex) => (
                <div key={ex.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <EditableText value={ex.name} onSave={(v) => updateExerciseName(ex.id, v)} className="font-semibold text-gray-800" />
                    <button onClick={() => deleteExercise(ex.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs">
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
                        <tr key={s.id} className="border-t border-gray-100">
                          <td className="py-1 text-gray-400">{si + 1}</td>
                          <td>
                            <EditableNumber value={s.reps} onSave={(v) => updateSet(s.id, 'reps', v)} />
                          </td>
                          <td>
                            <EditableNumber value={s.weightKg} onSave={(v) => updateSet(s.id, 'weightKg', v)} decimal />
                          </td>
                          <td className="text-gray-400 text-xs">{s.notes || ''}</td>
                          <td>
                            <FeedbackInput value={s.feedback} onSave={(v) => updateSet(s.id, 'feedback', v)} />
                          </td>
                          <td>
                            <input type="checkbox" checked={s.completed}
                              onChange={(e) => updateSet(s.id, 'completed', e.target.checked)}
                              className="accent-indigo-600" />
                          </td>
                          <td>
                            <button onClick={() => deleteSet(s.id)} className="text-red-300 hover:text-red-500">&times;</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addSet(ex)} className="mt-2 text-xs text-indigo-600 hover:underline">+ Add set</button>
                </div>
              ))}

              <div className="flex gap-2">
                <input value={newExName} onChange={(e) => setNewExName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                  placeholder="Exercise name" className="border rounded px-3 py-1.5 text-sm flex-1" />
                <button onClick={addExercise} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
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
        autoFocus className="border-b border-indigo-400 outline-none px-1 text-sm" />
    );
  }
  return <span onClick={() => setEditing(true)} className={`cursor-pointer hover:text-indigo-600 ${className}`}>{value}</span>;
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
        autoFocus className="w-16 border-b border-indigo-400 outline-none px-1 text-sm" />
    );
  }
  return (
    <span onClick={() => { setText(value?.toString() ?? ''); setEditing(true); }}
      className="cursor-pointer hover:text-indigo-600 text-sm">
      {value !== null && value !== undefined ? value : '—'}
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
        autoFocus className="w-36 border-b border-gray-300 outline-none px-1 text-xs text-gray-600" />
    );
  }
  return (
    <span onClick={() => { setText(value ?? ''); setEditing(true); }}
      className="cursor-pointer text-xs text-gray-400 italic hover:text-indigo-500">
      {value || 'add feedback'}
    </span>
  );
}
