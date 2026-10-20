import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está configurada');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const email = 'cliente@securebank.test';

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    throw new Error(
      'No existe el usuario de prueba. Ejecuta primero el script de creación del usuario.',
    );
  }

  const account = await prisma.account.upsert({
    where: {
      accountNumber: 'SB-10000001',
    },
    update: {
      userId: user.id,
    },
    create: {
      accountNumber: 'SB-10000001',
      balance: '1000.00',
      currency: 'GTQ',
      status: 'ACTIVE',
      userId: user.id,
    },
    select: {
      id: true,
      accountNumber: true,
      balance: true,
      currency: true,
      status: true,
      userId: true,
    },
  });

  console.log('Cuenta de prueba creada o actualizada:');
  console.log({
    ...account,
    balance: account.balance.toFixed(2),
  });
}

main()
  .catch((error) => {
    console.error('Error al crear la cuenta:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });