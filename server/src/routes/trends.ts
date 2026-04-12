import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// GET /api/trends/strength — max weight per week for last 12 weeks
router.get('/strength', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await prisma.week.findMany({
      where: { userId: req.userId },
      orderBy: { weekNumber: 'desc' },
      take: 12,
      include: {
        days: {
          include: {
            exercises: {
              include: { sets: true },
            },
          },
        },
      },
    });

    const result = weeks
      .reverse()
      .map((w) => {
        let maxWeight = 0;
        for (const d of w.days) {
          for (const ex of d.exercises) {
            for (const s of ex.sets) {
              if (s.weightKg !== null && s.weightKg > maxWeight) {
                maxWeight = s.weightKg;
              }
            }
          }
        }
        return { week: w.weekNumber, weekLabel: `Week ${w.weekNumber}`, maxWeight };
      });

    res.json(result);
  } catch (err: any) {
    console.error('Trends strength error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/consistency — daily set counts for last 365 days
router.get('/consistency', async (req: AuthRequest, res: Response) => {
  try {
    // Get all completed sets for this user with their week/day info
    const weeks = await prisma.week.findMany({
      where: { userId: req.userId },
      include: {
        days: {
          include: {
            exercises: {
              include: {
                sets: { where: { completed: true } },
              },
            },
          },
        },
      },
    });

    // Map day-of-week to completed set counts per week
    // Since we don't have exact dates, we approximate by using week creation + day offset
    const dayOffsets: Record<string, number> = {
      MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
    };

    const dayCounts: Record<string, number> = {};

    for (const w of weeks) {
      const weekStart = new Date(w.createdAt);
      // Align to Monday of that week
      const dayOfWeek = weekStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(weekStart);
      monday.setDate(monday.getDate() + mondayOffset);

      for (const d of w.days) {
        const offset = dayOffsets[d.dayOfWeek] ?? 0;
        const dayDate = new Date(monday);
        dayDate.setDate(dayDate.getDate() + offset);
        const dateStr = dayDate.toISOString().split('T')[0];
        const completedCount = d.exercises.reduce(
          (sum, ex) => sum + ex.sets.length,
          0
        );
        if (completedCount > 0) {
          dayCounts[dateStr] = (dayCounts[dateStr] || 0) + completedCount;
        }
      }
    }

    // Build array for last 365 days
    const result = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({ date: dateStr, count: dayCounts[dateStr] || 0 });
    }

    res.json(result);
  } catch (err: any) {
    console.error('Trends consistency error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/records — personal records per exercise (top 6 by date)
router.get('/records', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await prisma.week.findMany({
      where: { userId: req.userId },
      include: {
        days: {
          include: {
            exercises: {
              include: { sets: true },
            },
          },
        },
      },
    });

    const records: Record<string, { exercise: string; maxWeightKg: number; maxReps: number; achievedAt: string }> = {};

    for (const w of weeks) {
      for (const d of w.days) {
        for (const ex of d.exercises) {
          for (const s of ex.sets) {
            if (s.weightKg !== null && s.weightKg > 0) {
              const existing = records[ex.name];
              if (!existing || s.weightKg > existing.maxWeightKg) {
                records[ex.name] = {
                  exercise: ex.name,
                  maxWeightKg: s.weightKg,
                  maxReps: s.reps ?? 0,
                  achievedAt: w.createdAt.toISOString().split('T')[0],
                };
              }
            }
          }
        }
      }
    }

    const sorted = Object.values(records)
      .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
      .slice(0, 6);

    res.json(sorted);
  } catch (err: any) {
    console.error('Trends records error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/milestones — achievement tracking
router.get('/milestones', async (req: AuthRequest, res: Response) => {
  try {
    const weeks = await prisma.week.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
      include: {
        days: {
          include: {
            exercises: {
              include: { sets: true },
            },
          },
        },
      },
    });

    // Count total completed sets
    let totalCompleted = 0;
    let firstCompletedDate: string | null = null;

    for (const w of weeks) {
      for (const d of w.days) {
        for (const ex of d.exercises) {
          for (const s of ex.sets) {
            if (s.completed) {
              totalCompleted++;
              if (!firstCompletedDate) {
                firstCompletedDate = w.createdAt.toISOString().split('T')[0];
              }
            }
          }
        }
      }
    }

    // Calculate max consecutive streak
    const dayOffsets: Record<string, number> = {
      MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
    };
    const activeDates = new Set<string>();

    for (const w of weeks) {
      const weekStart = new Date(w.createdAt);
      const dayOfWeek = weekStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(weekStart);
      monday.setDate(monday.getDate() + mondayOffset);

      for (const d of w.days) {
        const hasCompleted = d.exercises.some((ex) => ex.sets.some((s) => s.completed));
        if (hasCompleted) {
          const offset = dayOffsets[d.dayOfWeek] ?? 0;
          const dayDate = new Date(monday);
          dayDate.setDate(dayDate.getDate() + offset);
          activeDates.add(dayDate.toISOString().split('T')[0]);
        }
      }
    }

    // Find max streak
    let maxStreak = 0;
    let currentStreak = 0;
    const sortedDates = Array.from(activeDates).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    const milestones = [
      {
        title: 'First Workout',
        description: 'Logged your first set',
        achieved: totalCompleted >= 1,
        achievedAt: firstCompletedDate,
      },
      {
        title: '7 Day Streak',
        description: '7 consecutive days training',
        achieved: maxStreak >= 7,
        achievedAt: maxStreak >= 7 ? sortedDates[6] || null : null,
      },
      {
        title: '30 Day Streak',
        description: '30 consecutive days training',
        achieved: maxStreak >= 30,
        achievedAt: maxStreak >= 30 ? sortedDates[29] || null : null,
      },
      {
        title: '100 Sets',
        description: 'Completed 100 total sets',
        achieved: totalCompleted >= 100,
        achievedAt: totalCompleted >= 100 ? firstCompletedDate : null,
      },
      {
        title: '500 Sets',
        description: 'Completed 500 total sets',
        achieved: totalCompleted >= 500,
        achievedAt: totalCompleted >= 500 ? firstCompletedDate : null,
      },
      {
        title: '1,000 Sets',
        description: 'Completed 1,000 total sets',
        achieved: totalCompleted >= 1000,
        achievedAt: totalCompleted >= 1000 ? firstCompletedDate : null,
      },
    ];

    res.json(milestones);
  } catch (err: any) {
    console.error('Trends milestones error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
