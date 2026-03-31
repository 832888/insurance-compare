import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * IRR calculation using Newton-Raphson method.
 * cashflows: array of cash flows, where negative = outflow, positive = inflow
 */
export function calculateIRR(cashflows: number[], guess = 0.05, maxIter = 1000, tolerance = 1e-7): number | null {
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += cashflows[t] / factor;
      dnpv -= (t * cashflows[t]) / (factor * (1 + rate));
    }
    if (Math.abs(npv) < tolerance) return rate;
    const newRate = rate - npv / dnpv;
    if (!isFinite(newRate)) return null;
    rate = newRate;
  }
  return Math.abs(rate) < 1 ? rate : null;
}

/**
 * Build cashflows for IRR: premiums paid as outflows, cash value at target year as inflow.
 */
export function buildCashflowsForIRR(
  annualPremium: number,
  premiumTerm: number,
  cashValueAtYear: number,
  targetYear: number
): number[] {
  const cashflows: number[] = [];
  for (let y = 0; y < targetYear; y++) {
    cashflows.push(y < premiumTerm ? -annualPremium : 0);
  }
  cashflows[cashflows.length - 1] += cashValueAtYear;
  return cashflows;
}
