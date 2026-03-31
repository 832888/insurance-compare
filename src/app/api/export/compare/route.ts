import { prisma } from "@/lib/db";
import { generateExcelBuffer, type ExcelSheet } from "@/lib/excel-export";
import {
  calculateIRR,
  buildCashflowsForIRR,
  formatPercent,
} from "@/lib/utils";

export async function POST(request: Request) {
  const { productIds } = (await request.json()) as { productIds: string[] };

  if (!productIds || productIds.length < 2) {
    return new Response("至少需要 2 个产品", { status: 400 });
  }

  const products = await Promise.all(
    productIds.map((id) =>
      prisma.product.findUnique({
        where: { id },
        include: {
          company: true,
          cashValueEntries: { orderBy: { policyYear: "asc" } },
        },
      })
    )
  );

  const validProducts = products.filter(Boolean) as NonNullable<
    (typeof products)[number]
  >[];

  if (validProducts.length < 2) {
    return new Response("未找到足够的产品", { status: 404 });
  }

  // Sheet 1: 产品信息
  const infoSheet: ExcelSheet = {
    name: "产品信息",
    headers: ["保险公司", "产品名称", "币种", "缴费期", "分红实现率"],
    rows: validProducts.map((p) => [
      p.company.name,
      p.name,
      p.currency,
      p.premiumTerms,
      p.fulfillmentRatio != null ? `${(p.fulfillmentRatio * 100).toFixed(1)}%` : "N/A",
    ]),
  };

  // Determine max year across all products
  const maxYear = Math.max(
    ...validProducts.map((p) =>
      p.cashValueEntries.length > 0
        ? Math.max(...p.cashValueEntries.map((e) => e.policyYear))
        : 0
    )
  );

  // Sheet 2: 现金价值对比
  const cvHeaders = ["年度"];
  for (const p of validProducts) {
    cvHeaders.push(`${p.name}_保证`, `${p.name}_预期总计`);
  }

  const cvRows: (string | number | null)[][] = [];
  for (let y = 1; y <= maxYear; y++) {
    const row: (string | number | null)[] = [y];
    for (const p of validProducts) {
      const entry = p.cashValueEntries.find((e) => e.policyYear === y);
      row.push(entry?.guaranteedCV ?? null, entry?.totalCV ?? null);
    }
    cvRows.push(row);
  }

  const cvSheet: ExcelSheet = {
    name: "现金价值对比",
    headers: cvHeaders,
    rows: cvRows,
  };

  // Sheet 3: IRR对比
  const irrHeaders = ["年度"];
  for (const p of validProducts) {
    irrHeaders.push(`${p.name}_保证IRR`, `${p.name}_预期IRR`);
  }

  const irrRows: (string | number | null)[][] = [];
  for (let y = 1; y <= maxYear; y++) {
    const row: (string | number | null)[] = [y];
    for (const p of validProducts) {
      const entry = p.cashValueEntries.find((e) => e.policyYear === y);
      if (entry) {
        const gFlows = buildCashflowsForIRR(
          entry.annualPremium,
          entry.premiumTerm,
          entry.guaranteedCV,
          y
        );
        const tFlows = buildCashflowsForIRR(
          entry.annualPremium,
          entry.premiumTerm,
          entry.totalCV,
          y
        );
        const gIRR = calculateIRR(gFlows);
        const tIRR = calculateIRR(tFlows);
        row.push(
          gIRR != null ? formatPercent(gIRR) : "N/A",
          tIRR != null ? formatPercent(tIRR) : "N/A"
        );
      } else {
        row.push(null, null);
      }
    }
    irrRows.push(row);
  }

  const irrSheet: ExcelSheet = {
    name: "IRR对比",
    headers: irrHeaders,
    rows: irrRows,
  };

  const buffer = generateExcelBuffer([infoSheet, cvSheet, irrSheet]);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="comparison_${Date.now()}.xlsx"`,
    },
  });
}
