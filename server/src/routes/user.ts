import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

router.put('/targets', async (req: AuthRequest, res: Response) => {
  const { calorieTarget, proteinTarget, carbsTarget, fatTarget } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(calorieTarget !== undefined && { calorieTarget }),
      ...(proteinTarget !== undefined && { proteinTarget }),
      ...(carbsTarget !== undefined && { carbsTarget }),
      ...(fatTarget !== undefined && { fatTarget }),
    },
    select: { id: true, username: true, email: true, calorieTarget: true, proteinTarget: true, carbsTarget: true, fatTarget: true },
  });
  res.json(user);
});

export default router;
