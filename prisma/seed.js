import prisma from '../src/config/prisma.js';
import bcrypt from 'bcrypt';
import { ensureAuthorizationSetup } from '../src/services/bootstrapService.js';

async function main() {
  console.log('Seeding database...');
  
  // 1. Ensure roles and permissions are created first
  await ensureAuthorizationSetup();
  console.log('Roles and permissions setup checked.');

  // 2. Define default admin credentials
  const adminEmail = 'admin@authora.com';
  const adminPassword = 'password123';
  
  // 3. Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (adminRole) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const admin = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: adminEmail,
          password: hashedPassword,
          roleId: adminRole.id,
          status: 'ACTIVE',
        },
      });
      console.log(`Created default admin account!`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.error('ADMIN role not found. Cannot create admin user.');
    }
  } else {
    console.log(`Admin account (${adminEmail}) already exists. Skipping creation.`);
  }

  console.log('Seeding finished.');
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
