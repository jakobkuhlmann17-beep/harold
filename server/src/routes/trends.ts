import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Helper: get all weeks with full data for a user
async function getUserWeeks(userId: number | undefined) {
  return prisma.week.findMany({
    where: { userId },
    orderBy: { weekNumber: 'asc' },
    include: { days: { include: { exercises: { include: { sets: true } }, cardioSession: true } } },
  });
}

// GET /api/trends/strength
router.get('/strength', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await getUserWeeks(req.userId);
    const result = weeks.slice(-12).map((w) => {
      let maxWeight = 0;
      for (const d of w.days) for (const ex of d.exercises) for (const s of ex.sets) if (s.weightKg !== null && s.weightKg > maxWeight) maxWeight = s.weightKg;
      return { week: w.weekNumber, weekLabel: `Week ${w.weekNumber}`, maxWeight };
    });
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/trends/exercise-progress?exercise=Barbells
router.get('/exercise-progress', async (req: AuthRequest, res: Response) => {
  try {
    const exerciseName = req.query.exercise as string;
    if (!exerciseName) return res.status(400).json({ error: 'exercise query param required' });

    const weeks = await getUserWeeks(req.userId);
    const result = weeks.map((w) => {
      let maxWeightKg = 0;
      let totalVolume = 0;
      let bestSet = '';
      for (const d of w.days) {
        for (const ex of d.exercises) {
          if (ex.name !== exerciseName) continue;
          for (const s of ex.sets) {
            const wt = s.weightKg ?? 0;
            const rp = s.reps ?? 0;
            totalVolume += rp * wt;
            if (wt > maxWeightKg) { maxWeightKg = wt; bestSet = `${rp} \u00d7 ${wt}kg`; }
          }
        }
      }
      return { week: w.weekNumber, weekLabel: `Week ${w.weekNumber}`, maxWeightKg, totalVolume: Math.round(totalVolume), bestSet };
    }).filter((w) => w.maxWeightKg > 0 || w.totalVolume > 0);

    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/trends/insights
router.get('/insights', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await getUserWeeks(req.userId);

    // Total sets + volume all time
    let totalSetsAllTime = 0;
    let totalVolumeAllTime = 0;
    let totalFeedback = 0;
    const dayCompletionMap: Record<string, number[]> = {};
    const exerciseVolumeByWeek: Record<string, number[]> = {};

    for (let wi = 0; wi < weeks.length; wi++) {
      const w = weeks[wi];
      for (const d of w.days) {
        const daySets = d.exercises.reduce((s, e) => s + e.sets.filter(st => st.completed).length, 0);
        const dayTotal = d.exercises.reduce((s, e) => s + e.sets.length, 0);
        if (!dayCompletionMap[d.dayOfWeek]) dayCompletionMap[d.dayOfWeek] = [];
        if (dayTotal > 0) dayCompletionMap[d.dayOfWeek].push(daySets / dayTotal);

        for (const ex of d.exercises) {
          let weekVol = 0;
          for (const s of ex.sets) {
            if (s.completed) { totalSetsAllTime++; weekVol += (s.reps ?? 0) * (s.weightKg ?? 0); }
            if (s.feedback) totalFeedback++;
          }
          totalVolumeAllTime += weekVol;
          if (!exerciseVolumeByWeek[ex.name]) exerciseVolumeByWeek[ex.name] = [];
          while (exerciseVolumeByWeek[ex.name].length < wi) exerciseVolumeByWeek[ex.name].push(0);
          exerciseVolumeByWeek[ex.name][wi] = (exerciseVolumeByWeek[ex.name][wi] || 0) + weekVol;
        }
      }
    }

    // Strongest exercise (highest % volume gain)
    let strongestExercise = { name: 'N/A', totalVolumeGain: 0 };
    for (const [name, vols] of Object.entries(exerciseVolumeByWeek)) {
      if (vols.length >= 2) {
        const last = vols[vols.length - 1] || 0;
        const prev = vols[vols.length - 2] || 0;
        const gain = prev > 0 ? ((last - prev) / prev) * 100 : 0;
        if (gain > strongestExercise.totalVolumeGain) strongestExercise = { name, totalVolumeGain: Math.round(gain * 10) / 10 };
      }
    }

    // Most consistent day
    let mostConsistentDay = 'MONDAY';
    let bestAvg = 0;
    for (const [day, rates] of Object.entries(dayCompletionMap)) {
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      if (avg > bestAvg) { bestAvg = avg; mostConsistentDay = day; }
    }

    // Avg completion rate
    const allRates = Object.values(dayCompletionMap).flat();
    const avgCompletionRate = allRates.length > 0 ? Math.round((allRates.reduce((a, b) => a + b, 0) / allRates.length) * 100) : 0;

    // Streaks
    const dayOffsets: Record<string, number> = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 };
    const activeDates = new Set<string>();
    for (const w of weeks) {
      const ws = new Date(w.createdAt); const dow = ws.getDay(); const mo = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(ws); mon.setDate(mon.getDate() + mo);
      for (const d of w.days) {
        if (d.exercises.some(e => e.sets.some(s => s.completed))) {
          const dd = new Date(mon); dd.setDate(dd.getDate() + (dayOffsets[d.dayOfWeek] ?? 0));
          activeDates.add(dd.toISOString().split('T')[0]);
        }
      }
    }
    const sorted = Array.from(activeDates).sort();
    let maxStreak = 0; let curStreak = 0; let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) curStreak = 1;
      else { const p = new Date(sorted[i - 1]); const c = new Date(sorted[i]); curStreak = (c.getTime() - p.getTime()) / 864e5 === 1 ? curStreak + 1 : 1; }
      maxStreak = Math.max(maxStreak, curStreak);
    }
    // Current streak from end
    currentStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (i === sorted.length - 1) { currentStreak = 1; }
      else {
        const next = new Date(sorted[i + 1]); const curr = new Date(sorted[i]);
        if ((next.getTime() - curr.getTime()) / 864e5 === 1) currentStreak++;
        else break;
      }
    }

    // Week-over-week volume change
    let weekOverWeekVolumeChange = 0;
    if (weeks.length >= 2) {
      const volWeek = (w: typeof weeks[0]) => w.days.reduce((ds, d) => ds + d.exercises.reduce((es, e) => es + e.sets.reduce((ss, s) => ss + (s.completed ? (s.reps ?? 0) * (s.weightKg ?? 0) : 0), 0), 0), 0);
      const last = volWeek(weeks[weeks.length - 1]);
      const prev = volWeek(weeks[weeks.length - 2]);
      weekOverWeekVolumeChange = prev > 0 ? Math.round(((last - prev) / prev) * 1000) / 10 : 0;
    }

    // Recommended focus
    const focusCounts: Record<string, number> = {};
    for (const w of weeks.slice(-2)) for (const d of w.days) if (d.focus && d.exercises.some(e => e.sets.some(s => s.completed))) focusCounts[d.focus] = (focusCounts[d.focus] || 0) + 1;
    const allFocuses = weeks.flatMap(w => w.days.map(d => d.focus)).filter(Boolean);
    const uniqueFocuses = [...new Set(allFocuses)];
    let leastTrained = uniqueFocuses[0] || 'rest';
    let minCount = Infinity;
    for (const f of uniqueFocuses) { const c = focusCounts[f] || 0; if (c < minCount) { minCount = c; leastTrained = f; } }
    const recommendedFocus = `You've been consistent — consider adding more ${leastTrained} volume this week for balanced development.`;

    // Posts count for Social Butterfly milestone
    const postCount = await prisma.post.count({ where: { userId: req.userId } });

    res.json({
      strongestExercise, mostConsistentDay, avgCompletionRate, currentStreak, longestStreak: maxStreak,
      totalSetsAllTime, totalVolumeAllTime: Math.round(totalVolumeAllTime), weekOverWeekVolumeChange,
      recommendedFocus, totalFeedback, postCount, weekCount: weeks.length,
    });
  } catch (err: any) { console.error('Insights error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/trends/consistency (unchanged)
router.get('/consistency', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await getUserWeeks(req.userId);
    const dayOffsets: Record<string, number> = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 };
    const dayCounts: Record<string, number> = {};
    for (const w of weeks) {
      const ws = new Date(w.createdAt); const dow = ws.getDay(); const mo = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(ws); mon.setDate(mon.getDate() + mo);
      for (const d of w.days) {
        const offset = dayOffsets[d.dayOfWeek] ?? 0;
        const dd = new Date(mon); dd.setDate(dd.getDate() + offset);
        const dateStr = dd.toISOString().split('T')[0];
        const cnt = d.exercises.reduce((s, ex) => s + ex.sets.filter(st => st.completed).length, 0);
        if (cnt > 0) dayCounts[dateStr] = (dayCounts[dateStr] || 0) + cnt;
      }
    }
    const result = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const ds = d.toISOString().split('T')[0]; result.push({ date: ds, count: dayCounts[ds] || 0 }); }
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/trends/records
router.get('/records', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await getUserWeeks(req.userId);
    const records: Record<string, { exercise: string; maxWeightKg: number; maxReps: number; achievedAt: string }> = {};
    for (const w of weeks) for (const d of w.days) for (const ex of d.exercises) for (const s of ex.sets)
      if (s.weightKg !== null && s.weightKg > 0 && (!records[ex.name] || s.weightKg > records[ex.name].maxWeightKg))
        records[ex.name] = { exercise: ex.name, maxWeightKg: s.weightKg, maxReps: s.reps ?? 0, achievedAt: w.createdAt.toISOString().split('T')[0] };
    res.json(Object.values(records).sort((a, b) => b.maxWeightKg - a.maxWeightKg).slice(0, 10));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/trends/milestones
router.get('/milestones', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await getUserWeeks(req.userId);
    let totalCompleted = 0; let totalFeedback = 0; let firstDate: string | null = null;
    const dayOffsets: Record<string, number> = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 };
    const activeDates = new Set<string>();

    for (const w of weeks) {
      const ws = new Date(w.createdAt); const dow = ws.getDay(); const mo = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(ws); mon.setDate(mon.getDate() + mo);
      for (const d of w.days) {
        let dayActive = false;
        for (const ex of d.exercises) for (const s of ex.sets) {
          if (s.completed) { totalCompleted++; dayActive = true; if (!firstDate) firstDate = w.createdAt.toISOString().split('T')[0]; }
          if (s.feedback) totalFeedback++;
        }
        if (dayActive) { const dd = new Date(mon); dd.setDate(dd.getDate() + (dayOffsets[d.dayOfWeek] ?? 0)); activeDates.add(dd.toISOString().split('T')[0]); }
      }
    }

    const sorted = Array.from(activeDates).sort();
    let maxStreak = 0; let cur = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) cur = 1; else { const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 864e5; cur = diff === 1 ? cur + 1 : 1; }
      maxStreak = Math.max(maxStreak, cur);
    }

    const totalVolume = weeks.reduce((ws, w) => ws + w.days.reduce((ds, d) => ds + d.exercises.reduce((es, e) => es + e.sets.reduce((ss, s) => ss + (s.completed ? (s.reps ?? 0) * (s.weightKg ?? 0) : 0), 0), 0), 0), 0);
    const postCount = await prisma.post.count({ where: { userId: req.userId } });

    const milestones = [
      { title: 'First Workout', description: 'Logged your first set', achieved: totalCompleted >= 1, achievedAt: firstDate, progress: totalCompleted >= 1 ? null : `${totalCompleted} / 1 sets` },
      { title: '7 Day Streak', description: '7 consecutive days training', achieved: maxStreak >= 7, achievedAt: maxStreak >= 7 ? sorted[6] || null : null, progress: maxStreak < 7 ? `${maxStreak} / 7 days` : null },
      { title: 'Iron Consistent', description: '14 consecutive days training', achieved: maxStreak >= 14, achievedAt: maxStreak >= 14 ? sorted[13] || null : null, progress: maxStreak < 14 ? `${maxStreak} / 14 days` : null },
      { title: '30 Day Streak', description: '30 consecutive days training', achieved: maxStreak >= 30, achievedAt: maxStreak >= 30 ? sorted[29] || null : null, progress: maxStreak < 30 ? `${maxStreak} / 30 days` : null },
      { title: 'Week 2 Warrior', description: 'Completed 2 full weeks', achieved: weeks.length >= 2, achievedAt: weeks.length >= 2 ? weeks[1].createdAt.toISOString().split('T')[0] : null, progress: weeks.length < 2 ? `${weeks.length} / 2 weeks` : null },
      { title: '100 Sets', description: 'Completed 100 total sets', achieved: totalCompleted >= 100, achievedAt: totalCompleted >= 100 ? firstDate : null, progress: totalCompleted < 100 ? `${totalCompleted} / 100 sets` : null },
      { title: '500 Sets', description: 'Completed 500 total sets', achieved: totalCompleted >= 500, achievedAt: totalCompleted >= 500 ? firstDate : null, progress: totalCompleted < 500 ? `${totalCompleted} / 500 sets` : null },
      { title: 'Volume King', description: 'Lifted over 10,000 kg total', achieved: totalVolume >= 10000, achievedAt: totalVolume >= 10000 ? firstDate : null, progress: totalVolume < 10000 ? `${Math.round(totalVolume).toLocaleString()} / 10,000 kg` : null },
      { title: 'Feedback Pro', description: 'Left feedback on 20+ sets', achieved: totalFeedback >= 20, achievedAt: totalFeedback >= 20 ? firstDate : null, progress: totalFeedback < 20 ? `${totalFeedback} / 20 feedbacks` : null },
      { title: 'Social Butterfly', description: 'Made 5+ community posts', achieved: postCount >= 5, achievedAt: postCount >= 5 ? firstDate : null, progress: postCount < 5 ? `${postCount} / 5 posts` : null },
    ];
    res.json(milestones);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Body weight endpoints
router.get('/body-weight', async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.bodyWeight.findMany({ where: { userId: req.userId }, orderBy: { date: 'asc' } });
    res.json(entries.map(e => ({ ...e, date: e.date.toISOString().split('T')[0] })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/body-weight', async (req: AuthRequest, res: Response) => {
  try {
    const { weightKg, date, notes } = req.body;
    if (!weightKg) return res.status(400).json({ error: 'weightKg is required' });
    const entry = await prisma.bodyWeight.create({ data: { userId: req.userId!, weightKg, date: new Date(date || new Date().toISOString().split('T')[0]), notes: notes || null } });
    res.json({ ...entry, date: entry.date.toISOString().split('T')[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/body-weight/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.bodyWeight.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await prisma.bodyWeight.delete({ where: { id: entry.id } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
