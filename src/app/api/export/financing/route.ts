import { prisma } from "@/lib/db";
import { generateExcelBuffer, type ExcelSheet } from "@/lib/excel-export";
import { calculateFinancingReturns } from "@/lib/financing";

export async function POST(request: Request) {
  const { productId, ltv, interestRate } = (await request.json()) as {
    productId: string;
    ltv: number;
    interestRate: number;
  };

  if (!productId) {
    return new Response("缺少产品 ID", { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      company: true,
      cashValueEntries: { orderBy: { policyYear: "asc" } },
    },
  });

  if (!product || product.cashValueEntries.length === 0) {
    return new Response("产品未找到或无数据", { status: 404 });
  }

  const entries = product.cashValueEntries;
  const totalPremium = entries[0].totalPremium;
  const loanAmount = totalPremium * ltv;
  const selfPaid = totalPremium - loanAmount;
  const annualInterest = loanAmount * interestRate;

  const results = calculateFinancingReturns({
    totalPremium,
    ltv,
    annualInterestRate: interestRate,
    cashValues: entries.map((e) => ({
      year: e.policyYear,
      guaranteedCV: e.guaranteedCV,
      totalCV: e.totalCV,
    })),
  });

  // Sheet 1: 融资参数
  const paramsSheet: ExcelSheet = {
    name: "融资参数",
    headers: ["参数", "值"],
    rows: [
      ["产品", `${product.company.name} - ${product.name}`],
      ["币种", product.currency],
      ["总保费", totalPremium],
      ["贷款成数 (LTV)", `${(ltv * 100).toFixed(1)}%`],
      ["贷款金额", loanAmount],
      ["自付金额", selfPaid],
      ["年利率", `${(interestRate * 100).toFixed(2)}%`],
      ["年利息支出", annualInterest],
    ],
  };

  // Sheet 2: 逐年分析
  const analysisSheet: ExcelSheet = {
    name: "逐年分析",
    headers: [
      "年度",
      "累计利息",
      "保证现金价值",
      "预期现金价值",
      "保证净回报",
      "预期净回报",
    ],
    rows: results.map((r) => [
      r.year,
      r.cumulativeInterest,
      r.guaranteedCV,
      r.totalCV,
      r.guaranteedNetReturn,
      r.totalNetReturn,
    ]),
  };

  const buffer = generateExcelBuffer([paramsSheet, analysisSheet]);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="financing_${Date.now()}.xlsx"`,
    },
  });
}
