import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SeedSet {
  reps: number | null;
  weightKg: number | null;
  notes: string | null;
}

interface SeedExercise {
  name: string;
  order: number;
  sets: SeedSet[];
}

interface SeedDay {
  dayOfWeek: DayOfWeek;
  focus: string;
  exercises: SeedExercise[];
}

function s(reps: number | null, weightKg: number | null, notes: string | null = null): SeedSet {
  return { reps, weightKg, notes };
}

const week2Days: SeedDay[] = [
  {
    dayOfWeek: 'MONDAY', focus: 'chest',
    exercises: [
      { name: 'Barbells', order: 0, sets: [s(8, 26), s(6, 26), s(6, 26), s(4, 28)] },
      { name: 'Cable chest', order: 1, sets: [s(10, 17), s(10, 17), s(6, 17)] },
      { name: 'Over the neck', order: 2, sets: [s(8, 32), s(6, 32), s(null, null, 'to failure')] },
      { name: 'Dips', order: 3, sets: [s(17, null), s(15, null), s(12, null)] },
    ],
  },
  {
    dayOfWeek: 'TUESDAY', focus: 'arms/abs',
    exercises: [
      { name: 'Bicep curls', order: 0, sets: [s(8, 16), s(6, 16), s(5, 16)] },
      { name: 'Standing curls', order: 1, sets: [s(15, 12), s(15, 12), s(15, 10)] },
      { name: 'Skull crushers', order: 2, sets: [s(15, 12), s(15, 12), s(15, 12)] },
      { name: 'Rows', order: 3, sets: [s(12, 23.8), s(12, 23.8), s(8, 26)] },
      { name: 'Crunches', order: 4, sets: [s(15, null), s(15, null), s(15, null)] },
    ],
  },
  {
    dayOfWeek: 'WEDNESDAY', focus: 'back',
    exercises: [
      { name: 'Pull-ups', order: 0, sets: [s(12, null), s(10, null), s(8, null), s(6, null)] },
      { name: 'Pull-downs', order: 1, sets: [s(12, 59), s(10, 66), s(8, 66), s(8, 66)] },
      { name: 'Low pulley row', order: 2, sets: [s(12, 45), s(12, 45), s(8, 52)] },
      { name: 'Deadlifts', order: 3, sets: [s(12, 20), s(6, 30), s(6, 40), s(6, 40)] },
      { name: 'Bent over rows', order: 4, sets: [s(15, 20), s(8, 30), s(8, 40), s(6, 40)] },
    ],
  },
  {
    dayOfWeek: 'THURSDAY', focus: 'shoulders/legs',
    exercises: [
      { name: 'Shoulder press', order: 0, sets: [s(9, 20), s(7, 20), s(6, 20)] },
      { name: 'Squats', order: 1, sets: [s(10, 40), s(8, 40), s(8, 40), s(8, 40)] },
      { name: 'Shoulders wide', order: 2, sets: [s(12, 8), s(12, 9), s(12, 10)] },
      { name: 'Front raise', order: 3, sets: [s(16, 16), s(14, 16), s(12, 16)] },
    ],
  },
  {
    dayOfWeek: 'FRIDAY', focus: 'chest',
    exercises: [
      { name: 'Barbells', order: 0, sets: [s(8, 26), s(7, 26), s(6, 26), s(4, 28)] },
      { name: 'Cable chest', order: 1, sets: [s(8, 17), s(8, 15.5), s(7, 17)] },
      { name: 'Over the neck', order: 2, sets: [s(8, 32), s(6, 32), s(null, null, 'to failure')] },
      { name: 'Dips', order: 3, sets: [s(17, null), s(15, null), s(12, null)] },
    ],
  },
  {
    dayOfWeek: 'SATURDAY', focus: 'abs/remainders',
    exercises: [
      { name: 'Deadlifts', order: 0, sets: [s(8, 30), s(8, 40), s(6, 40)] },
      { name: 'Sit ups', order: 1, sets: [s(null, null, '4 sets to failure')] },
      { name: 'Hanging leg raises', order: 2, sets: [s(8, null), s(8, null), s(6, null)] },
      { name: 'Cable twists', order: 3, sets: [s(12, 13.5), s(10, 14.5), s(8, 15.5)] },
      { name: 'Cable crunches', order: 4, sets: [] },
    ],
  },
];

