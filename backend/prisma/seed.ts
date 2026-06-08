import {
  PrismaClient,
  UserRole,
  ResidentStatus,
  NoticeCategory,
  LocalGuideCategory,
  PaymentStatus,
  PaymentType,
  MaintenanceStatus,
  ApprovalStatus,
  CommunityPostType,
  SupplyRequestStatus,
  SosAlertStatus,
  BusinessSetupFeeStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_DEMO_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_DEMO_PASSWORD is required to seed demo users.');
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);

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

  await prisma.user.upsert({
    where: { email: 'superadmin@appcreativesllc.com' },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      profile: {
        upsert: {
          create: {
            fullName: 'AppCreatives Office',
            phone: '+1-865-555-0200',
            country: 'USA',
            currentStatus: ResidentStatus.ACTIVE_RESIDENT,
          },
          update: {
            fullName: 'AppCreatives Office',
            phone: '+1-865-555-0200',
            country: 'USA',
            currentStatus: ResidentStatus.ACTIVE_RESIDENT,
          },
        },
      },
    },
    create: {
      email: 'superadmin@appcreativesllc.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      profile: {
        create: {
          fullName: 'AppCreatives Office',
          phone: '+1-865-555-0200',
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

  const resident2 = await prisma.user.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      email: 'carlos@example.com',
      passwordHash,
      role: UserRole.RESIDENT,
      profile: {
        create: {
          fullName: 'Carlos Mendez',
          phone: '+52-55-9876-5432',
          country: 'Mexico',
          currentStatus: ResidentStatus.ROOM_ASSIGNED,
        },
      },
    },
  });

  await prisma.seasonResident.upsert({
    where: { userId_seasonId: { userId: resident2.id, seasonId: summer2026.id } },
    update: {},
    create: {
      userId: resident2.id,
      seasonId: summer2026.id,
      status: ResidentStatus.ROOM_ASSIGNED,
    },
  });

  const existingProperty = await prisma.property.findFirst({ where: { name: 'Hideaway Holler Main' } });
  let property = existingProperty;
  if (!existingProperty) {
  property = await prisma.property.create({
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
  }

  if (property) {
    await ensureAnimalHouses(property.id);
  }

  if (property && !existingProperty) {
  const room101 = property.buildings[0].rooms[0];
  const bedA = room101.beds[0];

  await prisma.roomAssignment.create({
    data: {
      userId: resident.id,
      roomId: room101.id,
      bedId: bedA.id,
      seasonId: summer2026.id,
    },
  });
  }

  const existingLease = await prisma.lease.findFirst({ where: { userId: resident.id, seasonId: summer2026.id } });
  if (!existingLease) await prisma.lease.create({
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

  const paymentCount = await prisma.payment.count({ where: { userId: resident.id } });
  if (!paymentCount) await prisma.payment.createMany({
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

  const noticeCount = await prisma.notice.count();
  if (!noticeCount) await prisma.notice.createMany({
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

  const maintenanceCount = await prisma.maintenanceRequest.count();
  if (!maintenanceCount) await prisma.maintenanceRequest.create({
    data: {
      userId: resident.id,
      category: 'PLUMBING',
      description: 'Bathroom sink is draining slowly.',
      status: MaintenanceStatus.OPEN,
    },
  });

  const albumCount = await prisma.galleryAlbum.count();
  const album = albumCount ? null : await prisma.galleryAlbum.create({
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

  const emergencyCount = await prisma.emergencyContact.count();
  if (!emergencyCount) await prisma.emergencyContact.createMany({
    data: [
      { label: '911', phone: '911', description: 'Life-threatening emergencies', sortOrder: 1 },
      { label: 'Property Management', phone: '+1-865-555-0100', description: 'Hideaway Holler office', sortOrder: 2 },
      { label: 'Maintenance Hotline', phone: '+1-865-555-0101', description: 'Urgent maintenance', sortOrder: 3 },
      { label: 'LeConte Medical Center', phone: '865-446-7000', description: 'Nearest hospital', sortOrder: 4 },
      { label: 'Sevierville Police', phone: '865-453-5506', sortOrder: 5 },
      { label: 'Sponsor Contact', phone: 'See your profile', description: 'Your program sponsor', sortOrder: 6 },
    ],
  });

  const approvedCheckIn = await prisma.checkIn.findFirst({ where: { userId: resident.id, adminApproved: true } });
  if (!approvedCheckIn) {
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
  }

  const pendingCheckIn = await prisma.checkIn.findFirst({ where: { userId: resident2.id, adminApproved: false } });
  if (!pendingCheckIn) {
    await prisma.checkIn.create({
      data: {
        userId: resident2.id,
        seasonId: summer2026.id,
        arrivalConfirmed: true,
        rulesAccepted: true,
        roomCondition: 'Ready for admin review — towels and bedding requested.',
        completedAt: new Date(),
      },
    });
  }

  const supplyCount = await prisma.supplyRequest.count();
  if (!supplyCount) {
    await prisma.supplyRequest.createMany({
      data: [
        { userId: resident.id, house: 'Bear House', supplyType: 'TOILET_PAPER', quantity: 2, notes: 'Need extra bath towels', status: SupplyRequestStatus.OPEN },
        { userId: resident2.id, house: 'Elk House', supplyType: 'CLEANING_SUPPLIES', quantity: 1, notes: 'All-purpose cleaner', status: SupplyRequestStatus.OPEN },
      ],
    });
  }

  const communityCount = await prisma.communityPost.count();
  if (!communityCount) {
    await prisma.communityPost.create({
      data: {
        authorId: resident.id,
        authorRole: UserRole.RESIDENT,
        caption: 'First sunset at Hideaway Holler — welcome week memories.',
        postType: CommunityPostType.RESIDENT_MEMORY,
        approvalStatus: ApprovalStatus.APPROVED,
        images: {
          create: [{
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
            imageOrder: 0,
          }],
        },
      },
    });
    await prisma.communityPost.create({
      data: {
        authorId: resident2.id,
        authorRole: UserRole.RESIDENT,
        caption: 'Movie night in Deer House common room.',
        postType: CommunityPostType.COMMUNITY_ACTIVITY,
        approvalStatus: ApprovalStatus.PENDING,
        images: {
          create: [{
            imageUrl: 'https://images.unsplash.com/photo-1517456793572-1cca8c4fc354?auto=format&fit=crop&w=1200&q=80',
            imageOrder: 0,
          }],
        },
      },
    });
  }

  const sosCount = await prisma.sosAlert.count();
  if (!sosCount) {
    await prisma.sosAlert.create({
      data: {
        residentId: resident.id,
        residentName: 'Maria Santos',
        status: SosAlertStatus.RESOLVED,
        initialLatitude: 35.8687,
        initialLongitude: -83.5618,
        currentLatitude: 35.8687,
        currentLongitude: -83.5618,
        city: 'Sevierville',
        state: 'TN',
        adminAcknowledgedAt: new Date(Date.now() - 3600000),
        resolvedAt: new Date(Date.now() - 3000000),
      },
    });
  }

  const businessAccount = await prisma.businessAccount.findFirst({ where: { slug: 'hideaway-holler' } });
  if (businessAccount) {
    await prisma.businessAccount.update({
      where: { id: businessAccount.id },
      data: {
        setupFeeAmount: 250000,
        setupFeeStatus: BusinessSetupFeeStatus.SENT,
        billingEmail: 'billing@hideawayholler.com',
      },
    });
    await prisma.clientBillingSettings.upsert({
      where: { clientId: businessAccount.id },
      create: {
        clientId: businessAccount.id,
        setupFeeAmount: 250000,
        setupFeeStatus: BusinessSetupFeeStatus.SENT,
        monthlySubscriptionAmount: 14900,
        billingFrequency: 'MONTHLY',
        paymentDueDay: 1,
        gracePeriodDays: 7,
      },
      update: {
        setupFeeAmount: 250000,
        monthlySubscriptionAmount: 14900,
      },
    });
    await prisma.clientServiceSubscription.upsert({
      where: { businessId: businessAccount.id },
      create: {
        businessId: businessAccount.id,
        serviceSubscriptionStatus: 'active',
        introMonthlyFee: 149,
        introDurationMonths: 6,
        standardMonthlyFee: 99,
        taxRate: 0,
        billingDay: 1,
      },
      update: {
        introMonthlyFee: 149,
        standardMonthlyFee: 99,
      },
    });
  }

  console.log('Seed completed.');
  console.log('Seeded demo user emails. Passwords are configured through SEED_DEMO_PASSWORD.');
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
