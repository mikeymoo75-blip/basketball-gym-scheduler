const { PrismaClient } = require('@prisma/client');
const { compare } = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  const email = 'admin';
  const password = 'MPtravel1!';
  
  console.log('Looking for user with email:', email);
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User found:', { id: user.id, name: user.name, email: user.email, active: user.active });
  console.log('Testing password...');
  
  const valid = await compare(password, user.passwordHash);
  console.log('Password valid:', valid);
  
  await prisma.$disconnect();
}

testLogin().catch(console.error);
