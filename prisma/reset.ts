import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('💥 Wiping 100% of database data across all tables...');

  // Delete child/dependent records first to satisfy foreign key constraints
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

  console.log('✅ Database completely wiped clean! All tables are empty.');
}

main()
  .catch((e) => {
    console.error('Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
