// seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Realistic Singapore hawker center data
const HAWKER_CENTERS = [
  {
    name: 'Lau Pa Sat',
    address: '18 Raffles Quay, Singapore 048582',
    latitude: 1.2807,
    longitude: 103.8503,
    region: 'Central',
    openingTime: '06:00',
    closingTime: '02:00',
    amenities: ['Parking', 'WiFi', 'AirCon', 'Halal', 'Wheelchair Access'],
    tags: ['Heritage', 'Tourist-Friendly', 'Late Night'],
    imageUrl: 'https://example.com/laupasaat.jpg',
    coverImage: 'https://example.com/laupasaat-cover.jpg',
  },
  {
    name: 'Maxwell Food Centre',
    address: '1 Kadayanallur St, Singapore 069184',
    latitude: 1.2805,
    longitude: 103.8449,
    region: 'Central',
    openingTime: '08:00',
    closingTime: '22:00',
    amenities: ['Halal', 'Tourist-Friendly'],
    tags: ['Heritage', 'Tourist-Friendly'],
    imageUrl: 'https://example.com/maxwell.jpg',
    coverImage: 'https://example.com/maxwell-cover.jpg',
  },
  {
    name: 'Old Airport Road Food Centre',
    address: '51 Old Airport Rd, Singapore 390051',
    latitude: 1.3084,
    longitude: 103.8862,
    region: 'East',
    openingTime: '06:00',
    closingTime: '23:00',
    amenities: ['Parking', 'Halal'],
    tags: ['Local Favorite', 'Large'],
    imageUrl: 'https://example.com/oldairport.jpg',
    coverImage: 'https://example.com/oldairport-cover.jpg',
  },
  {
    name: 'Tiong Bahru Market',
    address: '30 Seng Poh Rd, Singapore 168898',
    latitude: 1.2837,
    longitude: 103.8327,
    region: 'Central',
    openingTime: '06:00',
    closingTime: '22:00',
    amenities: ['Parking', 'Halal', 'WiFi'],
    tags: ['Heritage', 'Hipster'],
    imageUrl: 'https://example.com/tiongbahru.jpg',
    coverImage: 'https://example.com/tiongbahru-cover.jpg',
  },
  {
    name: 'Chomp Chomp Food Centre',
    address: '20 Kensington Park Rd, Singapore 557269',
    latitude: 1.3639,
    longitude: 103.8675,
    region: 'North',
    openingTime: '16:00',
    closingTime: '02:00',
    amenities: ['Parking', 'Halal'],
    tags: ['Late Night', 'BBQ Seafood'],
    imageUrl: 'https://example.com/chompchomp.jpg',
    coverImage: 'https://example.com/chompchomp-cover.jpg',
  },
];

// Define types for our data structures
interface DishTemplate {
  name: string;
  nameZh?: string;
  nameMy?: string;
  nameTa?: string;
  price: number;
  category: string;
}

interface StallTemplate {
  name: string;
  specialties: string[];
  priceRange: number;
  dishes: DishTemplate[];
}

interface CuisineTemplate {
  cuisine: string;
  stalls: StallTemplate[];
}

