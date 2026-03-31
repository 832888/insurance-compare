export interface FinancingParams {
  totalPremium: number;
  ltv: number;
  annualInterestRate: number;
  cashValues: { year: number; guaranteedCV: number; totalCV: number }[];
}

export interface FinancingYearResult {
  year: number;
  loanBalance: number;
  yearlyInterest: number;
  cumulativeInterest: number;
  selfPaid: number;
  guaranteedCV: number;
  totalCV: number;
  guaranteedNetReturn: number;
  totalNetReturn: number;
}

export function calculateFinancingReturns(params: FinancingParams): FinancingYearResult[] {
  const { totalPremium, ltv, annualInterestRate, cashValues } = params;
  const loanAmount = totalPremium * ltv;
  const selfPaid = totalPremium - loanAmount;

  let cumulativeInterest = 0;
  return cashValues.map((cv) => {
    const yearlyInterest = loanAmount * annualInterestRate;
    cumulativeInterest += yearlyInterest;

    return {
      year: cv.year,
      loanBalance: loanAmount,
      yearlyInterest,
      cumulativeInterest,
      selfPaid,
      guaranteedCV: cv.guaranteedCV,
      totalCV: cv.totalCV,
      guaranteedNetReturn: cv.guaranteedCV - loanAmount - cumulativeInterest - selfPaid,
      totalNetReturn: cv.totalCV - loanAmount - cumulativeInterest - selfPaid,
    };
  });
}

export function stressTest(
  params: FinancingParams,
  rateIncrement: number
): FinancingYearResult[] {
  return calculateFinancingReturns({
    ...params,
    annualInterestRate: params.annualInterestRate + rateIncrement,
  });
}

export function findBreakevenRate(
  params: FinancingParams,
  targetYear: number,
  useGuaranteed = false
): number | null {
  const cv = params.cashValues.find((v) => v.year === targetYear);
  if (!cv) return null;

  const loanAmount = params.totalPremium * params.ltv;
  const selfPaid = params.totalPremium - loanAmount;
  const cvValue = useGuaranteed ? cv.guaranteedCV : cv.totalCV;

  // Net return = CV - loan - cumInterest - selfPaid = 0
  // CV - loan - (loan * rate * year) - selfPaid = 0
  // rate = (CV - loan - selfPaid) / (loan * year)
  const numerator = cvValue - loanAmount - selfPaid;
  const denominator = loanAmount * targetYear;
  if (denominator === 0) return null;

  const rate = numerator / denominator;
  return rate > 0 ? rate : null;
}
