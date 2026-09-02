import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🧹 Wiping database to 100% clean state (Only 1 Admin User)...');

  // Delete child/dependent records first to prevent foreign key constraints
  await prisma.vaultAdjustment.deleteMany({});
  await prisma.customerTransaction.deleteMany({});
  await prisma.customerContract.deleteMany({});
  await prisma.customer.deleteMany({});
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
  await prisma.vault.deleteMany({});

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

  // 2. Vaults initialized to 0 capital
  await prisma.vault.create({
    data: {
      domain: 'WHITE_GOLD',
      initialCapital: 0,
    },
  });

  await prisma.vault.create({
    data: {
      domain: 'AL_JAWHARA',
      initialCapital: 0,
    },
  });

  // 3. Pre-create Al Jawhara 5 Stock Departments (Initial Quantity: 0)
  const defaultStocks = [
    { category: 'FEED', itemName: 'مخزون أمباز (علف)', unit: 'جوال' },
    { category: 'OIL', itemName: 'مخزون الزيت النقي', unit: 'برميل' },
    { category: 'WASTE', itemName: 'مخزون مخلفات العصر', unit: 'طن' },
    { category: 'SPARE_PARTS', itemName: 'مخزون قطع غيار ومستلزمات تشغيل', unit: 'قطعة' },
    { category: 'PACKAGING', itemName: 'مخزون مستلزمات الإنتاج والتعبئة', unit: 'جوال' },
  ];

  for (const s of defaultStocks) {
    await prisma.stock.create({
      data: {
        category: s.category,
        itemName: s.itemName,
        currentQuantity: 0,
        unit: s.unit,
      },
    });
  }

  console.log('✅ Clean database ready!');
  console.log(`Only 1 user in system: "${admin.username}" (Admin).`);
  console.log('Zero transactions, zero employees, 5 initialized stock departments, zero customers.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
