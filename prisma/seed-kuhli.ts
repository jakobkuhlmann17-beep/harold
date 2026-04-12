import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'kuhli1712' } });
  if (!user) {
    console.error('User kuhli1712 not found');
    process.exit(1);
  }
  console.log(`Found user: ${user.username} (id=${user.id})`);

  // Delete existing weeks (cascade manually)
  const existingWeeks = await prisma.week.findMany({ where: { userId: user.id } });
  if (existingWeeks.length > 0) {
    console.log(`Deleting ${existingWeeks.length} existing week(s)...`);
    const weekIds = existingWeeks.map((w) => w.id);
    const days = await prisma.day.findMany({ where: { weekId: { in: weekIds } } });
    const dayIds = days.map((d) => d.id);
    const exercises = await prisma.exercise.findMany({ where: { dayId: { in: dayIds } } });
    const exerciseIds = exercises.map((e) => e.id);

    await prisma.set.deleteMany({ where: { exerciseId: { in: exerciseIds } } });
    await prisma.exercise.deleteMany({ where: { dayId: { in: dayIds } } });
    await prisma.day.deleteMany({ where: { weekId: { in: weekIds } } });
    await prisma.week.deleteMany({ where: { id: { in: weekIds } } });
    console.log('Deleted all existing workout data.');
  }

  // Create Week 3
  const week = await prisma.week.create({
    data: { userId: user.id, weekNumber: 3 },
  });
  console.log(`Created Week ${week.weekNumber} (id=${week.id})`);

  const templateDays = [
    {
      dayOfWeek: 'MONDAY', focus: 'chest',
      exercises: [
        { name: 'Barbells', order: 0, sets: [
          { reps: 8, weightKg: 28 }, { reps: 7, weightKg: 28 }, { reps: 6, weightKg: 28 }, { reps: 5, weightKg: 28 },
        ]},
        { name: 'Cable chest', order: 1, sets: [
          { reps: 10, weightKg: 18.5 }, { reps: 10, weightKg: 18.5 }, { reps: 7, weightKg: 18.5 },
        ]},
        { name: 'Over the neck', order: 2, sets: [
          { reps: 8, weightKg: 34 }, { reps: 6, weightKg: 34, notes: 'to failure' },
        ]},
        { name: 'Dips', order: 3, sets: [
          { reps: 18 }, { reps: 16 }, { reps: 13 },
        ]},
      ],
    },
    {
      dayOfWeek: 'TUESDAY', focus: 'arms/abs',
      exercises: [
        { name: 'Bicep curls', order: 0, sets: [
          { reps: 9, weightKg: 16 }, { reps: 7, weightKg: 16 }, { reps: 6, weightKg: 16 },
        ]},
        { name: 'Standing curls', order: 1, sets: [
          { reps: 15, weightKg: 13 }, { reps: 15, weightKg: 13 }, { reps: 15, weightKg: 11 },
        ]},
        { name: 'Skull crushers', order: 2, sets: [
          { reps: 15, weightKg: 13 }, { reps: 15, weightKg: 13 }, { reps: 15, weightKg: 13 },
        ]},
        { name: 'Rows', order: 3, sets: [
          { reps: 12, weightKg: 26 }, { reps: 12, weightKg: 26 }, { reps: 8, weightKg: 28 },
        ]},
        { name: 'Crunches', order: 4, sets: [
          { reps: 15 }, { reps: 15 }, { reps: 15 },
        ]},
      ],
    },
    {
      dayOfWeek: 'WEDNESDAY', focus: 'back',
      exercises: [
        { name: 'Pull-ups', order: 0, sets: [
          { reps: 13 }, { reps: 11 }, { reps: 9 }, { reps: 7 },
        ]},
        { name: 'Pull-downs', order: 1, sets: [
          { reps: 12, weightKg: 61 }, { reps: 10, weightKg: 68 }, { reps: 8, weightKg: 68 }, { reps: 8, weightKg: 68 },
        ]},
        { name: 'Low pulley row', order: 2, sets: [
          { reps: 12, weightKg: 47 }, { reps: 12, weightKg: 47 }, { reps: 8, weightKg: 54 },
        ]},
        { name: 'Seated rows', order: 3, sets: [] },
        { name: 'Deadlifts', order: 4, sets: [
          { reps: 12, weightKg: 20 }, { reps: 6, weightKg: 32.5 }, { reps: 6, weightKg: 42.5 }, { reps: 6, weightKg: 42.5 },
        ]},
        { name: 'Bent over rows', order: 5, sets: [
          { reps: 15, weightKg: 20 }, { reps: 8, weightKg: 32.5 }, { reps: 8, weightKg: 42.5 }, { reps: 6, weightKg: 42.5 },
        ]},
        { name: 'Straight arm pull downs', order: 6, sets: [
          { notes: 'need to rehearse' },
        ]},
        { name: 'Low pulley row (2)', order: 7, sets: [
          { reps: 12, weightKg: 47 }, { reps: 10, weightKg: 47 }, { reps: 8, weightKg: 47 },
        ]},
      ],
    },
    {
      dayOfWeek: 'THURSDAY', focus: 'shoulders/legs',
      exercises: [
        { name: 'Shoulder press', order: 0, sets: [
          { reps: 10, weightKg: 20 }, { reps: 8, weightKg: 20 }, { reps: 7, weightKg: 20 },
        ]},
        { name: 'Squats', order: 1, sets: [
          { reps: 10, weightKg: 42.5 }, { reps: 8, weightKg: 42.5 }, { reps: 8, weightKg: 42.5 }, { reps: 8, weightKg: 42.5 },
        ]},
        { name: 'Shoulders wide', order: 2, sets: [
          { reps: 12, weightKg: 9 }, { reps: 12, weightKg: 10 }, { reps: 12, weightKg: 11 },
        ]},
        { name: 'Front raise', order: 3, sets: [
          { reps: 16, weightKg: 17 }, { reps: 14, weightKg: 17 }, { reps: 12, weightKg: 17 },
        ]},
      ],
    },
    {
      dayOfWeek: 'FRIDAY', focus: 'chest',
      exercises: [
        { name: 'Barbells', order: 0, sets: [
          { reps: 8, weightKg: 28 }, { reps: 7, weightKg: 28 }, { reps: 6, weightKg: 28 }, { reps: 5, weightKg: 28 },
        ]},
        { name: 'Cable chest', order: 1, sets: [
          { reps: 9, weightKg: 17 }, { reps: 9, weightKg: 17 }, { reps: 8, weightKg: 17 },
        ]},
        { name: 'Over the neck', order: 2, sets: [
          { reps: 8, weightKg: 34 }, { reps: 6, weightKg: 34, notes: 'to failure' },
        ]},
        { name: 'Dips', order: 3, sets: [
          { reps: 18 }, { reps: 16 }, { reps: 13 },
        ]},
      ],
    },
    {
      dayOfWeek: 'SATURDAY', focus: 'abs/remainders',
      exercises: [
        { name: 'Deadlifts', order: 0, sets: [
          { reps: 8, weightKg: 32.5 }, { reps: 8, weightKg: 42.5 }, { reps: 6, weightKg: 42.5 },
        ]},
        { name: 'Sit ups', order: 1, sets: [
          { notes: '4 sets to failure' },
        ]},
        { name: 'Hanging leg raises', order: 2, sets: [
          { reps: 9 }, { reps: 9 }, { reps: 7 },
        ]},
        { name: 'Cable twists', order: 3, sets: [
          { reps: 12, weightKg: 14.5 }, { reps: 10, weightKg: 15.5 }, { reps: 8, weightKg: 16.5, notes: 'sides 20kg x12' },
        ]},
        { name: 'Cable crunches', order: 4, sets: [] },
      ],
    },
  ];

  let totalExercises = 0;
  let totalSets = 0;

  for (const dayData of templateDays) {
    const day = await prisma.day.create({
      data: { weekId: week.id, dayOfWeek: dayData.dayOfWeek, focus: dayData.focus },
    });

    for (const exData of dayData.exercises) {
      const exercise = await prisma.exercise.create({
        data: { dayId: day.id, name: exData.name, order: exData.order },
      });
      totalExercises++;

      for (const setData of exData.sets) {
        await prisma.set.create({
          data: {
            exerciseId: exercise.id,
            reps: (setData as any).reps ?? null,
            weightKg: (setData as any).weightKg ?? null,
            notes: (setData as any).notes ?? null,
            feedback: null,
            completed: false,
          },
        });
        totalSets++;
      }
    }

    console.log(`  ${dayData.dayOfWeek} (${dayData.focus}) — done`);
  }

  console.log(`\nSeeded Week 3 for kuhli1712: 6 days, ${totalExercises} exercises, ${totalSets} sets.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
