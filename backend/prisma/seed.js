import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // --- Vendors ---
  const vendorA = await prisma.vendors.create({
    data: {
      name: 'Vendor A',
      currentOutStanding: 5000,
    },
  })

  const vendorB = await prisma.vendors.create({
    data: {
      name: 'Vendor B',
      currentOutStanding: 3200,
    },
  })

  // --- Admins ---
  const admin1 = await prisma.admin.create({
    data: {
      userName: 'manager1',
      password: 'secret123',
      branch: 'Mumbai',
    },
  })

  const admin2 = await prisma.admin.create({
    data: {
      userName: 'manager2',
      password: 'admin456',
      branch: 'Delhi',
    },
  })

  // --- Branches ---
  const branch1 = await prisma.branches.create({
    data: {
      name: 'Mumbai',
      location: 'Andheri',
    },
  })

  const branch2 = await prisma.branches.create({
    data: {
      name: 'Delhi',
      location: 'Connaught Place',
    },
  })

  // --- WriteOffs ---
  await prisma.writeOff.create({
    data: {
      fmNumber: 'FM-101',
      note: 'Damaged goods - Vendor A',
      amount: 500,
      vendorId: vendorA.id,
      adminId: admin1.id,
      branchId: branch1.id,
    },
  })

  await prisma.writeOff.create({
    data: {
      fmNumber: 'FM-102',
      note: 'Expired stock - Vendor B',
      amount: 300,
      vendorId: vendorB.id,
      adminId: admin2.id,
      branchId: branch2.id,
    },
  })

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
