import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const mesaDePartes = await prisma.office.upsert({
    where: { name: 'MESA_DE_PARTES' },
    update: {},
    create: {
      name: 'MESA_DE_PARTES',
      type: 'UNIDAD',
      acronym: 'MDP',
    },
  });

  const jefeDeMesaDePartes = await prisma.user.upsert({
    where: { email: 'mesa@mesa.com' },
    update: {},
    create: {
      email: 'mesa@mesa.com',
      passwordHash: await bcrypt.hash('mesa@mesa.com', 10),
      name: 'Jose Lopez',
      dni: '98765432',
      lastName: 'Lopez',
      role: 'MESA_DE_PARTES',
      username: '98765432',
      officeId: mesaDePartes.id,
    },
  });

  console.log({ mesaDePartes, jefeDeMesaDePartes });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
