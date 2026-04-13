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
    console.log('Claude macro response:', responseText.slice(0, 200));
    const clean = responseText.replace(/```json\s*|```\s*/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch { return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' }); }
      } else {
        return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
      }
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Estimate macros error:', err?.message || err);
    res.status(500).json({ error: `AI estimation failed: ${err?.message || 'Unknown error'}` });
  }
});

// POST /api/meals/estimate-from-photo — vision-based macro estimation
router.post('/estimate-from-photo', async (req: AuthRequest, res: Response) => {
  try {
    const { imageBase64, mimeType, portionNotes } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

    const anthropic = new Anthropic({ apiKey });

    const mediaType = (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a professional sports nutritionist and food scientist with expert knowledge of food composition. When shown a photo of a meal or food, analyse what you can see and estimate the macronutrients as accurately as possible.

Be specific about what you identify in the image. Consider:
- The type of food and cooking method
- Estimated portion size based on visual cues (plate size, serving utensils, context)
- Visible ingredients and their approximate quantities
- Whether it appears to be a restaurant portion, home-cooked, or packaged food

Always err on the side of accuracy over caution — give a real estimate, not a refusal.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "mealName": "Grilled chicken with rice and broccoli",
  "servingSize": "1 plate (approximately 450g)",
  "calories": 580,
  "proteinG": 48,
  "carbsG": 52,
  "fatG": 12,
  "confidence": "medium",
  "identifiedFoods": ["grilled chicken breast (~180g)", "white rice (~150g)", "steamed broccoli (~120g)"],
  "notes": "Estimated based on standard plate size. Chicken appears to be skinless.",
  "adjustmentSuggestions": "If this is a restaurant portion it may be 20-30% larger than estimated"
}`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: `Please analyse this meal photo and estimate the macronutrients.${portionNotes ? ' Additional context: ' + portionNotes : ''}` },
        ],
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('Claude photo response:', responseText.slice(0, 200));
    const clean = responseText.replace(/```json\s*|```\s*/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(clean); }
    catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch { return res.status(500).json({ error: 'Could not parse food analysis. Try a clearer photo or use manual entry.' }); } }
      else return res.status(500).json({ error: 'Could not identify food in this photo. Try a clearer photo or use manual entry.' });
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Photo estimate error:', err?.message || err);
    res.status(500).json({ error: `Photo analysis failed: ${err?.message || 'Unknown error'}` });
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
  const { name, calories, proteinG, carbsG, fatG, date, photoBase64 } = req.body;
  const meal = await prisma.meal.create({
    data: {
      userId: req.userId!,
      name, calories, proteinG, carbsG, fatG,
      date: new Date(date),
      photoBase64: photoBase64 || null,
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
