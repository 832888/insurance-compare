import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const company = await prisma.company.update({
    where: { id },
    data: {
      name: body.name,
      nameEn: body.nameEn || null,
      logoUrl: body.logoUrl || null,
      rating: body.rating || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(company);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
