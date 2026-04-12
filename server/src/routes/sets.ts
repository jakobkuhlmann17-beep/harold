import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  const { exerciseId, reps, weightKg, notes, feedback } = req.body;
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId },
    include: { day: { include: { week: true } } },
  });
  if (!exercise || exercise.day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Exercise not found' });
  }
  const set = await prisma.set.create({
    data: { exerciseId, reps: reps ?? null, weightKg: weightKg ?? null, notes: notes ?? null, feedback: feedback ?? null },
  });
  res.json(set);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { reps, weightKg, completed, notes, feedback } = req.body;
  const set = await prisma.set.findFirst({
    where: { id: Number(req.params.id) },
    include: { exercise: { include: { day: { include: { week: true } } } } },
  });
  if (!set || set.exercise.day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Set not found' });
  }
  const updated = await prisma.set.update({
    where: { id: set.id },
    data: {
      ...(reps !== undefined && { reps }),
      ...(weightKg !== undefined && { weightKg }),
      ...(completed !== undefined && { completed }),
      ...(notes !== undefined && { notes }),
      ...(feedback !== undefined && { feedback }),
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const set = await prisma.set.findFirst({
    where: { id: Number(req.params.id) },
    include: { exercise: { include: { day: { include: { week: true } } } } },
  });
  if (!set || set.exercise.day.week.userId !== req.userId) {
    return res.status(404).json({ error: 'Set not found' });
  }
  await prisma.set.delete({ where: { id: set.id } });
  res.json({ success: true });
});

export default router;
