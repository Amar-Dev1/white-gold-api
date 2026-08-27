import path from 'path';
import fs from 'fs';
import { prisma } from '../../lib/prisma';

export async function listGinningReports() {
  return prisma.ginningReport.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createGinningReport(imageUrl: string) {
  return prisma.ginningReport.create({
    data: {
      imageUrl,
    },
  });
}

export async function deleteGinningReport(id: number) {
  const report = await prisma.ginningReport.findUnique({ where: { id } });
  if (!report) {
    throw new Error('REPORT_NOT_FOUND');
  }

  if (report.imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), report.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  return prisma.ginningReport.delete({ where: { id } });
}
