import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const bank = await prisma.financingBank.update({
    where: { id },
    data: {
      bankName: body.bankName,
      maxLtv: Number(body.maxLtv),
      interestType: body.interestType,
      baseRate: body.baseRate ? Number(body.baseRate) : null,
      spread: body.spread ? Number(body.spread) : null,
      capRate: body.capRate ? Number(body.capRate) : null,
      fixedRate: body.fixedRate ? Number(body.fixedRate) : null,
      minLoanAmount: body.minLoanAmount ? Number(body.minLoanAmount) : null,
      maxLoanTerm: body.maxLoanTerm ? Number(body.maxLoanTerm) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(bank);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.financingBank.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
