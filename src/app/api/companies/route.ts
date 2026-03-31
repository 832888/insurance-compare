import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const company = await prisma.company.create({
    data: {
      name: body.name,
      nameEn: body.nameEn || null,
      logoUrl: body.logoUrl || null,
      rating: body.rating || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(company, { status: 201 });
}
