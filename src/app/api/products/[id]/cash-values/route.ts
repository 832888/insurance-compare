import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const body = await request.json();

  // body.entries is an array of cash value rows
  const entries = body.entries as Array<{
    entryAge: number;
    gender: string;
    smoker: boolean;
    annualPremium: number;
    premiumTerm: number;
    totalPremium: number;
    policyYear: number;
    guaranteedCV: number;
    nonGuaranteedCV: number;
    totalCV: number;
    guaranteedDeathBenefit: number;
    totalDeathBenefit: number;
  }>;

  // Upsert each entry
  const results = await Promise.all(
    entries.map((entry) =>
      prisma.cashValueEntry.upsert({
        where: {
          productId_entryAge_gender_smoker_annualPremium_premiumTerm_policyYear: {
            productId,
            entryAge: entry.entryAge,
            gender: entry.gender,
            smoker: entry.smoker,
            annualPremium: entry.annualPremium,
            premiumTerm: entry.premiumTerm,
            policyYear: entry.policyYear,
          },
        },
        create: { productId, ...entry },
        update: entry,
      })
    )
  );

  return NextResponse.json({ count: results.length }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const { searchParams } = new URL(request.url);
  const entryAge = searchParams.get("entryAge");
  const gender = searchParams.get("gender");
  const annualPremium = searchParams.get("annualPremium");
  const premiumTerm = searchParams.get("premiumTerm");

  const where: Record<string, unknown> = { productId };
  if (entryAge) where.entryAge = Number(entryAge);
  if (gender) where.gender = gender;
  if (annualPremium) where.annualPremium = Number(annualPremium);
  if (premiumTerm) where.premiumTerm = Number(premiumTerm);

  const result = await prisma.cashValueEntry.deleteMany({ where });
  return NextResponse.json({ deleted: result.count });
}
