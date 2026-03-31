import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const banks = await prisma.financingBank.findMany({ orderBy: { bankName: "asc" } });
  return NextResponse.json(banks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const bank = await prisma.financingBank.create({
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
  return NextResponse.json(bank, { status: 201 });
}
