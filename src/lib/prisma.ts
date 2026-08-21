import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const dbUrl = process.env.DATABASE_URL || 'file:./db.sql';

const adapter = new PrismaLibSql({ url: dbUrl });
export const prisma = new PrismaClient({ adapter });
