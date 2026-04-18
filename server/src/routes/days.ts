import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { focus } = req.body;
  const day = await prisma.day.findFirst({
    where: { id: Number(req.params.id) },
    include: { week: true },
  });
  if (!day || day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Day not found' });
  }
  const updated = await prisma.day.update({
    where: { id: day.id },
    data: { focus },
  });
  res.json(updated);
});

// POST /api/days — add a new day to a week
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { weekId, dayOfWeek, focus } = req.body;
    if (!weekId || !dayOfWeek) return res.status(400).json({ error: 'weekId and dayOfWeek are required' });

    const week = await prisma.week.findFirst({ where: { id: weekId, userId: req.userId } });
    if (!week) return res.status(404).json({ error: 'Week not found' });

    // Check duplicate
    const existing = await prisma.day.findFirst({ where: { weekId, dayOfWeek } });
    if (existing) return res.status(400).json({ error: 'This day already exists in the week' });

    const day = await prisma.day.create({
      data: { weekId, dayOfWeek, focus: focus || '' },
      include: { exercises: { include: { sets: true } }, cardioSession: true },
    });
    res.json(day);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/days/:id — remove a day and all related data
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const dayId = Number(req.params.id);
    const day = await prisma.day.findFirst({
      where: { id: dayId },
      include: { week: true, exercises: true },
    });
    if (!day || day.week.userId !== req.userId) return res.status(404).json({ error: 'Day not found' });

    const exerciseIds = day.exercises.map(e => e.id);
    await prisma.set.deleteMany({ where: { exerciseId: { in: exerciseIds } } });
    await prisma.exercise.deleteMany({ where: { dayId } });
    await prisma.cardioSession.deleteMany({ where: { dayId } });
    await prisma.day.delete({ where: { id: dayId } });

    res.json({ deleted: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/days/:id/activity-type — update activity type
router.put('/:id/activity-type', async (req: AuthRequest, res: Response) => {
  const { activityType } = req.body;
  if (!['WORKOUT', 'RUN', 'CYCLING'].includes(activityType)) {
    return res.status(400).json({ error: 'Invalid activity type' });
  }
  const day = await prisma.day.findFirst({
    where: { id: Number(req.params.id) },
    include: { week: true },
  });
  if (!day || day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Day not found' });
  }
  const updated = await prisma.day.update({
    where: { id: day.id },
    data: { activityType },
  });
  res.json(updated);
});

// POST /api/days/:id/cardio — create or update cardio session
router.post('/:id/cardio', async (req: AuthRequest, res: Response) => {
  const dayId = Number(req.params.id);
  const day = await prisma.day.findFirst({
    where: { id: dayId },
    include: { week: true },
  });
  if (!day || day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Day not found' });
  }

  const { distanceKm, durationMinutes, avgHeartRate, elevationM, avgPaceMinKm, avgSpeedKmh, calories, notes } = req.body;

  const session = await prisma.cardioSession.upsert({
    where: { dayId },
    update: {
      type: day.activityType,
      distanceKm: distanceKm ?? null,
      durationMinutes: durationMinutes ?? null,
      avgHeartRate: avgHeartRate ?? null,
      elevationM: elevationM ?? null,
      avgPaceMinKm: avgPaceMinKm ?? null,
      avgSpeedKmh: avgSpeedKmh ?? null,
      calories: calories ?? null,
      notes: notes ?? null,
    },
    create: {
      dayId,
      type: day.activityType,
      distanceKm: distanceKm ?? null,
      durationMinutes: durationMinutes ?? null,
      avgHeartRate: avgHeartRate ?? null,
      elevationM: elevationM ?? null,
      avgPaceMinKm: avgPaceMinKm ?? null,
      avgSpeedKmh: avgSpeedKmh ?? null,
      calories: calories ?? null,
      notes: notes ?? null,
    },
  });

  res.json(session);
});

// GET /api/days/:id/cardio — get cardio session
router.get('/:id/cardio', async (req: AuthRequest, res: Response) => {
  const dayId = Number(req.params.id);
  const day = await prisma.day.findFirst({
    where: { id: dayId },
    include: { week: true },
  });
  if (!day || day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Day not found' });
  }
  const session = await prisma.cardioSession.findUnique({ where: { dayId } });
  res.json(session || null);
});

export default router;
