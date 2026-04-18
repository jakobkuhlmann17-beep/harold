import { useEffect, useState } from 'react';
import api from '../lib/api';

interface CompletionDay { weekNumber: number; dayOfWeek: string; focus: string; label: string; totalExercises: number; completedExercises: number; totalSets: number; completedSets: number; }
interface ConsistencyDay { date: string; count: number; }
interface Record_ { exercise: string; maxWeightKg: number; maxReps: number; achievedAt: string; }
interface Milestone { title: string; description: string; achieved: boolean; achievedAt: string | null; progress: string | null; }
interface Insights { strongestExercise: { name: string; totalVolumeGain: number }; mostConsistentDay: string; avgCompletionRate: number; currentStreak: number; longestStreak: number; totalSetsAllTime: number; totalVolumeAllTime: number; weekOverWeekVolumeChange: number; recommendedFocus: string; }

export default function Trends() {
  const [completion, setCompletion] = useState<CompletionDay[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyDay[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [heatmapMonth, setHeatmapMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; });
  const [currentWeekData, setCurrentWeekData] = useState<any>(null);

  const fetchConsistency = async (month: string) => {
    const { data } = await api.get(`/trends/consistency?month=${month}`);
    setConsistency(data);
  };

  useEffect(() => {
    Promise.all([
      api.get('/trends/workout-completion'), api.get(`/trends/consistency?month=${heatmapMonth}`),
      api.get('/trends/records'), api.get('/trends/milestones'), api.get('/trends/insights'),
      api.get('/trends/current-week'),
    ]).then(([wc, c, r, m, ins, cw]) => {
      setCompletion(wc.data); setConsistency(c.data); setRecords(r.data); setMilestones(m.data); setInsights(ins.data);
      setCurrentWeekData(cw.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const shiftMonth = (delta: number) => {
    const [y, m] = heatmapMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setHeatmapMonth(newMonth);
    fetchConsistency(newMonth);
  };

  const isCurrentMonth = (() => { const n = new Date(); return heatmapMonth === `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; })();
  const monthLabel = (() => { const [y, m] = heatmapMonth.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); })();

  // Volume data for weight progress
  const weeklyVolume = computeWeeklyVolume(consistency);
  const [volMode, setVolMode] = useState<'volume' | 'sets'>('volume');

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">Training Overview</p>
        <h2 className="font-headline text-3xl lg:text-4xl font-black text-on-surface">Your Workout Journey</h2>
      </div>

      {/* Insights bar */}
      {insights && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <InsightCard icon="trending_up" value={`${insights.weekOverWeekVolumeChange > 0 ? '+' : ''}${insights.weekOverWeekVolumeChange}%`} label="vs last week" color={insights.weekOverWeekVolumeChange >= 0 ? 'text-[#2e7d32]' : 'text-error'} />
          <InsightCard icon="pie_chart" value={`${insights.avgCompletionRate}%`} label="completion rate" ringPct={insights.avgCompletionRate} />
          <InsightCard icon="fitness_center" value={insights.totalVolumeAllTime >= 1000 ? `${(insights.totalVolumeAllTime / 1000).toFixed(1)}k` : String(insights.totalVolumeAllTime)} label="kg lifted all time" />
          <InsightCard icon="calendar_today" value={insights.mostConsistentDay.charAt(0) + insights.mostConsistentDay.slice(1).toLowerCase()} label="most consistent day" />
          {/* AI recommendation */}
          <div className="min-w-[300px] hearth-glow text-white rounded-2xl p-5 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="text-white/70 text-xs font-label uppercase tracking-widest">Coach Insight</span>
            </div>
            <p className="text-sm font-body leading-relaxed">{insights.recommendedFocus}</p>
          </div>
        </div>
      )}

      {/* Workout Completion + Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Workout Completion</h3>
              <p className="text-sm text-on-surface-variant font-body">Exercises completed per session</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-body text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: '#f26d21' }} /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-surface-container-highest" /> Incomplete</span>
            </div>
          </div>
          {completion.length > 0 ? <CompletionChart data={completion} /> : (
            <div className="h-48 flex items-center justify-center"><p className="text-on-surface-variant font-body italic">Start logging workouts to see your completion chart</p></div>
          )}
          {/* Summary row */}
          {completion.length > 0 && (() => {
            const avgCompletion = Math.round(completion.reduce((s, d) => s + (d.totalExercises > 0 ? d.completedExercises / d.totalExercises : 0), 0) / completion.length * 100);
            const last = completion[completion.length - 1];
            // Best streak of consecutive days with all exercises complete
            let bestStreak = 0; let cur = 0;
            for (const d of completion) { if (d.completedExercises === d.totalExercises) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0; }
            return (
              <div className="flex gap-3 mt-4 flex-wrap">
                <div className="bg-surface-container-low rounded-2xl px-5 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">percent</span>
                  <div><span className="font-headline font-bold text-lg">{avgCompletion}%</span><span className="text-xs text-on-surface-variant font-body ml-1">avg completion</span></div>
                </div>
                <div className="bg-surface-container-low rounded-2xl px-5 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">local_fire_department</span>
                  <div><span className="font-headline font-bold text-lg">{bestStreak}</span><span className="text-xs text-on-surface-variant font-body ml-1">best streak</span></div>
                </div>
                <div className="bg-surface-container-low rounded-2xl px-5 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">fitness_center</span>
                  <div><span className="font-headline font-bold text-lg">{last.completedSets}/{last.totalSets}</span><span className="text-xs text-on-surface-variant font-body ml-1">last session</span></div>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="lg:col-span-5 space-y-3">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Personal Records</h3>
          {records.length === 0 && <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm text-center"><p className="text-on-surface-variant font-body italic">No records yet</p></div>}
          {records.slice(0, 3).map((r, i) => (
            <div key={r.exercise} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm relative">
              {i === 0 && <span className="absolute top-3 right-3 bg-primary-container/20 text-primary text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-label tracking-wider">NEW PR</span>}
              <p className="font-headline font-bold text-on-surface">{r.exercise}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline text-3xl font-black text-primary">{r.maxWeightKg}</span>
                <span className="text-sm text-on-surface-variant font-label">kg</span>
                <span className="text-sm text-on-surface-variant font-body ml-2">{r.maxReps} reps</span>
              </div>
              <p className="text-xs text-outline font-label mt-1">{r.achievedAt}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Heatmap */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface">Consistency Heatmap</h3>
            <p className="text-sm text-on-surface-variant font-body">Daily workout frequency</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="font-headline font-bold text-lg text-on-surface min-w-[140px] text-center">{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors text-on-surface-variant disabled:opacity-30">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
        <MonthlyHeatmap data={consistency} month={heatmapMonth} />
        <div className="flex items-center justify-between mt-4">
          <HeatmapLegend />
          {insights && (
            <div className="flex gap-4 text-xs font-label text-on-surface-variant">
              <span>Active: <span className="font-bold text-on-surface">{consistency.filter(d => d.count > 0).length}</span> days</span>
              <span>Streak: <span className="font-bold text-on-surface">{insights.currentStreak}</span> days</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Week Progress */}
      {currentWeekData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">Current Week</p>
              <h3 className="font-headline text-2xl font-bold text-on-surface">This Week's Progress</h3>
            </div>
            <span className="text-sm text-on-surface-variant font-body">Week {currentWeekData.weekNumber} &mdash; {currentWeekData.weekStart?.slice(5)} to {currentWeekData.weekEnd?.slice(5)}</span>
          </div>
          <div className="grid grid-cols-7 gap-2 lg:gap-3">
            {currentWeekData.days?.map((d: any) => {
              const pct = d.totalSets > 0 ? (d.completedSets / d.totalSets) * 100 : 0;
              return (
                <div key={d.dayOfWeek} className={`bg-surface-container-lowest rounded-2xl p-3 lg:p-4 border transition-all ${d.isToday ? 'border-primary border-2' : 'border-outline-variant/20'} ${d.isFuture ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-on-surface-variant">{d.dayOfWeek.slice(0, 3)}</span>
                    {d.isToday && <span className="bg-primary text-white rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase">Today</span>}
                  </div>
                  <p className="text-[10px] text-on-surface-variant">{d.date?.slice(5)}</p>
                  {d.focus && <p className="text-[10px] font-bold text-primary mt-1">{d.focus}</p>}
                  {d.totalSets > 0 && !d.isFuture && (
                    <>
                      <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-2">
                        <div className="hearth-glow h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] font-bold text-on-surface mt-1">{d.completedSets}/{d.totalSets}</p>
                      <div className="mt-1 space-y-0.5">
                        {d.exercises?.slice(0, 3).map((ex: any, i: number) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${ex.completed ? 'bg-[#2e7d32]' : 'bg-outline-variant'}`} />
                            <span className={`text-[9px] ${ex.completed ? 'text-on-surface' : 'text-on-surface-variant'}`}>{ex.name}</span>
                          </div>
                        ))}
                        {d.exercises?.length > 3 && <span className="text-[9px] text-on-surface-variant">+{d.exercises.length - 3} more</span>}
                      </div>
                    </>
                  )}
                  {d.totalSets === 0 && !d.isFuture && <p className="text-[9px] text-on-surface-variant italic mt-2">Rest day</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Volume + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Weight Progress</h3>
              <p className="text-sm text-on-surface-variant font-body">Weekly volume trends</p>
            </div>
            <div className="flex gap-1 bg-surface-container-low rounded-full p-0.5">
              {(['volume', 'sets'] as const).map(m => (
                <button key={m} onClick={() => setVolMode(m)} className={`px-3 py-1 rounded-full text-xs font-headline font-bold transition-all ${volMode === m ? 'hearth-glow text-white' : 'text-on-surface-variant'}`}>{m === 'volume' ? 'Volume' : 'Sets'}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-6 mb-4">
            <div><p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">This Week</p><p className="font-headline text-2xl font-black text-on-surface">{weeklyVolume.length > 0 ? (volMode === 'volume' ? fmtK(weeklyVolume[weeklyVolume.length - 1].volume) : weeklyVolume[weeklyVolume.length - 1].sets) : 0}</p></div>
          </div>
          <VolumeChart data={weeklyVolume} mode={volMode} />
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Milestones Reached</h3>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.title} className={`flex items-center gap-3 ${m.achieved ? '' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.achieved ? 'bg-primary-container/20' : 'bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: m.achieved ? '#a14000' : '#8c7166' }}>{milestoneIcon(m.title)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-headline font-bold text-sm ${m.achieved ? 'text-on-surface' : 'text-outline'}`}>{m.title}</p>
                  <p className="text-xs text-on-surface-variant font-body">{m.description}</p>
                </div>
                {m.achieved && m.achievedAt ? (
                  <span className="text-xs text-outline font-label flex-shrink-0">{m.achievedAt}</span>
                ) : m.progress ? (
                  <span className="text-xs text-outline font-label flex-shrink-0">{m.progress}</span>
                ) : !m.achieved ? (
                  <span className="material-symbols-outlined text-[16px] text-outline-variant">lock</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---
function fmtK(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v); }
function milestoneIcon(title: string): string {
  if (title.includes('Streak') || title.includes('Consistent')) return 'local_fire_department';
  if (title.includes('Sets') || title.includes('Volume')) return 'fitness_center';
  if (title.includes('Warrior')) return 'military_tech';
  if (title.includes('Feedback')) return 'chat_bubble';
  if (title.includes('Social')) return 'group';
  return 'star';
}

function InsightCard({ icon, value, label, color, ringPct }: { icon: string; value: string; label: string; color?: string; ringPct?: number }) {
  return (
    <div className="min-w-[200px] bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 flex-shrink-0">
      <div className="flex items-center gap-3">
        {ringPct !== undefined ? (
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#eae7e7" strokeWidth="4" /><circle cx="20" cy="20" r="15" fill="none" stroke="#a14000" strokeWidth="4" strokeLinecap="round" strokeDasharray={2*Math.PI*15} strokeDashoffset={2*Math.PI*15*(1-ringPct/100)} /></svg>
          </div>
        ) : (
          <span className="material-symbols-outlined text-primary text-[24px]">{icon}</span>
        )}
        <div>
          <p className={`font-headline text-xl font-black ${color || 'text-on-surface'}`}>{value}</p>
          <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CompletionChart({ data }: { data: CompletionDay[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const W = 700; const H = 280; const PAD = { t: 10, r: 10, b: 30, l: 10 };
  const cw = W - PAD.l - PAD.r; const ch = H - PAD.t - PAD.b;
  const maxEx = Math.max(...data.map(d => d.totalExercises), 1);
  const gap = 8;
  const barW = Math.max(8, (cw - gap * data.length) / data.length);
  const blockGap = 2;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHoveredIdx(null)}>
        {data.map((d, i) => {
          const x = PAD.l + i * (barW + gap);
          const blockH = (ch - blockGap * (maxEx - 1)) / maxEx;
          const blocks = [];
          for (let b = 0; b < d.totalExercises; b++) {
            const isComplete = b < d.completedExercises;
            const y = PAD.t + ch - (b + 1) * blockH - b * blockGap;
            blocks.push(
              <rect key={b} x={x} y={y} width={barW} height={blockH} rx={3}
                fill={isComplete ? '#f26d21' : '#e4e2e1'} />
            );
          }
          const showLabel = data.length <= 20 || i % 2 === 0;
          return (
            <g key={i} onMouseEnter={() => setHoveredIdx(i)} style={{ cursor: 'pointer' }}>
              {/* Invisible hit area */}
              <rect x={x} y={PAD.t} width={barW} height={ch} fill="transparent" />
              {blocks}
              {showLabel && (
                <text x={x + barW / 2} y={H - 5} textAnchor="middle" fill="#8c7166" fontSize="8" fontFamily="Manrope">
                  {data.length > 14 ? d.label.split(' ')[0] : d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Tooltip */}
      {hoveredIdx !== null && (() => {
        const d = data[hoveredIdx];
        const leftPct = ((hoveredIdx + 0.5) / data.length) * 100;
        return (
          <div className="absolute pointer-events-none bg-[#1b1c1c] text-white rounded-xl px-4 py-3 text-xs font-body z-10"
            style={{ left: `${Math.min(80, Math.max(10, leftPct))}%`, top: 0, transform: 'translateX(-50%)' }}>
            <p className="font-headline font-bold">{d.dayOfWeek.charAt(0) + d.dayOfWeek.slice(1).toLowerCase()} {d.focus ? `\u2014 ${d.focus}` : ''} <span className="opacity-60">Week {d.weekNumber}</span></p>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: d.totalExercises }).map((_, i) => (
                <span key={i} className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: i < d.completedExercises ? '#f26d21' : '#555' }} />
              ))}
              <span className="ml-1">{d.completedExercises}/{d.totalExercises} exercises</span>
            </div>
            <p className="mt-0.5 opacity-70">{d.completedSets}/{d.totalSets} sets completed</p>
          </div>
        );
      })()}
    </div>
  );
}

function HeatmapLegend() {
  const colors = ['#eae7e7', '#ffdbcc', '#ffb694', 'rgba(242,109,33,0.6)', '#a14000'];
  return (<div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-label"><span>Less</span>{colors.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />)}<span>More</span></div>);
}

function MonthlyHeatmap({ data, month }: { data: ConsistencyDay[]; month: string }) {
  const lookup: Record<string, number> = {};
  for (const d of data) lookup[d.date] = d.count;
  const [y, m] = month.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun
  const offset = startDow === 0 ? 6 : startDow - 1; // Mon=0

  const cellColor = (count: number) => { if (count === 0) return '#eae7e7'; if (count <= 2) return '#ffdbcc'; if (count <= 5) return '#ffb694'; if (count <= 9) return 'rgba(242,109,33,0.6)'; return '#a14000'; };
  const textColor = (count: number) => count >= 10 ? 'white' : count >= 3 ? '#a14000' : '#8c7166';
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const cells: { day: number; row: number; col: number; count: number; date: string; isThisMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const col = i % 7; const row = Math.floor(i / 7);
    const dayNum = i - offset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ day: dayNum < 1 ? new Date(y, m - 2, 0).getDate() + dayNum : dayNum - daysInMonth, row, col, count: 0, date: '', isThisMonth: false });
    } else {
      const d = new Date(y, m - 1, dayNum);
      const ds = d.toISOString().split('T')[0];
      cells.push({ day: dayNum, row, col, count: lookup[ds] || 0, date: ds, isThisMonth: true });
    }
  }
  // Remove trailing rows that are entirely next month
  while (cells.length > 7 && cells.slice(-7).every(c => !c.isThisMonth)) cells.splice(-7);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayLabels.map(l => <div key={l} className="text-center text-xs uppercase font-bold text-on-surface-variant">{l}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, i) => (
          <div key={i} className={`w-full aspect-square rounded-xl flex items-center justify-center relative group ${!c.isThisMonth ? 'opacity-30' : ''}`}
            style={{ backgroundColor: c.isThisMonth ? cellColor(c.count) : '#eae7e7' }} title={c.date ? `${c.date}: ${c.count} sets` : ''}>
            <span className="text-xs font-bold" style={{ color: c.isThisMonth ? textColor(c.count) : '#bbb' }}>{c.day}</span>
            {c.isThisMonth && c.count > 0 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1b1c1c] text-white rounded-lg px-2 py-1 text-[9px] font-body whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                {c.count} sets
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function computeWeeklyVolume(consistency: ConsistencyDay[]): { label: string; sets: number; volume: number }[] {
  if (consistency.length === 0) return [];
  const last56 = consistency.slice(-56);
  const weekMap: Record<string, { sets: number; volume: number }> = {};
  for (let i = 0; i < last56.length; i++) {
    const weekIdx = Math.floor(i / 7); const key = `W${weekIdx + 1}`;
    if (!weekMap[key]) weekMap[key] = { sets: 0, volume: 0 };
    weekMap[key].sets += last56[i].count;
    weekMap[key].volume += last56[i].count * 20;
  }
  return Object.entries(weekMap).map(([label, v]) => ({ label, ...v }));
}

function VolumeChart({ data, mode }: { data: { label: string; sets: number; volume: number }[]; mode: 'volume' | 'sets' }) {
  if (data.length === 0) return <div className="h-32 flex items-center justify-center"><p className="text-on-surface-variant italic font-body text-sm">No volume data yet</p></div>;
  const values = data.map(d => mode === 'volume' ? d.volume : d.sets);
  const maxVal = Math.max(...values, 1);
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((d, i) => {
        const val = mode === 'volume' ? d.volume : d.sets;
        const h = Math.max(4, (val / maxVal) * 100);
        const opacity = 0.4 + (i / Math.max(data.length - 1, 1)) * 0.6;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-0.5 rounded-full">{mode === 'volume' ? fmtK(val) : val}</div>
            <div className="w-full max-w-[40px] rounded-t-lg hearth-glow transition-all duration-500" style={{ height: `${h}%`, opacity }} />
            <span className="text-[9px] font-label text-on-surface-variant">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div><div className="h-4 w-32 bg-surface-container-high rounded animate-pulse mb-2" /><div className="h-10 w-64 bg-surface-container-high rounded animate-pulse" /></div>
      <div className="flex gap-4 overflow-hidden">{[0,1,2,3,4].map(i => <div key={i} className="min-w-[200px] h-20 bg-surface-container-high rounded-2xl animate-pulse" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-8 shadow-sm"><div className="h-48 bg-surface-container-high rounded-xl animate-pulse" /></div>
        <div className="lg:col-span-5 space-y-3">{[0,1,2].map(i => <div key={i} className="h-24 bg-surface-container-high rounded-2xl animate-pulse" />)}</div>
      </div>
      <div className="h-40 bg-surface-container-high rounded-3xl animate-pulse" />
    </div>
  );
}