// Realistic stall types with Singapore dishes
const STALL_TEMPLATES: CuisineTemplate[] = [
  {
    cuisine: 'Chinese',
    stalls: [
      {
        name: 'Ah Huat Chicken Rice',
        specialties: ['Hainanese Chicken Rice', 'Roasted Chicken'],
        priceRange: 1,
        dishes: [
          { name: 'Hainanese Chicken Rice', nameZh: '海南鸡饭', price: 4.50, category: 'Rice' },
          { name: 'Roasted Chicken Rice', nameZh: '烧鸡饭', price: 5.00, category: 'Rice' },
          { name: 'Chicken Soup', nameZh: '鸡汤', price: 2.00, category: 'Soup' },
          { name: 'Extra Rice', nameZh: '加饭', price: 0.50, category: 'Add-on' },
        ]
      },
      {
        name: 'Famous Char Kway Teow',
        specialties: ['Char Kway Teow', 'Fried Hokkien Mee'],
        priceRange: 2,
        dishes: [
          { name: 'Char Kway Teow', nameZh: '炒粿条', price: 5.00, category: 'Noodles' },
          { name: 'Fried Hokkien Mee', nameZh: '福建炒面', price: 5.00, category: 'Noodles' },
          { name: 'Fried Bee Hoon', nameZh: '炒米粉', price: 4.00, category: 'Noodles' },
          { name: 'Carrot Cake (Black)', nameZh: '黑菜头粿', price: 4.00, category: 'Others' },
          { name: 'Carrot Cake (White)', nameZh: '白菜头粿', price: 4.00, category: 'Others' },
        ]
      },
      {
        name: 'Wanton Mee Express',
        specialties: ['Wanton Mee', 'Char Siu'],
        priceRange: 1,
        dishes: [
          { name: 'Wanton Mee (Dry)', nameZh: '云吞面（干）', price: 4.00, category: 'Noodles' },
          { name: 'Wanton Mee (Soup)', nameZh: '云吞面（汤）', price: 4.00, category: 'Noodles' },
          { name: 'Char Siu Rice', nameZh: '叉烧饭', price: 5.00, category: 'Rice' },
          { name: 'Dumpling Soup', nameZh: '水饺汤', price: 4.50, category: 'Soup' },
        ]
      },
    ]
  },
  {
    cuisine: 'Malay',
    stalls: [
      {
        name: 'Nasi Lemak Power',
        specialties: ['Nasi Lemak', 'Nasi Goreng'],
        priceRange: 1,
        dishes: [
          { name: 'Nasi Lemak with Chicken Wing', nameMy: 'Nasi Lemak Ayam', price: 5.00, category: 'Rice' },
          { name: 'Nasi Lemak with Fried Fish', nameMy: 'Nasi Lemak Ikan', price: 5.50, category: 'Rice' },
          { name: 'Nasi Goreng', nameMy: 'Nasi Goreng Kampung', price: 5.00, category: 'Rice' },
          { name: 'Mee Goreng', nameMy: 'Mee Goreng Mamak', price: 5.00, category: 'Noodles' },
          { name: 'Ayam Penyet', nameMy: 'Ayam Penyet', price: 6.50, category: 'Rice' },
        ]
      },
      {
        name: 'Satay King',
        specialties: ['Satay', 'BBQ Chicken Wings'],
        priceRange: 2,
        dishes: [
          { name: 'Chicken Satay (10 sticks)', nameMy: 'Satay Ayam', price: 8.00, category: 'BBQ' },
          { name: 'Mutton Satay (10 sticks)', nameMy: 'Satay Kambing', price: 10.00, category: 'BBQ' },
          { name: 'Beef Satay (10 sticks)', nameMy: 'Satay Daging', price: 10.00, category: 'BBQ' },
          { name: 'BBQ Chicken Wings (6pcs)', nameMy: 'Kepak Ayam BBQ', price: 8.00, category: 'BBQ' },
          { name: 'Ketupat (Rice Cake)', nameMy: 'Ketupat', price: 1.00, category: 'Add-on' },
        ]
      },
    ]
  },
  {
    cuisine: 'Indian',
    stalls: [
      {
        name: 'Roti Prata Corner',
        specialties: ['Roti Prata', 'Murtabak'],
        priceRange: 1,
        dishes: [
          { name: 'Plain Prata (2pcs)', nameTa: 'சாதா பராத்தா', price: 2.40, category: 'Prata' },
          { name: 'Egg Prata', nameTa: 'முட்டை பராத்தா', price: 2.00, category: 'Prata' },
          { name: 'Cheese Prata', nameTa: 'சீஸ் பராத்தா', price: 3.00, category: 'Prata' },
          { name: 'Chicken Murtabak', nameTa: 'கோழி முர்தபாக்', price: 8.00, category: 'Murtabak' },
          { name: 'Mutton Murtabak', nameTa: 'ஆட்டு முர்தபாக்', price: 9.00, category: 'Murtabak' },
          { name: 'Teh Tarik', nameTa: 'தே தரிக்', price: 1.50, category: 'Drinks' },
        ]
      },
      {
        name: 'Banana Leaf Rice House',
        specialties: ['Banana Leaf Rice', 'Fish Head Curry'],
        priceRange: 2,
        dishes: [
          { name: 'Banana Leaf Rice Set', nameTa: 'வாழை இலை சாப்பாடு', price: 7.00, category: 'Rice' },
          { name: 'Fish Head Curry', nameTa: 'மீன் தலை கறி', price: 25.00, category: 'Curry' },
          { name: 'Chicken Biryani', nameTa: 'கோழி பிரியாணி', price: 8.00, category: 'Rice' },
          { name: 'Mutton Curry', nameTa: 'ஆட்டு கறி', price: 9.00, category: 'Curry' },
          { name: 'Papadum', nameTa: 'பப்படம்', price: 1.00, category: 'Add-on' },
        ]
      },
    ]
  },
  {
    cuisine: 'Western',
    stalls: [
      {
        name: 'Western Grill Express',
        specialties: ['Chicken Chop', 'Fish & Chips'],
        priceRange: 2,
        dishes: [
          { name: 'Chicken Chop', price: 7.50, category: 'Mains' },
          { name: 'Fish & Chips', price: 8.00, category: 'Mains' },
          { name: 'Beef Steak', price: 12.00, category: 'Mains' },
          { name: 'Spaghetti Bolognese', price: 6.50, category: 'Pasta' },
          { name: 'Mushroom Soup', price: 3.50, category: 'Soup' },
        ]
      },
    ]
  },
  {
    cuisine: 'Drinks',
    stalls: [
      {
        name: 'Fresh Juice Paradise',
        specialties: ['Fresh Juices', 'Smoothies'],
        priceRange: 1,
        dishes: [
          { name: 'Sugar Cane Juice', nameZh: '甘蔗水', price: 2.50, category: 'Juice' },
          { name: 'Fresh Orange Juice', nameZh: '鲜橙汁', price: 3.00, category: 'Juice' },
          { name: 'Watermelon Juice', nameZh: '西瓜汁', price: 3.00, category: 'Juice' },
          { name: 'Mango Smoothie', price: 4.00, category: 'Smoothie' },
          { name: 'Avocado Shake', price: 4.50, category: 'Smoothie' },
          { name: 'Coconut Water', nameZh: '椰子水', price: 2.00, category: 'Juice' },
        ]
      },
      {
        name: 'Traditional Kopi House',
        specialties: ['Kopi', 'Teh'],
        priceRange: 1,
        dishes: [
          { name: 'Kopi', nameZh: '咖啡', price: 1.30, category: 'Coffee' },
          { name: 'Kopi-O', nameZh: '咖啡乌', price: 1.20, category: 'Coffee' },
          { name: 'Teh', nameZh: '茶', price: 1.30, category: 'Tea' },
          { name: 'Teh-O', nameZh: '茶乌', price: 1.20, category: 'Tea' },
          { name: 'Milo Dinosaur', price: 3.50, category: 'Others' },
          { name: 'Yuan Yang', nameZh: '鸳鸯', price: 1.50, category: 'Coffee' },
        ]
      },
    ]
  },
];

