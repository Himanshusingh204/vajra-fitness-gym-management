import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const GYMS = [
  {
    owner: { username: 'Iron Valley Admin', email: 'owner@ironvalley.com', password: 'gym123', phone: '9000000001' },
    gym: {
      name: 'Iron Valley Gym',
      address: '12, A.B. Road, Vijay Nagar',
      city: 'Indore',
      state: 'Madhya Pradesh',
      location: 'Indore, MP',
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
      facilities: 'Cardio Zone, Free Weights, CrossFit Area, Personal Training, Locker & Shower, Nutrition Bar',
    },
    plans: [
      { name: 'Monthly', description: 'Full gym access for 1 month', duration: 30, price: 999 },
      { name: 'Quarterly', description: '3 months access with 1 free PT session', duration: 90, price: 2499 },
      { name: 'Annual', description: '12 months access + nutrition consultation', duration: 365, price: 8999 },
    ],
  },
  {
    owner: { username: 'PowerHouse Admin', email: 'owner@powerhouse.com', password: 'gym123', phone: '9000000002' },
    gym: {
      name: 'PowerHouse Fitness',
      address: '4th Floor, Orbit Mall, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      location: 'Mumbai, MH',
      imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
      facilities: 'Strength Training, Yoga Studio, Cardio Theatre, Sauna, Steam, Parking',
    },
    plans: [
      { name: 'Monthly', description: 'Full gym access for 1 month', duration: 30, price: 1499 },
      { name: 'Half-Yearly', description: '6 months access + 4 group classes', duration: 180, price: 6999 },
      { name: 'Annual', description: '12 months access + 2 PT sessions', duration: 365, price: 11999 },
    ],
  },
  {
    owner: { username: 'Peak Admin', email: 'owner@peakclub.com', password: 'gym123', phone: '9000000003' },
    gym: {
      name: 'Peak Performance Club',
      address: '7, MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      location: 'Bengaluru, KA',
      imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80',
      facilities: 'Olympic Lifting, CrossFit Box, Group Classes, Rooftop Gym, Cafe, Physio Support',
    },
    plans: [
      { name: 'Monthly', description: 'Full club access for 1 month', duration: 30, price: 1999 },
      { name: 'Annual', description: '12 months access + 4 PT sessions', duration: 365, price: 15999 },
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== '1') {
    console.log('Refusing to seed credentials in production. Set ALLOW_PRODUCTION_SEED=1 to override.');
    return;
  }
  for (const { owner, gym, plans } of GYMS) {
    const existing = await prisma.user.findUnique({ where: { email: owner.email } });
    if (existing) {
      console.log(`Skipping ${gym.name} — owner already exists.`);
      continue;
    }

    const hashedPassword = await argon2.hash(owner.password);

    await prisma.user.create({
      data: {
        username: owner.username,
        email: owner.email,
        password: hashedPassword,
        role: 'GYM_ADMIN',
        phone: owner.phone,
        ownedGyms: {
          create: {
            name: gym.name,
            address: gym.address,
            city: gym.city,
            state: gym.state,
            location: gym.location,
            imageUrl: gym.imageUrl,
            facilities: gym.facilities,
            isApproved: true,
            membershipPlans: {
              create: plans.map((p) => ({
                name: p.name,
                description: p.description,
                duration: p.duration,
                price: p.price,
                isActive: true,
              })),
            },
          },
        },
      },
    });

    console.log(`Seeded ${gym.name} with ${plans.length} plans (owner: ${owner.email} / ${owner.password}).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
