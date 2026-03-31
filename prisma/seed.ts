import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  await prisma.systemUser.upsert({
    where: { username: "8888" },
    update: {},
    create: { username: "8888", passwordHash: hashPassword("8008") },
  });
  console.log("Default user created: username=8888");
  // Seed companies
  const aia = await prisma.company.upsert({
    where: { id: "aia" },
    update: {},
    create: { id: "aia", name: "友邦保险", nameEn: "AIA", rating: "A+", notes: "香港最大保险公司之一" },
  });
  const prudential = await prisma.company.upsert({
    where: { id: "prudential" },
    update: {},
    create: { id: "prudential", name: "保诚保险", nameEn: "Prudential", rating: "A+", notes: "英国老牌保险公司" },
  });
  const manulife = await prisma.company.upsert({
    where: { id: "manulife" },
    update: {},
    create: { id: "manulife", name: "宏利保险", nameEn: "Manulife", rating: "A+", notes: "加拿大保险巨头" },
  });

  // Seed products
  const product1 = await prisma.product.upsert({
    where: { id: "aia-evergreen3" },
    update: {},
    create: {
      id: "aia-evergreen3",
      companyId: aia.id,
      name: "盈御多元货币计划3",
      nameEn: "Evergreen Wealth 3",
      currency: "USD",
      premiumTerms: JSON.stringify([2, 5]),
      minPremium: 4000,
      minEntryAge: 0,
      maxEntryAge: 75,
      fulfillmentRatio: 100,
      notes: "AIA 旗舰储蓄分红产品",
    },
  });

  const product2 = await prisma.product.upsert({
    where: { id: "pru-elite" },
    update: {},
    create: {
      id: "pru-elite",
      companyId: prudential.id,
      name: "隽富多元货币计划",
      nameEn: "Elite",
      currency: "USD",
      premiumTerms: JSON.stringify([2, 5]),
      minPremium: 4000,
      minEntryAge: 0,
      maxEntryAge: 75,
      fulfillmentRatio: 102,
      notes: "保诚旗舰储蓄分红产品",
    },
  });

  const product3 = await prisma.product.upsert({
    where: { id: "manulife-vision" },
    update: {},
    create: {
      id: "manulife-vision",
      companyId: manulife.id,
      name: "悦目未来",
      nameEn: "Vision",
      currency: "USD",
      premiumTerms: JSON.stringify([2, 5]),
      minPremium: 4000,
      minEntryAge: 0,
      maxEntryAge: 70,
      fulfillmentRatio: 98,
      notes: "宏利储蓄分红产品",
    },
  });

  // Seed cash value data (sample: 35M non-smoker, $50,000/yr, 5yr pay)
  const sampleConditions = {
    entryAge: 35,
    gender: "M",
    smoker: false,
    annualPremium: 50000,
    premiumTerm: 5,
    totalPremium: 250000,
  };

  // AIA Evergreen 3 sample data
  const aiaData = [
    { year: 1, gCV: 0, ngCV: 0, tCV: 0, gDB: 262500, tDB: 262500 },
    { year: 2, gCV: 2500, ngCV: 500, tCV: 3000, gDB: 262500, tDB: 263000 },
    { year: 3, gCV: 45000, ngCV: 3000, tCV: 48000, gDB: 262500, tDB: 310500 },
    { year: 5, gCV: 120000, ngCV: 15000, tCV: 135000, gDB: 262500, tDB: 397500 },
    { year: 10, gCV: 145000, ngCV: 80000, tCV: 225000, gDB: 262500, tDB: 487500 },
    { year: 15, gCV: 155000, ngCV: 160000, tCV: 315000, gDB: 262500, tDB: 577500 },
    { year: 20, gCV: 170000, ngCV: 280000, tCV: 450000, gDB: 262500, tDB: 712500 },
    { year: 25, gCV: 185000, ngCV: 440000, tCV: 625000, gDB: 262500, tDB: 887500 },
    { year: 30, gCV: 200000, ngCV: 670000, tCV: 870000, gDB: 262500, tDB: 1132500 },
  ];

  // Prudential Elite sample data
  const pruData = [
    { year: 1, gCV: 0, ngCV: 0, tCV: 0, gDB: 260000, tDB: 260000 },
    { year: 2, gCV: 2000, ngCV: 600, tCV: 2600, gDB: 260000, tDB: 262600 },
    { year: 3, gCV: 44000, ngCV: 3500, tCV: 47500, gDB: 260000, tDB: 307500 },
    { year: 5, gCV: 118000, ngCV: 16000, tCV: 134000, gDB: 260000, tDB: 394000 },
    { year: 10, gCV: 142000, ngCV: 85000, tCV: 227000, gDB: 260000, tDB: 487000 },
    { year: 15, gCV: 152000, ngCV: 170000, tCV: 322000, gDB: 260000, tDB: 582000 },
    { year: 20, gCV: 166000, ngCV: 295000, tCV: 461000, gDB: 260000, tDB: 721000 },
    { year: 25, gCV: 180000, ngCV: 460000, tCV: 640000, gDB: 260000, tDB: 900000 },
    { year: 30, gCV: 195000, ngCV: 700000, tCV: 895000, gDB: 260000, tDB: 1155000 },
  ];

  // Manulife Vision sample data
  const manuData = [
    { year: 1, gCV: 0, ngCV: 0, tCV: 0, gDB: 255000, tDB: 255000 },
    { year: 2, gCV: 1800, ngCV: 400, tCV: 2200, gDB: 255000, tDB: 257200 },
    { year: 3, gCV: 42000, ngCV: 2800, tCV: 44800, gDB: 255000, tDB: 299800 },
    { year: 5, gCV: 115000, ngCV: 14000, tCV: 129000, gDB: 255000, tDB: 384000 },
    { year: 10, gCV: 140000, ngCV: 75000, tCV: 215000, gDB: 255000, tDB: 470000 },
    { year: 15, gCV: 150000, ngCV: 150000, tCV: 300000, gDB: 255000, tDB: 555000 },
    { year: 20, gCV: 163000, ngCV: 265000, tCV: 428000, gDB: 255000, tDB: 683000 },
    { year: 25, gCV: 178000, ngCV: 420000, tCV: 598000, gDB: 255000, tDB: 853000 },
    { year: 30, gCV: 192000, ngCV: 640000, tCV: 832000, gDB: 255000, tDB: 1087000 },
  ];

  const productDataMap = [
    { productId: product1.id, data: aiaData },
    { productId: product2.id, data: pruData },
    { productId: product3.id, data: manuData },
  ];

  for (const { productId, data } of productDataMap) {
    for (const row of data) {
      await prisma.cashValueEntry.upsert({
        where: {
          productId_entryAge_gender_smoker_annualPremium_premiumTerm_policyYear: {
            productId,
            entryAge: sampleConditions.entryAge,
            gender: sampleConditions.gender,
            smoker: sampleConditions.smoker,
            annualPremium: sampleConditions.annualPremium,
            premiumTerm: sampleConditions.premiumTerm,
            policyYear: row.year,
          },
        },
        update: {},
        create: {
          productId,
          ...sampleConditions,
          policyYear: row.year,
          guaranteedCV: row.gCV,
          nonGuaranteedCV: row.ngCV,
          totalCV: row.tCV,
          guaranteedDeathBenefit: row.gDB,
          totalDeathBenefit: row.tDB,
        },
      });
    }
  }

  // Seed financing banks
  await prisma.financingBank.upsert({
    where: { id: "bochk" },
    update: {},
    create: {
      id: "bochk",
      bankName: "中银香港",
      maxLtv: 0.8,
      interestType: "HIBOR_SPREAD",
      baseRate: 0.043,
      spread: 0.008,
      capRate: 0.06,
      minLoanAmount: 200000,
      maxLoanTerm: 20,
      notes: "接受大部分主流储蓄产品",
    },
  });

  await prisma.financingBank.upsert({
    where: { id: "dbs" },
    update: {},
    create: {
      id: "dbs",
      bankName: "星展银行",
      maxLtv: 0.85,
      interestType: "HIBOR_SPREAD",
      baseRate: 0.043,
      spread: 0.007,
      capRate: 0.055,
      minLoanAmount: 150000,
      maxLoanTerm: 25,
      notes: "LTV 较高，利率较低",
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
