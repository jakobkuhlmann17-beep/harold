import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'kuhli1712' } });
  if (!user) {
    console.error('User kuhli1712 not found');
    process.exit(1);
  }
  console.log(`Found user: ${user.username} (id=${user.id})`);

  const posts = [
    { content: "Just hit Week 3 of the program \u2014 deadlifts feeling strong \ud83d\udcaa", category: 'Strength Focus' },
    { content: "Post-workout meal prepped: chicken, rice, and roasted veg. Fueling the fire \ud83d\udd25", category: 'Fueling' },
    { content: "Early morning session done before sunrise. The best way to start the day \ud83c\udf05", category: 'Morning Grit' },
  ];

  for (const p of posts) {
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content: p.content,
        category: p.category,
      },
    });
    console.log(`Created post: "${p.content.slice(0, 40)}..." (id=${post.id})`);
  }

  console.log('\nSeeded 3 demo posts for kuhli1712.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