// Customer names for realistic data
const CUSTOMER_NAMES = [
  'John Tan', 'Sarah Lim', 'Ahmad Ibrahim', 'Priya Nair', 'David Wong',
  'Michelle Lee', 'Raj Kumar', 'Jennifer Ng', 'Michael Chen', 'Fatimah Abdullah',
  'Kevin Ong', 'Jessica Koh', 'Hassan Ali', 'Anita Sharma', 'Brian Teo',
  'Grace Chong', 'Suresh Pillai', 'Emily Goh', 'Daniel Seah', 'Nurul Ain'
];

// Review comments templates with proper typing
const REVIEW_TEMPLATES: Record<number, string[]> = {
  5: [
    'Best {dish} I\'ve ever had! Will definitely come back.',
    'Authentic taste and generous portions. Highly recommended!',
    'The {dish} here is legendary. Worth the queue!',
    'Consistently good quality. My go-to stall for {dish}.',
    'Friendly service and delicious food. Can\'t ask for more!'
  ],
  4: [
    'Good {dish}, though slightly pricey.',
    'Tasty food but sometimes the wait can be long.',
    'Almost as good as my grandmother\'s cooking!',
    'Solid choice for {dish}. Portions could be bigger.',
    'Nice flavors, would come back again.'
  ],
  3: [
    'Average {dish}. Nothing special but decent.',
    'OK for the price. There are better options nearby.',
    'Hit or miss. Sometimes good, sometimes not.',
    'Edible but not memorable.',
    'Standard hawker fare, nothing to shout about.'
  ],
  2: [
    'Disappointed with the {dish}. Used to be better.',
    'Quality has dropped. Won\'t be returning.',
    'Overpriced for what you get.',
    'Service needs improvement.',
    'Had better {dish} elsewhere.'
  ],
  1: [
    'Terrible experience. Food was cold.',
    'Worst {dish} I\'ve had. Avoid!',
    'Unhygienic conditions. Reported to NEA.',
    'Rude staff and bad food.',
    'Complete waste of money.'
  ]
};

