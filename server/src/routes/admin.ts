import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Admin-only middleware
async function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.username !== 'kuhli1712') return res.status(403).json({ error: 'Forbidden' });
  next();
}
router.use(adminOnly);

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

    const [totalUsers, newUsers7, newUsers30, totalWeeks, totalSets, completedSets, totalMeals, totalPosts, totalLikes] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      prisma.week.count(),
      prisma.set.count(),
      prisma.set.count({ where: { completed: true } }),
      prisma.meal.count(),
      prisma.post.count(),
      prisma.like.count(),
    ]);

    // Active users: users with at least 1 completed set in time period
    const activeUsers7 = await prisma.user.count({
      where: { weeks: { some: { createdAt: { gte: d7 }, days: { some: { exercises: { some: { sets: { some: { completed: true } } } } } } } } },
    });
    const activeUsers30 = await prisma.user.count({
      where: { weeks: { some: { createdAt: { gte: d30 }, days: { some: { exercises: { some: { sets: { some: { completed: true } } } } } } } } },
    });

    res.json({
      totalUsers, newUsersLast7Days: newUsers7, newUsersLast30Days: newUsers30,
      totalWeeks, totalSets, completedSets, totalMeals, totalPosts, totalLikes,
      activeUsersLast7Days: activeUsers7, activeUsersLast30Days: activeUsers30,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: { include: { days: { include: { exercises: { include: { sets: true } } } } } },
        meals: true,
        posts: true,
      },
    });

    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);

    const result = users.map((u) => {
      const allSets = u.weeks.flatMap(w => w.days.flatMap(d => d.exercises.flatMap(e => e.sets)));
      const completedSets = allSets.filter(s => s.completed).length;
      const lastWeek = u.weeks.length > 0 ? u.weeks.reduce((latest, w) => w.createdAt > latest.createdAt ? w : latest) : null;
      const lastActiveDate = lastWeek?.createdAt || u.createdAt;
      const isRecent = lastActiveDate >= d7;
      const isMonthActive = lastActiveDate >= d30;

      return {
        id: u.id, username: u.username, email: u.email,
        createdAt: u.createdAt.toISOString().split('T')[0],
        totalWeeks: u.weeks.length,
        totalSets: allSets.length,
        completedSets,
        totalMeals: u.meals.length,
        totalPosts: u.posts.length,
        lastActiveAt: lastActiveDate.toISOString().split('T')[0],
        status: isRecent ? 'active' : isMonthActive ? 'recent' : 'inactive',
      };
    });

    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/growth — daily signups last 30 days
router.get('/growth', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({ select: { createdAt: true } });
    const counts: Record<string, number> = {};
    for (const u of users) { const d = u.createdAt.toISOString().split('T')[0]; counts[d] = (counts[d] || 0) + 1; }

    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const ds = d.toISOString().split('T')[0]; result.push({ date: ds, newUsers: counts[ds] || 0 }); }
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/activity — daily completed sets last 30 days
router.get('/activity', async (_req: AuthRequest, res: Response) => {
  try {
    const weeks = await prisma.week.findMany({
      include: { days: { include: { exercises: { include: { sets: { where: { completed: true } } } } } } },
    });

    const dayOffsets: Record<string, number> = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 };
    const dayCounts: Record<string, { sets: number; users: Set<number> }> = {};

    for (const w of weeks) {
      const ws = new Date(w.createdAt); const dow = ws.getDay(); const mo = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(ws); mon.setDate(mon.getDate() + mo);
      for (const d of w.days) {
        const cnt = d.exercises.reduce((s, e) => s + e.sets.length, 0);
        if (cnt > 0) {
          const dd = new Date(mon); dd.setDate(dd.getDate() + (dayOffsets[d.dayOfWeek] ?? 0));
          const ds = dd.toISOString().split('T')[0];
          if (!dayCounts[ds]) dayCounts[ds] = { sets: 0, users: new Set() };
          dayCounts[ds].sets += cnt;
          dayCounts[ds].users.add(w.userId);
        }
      }
    }

    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); const ds = d.toISOString().split('T')[0];
      result.push({ date: ds, completedSets: dayCounts[ds]?.sets || 0, activeUsers: dayCounts[ds]?.users.size || 0 });
    }
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
