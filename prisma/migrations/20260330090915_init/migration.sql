-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "logoUrl" TEXT,
    "rating" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "premiumTerms" TEXT NOT NULL,
    "minPremium" REAL,
    "maxEntryAge" INTEGER,
    "minEntryAge" INTEGER,
    "policyFeatures" TEXT,
    "fulfillmentRatio" REAL,
    "brochureUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashValueEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "smoker" BOOLEAN NOT NULL DEFAULT false,
    "annualPremium" REAL NOT NULL,
    "premiumTerm" INTEGER NOT NULL,
    "totalPremium" REAL NOT NULL,
    "policyYear" INTEGER NOT NULL,
    "guaranteedCV" REAL NOT NULL DEFAULT 0,
    "nonGuaranteedCV" REAL NOT NULL DEFAULT 0,
    "totalCV" REAL NOT NULL DEFAULT 0,
    "guaranteedDeathBenefit" REAL NOT NULL DEFAULT 0,
    "totalDeathBenefit" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "CashValueEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancingBank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankName" TEXT NOT NULL,
    "maxLtv" REAL NOT NULL,
    "interestType" TEXT NOT NULL,
    "baseRate" REAL,
    "spread" REAL,
    "capRate" REAL,
    "fixedRate" REAL,
    "minLoanAmount" REAL,
    "maxLoanTerm" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CashValueEntry_productId_idx" ON "CashValueEntry"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CashValueEntry_productId_entryAge_gender_smoker_annualPremium_premiumTerm_policyYear_key" ON "CashValueEntry"("productId", "entryAge", "gender", "smoker", "annualPremium", "premiumTerm", "policyYear");
