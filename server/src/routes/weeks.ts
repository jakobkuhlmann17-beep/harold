import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const weeks = await prisma.week.findMany({
    where: { userId: req.userId },
    orderBy: { weekNumber: 'asc' },
    include: {
      days: {
        include: {
          exercises: {
            include: { sets: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
  res.json(weeks);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const lastWeek = await prisma.week.findFirst({
    where: { userId: req.userId },
    orderBy: { weekNumber: 'desc' },
  });
  const weekNumber = lastWeek ? lastWeek.weekNumber + 1 : 1;

  const week = await prisma.week.create({
    data: {
      userId: req.userId!,
      weekNumber,
      days: {
        create: [
          { dayOfWeek: 'MONDAY', focus: '' },
          { dayOfWeek: 'TUESDAY', focus: '' },
          { dayOfWeek: 'WEDNESDAY', focus: '' },
          { dayOfWeek: 'THURSDAY', focus: '' },
          { dayOfWeek: 'FRIDAY', focus: '' },
          { dayOfWeek: 'SATURDAY', focus: '' },
        ],
      },
    },
    include: {
      days: {
        include: { exercises: { include: { sets: true } } },
      },
    },
  });
  res.json(week);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const week = await prisma.week.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
    include: {
      days: {
        include: {
          exercises: {
            include: { sets: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
  if (!week) return res.status(404).json({ error: 'Week not found' });
  res.json(week);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const week = await prisma.week.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (!week) return res.status(404).json({ error: 'Week not found' });

  // Delete cascade: sets -> exercises -> days -> week
  const days = await prisma.day.findMany({ where: { weekId: week.id } });
  const dayIds = days.map((d) => d.id);
  const exercises = await prisma.exercise.findMany({ where: { dayId: { in: dayIds } } });
  const exerciseIds = exercises.map((e) => e.id);

  await prisma.set.deleteMany({ where: { exerciseId: { in: exerciseIds } } });
  await prisma.exercise.deleteMany({ where: { dayId: { in: dayIds } } });
  await prisma.day.deleteMany({ where: { weekId: week.id } });
  await prisma.week.delete({ where: { id: week.id } });

  res.json({ success: true });
});

router.post('/:id/generate-next', async (req: AuthRequest, res: Response) => {
  try {
    const currentWeek = await prisma.week.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: {
        days: {
          include: {
            exercises: {
              include: { sets: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!currentWeek) return res.status(404).json({ error: 'Week not found' });

    // Format week data for Claude with feedback
    const weekText = currentWeek.days
      .map((d) => {
        const exText = d.exercises
          .map((ex) => {
            const setsText = ex.sets
              .map((s) => {
                const parts = [];
                if (s.reps !== null) parts.push(`${s.reps} reps`);
                if (s.weightKg !== null) parts.push(`@ ${s.weightKg}kg`);
                if (s.notes) parts.push(`notes: "${s.notes}"`);
                if (s.feedback) parts.push(`[feedback: ${s.feedback}]`);
                return '- ' + (parts.join(' ') || 'empty set');
              })
              .join('\n    ');
            return `  ${ex.name}:\n    ${setsText}`;
          })
          .join('\n');
        return `${d.dayOfWeek} (${d.focus}):\n${exText}`;
      })
      .join('\n\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are a fitness expert specializing in progressive overload. When given a week of workout data, generate the next week applying these rules as a baseline: +1-2 reps on bodyweight/rep-only sets (dips, pull-ups, sit-ups), +2.5kg on compound lifts (barbells, squats, deadlifts, bent over rows, pull-downs), +1-2kg on isolation exercises (curls, cable exercises, shoulder raises).

IMPORTANT: You must also read and act on any set feedback provided in brackets. Use the following logic:
- "too hard", "too heavy", "struggled", "failed", "pain" → keep weight the same or reduce by 2.5kg, do not increase reps
- "felt easy", "too light", "could go heavier", "comfortable" → apply a larger increase than baseline: +5kg on compounds, +2.5kg on isolation
- "good", "solid", "fine" → apply standard baseline progression
- Any mention of pain or injury in a specific body part → add a note in the set's notes field flagging it, and reduce weight for that exercise

If feedback is mixed across sets in the same exercise (e.g. first set felt easy, last set was too hard), use the last set's feedback as the primary signal since fatigue is most relevant there.

Keep the exact same exercises, days, and structure. Respond ONLY with valid JSON, no markdown, no explanation.

Return JSON in this exact shape:
{
  "days": [
    {
      "dayOfWeek": "MONDAY",
      "focus": "chest",
      "exercises": [
        {
          "name": "Barbells",
          "order": 0,
          "sets": [
            { "reps": 8, "weightKg": 28, "notes": null, "feedback": null }
          ]
        }
      ]
    }
  ]
}`,
      messages: [
        {
          role: 'user',
          content: `Here is Week ${currentWeek.weekNumber} data. Generate Week ${currentWeek.weekNumber + 1} with progressive overload:\n\n${weekText}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try extracting JSON from possible markdown wrapper
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return res.status(500).json({ error: 'Failed to parse Claude response' });
      }
    }

    // Create new week in DB
    const newWeek = await prisma.week.create({
      data: {
        userId: req.userId!,
        weekNumber: currentWeek.weekNumber + 1,
      },
    });

    for (const dayData of parsed.days) {
      const day = await prisma.day.create({
        data: {
          weekId: newWeek.id,
          dayOfWeek: dayData.dayOfWeek,
          focus: dayData.focus,
        },
      });

      for (const exData of dayData.exercises) {
        const exercise = await prisma.exercise.create({
          data: {
            dayId: day.id,
            name: exData.name,
            order: exData.order,
          },
        });

        for (const setData of exData.sets) {
          await prisma.set.create({
            data: {
              exerciseId: exercise.id,
              reps: setData.reps ?? null,
              weightKg: setData.weightKg ?? null,
              notes: setData.notes ?? null,
              feedback: setData.feedback ?? null,
              completed: false,
            },
          });
        }
      }
    }

    // Return the full new week
    const fullNewWeek = await prisma.week.findUnique({
      where: { id: newWeek.id },
      include: {
        days: {
          include: {
            exercises: {
              include: { sets: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    res.json(fullNewWeek);
  } catch (err: any) {
    console.error('Generate next week error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
