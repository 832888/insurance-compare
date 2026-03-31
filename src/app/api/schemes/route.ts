import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (type) where.type = type;

  const schemes = await prisma.scheme.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      products: {
        include: { product: { include: { company: { select: { name: true } } } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json(schemes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const scheme = await prisma.scheme.create({
    data: {
      title: body.title,
      clientId: body.clientId || null,
      type: body.type,
      status: body.status || "DRAFT",
      compareParams: body.compareParams ? JSON.stringify(body.compareParams) : null,
      financingParams: body.financingParams ? JSON.stringify(body.financingParams) : null,
      notes: body.notes || null,
      products: {
        create: (body.productIds || []).map((pid: string, i: number) => ({
          productId: pid,
          sortOrder: i,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      products: {
        include: { product: { include: { company: { select: { name: true } } } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json(scheme, { status: 201 });
}
