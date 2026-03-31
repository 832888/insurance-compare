-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "smoker" BOOLEAN NOT NULL DEFAULT false,
    "budget" REAL,
    "currency" TEXT,
    "occupation" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "clientId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "compareParams" TEXT,
    "financingParams" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scheme_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchemeProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SchemeProduct_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchemeProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Scheme_clientId_idx" ON "Scheme"("clientId");

-- CreateIndex
CREATE INDEX "SchemeProduct_schemeId_idx" ON "SchemeProduct"("schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeProduct_schemeId_productId_key" ON "SchemeProduct"("schemeId", "productId");
