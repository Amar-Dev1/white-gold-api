import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🧹 Wiping database to 100% clean state (Only 1 Admin User)...');

  // Delete all data from all tables
  await prisma.stockMovement.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.jawharaExpense.deleteMany({});
  await prisma.jawharaSale.deleteMany({});
  await prisma.jawharaPurchase.deleteMany({});
  await prisma.ginningReport.deleteMany({});
  await prisma.wasteSale.deleteMany({});
  await prisma.cottonSale.deleteMany({});
  await prisma.packagingPurchase.deleteMany({});
  await prisma.cottonPurchase.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.vault.deleteMany({});
  await prisma.season.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.userDomainAccess.deleteMany({});
  await prisma.user.deleteMany({});

  // Password hash for the single initial admin
  const adminHash = await bcrypt.hash('admin123', 10);

  // 1. Single Admin User Account
  const admin = await prisma.user.create({
    data: {
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

  // 2. Default Active Seasons for both domains
  const seasonWg = await prisma.season.create({
    data: {
      name: `الموسم ${new Date().getFullYear()}`,
      domain: 'WHITE_GOLD',
      startDate: new Date('2026-01-01'),
      isActive: true,
    },
  });

  const seasonJw = await prisma.season.create({
    data: {
      name: `الموسم ${new Date().getFullYear()}`,
      domain: 'AL_JAWHARA',
      startDate: new Date('2026-01-01'),
      isActive: true,
    },
  });

  // 3. Vaults initialized to 0 capital
  await prisma.vault.create({
    data: {
      seasonId: seasonWg.id,
      domain: 'WHITE_GOLD',
      initialCapital: 0,
    },
  });

  await prisma.vault.create({
    data: {
      seasonId: seasonJw.id,
      domain: 'AL_JAWHARA',
      initialCapital: 0,
    },
  });

  console.log('✅ Clean database ready!');
  console.log(`Only 1 user in system: "${admin.username}" (Admin).`);
  console.log('Zero transactions, zero employees, zero stock, zero customers.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
