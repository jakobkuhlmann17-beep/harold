import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import { createNotification, extractMentions } from './notifications';

const router = Router();

// GET /api/community/posts — feed with optional ?filter=following
router.get('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const filter = req.query.filter as string | undefined;
    let userFilter: any = undefined;

    if (filter === 'following') {
      const follows = await prisma.follow.findMany({ where: { followerId: req.userId }, select: { followingId: true } });
      const followingIds = follows.map((f) => f.followingId);
      if (followingIds.length === 0) {
        // User follows nobody — return empty array
        return res.json([]);
      }
      followingIds.push(req.userId!); // include own posts alongside followed users
      userFilter = { userId: { in: followingIds } };
    }

    const posts = await prisma.post.findMany({
      where: userFilter,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, username: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });

    const result = posts.map((p) => ({
      id: p.id,
      content: p.content,
      category: p.category,
      workoutPostId: p.workoutPostId,
      sharedDayOfWeek: p.sharedDayOfWeek,
      cardioSessionId: p.cardioSessionId,
      activityType: p.activityType,
      hasWorkout: !!p.workoutPostId,
      hasCardio: !!p.cardioSessionId,
      createdAt: p.createdAt.toISOString(),
      user: p.user,
      likeCount: p.likes.length,
      commentCount: p._count.comments,
      likedByMe: p.likes.some((l) => l.userId === req.userId),
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Community posts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts — create a post
router.post('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const { content, category } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });

    const post = await prisma.post.create({
      data: { userId: req.userId!, content: content.trim(), category: category || null },
      include: { user: { select: { id: true, username: true } } },
    });
    // Notify @mentions
    const mentions = extractMentions(content);
    for (const uname of mentions) {
      const mentioned = await prisma.user.findUnique({ where: { username: uname }, select: { id: true } });
      if (mentioned && mentioned.id !== req.userId) await createNotification(mentioned.id, req.userId!, 'mention', `${post.user.username} mentioned you in a post`, post.id);
    }

    res.json({ ...post, createdAt: post.createdAt.toISOString(), likeCount: 0, commentCount: 0, likedByMe: false, hasWorkout: false, workoutPostId: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/share-workout — share a workout, run or cycling session
router.post('/posts/share-workout', async (req: AuthRequest, res: Response) => {
  try {
    const { weekId, dayOfWeek, content, category, cardioSessionId, activityType } = req.body;
    if (!weekId) return res.status(400).json({ error: 'weekId is required' });

    const week = await prisma.week.findFirst({ where: { id: weekId, userId: req.userId } });
    if (!week) return res.status(404).json({ error: 'Week not found' });

    const post = await prisma.post.create({
      data: {
        userId: req.userId!,
        content: (content || `Just completed Week ${week.weekNumber}!`).trim(),
        category: category || 'Strength Focus',
        workoutPostId: weekId,
        sharedDayOfWeek: dayOfWeek || null,
        cardioSessionId: cardioSessionId || null,
        activityType: activityType || null,
      },
      include: { user: { select: { id: true, username: true } } },
    });

    res.json({ ...post, createdAt: post.createdAt.toISOString(), likeCount: 0, commentCount: 0, likedByMe: false, hasWorkout: !!post.workoutPostId, workoutPostId: weekId, sharedDayOfWeek: post.sharedDayOfWeek, cardioSessionId: post.cardioSessionId, activityType: post.activityType });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/posts/:id/workout — get workout data for a shared post
router.get('/posts/:id/workout', async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: Number(req.params.id) } });
    if (!post || !post.workoutPostId) return res.status(404).json({ error: 'No workout linked' });

    const dayFilter = post.sharedDayOfWeek ? { dayOfWeek: post.sharedDayOfWeek } : {};

    const week = await prisma.week.findUnique({
      where: { id: post.workoutPostId },
      include: {
        user: { select: { id: true, username: true } },
        days: {
          where: dayFilter,
          include: {
            exercises: { include: { sets: true }, orderBy: { order: 'asc' } },
            cardioSession: true,
          },
        },
      },
    });

    res.json({ ...week, sharedDayOfWeek: post.sharedDayOfWeek, activityType: post.activityType });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/posts/:id/cardio — get cardio session for a post
router.get('/posts/:id/cardio', async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: Number(req.params.id) } });
    if (!post || !post.cardioSessionId) return res.status(404).json({ error: 'No cardio session linked' });

    const session = await prisma.cardioSession.findUnique({
      where: { id: post.cardioSessionId },
      include: { day: { include: { week: { select: { weekNumber: true } } } } },
    });
    if (!session) return res.status(404).json({ error: 'Cardio session not found' });

    res.json({
      type: session.type, distanceKm: session.distanceKm, durationMinutes: session.durationMinutes,
      avgHeartRate: session.avgHeartRate, elevationM: session.elevationM,
      avgPaceMinKm: session.avgPaceMinKm, avgSpeedKmh: session.avgSpeedKmh,
      calories: session.calories, notes: session.notes,
      dayOfWeek: session.day.dayOfWeek, weekNumber: session.day.week.weekNumber,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/community/posts/:id
router.delete('/posts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const post = await prisma.post.findFirst({ where: { id: postId, userId: req.userId } });
    if (!post) return res.status(404).json({ error: 'Post not found or not yours' });

    await prisma.like.deleteMany({ where: { postId } });
    await prisma.comment.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/:id/like
router.post('/posts/:id/like', async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const existing = await prisma.like.findUnique({ where: { postId_userId: { postId, userId: req.userId! } } });
    if (existing) { await prisma.like.delete({ where: { id: existing.id } }); }
    else {
      await prisma.like.create({ data: { postId, userId: req.userId! } });
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
      const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
      if (post && me) await createNotification(post.userId, req.userId!, 'like', `${me.username} liked your post`, postId);
    }
    const count = await prisma.like.count({ where: { postId } });
    res.json({ liked: !existing, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/posts/:id/comments
router.get('/posts/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: Number(req.params.id) },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, username: true } } },
    });
    res.json(comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/:id/comments
router.post('/posts/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const postId = Number(req.params.id);
    const comment = await prisma.comment.create({
      data: { postId, userId: req.userId!, content: content.trim() },
      include: { user: { select: { id: true, username: true } } },
    });
    // Notify post author
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (post && comment.user) await createNotification(post.userId, req.userId!, 'comment', `${comment.user.username} commented on your post`, postId, comment.id);
    // Notify @mentions
    const mentions = extractMentions(content);
    for (const uname of mentions) {
      const mentioned = await prisma.user.findUnique({ where: { username: uname }, select: { id: true } });
      if (mentioned && mentioned.id !== req.userId) await createNotification(mentioned.id, req.userId!, 'mention', `${comment.user.username} mentioned you in a comment`, postId, comment.id);
    }
    res.json({ ...comment, createdAt: comment.createdAt.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await prisma.user.findMany({
      select: {
        id: true, username: true,
        weeks: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          include: { days: { include: { exercises: { include: { sets: { where: { completed: true } } } } } } },
        },
      },
    });

    const ranked = users
      .map((u) => ({
        userId: u.id, username: u.username,
        totalSets: u.weeks.reduce((ws, w) => ws + w.days.reduce((ds, d) => ds + d.exercises.reduce((es, e) => es + e.sets.length, 0), 0), 0),
      }))
      .filter((u) => u.totalSets > 0)
      .sort((a, b) => b.totalSets - a.totalSets)
      .slice(0, 10)
      .map((u, i) => ({ rank: i + 1, username: u.username, totalSets: u.totalSets, isCurrentUser: u.userId === req.userId }));

    res.json(ranked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
