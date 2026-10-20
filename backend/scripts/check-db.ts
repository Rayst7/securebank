import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está configurada');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

try {
  await prisma.$connect();

  const result = await prisma.$queryRaw<
    Array<{ database: string; usuario: string }>
  >`
    SELECT current_database() AS database,
           current_user AS usuario
  `;

  console.log('✅ Conexión con PostgreSQL exitosa');
  console.log(result);
} catch (error) {
  console.error('❌ Error de conexión con PostgreSQL:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
