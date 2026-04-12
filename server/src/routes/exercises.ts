import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// GET /api/exercises/history — unique exercise names with usage count
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const exercises = await prisma.exercise.findMany({
      where: { day: { week: { userId: req.userId } } },
      select: { name: true },
    });

    const counts: Record<string, number> = {};
    for (const ex of exercises) {
      counts[ex.name] = (counts[ex.name] || 0) + 1;
    }

    const result = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (err: any) {
    console.error('Exercise history error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { dayId, name, order } = req.body;
  // Verify ownership
  const day = await prisma.day.findFirst({
    where: { id: dayId },
    include: { week: true },
  });
  if (!day || day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Day not found' });
  }
  const exercise = await prisma.exercise.create({
    data: { dayId, name, order: order ?? 0 },
    include: { sets: true },
  });
  res.json(exercise);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, order } = req.body;
  const exercise = await prisma.exercise.findFirst({
    where: { id: Number(req.params.id) },
    include: { day: { include: { week: true } } },
  });
  if (!exercise || exercise.day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Exercise not found' });
  }
  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data: { ...(name !== undefined && { name }), ...(order !== undefined && { order }) },
    include: { sets: true },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const exercise = await prisma.exercise.findFirst({
    where: { id: Number(req.params.id) },
    include: { day: { include: { week: true } } },
  });
  if (!exercise || exercise.day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Exercise not found' });
  }
  await prisma.set.deleteMany({ where: { exerciseId: exercise.id } });
  await prisma.exercise.delete({ where: { id: exercise.id } });
  res.json({ success: true });
});

export default router;
