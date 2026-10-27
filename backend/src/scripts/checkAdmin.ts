import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const users = await prisma.adminUser.findMany();
  console.log('Total admin users in DB:', users.length);
  for (const u of users) {
    console.log('User ID:', u.id, 'Email:', u.email, 'Role:', u.role);
    const testPasswords = [
      'RankRise2026!Secure',
      'RankRiseAdmin2026!',
      'RankRiseAdmin2025!',
      'admin',
      'password',
      'admin123',
    ];
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, u.passwordHash);
      console.log(`  Password '${pwd}' matches? ${match}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
