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
