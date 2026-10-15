import 'dotenv/config';
import * as bcrypt from 'bcrypt';
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
  const password = 'ClienteDemo2026!';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: 'ACTIVE',
      role: 'CUSTOMER',
    },
    create: {
      firstName: 'Cliente',
      lastName: 'Demo',
      email,
      passwordHash,
      status: 'ACTIVE',
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log('Cliente de prueba creado o actualizado:');
  console.log(user);
}

main()
  .catch((error) => {
    console.error('Error creando el cliente de prueba:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
