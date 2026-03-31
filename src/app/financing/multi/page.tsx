"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, X, Calculator, Printer } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculateFinancingReturns, type FinancingParams } from "@/lib/financing";
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

interface Scenario {
  id: string;
  label: string;
  productId: string;
  ltv: string;
  interestRate: string;
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

let scenarioCounter = 0;

function createScenario(): Scenario {
  scenarioCounter++;
  return {
    id: `s${scenarioCounter}`,
    label: `#${scenarioCounter}`,
    productId: "",
    ltv: "0.8",
    interestRate: "0.045",
  };
}

export default function MultiFinancingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([createScenario(), createScenario()]);
  const [analyzed, setAnalyzed] = useState(false);
  const [productCache, setProductCache] = useState<Record<string, ProductDetail>>({});
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => { setLocale(getSavedLocale()); }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function addScenario() {
    if (scenarios.length >= 6) return;
    setScenarios((prev) => [...prev, createScenario()]);
  }

  function removeScenario(id: string) {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    setAnalyzed(false);
  }

  function updateScenario(id: string, field: keyof Scenario, value: string) {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    setAnalyzed(false);
  }

  async function handleAnalyze() {
    const uniqueProductIds = [...new Set(scenarios.filter((s) => s.productId).map((s) => s.productId))];
    const newCache: Record<string, ProductDetail> = { ...productCache };

    for (const pid of uniqueProductIds) {
      if (!newCache[pid]) {
        const res = await fetch(`/api/products/${pid}`);
        newCache[pid] = await res.json();
      }
    }
    setProductCache(newCache);
    setAnalyzed(true);
  }

  const scenarioResults = useMemo(() => {
    if (!analyzed) return [];
    return scenarios
      .filter((s) => s.productId && productCache[s.productId])
      .map((s) => {
        const pd = productCache[s.productId];
        const entries = pd.cashValueEntries;
        if (entries.length === 0) return null;
        const firstEntry = entries[0];
        const params: FinancingParams = {
          totalPremium: firstEntry.totalPremium,
          ltv: Number(s.ltv),
          annualInterestRate: Number(s.interestRate),
          cashValues: entries.map((e) => ({
            year: e.policyYear,
            guaranteedCV: e.guaranteedCV,
            totalCV: e.totalCV,
          })),
        };
        return {
          scenario: s,
          product: pd,
          results: calculateFinancingReturns(params),
          totalPremium: firstEntry.totalPremium,
          loanAmount: firstEntry.totalPremium * Number(s.ltv),
          selfPaid: firstEntry.totalPremium * (1 - Number(s.ltv)),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [analyzed, scenarios, productCache]);

  const chartData = useMemo(() => {
    if (scenarioResults.length === 0) return [];
    const maxYear = Math.max(...scenarioResults.map((sr) => sr.results.length));
    const data = [];
    for (let y = 1; y <= maxYear; y++) {
      const point: Record<string, unknown> = { year: y };
      scenarioResults.forEach((sr, i) => {
        const r = sr.results.find((r) => r.year === y);
        point[`net_${i}`] = r?.totalNetReturn ?? null;
      });
      data.push(point);
    }
    return data;
  }, [scenarioResults]);

  const currency = scenarioResults[0]?.product.currency || "USD";
  const noDataLabel = locale === "en" ? " [no data]" : " [无数据]";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("page.multi.title", locale)}</h1>
      <p className="text-gray-500 mb-6">{t("page.multi.desc", locale)}</p>

      <Card className="mb-6">
        <CardHeader><CardTitle>{t("page.multi.setup", locale)}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scenarios.map((s, i) => (
              <div key={s.id} className="flex items-end gap-3 p-3 rounded-lg bg-gray-50">
                <span className="w-3 h-3 rounded-full shrink-0 mb-2" style={{ backgroundColor: COLORS[i] }} />
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">{t("page.multi.label", locale)}</Label>
                    <Input className="mt-1 h-9 text-sm" value={s.label} onChange={(e) => updateScenario(s.id, "label", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("page.multi.product", locale)}</Label>
                    <Select className="mt-1 h-9 text-sm" value={s.productId} onChange={(e) => updateScenario(s.id, "productId", e.target.value)}>
                      <option value="">{t("common.select_product", locale)}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.company.name} - {p.name}
                          {(p._count?.cashValueEntries ?? 0) === 0 ? noDataLabel : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">LTV</Label>
                    <Input className="mt-1 h-9 text-sm" type="number" step="0.01" value={s.ltv} onChange={(e) => updateScenario(s.id, "ltv", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("financing.interest_rate", locale)}</Label>
                    <Input className="mt-1 h-9 text-sm" type="number" step="0.001" value={s.interestRate} onChange={(e) => updateScenario(s.id, "interestRate", e.target.value)} />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 mb-0.5" onClick={() => removeScenario(s.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={addScenario} disabled={scenarios.length >= 6}>
              <Plus className="h-4 w-4 mr-2" />
              {t("page.multi.add", locale)}
            </Button>
            <Button onClick={handleAnalyze} disabled={scenarios.filter((s) => s.productId).length < 2}>
              <Calculator className="h-4 w-4 mr-2" />
              {t("common.start_compare", locale)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analyzed && scenarioResults.length >= 2 && (
        <>
          <div className="flex justify-end mb-4 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              {t("common.export_pdf", locale)}
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle>{t("page.multi.chart", locale)}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: t("insurance.policy_year", locale), position: "insideBottom", offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  {scenarioResults.map((sr, i) => (
                    <Line
                      key={sr.scenario.id}
                      type="monotone"
                      dataKey={`net_${i}`}
                      name={sr.scenario.label}
                      stroke={COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>{t("page.multi.summary", locale)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">{t("page.multi.metric", locale)}</th>
                      {scenarioResults.map((sr, i) => (
                        <th key={sr.scenario.id} className="px-4 py-3 text-center font-medium" style={{ color: COLORS[i] }}>
                          {sr.scenario.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-600">{t("page.multi.product_label", locale)}</td>
                      {scenarioResults.map((sr) => (
                        <td key={sr.scenario.id} className="px-4 py-2.5 text-center text-xs">
                          {sr.product.company.name}<br />{sr.product.name}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-600">{t("financing.total_premium", locale)}</td>
                      {scenarioResults.map((sr) => (
                        <td key={sr.scenario.id} className="px-4 py-2.5 text-center">{formatCurrency(sr.totalPremium, currency)}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-600">{t("financing.ltv", locale)} / {t("financing.interest_rate", locale)}</td>
                      {scenarioResults.map((sr) => (
                        <td key={sr.scenario.id} className="px-4 py-2.5 text-center">
                          {formatPercent(Number(sr.scenario.ltv))} / {formatPercent(Number(sr.scenario.interestRate))}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2.5 text-gray-600">{t("financing.self_paid", locale)}</td>
                      {scenarioResults.map((sr) => (
                        <td key={sr.scenario.id} className="px-4 py-2.5 text-center">{formatCurrency(sr.selfPaid, currency)}</td>
                      ))}
                    </tr>
                    {[10, 20, 30].map((year) => (
                      <tr key={year} className="border-b">
                        <td className="px-4 py-2.5 text-gray-600">{t("page.multi.net_year", locale).replace("{n}", String(year))}</td>
                        {scenarioResults.map((sr) => {
                          const r = sr.results.find((r) => r.year === year);
                          const val = r?.totalNetReturn ?? 0;
                          return (
                            <td key={sr.scenario.id} className={`px-4 py-2.5 text-center font-medium ${val >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {r ? formatCurrency(val, currency) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
