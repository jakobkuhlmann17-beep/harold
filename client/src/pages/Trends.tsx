import { useEffect, useState } from 'react';
import api from '../lib/api';

interface StrengthPoint { week: number; weekLabel: string; maxWeight: number; }
interface ConsistencyDay { date: string; count: number; }
interface Record_ { exercise: string; maxWeightKg: number; maxReps: number; achievedAt: string; }
interface Milestone { title: string; description: string; achieved: boolean; achievedAt: string | null; }

export default function Trends() {
  const [strength, setStrength] = useState<StrengthPoint[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyDay[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/trends/strength'),
      api.get('/trends/consistency'),
      api.get('/trends/records'),
      api.get('/trends/milestones'),
    ]).then(([s, c, r, m]) => {
      setStrength(s.data);
      setConsistency(c.data);
      setRecords(r.data);
      setMilestones(m.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Volume stats for Weight Progress section
  const weeklyVolume = computeWeeklyVolume(consistency);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">Performance Insight</p>
        <h2 className="font-headline text-3xl lg:text-4xl font-black text-on-surface">Your Kinetic Journey</h2>
      </div>

      {/* Section 1: Strength Gains + Personal Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Strength line chart */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Strength Gains</h3>
          <p className="text-sm text-on-surface-variant font-body mb-6">Max weight lifted per week</p>
          {strength.length > 0 ? (
            <StrengthChart data={strength} />
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-on-surface-variant font-body italic">Start logging workouts to see your strength trend</p>
            </div>
          )}
        </div>

        {/* Personal Records */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Personal Records</h3>
          {records.length === 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm text-center">
              <p className="text-on-surface-variant font-body italic">No records yet</p>
            </div>
          )}
          {records.slice(0, 3).map((r, i) => (
            <div key={r.exercise} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm relative">
              {i === 0 && (
                <span className="absolute top-3 right-3 bg-primary-container/20 text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-label tracking-wider">
                  NEW PR
                </span>
              )}
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

      {/* Section 2: Consistency Heatmap */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface">Consistency Heatmap</h3>
            <p className="text-sm text-on-surface-variant font-body">Daily workout frequency over the last year</p>
          </div>
          <HeatmapLegend />
        </div>
        <Heatmap data={consistency} />
      </div>

      {/* Section 3: Weight Progress + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Progress */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Weight Progress</h3>
          <p className="text-sm text-on-surface-variant font-body mb-4">Weekly volume trends</p>
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Total Sets</p>
              <p className="font-headline text-2xl font-black text-on-surface">
                {weeklyVolume.length > 0 ? weeklyVolume[weeklyVolume.length - 1].sets : 0}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Total Volume</p>
              <p className="font-headline text-2xl font-black text-on-surface">
                {weeklyVolume.length > 0 ? weeklyVolume[weeklyVolume.length - 1].volume.toLocaleString() : 0}
              </p>
            </div>
          </div>
          <VolumeChart data={weeklyVolume} />
        </div>

        {/* Milestones */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm">
          <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Milestones Reached</h3>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.title} className={`flex items-center gap-3 ${m.achieved ? '' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.achieved ? 'bg-primary-container/20' : 'bg-surface-container-high'
                }`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: m.achieved ? '#a14000' : '#8c7166' }}>
                    {milestoneIcon(m.title)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-headline font-bold text-sm ${m.achieved ? 'text-on-surface' : 'text-outline'}`}>{m.title}</p>
                  <p className="text-xs text-on-surface-variant font-body">{m.description}</p>
                </div>
                {m.achieved && m.achievedAt ? (
                  <span className="text-xs text-outline font-label flex-shrink-0">{m.achievedAt}</span>
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

// --- Sub-components ---

function milestoneIcon(title: string): string {
  if (title.includes('Streak')) return 'local_fire_department';
  if (title.includes('Sets')) return 'fitness_center';
  return 'star';
}

function StrengthChart({ data }: { data: StrengthPoint[] }) {
  const W = 600;
  const H = 200;
  const PAD = { t: 20, r: 20, b: 30, l: 40 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const maxW = Math.max(...data.map(d => d.maxWeight), 1);
  const minW = Math.min(...data.map(d => d.maxWeight));
  const range = maxW - minW || 1;

  const points = data.map((d, i) => {
    const x = PAD.l + (i / Math.max(data.length - 1, 1)) * cw;
    const y = PAD.t + ch - ((d.maxWeight - minW) / range) * ch;
    return { x, y, ...d };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const peakIdx = points.reduce((best, p, i) => p.maxWeight > points[best].maxWeight ? i : best, 0);
  const peak = points[peakIdx];

  // Gradient area
  const areaPath = `M${points[0].x},${PAD.t + ch} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${PAD.t + ch} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="strengthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f26d21" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f26d21" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD.l} y1={PAD.t + ch * (1 - f)} x2={PAD.l + cw} y2={PAD.t + ch * (1 - f)}
          stroke="#e0c0b2" strokeOpacity="0.2" strokeWidth="1" />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill="url(#strengthGrad)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#a14000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === peakIdx ? 5 : 3} fill={i === peakIdx ? '#f26d21' : '#a14000'} />
      ))}
      {/* Peak label */}
      <rect x={peak.x - 20} y={peak.y - 28} width="40" height="20" rx="10" fill="#a14000" />
      <text x={peak.x} y={peak.y - 15} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Lexend">{peak.maxWeight}kg</text>
      {/* X labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={H - 5} textAnchor="middle" fill="#8c7166" fontSize="9" fontFamily="Manrope">
          {data.length <= 6 ? p.weekLabel : `W${p.week}`}
        </text>
      ))}
    </svg>
  );
}

function HeatmapLegend() {
  const colors = ['#eae7e7', '#ffdbcc', '#ffb694', 'rgba(242,109,33,0.6)', '#a14000'];
  return (
    <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-label">
      <span>Less</span>
      {colors.map((c, i) => (
        <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
      ))}
      <span>More</span>
    </div>
  );
}

function Heatmap({ data }: { data: ConsistencyDay[] }) {
  // Build 52-week × 7-day grid
  const today = new Date();
  const totalDays = 364;

  // Create lookup
  const lookup: Record<string, number> = {};
  for (const d of data) lookup[d.date] = d.count;

  // Build grid: columns = weeks, rows = Mon(0)–Sun(6)
  const cells: { date: string; count: number; col: number; row: number }[] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays);

  // Align start to Monday
  const startDay = startDate.getDay();
  const mondayOffset = startDay === 0 ? 1 : startDay === 1 ? 0 : 8 - startDay;
  startDate.setDate(startDate.getDate() + mondayOffset);

  let col = 0;
  const d = new Date(startDate);
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;

  while (d <= today) {
    const dayOfWeek = d.getDay();
    const row = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
    const dateStr = d.toISOString().split('T')[0];
    const count = lookup[dateStr] || 0;

    if (row === 0) {
      const month = d.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: d.toLocaleDateString('en', { month: 'short' }), col });
        lastMonth = month;
      }
    }

    cells.push({ date: dateStr, count, col: row === 0 ? col : col, row });

    d.setDate(d.getDate() + 1);
    if (dayOfWeek === 0) col++; // new week column starts after Sunday
  }

  const maxCol = Math.max(...cells.map(c => c.col), 0);

  const cellColor = (count: number) => {
    if (count === 0) return '#eae7e7';
    if (count <= 2) return '#ffdbcc';
    if (count <= 5) return '#ffb694';
    if (count <= 9) return 'rgba(242,109,33,0.6)';
    return '#a14000';
  };

  const cellSize = 12;
  const gap = 3;
  const svgW = (maxCol + 1) * (cellSize + gap) + 30;
  const svgH = 7 * (cellSize + gap) + 20;

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg width={svgW} height={svgH} className="min-w-[700px]">
        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text key={i} x={m.col * (cellSize + gap)} y={10} fontSize="9" fill="#8c7166" fontFamily="Manrope">{m.label}</text>
        ))}
        {/* Cells */}
        {cells.map((c, i) => (
          <rect key={i} x={c.col * (cellSize + gap)} y={c.row * (cellSize + gap) + 16} width={cellSize} height={cellSize}
            rx="2" fill={cellColor(c.count)}>
            <title>{c.date}: {c.count} sets</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

function computeWeeklyVolume(consistency: ConsistencyDay[]): { label: string; sets: number; volume: number }[] {
  // Group by ISO week, last 8 weeks
  if (consistency.length === 0) return [];
  const weekMap: Record<string, { sets: number; volume: number }> = {};

  // Simplification: group by 7-day chunks from end
  const last56 = consistency.slice(-56);
  for (let i = 0; i < last56.length; i++) {
    const weekIdx = Math.floor(i / 7);
    const key = `W${weekIdx + 1}`;
    if (!weekMap[key]) weekMap[key] = { sets: 0, volume: 0 };
    weekMap[key].sets += last56[i].count;
    weekMap[key].volume += last56[i].count * 20; // Approximate volume
  }

  return Object.entries(weekMap).map(([label, v]) => ({ label, ...v }));
}

function VolumeChart({ data }: { data: { label: string; sets: number; volume: number }[] }) {
  if (data.length === 0) {
    return <div className="h-32 flex items-center justify-center"><p className="text-on-surface-variant italic font-body text-sm">No volume data yet</p></div>;
  }

  const maxVol = Math.max(...data.map(d => d.volume), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((d, i) => {
        const h = Math.max(4, (d.volume / maxVol) * 100);
        const opacity = 0.4 + (i / Math.max(data.length - 1, 1)) * 0.6;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full max-w-[40px] rounded-t-lg hearth-glow transition-all duration-500"
              style={{ height: `${h}%`, opacity }} />
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
      <div>
        <div className="h-4 w-32 bg-surface-container-high rounded animate-pulse mb-2" />
        <div className="h-10 w-64 bg-surface-container-high rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <div className="h-6 w-40 bg-surface-container-high rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-surface-container-high rounded animate-pulse mb-6" />
          <div className="h-48 bg-surface-container-high rounded-xl animate-pulse" />
        </div>
        <div className="lg:col-span-5 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="h-5 w-28 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="h-8 w-20 bg-surface-container-high rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <div className="h-6 w-48 bg-surface-container-high rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-surface-container-high rounded animate-pulse mb-4" />
        <div className="h-28 bg-surface-container-high rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
            <div className="h-6 w-40 bg-surface-container-high rounded animate-pulse mb-4" />
            <div className="h-32 bg-surface-container-high rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
