// ===== DATABASE SEED SCRIPT =====
// apps/api/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.stallOwner.deleteMany();
  await prisma.stall.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.hawker.deleteMany();

  // Create hawker centers
  const lauPaSat = await prisma.hawker.create({
    data: {
      id: 'dev-hawker-123',
      name: 'Lau Pa Sat',
      address: '18 Raffles Quay, Singapore 048582',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
    },
  });

  const maxwellFC = await prisma.hawker.create({
    data: {
      name: 'Maxwell Food Centre',
      address: '1 Kadayanallur St, Singapore 069184',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de',
    },
  });

  console.log('✅ Created hawker centers');

  // Create tables for Lau Pa Sat
  const tables = [];
  for (let i = 1; i <= 20; i++) {
    const table = await prisma.table.create({
      data: {
        hawkerId: lauPaSat.id,
        number: `A${i}`,
        qrCode: `hawkerhub://table/${lauPaSat.id}/A${i}`,
        isActive: true,
      },
    });
    tables.push(table);
  }

  console.log('✅ Created tables:', tables.length);

  // Create stalls with proper cuisine types
  const chickenRiceStall = await prisma.stall.create({
    data: {
      hawkerId: lauPaSat.id,
      name: 'Tian Tian Hainanese Chicken Rice',
      description: 'Famous for tender chicken and fragrant rice since 1987',
      qrCode: 'stall-chicken-rice-001',
      phoneNumber: '91234567',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec',
    },
  });

  const cktStall = await prisma.stall.create({
    data: {
      hawkerId: lauPaSat.id,
      name: 'Hill Street Char Kway Teow',
      description: 'Wok hei char kway teow with fresh prawns and cockles',
      qrCode: 'stall-ckt-001',
      phoneNumber: '82345678',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43',
    },
  });

  const nasiLemakStall = await prisma.stall.create({
    data: {
      hawkerId: lauPaSat.id,
      name: 'Selera Rasa Nasi Lemak',
      description: 'Authentic coconut rice with homemade sambal',
      qrCode: 'stall-nasi-lemak-001',
      phoneNumber: '93456789',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1567982047351-76b6f93e38ee',
    },
  });

  const indianStall = await prisma.stall.create({
    data: {
      hawkerId: lauPaSat.id,
      name: 'Allauddin\'s Briyani',
      description: 'Fragrant basmati rice with tender mutton and spices',
      qrCode: 'stall-briyani-001',
      phoneNumber: '84567890',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
    },
  });

  const drinkStall = await prisma.stall.create({
    data: {
      hawkerId: lauPaSat.id,
      name: 'Uncle\'s Drinks Corner',
      description: 'Fresh juices, kopi, and teh tarik',
      qrCode: 'stall-drinks-001',
      phoneNumber: '95678901',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8',
    },
  });

  console.log('✅ Created stalls');

  // Create stall owners
  await prisma.stallOwner.create({
    data: {
      stallId: chickenRiceStall.id,
      name: 'Ah Huat',
      email: 'ahhuat@tiantianchicken.sg',
      phoneNumber: '+6591234567',
      hashedPassword: await bcrypt.hash('password123', 10),
    },
  });

  // Create comprehensive menu items
  
  // Chicken Rice Stall Menu
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: chickenRiceStall.id,
        name: 'Steamed Chicken Rice',
        nameZh: '白鸡饭',
        description: 'Tender steamed chicken with fragrant rice and chili sauce',
        price: 4.50,
        category: 'Rice Dishes',
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec',
      },
      {
        stallId: chickenRiceStall.id,
        name: 'Roasted Chicken Rice',
        nameZh: '烧鸡饭',
        description: 'Crispy roasted chicken with fragrant rice',
        price: 5.00,
        category: 'Rice Dishes',
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1598515213692-5f252f75d785',
      },
      {
        stallId: chickenRiceStall.id,
        name: 'Chicken Rice Set',
        nameZh: '鸡饭套餐',
        description: 'Half chicken, rice, soup, and vegetables',
        price: 12.00,
        category: 'Set Meals',
        isAvailable: true,
      },
      {
        stallId: chickenRiceStall.id,
        name: 'Chicken Soup',
        nameZh: '鸡汤',
        description: 'Clear chicken broth with herbs',
        price: 2.00,
        category: 'Soups',
        isAvailable: true,
      },
      {
        stallId: chickenRiceStall.id,
        name: 'Extra Rice',
        nameZh: '加饭',
        description: 'Fragrant chicken rice',
        price: 1.50,
        category: 'Extras',
        isAvailable: true,
      },
    ],
  });

  // Char Kway Teow Stall Menu
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: cktStall.id,
        name: 'Char Kway Teow',
        nameZh: '炒粿条',
        description: 'Wok-fried flat rice noodles with egg, prawns, and cockles',
        price: 5.00,
        category: 'Noodles',
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43',
      },
      {
        stallId: cktStall.id,
        name: 'Char Kway Teow (Large)',
        nameZh: '炒粿条 (大)',
        description: 'Large portion with extra prawns',
        price: 6.50,
        category: 'Noodles',
        isAvailable: true,
      },
      {
        stallId: cktStall.id,
        name: 'Fried Hokkien Mee',
        nameZh: '福建面',
        description: 'Yellow noodles with prawns in rich seafood broth',
        price: 5.50,
        category: 'Noodles',
        isAvailable: true,
      },
      {
        stallId: cktStall.id,
        name: 'Fried Carrot Cake (Black)',
        nameZh: '黑菜头粿',
        description: 'Sweet dark soy sauce fried radish cake',
        price: 4.00,
        category: 'Others',
        isAvailable: true,
      },
      {
        stallId: cktStall.id,
        name: 'Fried Carrot Cake (White)',
        nameZh: '白菜头粿',
        description: 'Savory fried radish cake with eggs',
        price: 4.00,
        category: 'Others',
        isAvailable: true,
      },
    ],
  });

  // Nasi Lemak Stall Menu
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: nasiLemakStall.id,
        name: 'Nasi Lemak with Chicken Wing',
        nameMy: 'Nasi Lemak Ayam Goreng',
        description: 'Coconut rice with fried chicken wing, sambal, egg, and anchovies',
        price: 6.00,
        category: 'Rice Dishes',
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1567982047351-76b6f93e38ee',
      },
      {
        stallId: nasiLemakStall.id,
        name: 'Nasi Lemak with Fish',
        nameMy: 'Nasi Lemak Ikan',
        description: 'Coconut rice with fried fish fillet',
        price: 5.50,
        category: 'Rice Dishes',
        isAvailable: true,
      },
      {
        stallId: nasiLemakStall.id,
        name: 'Nasi Lemak with Rendang',
        nameMy: 'Nasi Lemak Rendang',
        description: 'Coconut rice with beef rendang',
        price: 7.50,
        category: 'Rice Dishes',
        isAvailable: false, // Sold out
      },
      {
        stallId: nasiLemakStall.id,
        name: 'Mee Siam',
        nameMy: 'Mee Siam',
        description: 'Spicy rice vermicelli in tangy gravy',
        price: 4.50,
        category: 'Noodles',
        isAvailable: true,
      },
      {
        stallId: nasiLemakStall.id,
        name: 'Lontong',
        nameMy: 'Lontong',
        description: 'Rice cakes in vegetable curry',
        price: 5.00,
        category: 'Others',
        isAvailable: true,
      },
    ],
  });

  // Indian Stall Menu
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: indianStall.id,
        name: 'Mutton Briyani',
        nameTa: 'மட்டன் பிரியாணி',
        description: 'Fragrant basmati rice with tender mutton chunks',
        price: 8.00,
        category: 'Rice Dishes',
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
      },
      {
        stallId: indianStall.id,
        name: 'Chicken Briyani',
        nameTa: 'சிக்கன் பிரியாணி',
        description: 'Fragrant basmati rice with marinated chicken',
        price: 7.00,
        category: 'Rice Dishes',
        isAvailable: true,
      },
      {
        stallId: indianStall.id,
        name: 'Roti Prata (2pcs)',
        nameTa: 'ரொட்டி பிராட்டா',
        description: 'Crispy flatbread with curry',
        price: 3.00,
        category: 'Breads',
        isAvailable: true,
      },
      {
        stallId: indianStall.id,
        name: 'Egg Prata',
        nameTa: 'முட்டை பிராட்டா',
        description: 'Prata with egg filling',
        price: 2.00,
        category: 'Breads',
        isAvailable: true,
      },
      {
        stallId: indianStall.id,
        name: 'Teh Tarik',
        nameTa: 'தே தரிக்',
        description: 'Pulled milk tea',
        price: 1.80,
        category: 'Beverages',
        isAvailable: true,
      },
    ],
  });

  // Drinks Stall Menu
  await prisma.menuItem.createMany({
    data: [
      {
        stallId: drinkStall.id,
        name: 'Kopi O',
        nameZh: '咖啡乌',
        description: 'Traditional black coffee',
        price: 1.40,
        category: 'Hot Beverages',
        isAvailable: true,
      },
      {
        stallId: drinkStall.id,
        name: 'Kopi',
        nameZh: '咖啡',
        description: 'Coffee with condensed milk',
        price: 1.60,
        category: 'Hot Beverages',
        isAvailable: true,
      },
      {
        stallId: drinkStall.id,
        name: 'Teh O',
        nameZh: '茶乌',
        description: 'Plain tea',
        price: 1.40,
        category: 'Hot Beverages',
        isAvailable: true,
      },
      {
        stallId: drinkStall.id,
        name: 'Milo Dinosaur',
        description: 'Iced milo with extra milo powder',
        price: 3.50,
        category: 'Cold Beverages',
        isAvailable: true,
      },
      {
        stallId: drinkStall.id,
        name: 'Fresh Orange Juice',
        nameZh: '鲜橙汁',
        description: 'Freshly squeezed orange juice',
        price: 3.00,
        category: 'Fresh Juices',
        isAvailable: true,
      },
      {
        stallId: drinkStall.id,
        name: 'Sugar Cane Juice',
        nameZh: '甘蔗水',
        description: 'Fresh sugar cane juice',
        price: 2.50,
        category: 'Fresh Juices',
        isAvailable: true,
      },
      {
        stallId: drinkStall.id,
        name: 'Lime Juice',
        nameZh: '酸柑水',
        description: 'Fresh lime juice',
        price: 2.00,
        category: 'Fresh Juices',
        isAvailable: true,
      },
    ],
  });

  console.log('✅ Created menu items');

  // Create test customers
  const testCustomer = await prisma.customer.create({
    data: {
      phoneNumber: '+6591234567',
      name: 'John Doe',
      email: 'john@example.com',
    },
  });

  const testCustomer2 = await prisma.customer.create({
    data: {
      phoneNumber: '+6598765432',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  });

  console.log('✅ Created test customers');

  // Create some sample orders (one order per stall)
  const chickenRiceItem = await prisma.menuItem.findFirst({ 
    where: { name: 'Steamed Chicken Rice' } 
  });
  
  const cktItem = await prisma.menuItem.findFirst({ 
    where: { name: 'Char Kway Teow' } 
  });

  if (chickenRiceItem) {
    await prisma.order.create({
      data: {
        orderNumber: '2024001',
        tableId: tables[0].id,
        stallId: chickenRiceStall.id,
        customerId: testCustomer.id,
        status: 'COMPLETED',
        totalAmount: 4.50,
        paymentMode: 'PAYNOW',
        items: {
          create: [
            {
              menuItemId: chickenRiceItem.id,
              quantity: 1,
              price: 4.50,
            },
          ],
        },
      },
    });
  }

  if (cktItem) {
    await prisma.order.create({
      data: {
        orderNumber: '2024002',
        tableId: tables[0].id,
        stallId: cktStall.id,
        customerId: testCustomer.id,
        status: 'PREPARING',
        totalAmount: 5.00,
        paymentMode: 'CASH',
        items: {
          create: [
            {
              menuItemId: cktItem.id,
              quantity: 1,
              price: 5.00,
            },
          ],
        },
      },
    });
  }

  // Create a pending order
  const nasiLemakItem = await prisma.menuItem.findFirst({ 
    where: { name: 'Nasi Lemak with Chicken Wing' } 
  });

  if (nasiLemakItem) {
    await prisma.order.create({
      data: {
        orderNumber: '2024003',
        tableId: tables[1].id,
        stallId: nasiLemakStall.id,
        customerId: testCustomer2.id,
        status: 'PENDING',
        totalAmount: 6.00,
        paymentMode: 'PAYNOW',
        items: {
          create: [
            {
              menuItemId: nasiLemakItem.id,
              quantity: 1,
              price: 6.00,
            },
          ],
        },
      },
    });
  }

  console.log('✅ Created sample orders');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📱 Test QR Codes:');
  console.log(`   Table A1: hawkerhub://table/${lauPaSat.id}/A1`);
  console.log(`   Table A2: hawkerhub://table/${lauPaSat.id}/A2`);
  console.log('\n👤 Test Customer:');
  console.log('   Phone: 91234567');
  console.log('   OTP: Check console logs when sending OTP');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });