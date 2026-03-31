import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Update products if provided
  if (body.productIds) {
    await prisma.schemeProduct.deleteMany({ where: { schemeId: id } });
    await prisma.schemeProduct.createMany({
      data: body.productIds.map((pid: string, i: number) => ({
        schemeId: id,
        productId: pid,
        sortOrder: i,
      })),
    });
  }

  const scheme = await prisma.scheme.update({
    where: { id },
    data: {
      title: body.title,
      clientId: body.clientId ?? undefined,
      status: body.status ?? undefined,
      compareParams: body.compareParams ? JSON.stringify(body.compareParams) : undefined,
      financingParams: body.financingParams ? JSON.stringify(body.financingParams) : undefined,
      notes: body.notes ?? undefined,
    },
    include: {
      client: { select: { id: true, name: true } },
      products: {
        include: { product: { include: { company: { select: { name: true } } } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json(scheme);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.scheme.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