const week3Days: SeedDay[] = [
  {
    dayOfWeek: 'MONDAY', focus: 'chest',
    exercises: [
      { name: 'Barbells', order: 0, sets: [s(8, 28), s(7, 28), s(6, 28), s(5, 28)] },
      { name: 'Cable chest', order: 1, sets: [s(10, 18.5), s(10, 18.5), s(7, 18.5)] },
      { name: 'Over the neck', order: 2, sets: [s(8, 34), s(6, 34), s(null, null, 'to failure')] },
      { name: 'Dips', order: 3, sets: [s(18, null), s(16, null), s(13, null)] },
    ],
  },
  {
    dayOfWeek: 'TUESDAY', focus: 'arms/abs',
    exercises: [
      { name: 'Bicep curls', order: 0, sets: [s(9, 16), s(7, 16), s(6, 16)] },
      { name: 'Standing curls', order: 1, sets: [s(15, 13), s(15, 13), s(15, 11)] },
      { name: 'Skull crushers', order: 2, sets: [s(15, 13), s(15, 13), s(15, 13)] },
      { name: 'Rows', order: 3, sets: [s(12, 26), s(12, 26), s(8, 28)] },
      { name: 'Crunches', order: 4, sets: [s(15, null), s(15, null), s(15, null)] },
    ],
  },
  {
    dayOfWeek: 'WEDNESDAY', focus: 'back',
    exercises: [
      { name: 'Pull-ups', order: 0, sets: [s(13, null), s(11, null), s(9, null), s(7, null)] },
      { name: 'Pull-downs', order: 1, sets: [s(12, 61), s(10, 68), s(8, 68), s(8, 68)] },
      { name: 'Low pulley row', order: 2, sets: [s(12, 47), s(12, 47), s(8, 54)] },
      { name: 'Deadlifts', order: 3, sets: [s(12, 20), s(6, 32.5), s(6, 42.5), s(6, 42.5)] },
      { name: 'Bent over rows', order: 4, sets: [s(15, 20), s(8, 32.5), s(8, 42.5), s(6, 42.5)] },
    ],
  },
  {
    dayOfWeek: 'THURSDAY', focus: 'shoulders/legs',
    exercises: [
      { name: 'Shoulder press', order: 0, sets: [s(10, 20), s(8, 20), s(7, 20)] },
      { name: 'Squats', order: 1, sets: [s(10, 42.5), s(8, 42.5), s(8, 42.5), s(8, 42.5)] },
      { name: 'Shoulders wide', order: 2, sets: [s(12, 9), s(12, 10), s(12, 11)] },
      { name: 'Front raise', order: 3, sets: [s(16, 17), s(14, 17), s(12, 17)] },
    ],
  },
  {
    dayOfWeek: 'FRIDAY', focus: 'chest',
    exercises: [
      { name: 'Barbells', order: 0, sets: [s(8, 28), s(7, 28), s(6, 28), s(5, 28)] },
      { name: 'Cable chest', order: 1, sets: [s(9, 17), s(9, 17), s(8, 17)] },
      { name: 'Over the neck', order: 2, sets: [s(8, 34), s(6, 34), s(null, null, 'to failure')] },
      { name: 'Dips', order: 3, sets: [s(18, null), s(16, null), s(13, null)] },
    ],
  },
  {
    dayOfWeek: 'SATURDAY', focus: 'abs/remainders',
    exercises: [
      { name: 'Deadlifts', order: 0, sets: [s(8, 32.5), s(8, 42.5), s(6, 42.5)] },
      { name: 'Sit ups', order: 1, sets: [s(null, null, '4 sets to failure')] },
      { name: 'Hanging leg raises', order: 2, sets: [s(9, null), s(9, null), s(7, null)] },
      { name: 'Cable twists', order: 3, sets: [s(12, 14.5), s(10, 15.5), s(8, 16.5)] },
      { name: 'Cable crunches', order: 4, sets: [] },
    ],
  },
];

async function createWeek(userId: number, weekNumber: number, days: SeedDay[]) {
  const week = await prisma.week.create({
    data: { userId, weekNumber },
  });

  for (const dayData of days) {
    const day = await prisma.day.create({
      data: {
        weekId: week.id,
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
            reps: setData.reps,
            weightKg: setData.weightKg,
            notes: setData.notes,
            completed: true,
          },
        });
      }
    }
  }

  return week;
}

async function main() {
  // Clear existing data
  await prisma.set.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.day.deleteMany();
  await prisma.week.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const user = await prisma.user.create({
    data: {
      username: 'demo',
      email: 'demo@ironlog.com',
      passwordHash,
      calorieTarget: 2200,
      proteinTarget: 160,
      carbsTarget: 220,
      fatTarget: 70,
    },
  });

  await createWeek(user.id, 2, week2Days);
  await createWeek(user.id, 3, week3Days);

  // Seed some meals for today
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr + 'T12:00:00');

  await prisma.meal.createMany({
    data: [
      { userId: user.id, date: today, name: 'Oatmeal with banana', calories: 350, proteinG: 12, carbsG: 55, fatG: 8 },
      { userId: user.id, date: today, name: 'Chicken breast & rice', calories: 550, proteinG: 45, carbsG: 60, fatG: 10 },
      { userId: user.id, date: today, name: 'Protein shake', calories: 250, proteinG: 30, carbsG: 15, fatG: 5 },
    ],
  });

  console.log('Seed complete: demo user + weeks 2 & 3 + meals');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
