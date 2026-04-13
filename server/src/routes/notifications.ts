import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Helper: create a notification
export async function createNotification(userId: number, fromUserId: number | null, type: string, message: string, postId?: number, commentId?: number) {
  if (userId === fromUserId) return; // don't notify yourself
  await prisma.notification.create({
    data: { userId, fromUserId, type, message, postId: postId || null, commentId: commentId || null },
  });
}

// Helper: extract @mentions
export function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) || [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

// GET /api/notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { fromUser: { select: { id: true, username: true } } },
    });
    res.json(notifs.map(n => ({
      id: n.id, type: n.type, message: n.message, read: n.read,
      fromUsername: n.fromUser?.username || null, fromUserId: n.fromUserId,
      postId: n.postId, createdAt: n.createdAt.toISOString(),
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.userId, read: false } });
    res.json({ count });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { id: Number(req.params.id), userId: req.userId }, data: { read: true } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
