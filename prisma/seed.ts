import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database...');

  // Password hashes
  const adminHash = await bcrypt.hash('admin123', 10);
  const wgUserHash = await bcrypt.hash('pass123', 10);
  const jwUserHash = await bcrypt.hash('pass123', 10);

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash, role: 'ADMIN' },
    create: {
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      domainAccess: {
        create: [
          { domain: 'WHITE_GOLD' },
          { domain: 'AL_JAWHARA' },
        ],
      },
    },
  });

  // 2. WhiteGold Employee User
  const wgUser = await prisma.user.upsert({
    where: { username: 'wg_user' },
    update: { passwordHash: wgUserHash, role: 'EMPLOYEE' },
    create: {
      username: 'wg_user',
      passwordHash: wgUserHash,
      role: 'EMPLOYEE',
      domainAccess: {
        create: [{ domain: 'WHITE_GOLD' }],
      },
    },
  });

  // 3. Jawhara Employee User
  const jwUser = await prisma.user.upsert({
    where: { username: 'jw_user' },
    update: { passwordHash: jwUserHash, role: 'EMPLOYEE' },
    create: {
      username: 'jw_user',
      passwordHash: jwUserHash,
      role: 'EMPLOYEE',
      domainAccess: {
        create: [{ domain: 'AL_JAWHARA' }],
      },
    },
  });

  // Clean old seasons & vaults to avoid unique constraint conflicts on re-seed
  await prisma.vault.deleteMany({});
  await prisma.season.deleteMany({});

  // 4. Create Seasons
  const seasonWg = await prisma.season.create({
    data: {
      name: 'موسم 2026 الحالي',
      domain: 'WHITE_GOLD',
      startDate: new Date('2026-01-01'),
      isActive: true,
    },
  });

  const seasonJw = await prisma.season.create({
    data: {
      name: 'موسم 2026 الحالي',
      domain: 'AL_JAWHARA',
      startDate: new Date('2026-01-01'),
      isActive: true,
    },
  });

  // 5. Create Initial Vaults
  await prisma.vault.create({
    data: {
      seasonId: seasonWg.id,
      domain: 'WHITE_GOLD',
      initialCapital: 50000000,
    },
  });

  await prisma.vault.create({
    data: {
      seasonId: seasonJw.id,
      domain: 'AL_JAWHARA',
      initialCapital: 35000000,
    },
  });

  console.log('Seeding completed successfully!');
  console.log(`Users created: ${admin.username}, ${wgUser.username}, ${jwUser.username}`);
  console.log(`Seasons created ID ${seasonWg.id} (WG), ID ${seasonJw.id} (JW)`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
