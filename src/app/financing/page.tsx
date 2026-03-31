"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, AlertTriangle, Printer, Save, FileDown } from "lucide-react";
import { SaveSchemeDialog } from "@/components/save-scheme-dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine,
} from "recharts";
import { formatCurrency, formatPercent, calculateIRR } from "@/lib/utils";
import { calculateFinancingReturns, stressTest, findBreakevenRate, type FinancingParams } from "@/lib/financing";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Product {
  id: string;
  name: string;
  currency: string;
  company: { name: string };
  _count?: { cashValueEntries: number };
}

interface CashValueEntry {
  policyYear: number;
  guaranteedCV: number;
  nonGuaranteedCV: number;
  totalCV: number;
  annualPremium: number;
  premiumTerm: number;
  totalPremium: number;
}

interface ProductDetail {
  id: string;
  name: string;
  currency: string;
  company: { name: string };
  cashValueEntries: CashValueEntry[];
}

export default function FinancingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [ltv, setLtv] = useState("0.8");
  const [interestRate, setInterestRate] = useState("0.045");
  const [analyzed, setAnalyzed] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => { setLocale(getSavedLocale()); }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleAnalyze() {
    if (!selectedProductId) return;
    const res = await fetch(`/api/products/${selectedProductId}`);
    const data = await res.json();
    setProductDetail(data);
    setAnalyzed(true);
  }

  const entries = productDetail?.cashValueEntries ?? [];
  const firstEntry = entries[0];
  const totalPremium = firstEntry?.totalPremium ?? 0;
  const annualPremium = firstEntry?.annualPremium ?? 0;
  const premiumTerm = firstEntry?.premiumTerm ?? 0;

  const financingParams: FinancingParams | null = useMemo(() => {
    if (!analyzed || entries.length === 0) return null;
    return {
      totalPremium,
      ltv: Number(ltv),
      annualInterestRate: Number(interestRate),
      cashValues: entries.map((e) => ({
        year: e.policyYear,
        guaranteedCV: e.guaranteedCV,
        totalCV: e.totalCV,
      })),
    };
  }, [analyzed, entries, totalPremium, ltv, interestRate]);

  const results = useMemo(() => {
    if (!financingParams) return [];
    return calculateFinancingReturns(financingParams);
  }, [financingParams]);

  const stressResults = useMemo(() => {
    if (!financingParams) return { plus1: [], plus2: [], plus3: [] };
    return {
      plus1: stressTest(financingParams, 0.01),
      plus2: stressTest(financingParams, 0.02),
      plus3: stressTest(financingParams, 0.03),
    };
  }, [financingParams]);

  const breakevenRates = useMemo(() => {
    if (!financingParams) return {};
    const milestones = [10, 15, 20, 25, 30];
    const rates: Record<number, { guaranteed: number | null; total: number | null }> = {};
    milestones.forEach((y) => {
      rates[y] = {
        guaranteed: findBreakevenRate(financingParams, y, true),
        total: findBreakevenRate(financingParams, y, false),
      };
    });
    return rates;
  }, [financingParams]);

  const netIRRData = useMemo(() => {
    if (results.length === 0) return [];
    const loanAmount = totalPremium * Number(ltv);
    const selfPaid = totalPremium - loanAmount;
    const rate = Number(interestRate);

    return results.map((r) => {
      const yearlyOutflow = r.year <= premiumTerm
        ? (annualPremium - (r.year === 1 ? loanAmount : 0)) + loanAmount * rate
        : loanAmount * rate;

      const cashflows: number[] = [];
      for (let y = 1; y <= r.year; y++) {
        if (y === 1) {
          cashflows.push(-selfPaid - loanAmount * rate);
        } else {
          cashflows.push(-loanAmount * rate);
        }
      }
      cashflows[cashflows.length - 1] += r.totalCV - loanAmount;

      const gCashflows: number[] = [];
      for (let y = 1; y <= r.year; y++) {
        if (y === 1) {
          gCashflows.push(-selfPaid - loanAmount * rate);
        } else {
          gCashflows.push(-loanAmount * rate);
        }
      }
      gCashflows[gCashflows.length - 1] += r.guaranteedCV - loanAmount;

      return {
        year: r.year,
        totalNetIRR: calculateIRR(cashflows),
        guaranteedNetIRR: calculateIRR(gCashflows),
        totalNetReturn: r.totalNetReturn,
        guaranteedNetReturn: r.guaranteedNetReturn,
      };
    });
  }, [results, totalPremium, ltv, interestRate, annualPremium, premiumTerm]);

  const chartData = useMemo(() => {
    return results.map((r, i) => ({
      year: r.year,
      netReturn: r.totalNetReturn,
      guaranteedNetReturn: r.guaranteedNetReturn,
      stressPlus1: stressResults.plus1[i]?.totalNetReturn ?? 0,
      stressPlus2: stressResults.plus2[i]?.totalNetReturn ?? 0,
      stressPlus3: stressResults.plus3[i]?.totalNetReturn ?? 0,
    }));
  }, [results, stressResults]);

  const loanAmount = totalPremium * Number(ltv);
  const selfPaid = totalPremium - loanAmount;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("page.financing.title", locale)}</h1>
      <p className="text-gray-500 mb-6">{t("page.financing.desc", locale)}</p>

      <Card className="mb-6">
        <CardHeader><CardTitle>分析参数</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>选择产品 *</Label>
              <Select className="mt-1.5" value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); setAnalyzed(false); }}>
                <option value="">-- 选择产品 --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.company.name} - {p.name}
                    {(p._count?.cashValueEntries ?? 0) === 0 ? " [无数据]" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>贷款成数 (LTV)</Label>
              <Input className="mt-1.5" type="number" step="0.01" value={ltv} onChange={(e) => { setLtv(e.target.value); setAnalyzed(false); }} placeholder="如：0.8 = 80%" />
            </div>
            <div>
              <Label>年利率（小数）</Label>
              <Input className="mt-1.5" type="number" step="0.001" value={interestRate} onChange={(e) => { setInterestRate(e.target.value); setAnalyzed(false); }} placeholder="如：0.045 = 4.5%" />
            </div>
          </div>
          <Button className="mt-4" onClick={handleAnalyze} disabled={!selectedProductId}>
            <Calculator className="h-4 w-4 mr-2" />
            开始分析
          </Button>
        </CardContent>
      </Card>

      {analyzed && productDetail && results.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-lg font-semibold text-gray-900">
              {productDetail.company.name} - {productDetail.name} · 融资分析报告
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
                <Save className="h-4 w-4 mr-2" />
                {t("common.save_scheme", locale)}
              </Button>
              <Button variant="outline" onClick={async () => {
                const res = await fetch("/api/export/financing", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: selectedProductId, ltv: Number(ltv), interestRate: Number(interestRate) }),
                });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `financing_${Date.now()}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <FileDown className="h-4 w-4 mr-2" />
                {t("common.export_excel", locale)}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                {t("common.export_pdf", locale)}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">总保费</p>
                <p className="text-xl font-bold">{formatCurrency(totalPremium, productDetail.currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">贷款金额</p>
                <p className="text-xl font-bold">{formatCurrency(loanAmount, productDetail.currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">自付首期</p>
                <p className="text-xl font-bold">{formatCurrency(selfPaid, productDetail.currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">年利息支出</p>
                <p className="text-xl font-bold">{formatCurrency(loanAmount * Number(interestRate), productDetail.currency)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Net Return Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                净回报走势（含压力测试）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: "保单年度", position: "insideBottom", offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), productDetail.currency)} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="netReturn" name="预期净回报" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="guaranteedNetReturn" name="保证净回报" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="stressPlus1" name="利率 +1%" stroke="#d97706" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="stressPlus2" name="利率 +2%" stroke="#ea580c" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="stressPlus3" name="利率 +3%" stroke="#dc2626" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card className="mb-6">
            <CardHeader><CardTitle>逐年融资分析明细</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">年度</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">累计利息</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">保证现金价值</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">预期现金价值</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">保证净回报</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">预期净回报</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">净 IRR (预期)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter((_, i) => {
                      const y = i + 1;
                      return y <= 5 || y % 5 === 0;
                    }).map((r) => {
                      const irrData = netIRRData.find((d) => d.year === r.year);
                      return (
                        <tr key={r.year} className="border-b hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-medium text-gray-700">第 {r.year} 年</td>
                          <td className="px-4 py-2.5 text-right text-red-600">
                            {formatCurrency(r.cumulativeInterest, productDetail.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {formatCurrency(r.guaranteedCV, productDetail.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {formatCurrency(r.totalCV, productDetail.currency)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${r.guaranteedNetReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(r.guaranteedNetReturn, productDetail.currency)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${r.totalNetReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(r.totalNetReturn, productDetail.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {irrData?.totalNetIRR != null ? formatPercent(irrData.totalNetIRR) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Breakeven Rate & Stress Test */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Break-even 利率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">当贷款利率达到以下水平时，净回报为零</p>
                <div className="space-y-3">
                  {Object.entries(breakevenRates).map(([year, rates]) => (
                    <div key={year} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">第 {year} 年</span>
                      <div className="flex gap-4">
                        <span className="text-sm">
                          保证：<span className="font-medium">{rates.guaranteed ? formatPercent(rates.guaranteed) : "N/A"}</span>
                        </span>
                        <span className="text-sm">
                          预期：<span className="font-medium text-blue-600">{rates.total ? formatPercent(rates.total) : "N/A"}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>压力测试摘要（第 20 年）</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">利率上升对第 20 年净回报的影响</p>
                <div className="space-y-3">
                  {[
                    { label: `基准 (${formatPercent(Number(interestRate))})`, data: results },
                    { label: `+1% (${formatPercent(Number(interestRate) + 0.01)})`, data: stressResults.plus1 },
                    { label: `+2% (${formatPercent(Number(interestRate) + 0.02)})`, data: stressResults.plus2 },
                    { label: `+3% (${formatPercent(Number(interestRate) + 0.03)})`, data: stressResults.plus3 },
                  ].map((scenario) => {
                    const r = scenario.data.find((d) => d.year === 20);
                    return (
                      <div key={scenario.label} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{scenario.label}</span>
                        <span className={`text-sm font-medium ${(r?.totalNetReturn ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {r ? formatCurrency(r.totalNetReturn, productDetail.currency) : "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!analyzed && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Calculator className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">选择产品并设置融资参数</p>
            <p className="text-sm mt-1">点击「开始分析」查看融资方案的详细回报分析</p>
          </CardContent>
        </Card>
      )}

      <SaveSchemeDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        type="FINANCING"
        productIds={selectedProductId ? [selectedProductId] : []}
        defaultTitle={
          productDetail
            ? `${productDetail.company.name} ${productDetail.name} 融资方案`
            : ""
        }
        financingParams={{ productId: selectedProductId, ltv: Number(ltv), interestRate: Number(interestRate) }}
      />
    </div>
  );
}
