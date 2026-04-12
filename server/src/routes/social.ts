import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// GET /api/social/search?q=username
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        id: { not: req.userId },
      },
      select: {
        id: true,
        username: true,
        _count: { select: { followers: true, following: true } },
      },
      take: 10,
    });

    const myFollowing = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true },
    });
    const followingSet = new Set(myFollowing.map((f) => f.followingId));

    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      followerCount: u._count.followers,
      followingCount: u._count.following,
      isFollowedByMe: followingSet.has(u.id),
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/social/follow/:userId
router.post('/follow/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const followingId = Number(req.params.userId);
    if (followingId === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });

    await prisma.follow.create({ data: { followerId: req.userId!, followingId } });
    res.json({ following: true });
  } catch (err: any) {
    if (err.code === 'P2002') return res.json({ following: true }); // already following
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/social/follow/:userId
router.delete('/follow/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const followingId = Number(req.params.userId);
    await prisma.follow.deleteMany({ where: { followerId: req.userId, followingId } });
    res.json({ following: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/followers
router.get('/followers', async (req: AuthRequest, res: Response) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: req.userId },
      include: { follower: { select: { id: true, username: true } } },
    });
    res.json(follows.map((f) => f.follower));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/following
router.get('/following', async (req: AuthRequest, res: Response) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.userId },
      include: { following: { select: { id: true, username: true } } },
    });
    res.json(follows.map((f) => f.following));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/profile/:username
router.get('/profile/:username', async (req: AuthRequest, res: Response) => {
  try {
    const username = req.params.username as string;
    const u = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: { select: { followers: true, following: true } },
        posts: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, content: true, category: true, createdAt: true } },
      },
    });
    if (!u) return res.status(404).json({ error: 'User not found' });

    const isFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.userId!, followingId: u.id } },
    });

    res.json({
      id: u.id,
      username: u.username,
      followerCount: u._count.followers,
      followingCount: u._count.following,
      isFollowedByMe: !!isFollowing,
      recentPosts: u.posts.map((p: any) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
