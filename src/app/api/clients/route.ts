import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { schemes: true } } },
  });
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      age: body.age ? Number(body.age) : null,
      gender: body.gender || null,
      smoker: body.smoker === true || body.smoker === "true",
      budget: body.budget ? Number(body.budget) : null,
      currency: body.currency || null,
      occupation: body.occupation || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(client, { status: 201 });
}
