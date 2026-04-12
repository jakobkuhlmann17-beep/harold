import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const dateStr = req.query.date as string;
  if (!dateStr) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });

  const start = new Date(dateStr + 'T00:00:00');
  const end = new Date(dateStr + 'T23:59:59.999');

  const meals = await prisma.meal.findMany({
    where: {
      userId: req.userId,
      date: { gte: start, lte: end },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(meals);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, calories, proteinG, carbsG, fatG, date } = req.body;
  const meal = await prisma.meal.create({
    data: {
      userId: req.userId!,
      name,
      calories,
      proteinG,
      carbsG,
      fatG,
      date: new Date(date),
    },
  });
  res.json(meal);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const meal = await prisma.meal.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (!meal) return res.status(404).json({ error: 'Meal not found' });

  const { name, calories, proteinG, carbsG, fatG } = req.body;
  const updated = await prisma.meal.update({
    where: { id: meal.id },
    data: {
      ...(name !== undefined && { name }),
      ...(calories !== undefined && { calories }),
      ...(proteinG !== undefined && { proteinG }),
      ...(carbsG !== undefined && { carbsG }),
      ...(fatG !== undefined && { fatG }),
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const meal = await prisma.meal.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (!meal) return res.status(404).json({ error: 'Meal not found' });
  await prisma.meal.delete({ where: { id: meal.id } });
  res.json({ success: true });
});

export default router;
