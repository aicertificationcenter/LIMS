import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding initial data...');

  // 1. 초기 사용자 생성
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kaic.kr' },
    update: {},
    create: {
      id: 'admin',
      email: 'admin@kaic.kr',
      passwordHash: 'admin', // 실제 운영 시에는 hash 처리 필수
      name: '슈퍼관리자',
      role: 'ADMIN',
    },
  });

  const tester1 = await prisma.user.upsert({
    where: { email: 't1@kaic.kr' },
    update: {},
    create: {
      id: 'tester1',
      email: 't1@kaic.kr',
      passwordHash: '1234',
      name: '홍길동 시험원',
      role: 'TESTER',
    },
  });

  // 2. 초기 장비 정보
  await prisma.equipment.upsert({
    where: { id: 'EQ-001' },
    update: {},
    create: {
      id: 'EQ-001',
      name: 'Digital Oscilloscope',
      status: 'ACTIVE',
      lastCalibration: new Date(2023, 10, 1),
      nextCalibration: new Date(2025, 10, 1),
    },
  });

  // 3. 초기 시료 정보
  const sample1 = await prisma.sample.upsert({
    where: { barcode: 'SAMP-20241120-001' },
    update: {},
    create: {
      barcode: 'SAMP-20241120-001',
      clientId: '대한은행',
      status: 'RECEIVED',
      location: '냉동고 A-1',
    },
  });

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
