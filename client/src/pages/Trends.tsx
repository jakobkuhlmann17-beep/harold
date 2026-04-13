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

  useEffect(() => {
    Promise.all([
      api.get('/trends/workout-completion'), api.get('/trends/consistency'),
      api.get('/trends/records'), api.get('/trends/milestones'), api.get('/trends/insights'),
    ]).then(([wc, c, r, m, ins]) => {
      setCompletion(wc.data); setConsistency(c.data); setRecords(r.data); setMilestones(m.data); setInsights(ins.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
          <InsightCard icon="emoji_events" value={insights.strongestExercise.name} label="strongest lift" />
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

      {/* Heatmap */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface">Consistency Heatmap</h3>
            <p className="text-sm text-on-surface-variant font-body">Daily workout frequency over the last year</p>
          </div>
          <HeatmapLegend />
        </div>
        <Heatmap data={consistency} />
        {/* Summary below heatmap */}
        {insights && (
          <div className="flex flex-wrap gap-4 mt-4 text-xs font-label text-on-surface-variant">
            <span>Total active days: <span className="font-bold text-on-surface">{consistency.filter(d => d.count > 0).length}</span></span>
            <span>Longest streak: <span className="font-bold text-on-surface">{insights.longestStreak} days</span></span>
            <span>Current streak: <span className="font-bold text-on-surface">{insights.currentStreak} days</span></span>
          </div>
        )}
      </div>

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

function Heatmap({ data }: { data: ConsistencyDay[] }) {
  const today = new Date();
  const totalDays = 364;
  const lookup: Record<string, number> = {};
  for (const d of data) lookup[d.date] = d.count;
  const cells: { date: string; count: number; col: number; row: number }[] = [];
  const startDate = new Date(today); startDate.setDate(startDate.getDate() - totalDays);
  const startDay = startDate.getDay();
  const mondayOffset = startDay === 0 ? 1 : startDay === 1 ? 0 : 8 - startDay;
  startDate.setDate(startDate.getDate() + mondayOffset);
  let col = 0;
  const d = new Date(startDate);
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  while (d <= today) {
    const dayOfWeek = d.getDay(); const row = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dateStr = d.toISOString().split('T')[0];
    if (row === 0) { const month = d.getMonth(); if (month !== lastMonth) { monthLabels.push({ label: d.toLocaleDateString('en', { month: 'short' }), col }); lastMonth = month; } }
    cells.push({ date: dateStr, count: lookup[dateStr] || 0, col: row === 0 ? col : col, row });
    d.setDate(d.getDate() + 1);
    if (dayOfWeek === 0) col++;
  }
  const maxCol = Math.max(...cells.map(c => c.col), 0);
  const cellColor = (count: number) => { if (count === 0) return '#eae7e7'; if (count <= 2) return '#ffdbcc'; if (count <= 5) return '#ffb694'; if (count <= 9) return 'rgba(242,109,33,0.6)'; return '#a14000'; };
  const cellSize = 12; const gap = 3;
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg width={(maxCol + 1) * (cellSize + gap) + 30} height={7 * (cellSize + gap) + 20} className="min-w-[700px]">
        {monthLabels.map((m, i) => <text key={i} x={m.col * (cellSize + gap)} y={10} fontSize="9" fill="#8c7166" fontFamily="Manrope">{m.label}</text>)}
        {cells.map((c, i) => <rect key={i} x={c.col * (cellSize + gap)} y={c.row * (cellSize + gap) + 16} width={cellSize} height={cellSize} rx="2" fill={cellColor(c.count)}><title>{c.date}: {c.count} sets</title></rect>)}
      </svg>
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
