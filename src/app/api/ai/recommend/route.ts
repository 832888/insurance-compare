import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateIRR, buildCashflowsForIRR } from "@/lib/utils";

interface RecommendBody {
  age: number;
  gender: string;
  smoker: boolean;
  budget: number;
  currency: string;
}

interface ScoredProduct {
  productId: string;
  productName: string;
  companyName: string;
  currency: string;
  irr20: number | null;
  premiumTerm: number;
  annualPremium: number;
  score: number;
  reasons: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RecommendBody;
    const { age, gender, smoker, budget, currency } = body;

    if (!age || !gender || !budget || !currency) {
      return NextResponse.json(
        { error: "Missing required fields: age, gender, budget, currency" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      include: {
        company: true,
        cashValueEntries: true,
      },
    });

    const scored: ScoredProduct[] = [];

    for (const product of products) {
      if (product.cashValueEntries.length === 0) continue;

      const reasons: string[] = [];
      let score = 0;

      if (product.minEntryAge != null && age < product.minEntryAge) continue;
      if (product.maxEntryAge != null && age > product.maxEntryAge) continue;
      reasons.push(`投保年龄 ${age} 岁符合要求`);
      score += 10;

      const currencyMatch = product.currency === currency;
      if (currencyMatch) {
        score += 20;
        reasons.push(`货币匹配 (${currency})`);
      } else {
        reasons.push(`货币不同 (产品: ${product.currency})`);
      }

      const matchingEntries = product.cashValueEntries.filter(
        (e) =>
          e.entryAge === age &&
          e.gender === gender &&
          e.smoker === smoker
      );

      let entries = matchingEntries;
      if (entries.length === 0) {
        entries = product.cashValueEntries;
      }

      const premiumGroups = new Map<string, typeof entries>();
      for (const e of entries) {
        const key = `${e.annualPremium}-${e.premiumTerm}`;
        if (!premiumGroups.has(key)) premiumGroups.set(key, []);
        premiumGroups.get(key)!.push(e);
      }

      let bestIrr: number | null = null;
      let bestPremiumTerm = 0;
      let bestAnnualPremium = 0;

      for (const [, groupEntries] of premiumGroups) {
        const first = groupEntries[0];
        const year20 = groupEntries.find((e) => e.policyYear === 20);
        if (!year20) continue;

        const cashflows = buildCashflowsForIRR(
          first.annualPremium,
          first.premiumTerm,
          year20.totalCV,
          20
        );
        const irr = calculateIRR(cashflows);
        if (irr != null && (bestIrr == null || irr > bestIrr)) {
          bestIrr = irr;
          bestPremiumTerm = first.premiumTerm;
          bestAnnualPremium = first.annualPremium;
        }
      }

      if (bestIrr != null) {
        if (bestIrr >= 0.05) {
          score += 40;
          reasons.push(`20年IRR优秀 (${(bestIrr * 100).toFixed(2)}%)`);
        } else if (bestIrr >= 0.03) {
          score += 25;
          reasons.push(`20年IRR良好 (${(bestIrr * 100).toFixed(2)}%)`);
        } else if (bestIrr > 0) {
          score += 10;
          reasons.push(`20年IRR ${(bestIrr * 100).toFixed(2)}%`);
        }
      }

      if (bestAnnualPremium > 0 && bestAnnualPremium <= budget) {
        score += 15;
        reasons.push(`年缴保费在预算范围内`);
      } else if (bestAnnualPremium > 0) {
        score -= 10;
        reasons.push(`年缴保费超出预算`);
      }

      if (product.fulfillmentRatio != null && product.fulfillmentRatio >= 90) {
        score += 10;
        reasons.push(`分红实现率 ${product.fulfillmentRatio}%`);
      }

      scored.push({
        productId: product.id,
        productName: product.name,
        companyName: product.company.name,
        currency: product.currency,
        irr20: bestIrr,
        premiumTerm: bestPremiumTerm,
        annualPremium: bestAnnualPremium,
        score,
        reasons,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5);

    const recommendations = top5.map((s) => ({
      product: s.productName,
      company: s.companyName,
      currency: s.currency,
      irr20: s.irr20,
      premiumTerm: s.premiumTerm,
      annualPremium: s.annualPremium,
      score: s.score,
      reasons: s.reasons,
    }));

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommend API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
