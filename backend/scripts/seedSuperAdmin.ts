import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== '1') {
    console.log('Refusing to seed credentials in production. Set ALLOW_PRODUCTION_SEED=1 to override.');
    return;
  }
  const email = 'admin@vajrafitness.com';
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Super Admin already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      username: 'System Administrator',
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      phone: '0000000000'
    }
  });

  console.log('Super Admin seeded successfully: admin@vajrafitness.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
