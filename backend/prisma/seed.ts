import { PrismaClient, UserRole, ResidentStatus, NoticeCategory, LocalGuideCategory, PaymentStatus, PaymentType, MaintenanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hideawayholler.com' },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      profile: {
        upsert: {
          create: {
            fullName: 'Holler Admin',
            phone: '+1-865-555-0100',
            country: 'USA',
            currentStatus: ResidentStatus.ACTIVE_RESIDENT,
          },
          update: {
            fullName: 'Holler Admin',
            phone: '+1-865-555-0100',
            country: 'USA',
            currentStatus: ResidentStatus.ACTIVE_RESIDENT,
          },
        },
      },
    },
    create: {
      email: 'admin@hideawayholler.com',
      passwordHash,
      role: UserRole.ADMIN,
      profile: {
        create: {
          fullName: 'Holler Admin',
          phone: '+1-865-555-0100',
          country: 'USA',
          currentStatus: ResidentStatus.ACTIVE_RESIDENT,
        },
      },
    },
  });

  const resident = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      email: 'maria@example.com',
      passwordHash,
      role: UserRole.RESIDENT,
      profile: {
        create: {
          fullName: 'Maria Santos',
          phone: '+55-11-99999-0001',
          country: 'Brazil',
          passportNumber: 'BR1234567',
          sponsor: 'CIEE',
          employer: 'Dollywood',
          emergencyContactName: 'Carlos Santos',
          emergencyContactPhone: '+55-11-99999-0002',
          arrivalDate: new Date('2026-05-15'),
          departureDate: new Date('2026-09-01'),
          currentStatus: ResidentStatus.ACTIVE_RESIDENT,
        },
      },
    },
  });

  const applicant = await prisma.user.upsert({
    where: { email: 'juan@example.com' },
    update: {},
    create: {
      email: 'juan@example.com',
      passwordHash,
      role: UserRole.APPLICANT,
      profile: {
        create: {
          fullName: 'Juan Perez',
          phone: '+52-55-1234-5678',
          country: 'Mexico',
          currentStatus: ResidentStatus.APPLICANT,
        },
      },
    },
  });

  const alumni = await prisma.user.upsert({
    where: { email: 'anna@example.com' },
    update: {},
    create: {
      email: 'anna@example.com',
      passwordHash,
      role: UserRole.ALUMNI,
      profile: {
        create: {
          fullName: 'Anna Kowalski',
          phone: '+48-22-123-4567',
          country: 'Poland',
          currentStatus: ResidentStatus.ALUMNI,
        },
      },
    },
  });

  const summer2026 = await prisma.season.upsert({
    where: { slug: 'summer-2026' },
    update: {},
    create: {
      name: 'Summer 2026',
      slug: 'summer-2026',
      year: 2026,
      term: 'Summer',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-09-30'),
      isActive: true,
      description: 'Summer J1 cohort 2026',
    },
  });

  const winter2026 = await prisma.season.upsert({
    where: { slug: 'winter-2026' },
    update: {},
    create: {
      name: 'Winter 2026',
      slug: 'winter-2026',
      year: 2026,
      term: 'Winter',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2027-03-31'),
      isActive: false,
      description: 'Winter seasonal workers 2026',
    },
  });

  const summer2027 = await prisma.season.upsert({
    where: { slug: 'summer-2027' },
    update: {},
    create: {
      name: 'Summer 2027',
      slug: 'summer-2027',
      year: 2027,
      term: 'Summer',
      startDate: new Date('2027-05-01'),
      endDate: new Date('2027-09-30'),
      isActive: false,
      description: 'Summer J1 cohort 2027',
    },
  });

  await prisma.seasonResident.upsert({
    where: { userId_seasonId: { userId: resident.id, seasonId: summer2026.id } },
    update: {},
    create: {
      userId: resident.id,
      seasonId: summer2026.id,
      status: ResidentStatus.ACTIVE_RESIDENT,
    },
  });

  await prisma.seasonResident.upsert({
    where: { userId_seasonId: { userId: alumni.id, seasonId: summer2026.id } },
    update: {},
    create: {
      userId: alumni.id,
      seasonId: summer2026.id,
      status: ResidentStatus.ALUMNI,
      leftAt: new Date('2025-09-15'),
    },
  });

  await prisma.application.upsert({
    where: { userId_seasonId: { userId: applicant.id, seasonId: summer2026.id } },
    update: {},
    create: {
      userId: applicant.id,
      seasonId: summer2026.id,
      status: 'PENDING',
    },
  });

  const existingProperty = await prisma.property.findFirst({ where: { name: 'Hideaway Holler Main' } });
  if (existingProperty) {
    await ensureAnimalHouses(existingProperty.id);
    console.log('Seed completed (data already exists).');
    return;
  }

  const property = await prisma.property.create({
    data: {
      name: 'Hideaway Holler Main',
      address: '123 Holler Lane',
      city: 'Sevierville',
      state: 'TN',
      zipCode: '37862',
      description: 'Primary J1 student housing property',
      buildings: {
        create: {
          name: 'Building A',
          floors: 2,
          rooms: {
            create: [
              {
                roomNumber: '101',
                capacity: 2,
                floor: 1,
                beds: { create: [{ bedLabel: 'A' }, { bedLabel: 'B' }] },
              },
              {
                roomNumber: '102',
                capacity: 2,
                floor: 1,
                beds: { create: [{ bedLabel: 'A' }, { bedLabel: 'B' }] },
              },
              {
                roomNumber: '201',
                capacity: 4,
                floor: 2,
                beds: { create: [{ bedLabel: 'A' }, { bedLabel: 'B' }, { bedLabel: 'C' }, { bedLabel: 'D' }] },
              },
            ],
          },
        },
      },
    },
    include: { buildings: { include: { rooms: { include: { beds: true } } } } },
  });

  const room101 = property.buildings[0].rooms[0];
  const bedA = room101.beds[0];

  await ensureAnimalHouses(property.id);

  await prisma.roomAssignment.create({
    data: {
      userId: resident.id,
      roomId: room101.id,
      bedId: bedA.id,
      seasonId: summer2026.id,
    },
  });

  await prisma.lease.create({
    data: {
      userId: resident.id,
      seasonId: summer2026.id,
      title: 'Summer 2026 Housing Agreement',
      sentAt: new Date('2026-04-01'),
      signedAt: new Date('2026-04-10'),
      expiresAt: new Date('2026-09-30'),
      acknowledged: true,
      acknowledgedAt: new Date('2026-04-10'),
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        userId: resident.id,
        seasonId: summer2026.id,
        type: PaymentType.DEPOSIT,
        description: 'Security deposit',
        amountDue: 500,
        amountPaid: 500,
        balance: 0,
        dueDate: new Date('2026-04-15'),
        status: PaymentStatus.PAID,
      },
      {
        userId: resident.id,
        seasonId: summer2026.id,
        type: PaymentType.RENT,
        description: 'May 2026 rent',
        amountDue: 650,
        amountPaid: 650,
        balance: 0,
        dueDate: new Date('2026-05-01'),
        status: PaymentStatus.PAID,
      },
      {
        userId: resident.id,
        seasonId: summer2026.id,
        type: PaymentType.RENT,
        description: 'June 2026 rent',
        amountDue: 650,
        amountPaid: 325,
        balance: 325,
        dueDate: new Date('2026-06-01'),
        status: PaymentStatus.PARTIAL,
      },
    ],
  });

  await prisma.notice.createMany({
    data: [
      {
        seasonId: summer2026.id,
        title: 'Community Quiet Hours',
        content: 'Quiet hours are 10 PM to 7 AM daily. Please respect your neighbors.',
        category: NoticeCategory.RULES,
        isPinned: true,
        createdBy: admin.id,
      },
      {
        seasonId: summer2026.id,
        title: 'Welcome Summer 2026!',
        content: 'Welcome to Hideaway Holler! Check your dashboard for check-in steps.',
        category: NoticeCategory.COMMUNITY,
        createdBy: admin.id,
      },
      {
        title: 'Severe Weather Advisory',
        content: 'Monitor local weather. Shelter in place during tornado warnings.',
        category: NoticeCategory.WEATHER,
        createdBy: admin.id,
      },
    ],
  });

  await prisma.maintenanceRequest.create({
    data: {
      userId: resident.id,
      category: 'PLUMBING',
      description: 'Bathroom sink is draining slowly.',
      status: MaintenanceStatus.OPEN,
    },
  });

  const album = await prisma.galleryAlbum.create({
    data: {
      seasonId: summer2026.id,
      title: 'Property Photos',
      description: 'Views of Hideaway Holler',
    },
  });

  await prisma.localGuide.createMany({
    data: [
      { name: 'Texas Roadhouse', category: LocalGuideCategory.FOOD, address: '1414 Parkway, Sevierville, TN', phone: '865-429-9900', description: 'American steakhouse', isFeatured: true },
      { name: 'Walmart Supercenter', category: LocalGuideCategory.SHOPPING, address: '1414 Parkway, Sevierville, TN', phone: '865-429-1234', description: 'Groceries and essentials' },
      { name: 'Sevier County Ambulance', category: LocalGuideCategory.HEALTHCARE, phone: '865-453-6315', description: 'Emergency medical services' },
      { name: 'First Tennessee Bank', category: LocalGuideCategory.BANKS, address: '123 Main St, Sevierville, TN', phone: '865-453-2000' },
      { name: 'Dollywood', category: LocalGuideCategory.ATTRACTIONS, address: '2700 Dollywood Parks Blvd, Pigeon Forge, TN', website: 'https://www.dollywood.com', mapLink: 'https://maps.google.com', isFeatured: true },
      { name: 'Sevierville Police', category: LocalGuideCategory.EMERGENCY, phone: '865-453-5506', description: 'Non-emergency line' },
    ],
  });

  await prisma.emergencyContact.createMany({
    data: [
      { label: '911', phone: '911', description: 'Life-threatening emergencies', sortOrder: 1 },
      { label: 'Property Management', phone: '+1-865-555-0100', description: 'Hideaway Holler office', sortOrder: 2 },
      { label: 'Maintenance Hotline', phone: '+1-865-555-0101', description: 'Urgent maintenance', sortOrder: 3 },
      { label: 'LeConte Medical Center', phone: '865-446-7000', description: 'Nearest hospital', sortOrder: 4 },
      { label: 'Sevierville Police', phone: '865-453-5506', sortOrder: 5 },
      { label: 'Sponsor Contact', phone: 'See your profile', description: 'Your program sponsor', sortOrder: 6 },
    ],
  });

  await prisma.checkIn.create({
    data: {
      userId: resident.id,
      seasonId: summer2026.id,
      arrivalConfirmed: true,
      rulesAccepted: true,
      roomCondition: 'Good condition, minor wear on carpet.',
      adminApproved: true,
      adminApprovedAt: new Date('2026-05-15'),
      completedAt: new Date('2026-05-15'),
    },
  });

  console.log('Seed completed.');
  console.log('Admin: admin@hideawayholler.com / password123');
  console.log('Resident: maria@example.com / password123');
  console.log('Applicant: juan@example.com / password123');
  console.log('Alumni: anna@example.com / password123');
}

async function ensureAnimalHouses(propertyId: string) {
  const houses = ['Bear House', 'Deer House', 'Elk House', 'Fox House'];

  for (const house of houses) {
    let building = await prisma.building.findFirst({ where: { propertyId, name: house } });
    if (!building) {
      building = await prisma.building.create({
        data: { propertyId, name: house, floors: 1 },
      });
    }

    for (let residentSpace = 1; residentSpace <= 8; residentSpace += 1) {
      const roomNumber = `${house.replace(' House', '')}-${residentSpace}`;
      const existingRoom = await prisma.room.findFirst({
        where: { buildingId: building.id, roomNumber },
      });
      if (!existingRoom) {
        await prisma.room.create({
          data: {
            buildingId: building.id,
            roomNumber,
            capacity: 1,
            floor: 1,
            notes: 'Animal-themed house resident space',
            beds: { create: [{ bedLabel: 'Resident' }] },
          },
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
