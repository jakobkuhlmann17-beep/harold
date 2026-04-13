import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import { createNotification } from './notifications';

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
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (me) await createNotification(followingId, req.userId!, 'follow', `${me.username} started following you`);
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

// GET /api/social/full-profile/:username — full profile with privacy
router.get('/full-profile/:username', async (req: AuthRequest, res: Response) => {
  try {
    const username = req.params.username as string;
    const u = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: { select: { followers: true, following: true } },
        privacySettings: true,
        posts: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, content: true, category: true, createdAt: true } },
        weeks: { include: { days: { include: { exercises: { include: { sets: true } } } } } },
      },
    });
    if (!u) return res.status(404).json({ error: 'User not found' });

    const privacy = u.privacySettings || { profilePublic: true, showWorkouts: true, showNutrition: false, showStats: true, allowFollowers: true };
    const isMe = u.id === req.userId;
    const isFollowing = !isMe ? !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.userId!, followingId: u.id } } })) : false;

    // If private and not following and not self
    if (!privacy.profilePublic && !isFollowing && !isMe) {
      return res.json({ id: u.id, username: u.username, isPrivate: true, followerCount: u._count.followers, followingCount: u._count.following, isFollowedByMe: false, isMe: false });
    }

    // Compute stats
    let totalSetsCompleted = 0; let totalVolume = 0; const exCounts: Record<string, number> = {};
    for (const w of u.weeks) for (const d of w.days) for (const ex of d.exercises) for (const s of ex.sets) {
      if (s.completed) { totalSetsCompleted++; totalVolume += (s.reps ?? 0) * (s.weightKg ?? 0); exCounts[ex.name] = (exCounts[ex.name] || 0) + 1; }
    }
    const favouriteExercise = Object.entries(exCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const weekSummaries = u.weeks.slice(-3).map(w => ({
      weekNumber: w.weekNumber, totalSets: w.days.reduce((s, d) => s + d.exercises.reduce((s2, e) => s2 + e.sets.length, 0), 0),
      completedSets: w.days.reduce((s, d) => s + d.exercises.reduce((s2, e) => s2 + e.sets.filter(st => st.completed).length, 0), 0),
    }));

    const result: any = {
      id: u.id, username: u.username, joinedAt: u.createdAt.toISOString().split('T')[0],
      isFollowedByMe: isFollowing, isMe,
      followerCount: u._count.followers, followingCount: u._count.following,
      privacySettings: isMe ? privacy : undefined,
      recentPosts: u.posts.map(p => ({ ...p, createdAt: (p.createdAt as Date).toISOString() })),
    };
    if (privacy.showStats || isMe) {
      result.stats = { totalWeeks: u.weeks.length, totalSetsCompleted, totalVolumeKg: Math.round(totalVolume), favouriteExercise, avgCompletionRate: 0 };
      const totalAll = u.weeks.reduce((s, w) => s + w.days.reduce((s2, d) => s2 + d.exercises.reduce((s3, e) => s3 + e.sets.length, 0), 0), 0);
      result.stats.avgCompletionRate = totalAll > 0 ? Math.round((totalSetsCompleted / totalAll) * 100) : 0;
    }
    if (privacy.showWorkouts || isMe) result.recentWorkouts = weekSummaries;

    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/social/privacy — update privacy settings
router.put('/privacy', async (req: AuthRequest, res: Response) => {
  try {
    const { profilePublic, showWorkouts, showNutrition, showStats, allowFollowers } = req.body;
    const settings = await prisma.userPrivacySettings.upsert({
      where: { userId: req.userId! },
      update: { profilePublic, showWorkouts, showNutrition, showStats, allowFollowers },
      create: { userId: req.userId!, profilePublic, showWorkouts, showNutrition, showStats, allowFollowers },
    });
    res.json(settings);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
