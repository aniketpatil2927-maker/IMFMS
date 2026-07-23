import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'immculatefms2023@gmail.com';
const ADMIN_PASSWORD = 'Krishna@1978';
const ADMIN_NAME = 'Krishna Patil';

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Remove old default admin if it still exists
  await prisma.user.deleteMany({
    where: { email: 'admin@hkbams.local' },
  });

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      name: ADMIN_NAME,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: ADMIN_NAME,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  for (const type of ['QUOTATION', 'INVOICE', 'BILL'] as const) {
    await prisma.documentSequence.upsert({
      where: { documentType: type },
      update: {},
      create: {
        documentType: type,
        year: new Date().getFullYear(),
        lastNumber: 0,
      },
    });
  }

  console.log(`Seed completed: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (${ADMIN_NAME})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
