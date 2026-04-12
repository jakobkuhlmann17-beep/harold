import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// GET /api/community/posts — feed with optional ?filter=following
router.get('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const filter = req.query.filter as string | undefined;
    let userFilter: any = undefined;

    if (filter === 'following') {
      const follows = await prisma.follow.findMany({ where: { followerId: req.userId }, select: { followingId: true } });
      const followingIds = follows.map((f) => f.followingId);
      followingIds.push(req.userId!); // include own posts
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
      hasWorkout: !!p.workoutPostId,
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

    res.json({ ...post, createdAt: post.createdAt.toISOString(), likeCount: 0, commentCount: 0, likedByMe: false, hasWorkout: false, workoutPostId: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/share-workout — share a week as a post
router.post('/posts/share-workout', async (req: AuthRequest, res: Response) => {
  try {
    const { weekId, content, category } = req.body;
    if (!weekId) return res.status(400).json({ error: 'weekId is required' });

    const week = await prisma.week.findFirst({ where: { id: weekId, userId: req.userId } });
    if (!week) return res.status(404).json({ error: 'Week not found' });

    const post = await prisma.post.create({
      data: {
        userId: req.userId!,
        content: (content || `Just completed Week ${week.weekNumber}!`).trim(),
        category: category || 'Strength Focus',
        workoutPostId: weekId,
      },
      include: { user: { select: { id: true, username: true } } },
    });

    res.json({ ...post, createdAt: post.createdAt.toISOString(), likeCount: 0, commentCount: 0, likedByMe: false, hasWorkout: true, workoutPostId: weekId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/posts/:id/workout — get workout data for a shared post
router.get('/posts/:id/workout', async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: Number(req.params.id) } });
    if (!post || !post.workoutPostId) return res.status(404).json({ error: 'No workout linked' });

    const week = await prisma.week.findUnique({
      where: { id: post.workoutPostId },
      include: {
        user: { select: { id: true, username: true } },
        days: {
          include: {
            exercises: { include: { sets: true }, orderBy: { order: 'asc' } },
            cardioSession: true,
          },
        },
      },
    });

    res.json(week);
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
    else { await prisma.like.create({ data: { postId, userId: req.userId! } }); }
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

    const comment = await prisma.comment.create({
      data: { postId: Number(req.params.id), userId: req.userId!, content: content.trim() },
      include: { user: { select: { id: true, username: true } } },
    });
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
