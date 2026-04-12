import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// POST /api/meals/estimate-macros — AI macro estimation
router.post('/estimate-macros', async (req: AuthRequest, res: Response) => {
  try {
    const { mealName, portionDescription } = req.body;
    if (!mealName || !mealName.trim()) return res.status(400).json({ error: 'mealName is required' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a professional sports nutritionist with deep knowledge of food composition. When given a meal or food name, estimate the macronutrients based on a standard serving size. Be accurate and evidence-based — use established food databases (USDA, NCCDB) as your reference. Always specify what serving size your estimate is for.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "servingSize": "1 medium bowl (350g)",
  "calories": 420,
  "proteinG": 35,
  "carbsG": 45,
  "fatG": 12,
  "confidence": "high",
  "notes": "Based on standard chicken fried rice recipe. Adjust if using more oil or larger portion."
}

Confidence levels:
- "high" = well-known food with established nutrition data (e.g. banana, chicken breast, white rice)
- "medium" = common dish with some variation (e.g. pasta bolognese, caesar salad)
- "low" = complex or highly variable dish (e.g. restaurant curry, homemade stew)`,
      messages: [{
        role: 'user',
        content: `Estimate macronutrients for: ${mealName.trim()}${portionDescription ? '. Portion: ' + portionDescription : ''}`,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return res.status(500).json({ error: 'Failed to parse Claude response' });
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Estimate macros error:', err);
    res.status(500).json({ error: err.message });
  }
});

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
