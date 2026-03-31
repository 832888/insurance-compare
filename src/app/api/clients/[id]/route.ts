import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      schemes: {
        orderBy: { updatedAt: "desc" },
        include: {
          products: {
            include: { product: { include: { company: true } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const client = await prisma.client.update({
    where: { id },
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
  return NextResponse.json(client);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
