import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const phoneNumber = process.env.ADMIN_PHONE_NUMBER;
  const fullName = process.env.ADMIN_FULL_NAME ?? 'Admin';

  if (!email || !password || !phoneNumber) {
    throw new Error(
      'ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_PHONE_NUMBER must be set in the environment to seed the default admin.',
    );
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`User ${email} already exists, skipping admin seed.`);
    return;
  }

  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.create({
    data: {
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
    },
    select: { id: true, fullName: true, email: true, role: true },
  });

  console.log('Default admin created:', admin);
}

main()
  .catch((error) => {
    console.error('Failed to seed default admin:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
