import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      company: true,
      cashValueEntries: { orderBy: { policyYear: "asc" } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const product = await prisma.product.update({
    where: { id },
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
  });
  return NextResponse.json(product);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
