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

export default router;
