import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const workerSchema = z.object({
  domain: z.enum(['WHITE_GOLD', 'AL_JAWHARA']),
  seasonId: z.number(),
  name: z.string().min(1, 'اسم العامل مطلوب'),
  phone: z.string().optional(),
  dailyWage: z.number().min(0, 'الأجر اليومي مطلوب'),
  notes: z.string().optional(),
});

export type WorkerInput = z.infer<typeof workerSchema>;

export async function listWorkers(domain: 'WHITE_GOLD' | 'AL_JAWHARA', seasonId: number) {
  return prisma.worker.findMany({
    where: { domain, seasonId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorker(data: WorkerInput) {
  return prisma.worker.create({ data });
}

export async function updateWorker(id: number, data: Partial<WorkerInput>) {
  return prisma.worker.update({
    where: { id },
    data,
  });
}

export async function deleteWorker(id: number) {
  return prisma.worker.delete({ where: { id } });
}
