import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const products = await prisma.product.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true, nameEn: true } },
      _count: { select: { cashValueEntries: true } },
    },
  });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const product = await prisma.product.create({
    data: {
      companyId: body.companyId,
      name: body.name,
      nameEn: body.nameEn || null,
      currency: body.currency || "USD",
      premiumTerms: JSON.stringify(body.premiumTerms || []),
      minPremium: body.minPremium ? Number(body.minPremium) : null,
      maxEntryAge: body.maxEntryAge ? Number(body.maxEntryAge) : null,
      minEntryAge: body.minEntryAge ? Number(body.minEntryAge) : null,
      fulfillmentRatio: body.fulfillmentRatio ? Number(body.fulfillmentRatio) : null,
      policyFeatures: body.policyFeatures || null,
      brochureUrl: body.brochureUrl || null,
      notes: body.notes || null,
    },
    include: { company: { select: { id: true, name: true, nameEn: true } } },
  });
  return NextResponse.json(product, { status: 201 });
}
