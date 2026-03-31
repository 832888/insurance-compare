import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const records = await prisma.fulfillmentRecord.findMany({
    where: { productId: id },
    orderBy: { year: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const body = await request.json();

  const records = body.records as Array<{
    year: number;
    ratio: number;
    source?: string;
    notes?: string;
  }>;

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "records array is required" }, { status: 400 });
  }

  const results = await Promise.all(
    records.map((r) =>
      prisma.fulfillmentRecord.upsert({
        where: {
          productId_year: { productId, year: r.year },
        },
        create: {
          productId,
          year: r.year,
          ratio: r.ratio,
          source: r.source ?? null,
          notes: r.notes ?? null,
        },
        update: {
          ratio: r.ratio,
          source: r.source ?? null,
          notes: r.notes ?? null,
        },
      })
    )
  );

  return NextResponse.json({ count: results.length }, { status: 201 });
}