async function seed() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.notificationTicket.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.pOSSyncLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.stallOwner.deleteMany();
  await prisma.stall.deleteMany();
  await prisma.table.deleteMany();
  await prisma.hawker.deleteMany();

  console.log('✅ Cleared existing data');

  // Create Customers
  // @ts-ignore
  const customers = [];
  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: CUSTOMER_NAMES[i],
        phoneNumber: `9${faker.number.int({ min: 1000000, max: 9999999 })}`,
        email: faker.internet.email({ firstName: CUSTOMER_NAMES[i].split(' ')[0] }),
        joinedAt: faker.date.past({ years: 2 }),
      },
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // Create Hawker Centers
  let globalStallCounter = 0; // Initialize global counter outside the loop
  
  for (const hawkerData of HAWKER_CENTERS) {
    const hawker = await prisma.hawker.create({
      data: {
        ...hawkerData,
        rating: faker.number.float({ min: 3.5, max: 5}),
        totalReviews: faker.number.int({ min: 50, max: 500 }),
      },
    });

    console.log(`📍 Created hawker center: ${hawker.name}`);

    // Create Tables for each hawker center
    const tableCount = faker.number.int({ min: 20, max: 50 });
    const tables = [];
    for (let i = 1; i <= tableCount; i++) {
      const table = await prisma.table.create({
        data: {
          hawkerId: hawker.id,
          number: `A${i}`,
          qrCode: `hawkerhub://table/${hawker.id}/A${i}`,
        },
      });
      tables.push(table);
    }

    // Create Stalls for each hawker center
    const selectedCuisines = faker.helpers.arrayElements(['Chinese', 'Malay', 'Indian', 'Western', 'Drinks'], { min: 3, max: 5 });
    let stallCounter = 1;

    for (const cuisine of selectedCuisines) {
      const cuisineStalls = STALL_TEMPLATES.find(t => t.cuisine === cuisine)?.stalls || [];
      const selectedStalls = faker.helpers.arrayElements(cuisineStalls, { min: 1, max: cuisineStalls.length });

      for (const stallTemplate of selectedStalls) {
        globalStallCounter++; // Increment global counter for unique emails
        const phoneNumber = `9${faker.number.int({ min: 1000000, max: 9999999 })}`;
        const stall = await prisma.stall.create({
          data: {
            hawkerId: hawker.id,
            name: stallTemplate.name,
            description: `Specializing in ${stallTemplate.specialties.join(', ')}`,
            imageUrl: `https://example.com/stall${stallCounter}.jpg`,
            qrCode: `hawkerhub://stall/${hawker.id}/${stallCounter}`,
            phoneNumber,
            cuisine,
            specialties: stallTemplate.specialties,
            rating: faker.number.float({ min: 3.0, max: 5.0 }),
            priceRange: stallTemplate.priceRange,
            images: Array.from({ length: 3 }, (_, i) => `https://example.com/food${stallCounter}-${i + 1}.jpg`),
            posType: faker.helpers.arrayElement(['StoreHub', 'Square', 'Custom', null]),
            lastMenuSync: faker.date.recent({ days: 7 }),
          },
        });

        // Create Stall Owner with unique email
        await prisma.stallOwner.create({
          data: {
            stallId: stall.id,
            name: faker.person.fullName(),
            email: `stall${globalStallCounter}@hawkerhub.sg`, // Use global counter for unique emails
            phoneNumber,
            hashedPassword: await hash('password123', 10),
          },
        });

        // Create Menu Items
        for (const dish of stallTemplate.dishes) {
          await prisma.menuItem.create({
            data: {
              stallId: stall.id,
              externalId: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.7 }),
              name: dish.name,
              nameZh: dish.nameZh || null,
              nameMy: dish.nameMy || null,
              nameTa: dish.nameTa || null,
              description: faker.helpers.maybe(() => faker.food.description(), { probability: 0.5 }),
              price: dish.price,
              imageUrl: faker.helpers.maybe(() => `https://example.com/${dish.name.toLowerCase().replace(/ /g, '-')}.jpg`, { probability: 0.8 }),
              category: dish.category,
              isAvailable: faker.datatype.boolean({ probability: 0.9 }),
              lastSyncedAt: faker.date.recent({ days: 1 }),
            },
          });
        }

        // Create Reviews for popular stalls
        if (faker.datatype.boolean({ probability: 0.7 })) {
          const reviewCount = faker.number.int({ min: 5, max: 20 });
          const reviewedCustomers = faker.helpers.arrayElements(customers, reviewCount);
          
          for (const customer of reviewedCustomers) {
            const rating = faker.helpers.weightedArrayElement([
              { weight: 10, value: 5 },
              { weight: 30, value: 4 },
              { weight: 20, value: 3 },
              { weight: 5, value: 2 },
              { weight: 2, value: 1 },
            ]);

            const reviewTemplate = faker.helpers.arrayElement(REVIEW_TEMPLATES[rating]);
            const comment = reviewTemplate.replace('{dish}', faker.helpers.arrayElement(stallTemplate.specialties));

            await prisma.review.create({
              data: {
                stallId: stall.id,
                customerId: customer.id,
                rating,
                comment,
                images: faker.helpers.maybe(() => [`https://example.com/review-${faker.string.uuid()}.jpg`], { probability: 0.3 }) || [],
                createdAt: faker.date.past({ years: 1 }),
              },
            });
          }
        }

        // Create Favorites
        const favoriteCount = faker.number.int({ min: 0, max: 10 });
        const favoriteCustomers = faker.helpers.arrayElements(customers, favoriteCount);
        for (const customer of favoriteCustomers) {
          await prisma.favorite.create({
            data: {
              customerId: customer.id,
              stallId: stall.id,
            },
          });
        }

        // Create Orders
        const orderCount = faker.number.int({ min: 20, max: 100 });
        for (let i = 0; i < orderCount; i++) {
          const orderDate = faker.date.recent({ days: 30 });
          const table = faker.helpers.arrayElement(tables);
          //@ts-ignore
          const customer = faker.helpers.maybe(() => faker.helpers.arrayElement(customers), { probability: 0.7 });
          const menuItems = await prisma.menuItem.findMany({
            where: { stallId: stall.id, isAvailable: true },
          });

          if (menuItems.length > 0) {
            const selectedItems = faker.helpers.arrayElements(menuItems, { min: 1, max: 4 });
            const orderItems = selectedItems.map(item => ({
              menuItemId: item.id,
              quantity: faker.number.int({ min: 1, max: 3 }),
              price: item.price,
              specialInstructions: faker.helpers.maybe(() => faker.helpers.arrayElement([
                'Less spicy please',
                'No vegetables',
                'Extra sauce',
                'Less oil',
                'No MSG',
              ]), { probability: 0.2 }),
            }));

            const totalAmount = orderItems.reduce((sum, item) => 
              sum + (Number(item.price) * item.quantity), 0
            );

            const status = faker.helpers.weightedArrayElement([
              { weight: 60, value: 'COMPLETED' },
              { weight: 20, value: 'PREPARING' },
              { weight: 10, value: 'READY' },
              { weight: 5, value: 'PENDING' },
              { weight: 5, value: 'CANCELLED' },
            ]);

            const paymentMode = faker.helpers.arrayElement(['PAYNOW', 'CASH', 'GRABPAY', 'PAYLAH']);
            const paymentStatus = status === 'COMPLETED' ? 'COMPLETED' : 
                               status === 'CANCELLED' ? 'FAILED' : 'PENDING';

            // Generate unique order number with stall ID and random component
            const dateStr = `${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}${orderDate.getDate().toString().padStart(2, '0')}`;
            const orderNumber = `${dateStr}-${stall.id.substring(0, 8)}-${faker.string.alphanumeric(6).toUpperCase()}`;

            const order = await prisma.order.create({
              data: {
                orderNumber,
                tableId: table.id,
                stallId: stall.id,
                customerId: customer?.id || null,
                status,
                totalAmount,
                paymentMode,
                paymentStatus,
                paidAt: paymentStatus === 'COMPLETED' ? faker.date.between({ from: orderDate, to: new Date() }) : null,
                createdAt: orderDate,
                updatedAt: faker.date.between({ from: orderDate, to: new Date() }),
                items: {
                  create: orderItems,
                },
              },
            });

            // Create Payment record for completed orders
            if (paymentStatus === 'COMPLETED') {
              await prisma.payment.create({
                data: {
                  orderId: order.id,
                  transactionId: faker.string.uuid(),
                  status: 'COMPLETED',
                  amount: totalAmount,
                  completedAt: order.paidAt!,
                  metadata: {
                    paymentMode,
                    processorResponse: 'Success',
                  },
                },
              });
            }
          }
        }

        // Create POS Sync Logs
        const syncCount = faker.number.int({ min: 5, max: 20 });
        for (let i = 0; i < syncCount; i++) {
          const syncDate = faker.date.recent({ days: 30 });
          await prisma.pOSSyncLog.create({
            data: {
              stallId: stall.id,
              syncType: faker.helpers.arrayElement(['menu', 'order', 'inventory']),
              status: faker.helpers.weightedArrayElement([
                { weight: 80, value: 'success' },
                { weight: 15, value: 'partial' },
                { weight: 5, value: 'failed' },
              ]),
              itemsSynced: faker.number.int({ min: 1, max: 50 }),
              errors: faker.helpers.maybe(() => ({ error: 'Connection timeout' }), { probability: 0.1 }),
              startedAt: syncDate,
              completedAt: faker.date.soon({ days: 1, refDate: syncDate }),
              createdAt: syncDate,
            },
          });
        }

        stallCounter++;
      }
    }
  }

  // Create Search History
  const searchQueries = [
    'chicken rice', 'halal food', 'vegetarian', 'laksa', 'nasi lemak',
    'cheap eats', 'best hawker', 'late night food', 'breakfast', 'dessert',
    'char kway teow', 'roti prata', 'fish soup', 'western food', 'drinks',
  ];

  for (const customer of customers) {
    const searchCount = faker.number.int({ min: 0, max: 10 });
    for (let i = 0; i < searchCount; i++) {
      await prisma.searchHistory.create({
        data: {
          customerId: customer.id,
          query: faker.helpers.arrayElement(searchQueries),
          createdAt: faker.date.recent({ days: 30 }),
        },
      });
    }
  }

  // Create Push Tokens for active users
  const activeCustomers = faker.helpers.arrayElements(customers, Math.floor(customers.length * 0.6));
  for (const customer of activeCustomers) {
    await prisma.pushToken.create({
      data: {
        token: `ExponentPushToken[${faker.string.alphanumeric(20)}]`,
        userId: customer.id,
        userType: 'customer',
        platform: faker.helpers.arrayElement(['ios', 'android']),
        lastUsed: faker.date.recent({ days: 7 }),
      },
    });

    await prisma.notificationPreference.create({
      data: {
        userId: customer.id,
        orderUpdates: faker.datatype.boolean({ probability: 0.8 }),
        promotions: faker.datatype.boolean({ probability: 0.6 }),
        newFeatures: faker.datatype.boolean({ probability: 0.7 }),
      },
    });
  }

  // Create some webhook events for testing
  const webhookSources = ['storehub', 'square', 'whatsapp'];
  for (let i = 0; i < 20; i++) {
    await prisma.webhookEvent.create({
      data: {
        source: faker.helpers.arrayElement(webhookSources),
        eventType: faker.helpers.arrayElement(['menu.updated', 'order.created', 'payment.completed']),
        payload: {
          timestamp: faker.date.recent().toISOString(),
          data: { test: true },
        },
        processed: faker.datatype.boolean({ probability: 0.8 }),
        processedAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.8 }),
        createdAt: faker.date.recent({ days: 7 }),
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  
  // Print summary
  const hawkerCount = await prisma.hawker.count();
  const stallCount = await prisma.stall.count();
  const customerCount = await prisma.customer.count();
  const orderCount = await prisma.order.count();
  const menuItemCount = await prisma.menuItem.count();
  
  console.log('\n📊 Database Summary:');
  console.log(`- Hawker Centers: ${hawkerCount}`);
  console.log(`- Stalls: ${stallCount}`);
  console.log(`- Customers: ${customerCount}`);
  console.log(`- Orders: ${orderCount}`);
  console.log(`- Menu Items: ${menuItemCount}`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });