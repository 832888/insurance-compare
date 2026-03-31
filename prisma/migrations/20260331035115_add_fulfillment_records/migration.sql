-- CreateTable
CREATE TABLE "FulfillmentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "ratio" REAL NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FulfillmentRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FulfillmentRecord_productId_idx" ON "FulfillmentRecord"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentRecord_productId_year_key" ON "FulfillmentRecord"("productId", "year");
