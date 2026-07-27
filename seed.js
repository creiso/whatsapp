const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@admin.com';
  const password = 'admin'; // Senha de teste
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  
  if (existingUser) {
    console.log('Usuário admin já existe!');
    return;
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  
  console.log(`Usuário admin criado: ${user.email} | Senha: admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
