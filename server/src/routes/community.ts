import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// GET /api/community/posts — feed of last 20 posts
router.get('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
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
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await prisma.post.create({
      data: {
        userId: req.userId!,
        content: content.trim(),
        category: category || null,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    res.json({
      ...post,
      createdAt: post.createdAt.toISOString(),
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
    });
  } catch (err: any) {
    console.error('Create post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/community/posts/:id — delete own post
router.delete('/posts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const post = await prisma.post.findFirst({ where: { id: postId, userId: req.userId } });
    if (!post) return res.status(404).json({ error: 'Post not found or not yours' });

    // Cascade delete likes and comments
    await prisma.like.deleteMany({ where: { postId } });
    await prisma.comment.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/:id/like — toggle like
router.post('/posts/:id/like', async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId: req.userId! } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({ data: { postId, userId: req.userId! } });
    }

    const count = await prisma.like.count({ where: { postId } });
    res.json({ liked: !existing, count });
  } catch (err: any) {
    console.error('Like toggle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/posts/:id/comments — get comments
router.get('/posts/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, username: true } } },
    });

    res.json(comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err: any) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/:id/comments — add comment
router.post('/posts/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId: req.userId!,
        content: content.trim(),
      },
      include: { user: { select: { id: true, username: true } } },
    });

    res.json({ ...comment, createdAt: comment.createdAt.toISOString() });
  } catch (err: any) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/leaderboard — top 10 users by completed sets in last 30 days
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all users with their completed sets from weeks created in last 30 days
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        weeks: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          include: {
            days: {
              include: {
                exercises: {
                  include: {
                    sets: { where: { completed: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const ranked = users
      .map((u) => {
        const totalSets = u.weeks.reduce(
          (wSum, w) => wSum + w.days.reduce(
            (dSum, d) => dSum + d.exercises.reduce(
              (eSum, e) => eSum + e.sets.length,
              0
            ),
            0
          ),
          0
        );
        return { userId: u.id, username: u.username, totalSets };
      })
      .filter((u) => u.totalSets > 0)
      .sort((a, b) => b.totalSets - a.totalSets)
      .slice(0, 10)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username,
        totalSets: u.totalSets,
        isCurrentUser: u.userId === req.userId,
      }));

    res.json(ranked);
  } catch (err: any) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
