// ===== DATABASE SEED SCRIPT =====
// apps/api/prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test hawker center
  const hawker = await prisma.hawker.create({
    data: {
      id: 'dev-hawker-123',
      name: 'Lau Pa Sat',
      address: '18 Raffles Quay, Singapore 048582',
      imageUrl: 'https://example.com/laupsat.jpg',
    },
  });

  console.log('✅ Created hawker center:', hawker.name);

  // Create tables
  const tables = await Promise.all([
    prisma.table.create({
      data: {
        hawkerId: hawker.id,
        number: 'A1',
        qrCode: 'hawkerhub://table/dev-hawker-123/A1',
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        hawkerId: hawker.id,
        number: 'A2',
        qrCode: 'hawkerhub://table/dev-hawker-123/A2',
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created tables:', tables.length);

  // Create stalls
  const chickenRiceStall = await prisma.stall.create({
    data: {
      hawkerId: hawker.id,
      name: 'Hainanese Chicken Rice',
      description: 'Famous for tender chicken and fragrant rice',
      qrCode: 'stall-chicken-rice',
      phoneNumber: '81234567',
      isActive: true,
      imageUrl: 'https://example.com/chicken-rice.jpg',
    },
  });

  const cktStall = await prisma.stall.create({
    data: {
      hawkerId: hawker.id,
      name: 'Char Kway Teow',
      description: 'Wok-fried flat rice noodles with prawns',
      qrCode: 'stall-ckt',
      phoneNumber: '82345678',
      isActive: true,
      imageUrl: 'https://example.com/ckt.jpg',
    },
  });

  const nasiLemakStall = await prisma.stall.create({
    data: {
      hawkerId: hawker.id,
      name: 'Nasi Lemak Corner',
      description: 'Coconut rice with sambal and sides',
      qrCode: 'stall-nasi-lemak',
      phoneNumber: '83456789',
      isActive: true,
      imageUrl: 'https://example.com/nasi-lemak.jpg',
    },
  });

  console.log('✅ Created stalls');

  // Create menu items for Chicken Rice Stall
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: chickenRiceStall.id,
        name: 'Hainanese Chicken Rice',
        nameZh: '海南鸡饭',
        description: 'Tender poached chicken with fragrant rice',
        price: 5.50,
        category: 'Rice Dishes',
        isAvailable: true,
      },
      {
        stallId: chickenRiceStall.id,
        name: 'Roasted Chicken Rice',
        nameZh: '烧鸡饭',
        description: 'Crispy roasted chicken with fragrant rice',
        price: 6.00,
        category: 'Rice Dishes',
        isAvailable: true,
      },
      {
        stallId: chickenRiceStall.id,
        name: 'Chicken Soup',
        nameZh: '鸡汤',
        description: 'Clear chicken broth with herbs',
        price: 3.00,
        category: 'Soups',
        isAvailable: true,
      },
    ],
  });

  // Create menu items for CKT Stall
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: cktStall.id,
        name: 'Char Kway Teow',
        nameZh: '炒粿条',
        description: 'Wok-fried flat rice noodles with prawns and cockles',
        price: 5.00,
        category: 'Noodles',
        isAvailable: true,
      },
      {
        stallId: cktStall.id,
        name: 'Fried Hokkien Mee',
        nameZh: '福建面',
        description: 'Stir-fried yellow noodles with prawns',
        price: 5.50,
        category: 'Noodles',
        isAvailable: true,
      },
    ],
  });

  // Create menu items for Nasi Lemak Stall
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: nasiLemakStall.id,
        name: 'Nasi Lemak with Chicken Wing',
        nameMy: 'Nasi Lemak Ayam',
        description: 'Coconut rice with fried chicken wing, sambal, and sides',
        price: 6.50,
        category: 'Rice Dishes',
        isAvailable: true,
      },
      {
        stallId: nasiLemakStall.id,
        name: 'Nasi Lemak with Ikan Bilis',
        nameMy: 'Nasi Lemak Ikan Bilis',
        description: 'Coconut rice with fried anchovies, sambal, and sides',
        price: 4.50,
        category: 'Rice Dishes',
        isAvailable: true,
      },
    ],
  });

  console.log('✅ Created menu items');

  // Create a test customer
  await prisma.customer.create({
    data: {
      phoneNumber: '+6591234567',
      name: 'Test Customer',
      email: 'test@example.com',
    },
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

