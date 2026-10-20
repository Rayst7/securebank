import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'destino.transfer.test@securebank.test';
  const accountNumber = 'SB-10000002';

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('DestinoDemo2026!', 12);

    user = await prisma.user.create({
      data: {
        firstName: 'Destino',
        lastName: 'Prueba',
        email,
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });
  }

  const existingAccount = await prisma.account.findUnique({
    where: { accountNumber },
  });

  if (existingAccount && existingAccount.userId !== user.id) {
    throw new Error(
      'El número de cuenta ya pertenece a otro usuario. No se modificó.',
    );
  }

  let account = existingAccount;

  if (!account) {
    account = await prisma.account.create({
      data: {
        accountNumber,
        userId: user.id,
        balance: new Prisma.Decimal('500.00'),
        currency: 'GTQ',
        status: 'ACTIVE',
      },
    });
  }

  console.log('Usuario de prueba preparado:');
  console.log({
    email: user.email,
    accountNumber: account.accountNumber,
    balance: account.balance.toString(),
    currency: account.currency,
    status: account.status,
  });
}

main()
  .catch((error) => {
    console.error('Error al preparar el usuario:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
