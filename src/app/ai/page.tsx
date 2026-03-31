"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, Trophy, Loader2 } from "lucide-react";
import { formatPercent, calculateIRR, buildCashflowsForIRR } from "@/lib/utils";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Recommendation {
  product: string;
  company: string;
  currency: string;
  irr20: number | null;
  premiumTerm: number;
  annualPremium: number;
  score: number;
  reasons: string[];
}

interface Company {
  id: string;
  name: string;
  nameEn: string | null;
}

interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  currency: string;
  premiumTerms: string;
  company: Company;
  _count?: { cashValueEntries: number };
}

interface CashValueEntry {
  policyYear: number;
  totalCV: number;
  annualPremium: number;
  premiumTerm: number;
}

interface ProductWithIRR {
  id: string;
  name: string;
  company: string;
  currency: string;
  irr20: number | null;
}

type TabKey = "recommend" | "finder";

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommend");
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => {
    setLocale(getSavedLocale());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            {t("page.ai.title", locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("page.ai.desc", locale)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveTab("recommend")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "recommend"
              ? "border-purple-500 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Sparkles className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          {t("page.ai.tab_recommend", locale)}
        </button>
        <button
          onClick={() => setActiveTab("finder")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "finder"
              ? "border-purple-500 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Search className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          {t("page.ai.tab_finder", locale)}
        </button>
      </div>

      {activeTab === "recommend" && <RecommendTab locale={locale} />}
      {activeTab === "finder" && <FinderTab locale={locale} />}
    </div>
  );
}

function RecommendTab({ locale }: { locale: Locale }) {
  const [age, setAge] = useState("35");
  const [gender, setGender] = useState("M");
  const [smoker, setSmoker] = useState("false");
  const [budget, setBudget] = useState("50000");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(age),
          gender,
          smoker: smoker === "true",
          budget: Number(budget),
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setResults(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">{t("page.ai.conditions", locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="age">{t("page.ai.age", locale)}</Label>
              <Input id="age" type="number" min={0} max={80} value={age} onChange={(e) => setAge(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="gender">{t("gender.male", locale)} / {t("gender.female", locale)}</Label>
              <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1">
                <option value="M">{t("gender.male", locale)}</option>
                <option value="F">{t("gender.female", locale)}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="smoker">{t("page.ai.smoking", locale)}</Label>
              <Select id="smoker" value={smoker} onChange={(e) => setSmoker(e.target.value)} className="mt-1">
                <option value="false">{t("page.ai.non_smoker", locale)}</option>
                <option value="true">{t("page.ai.smoker_yes", locale)}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="budget">{t("page.ai.budget", locale)}</Label>
              <Input id="budget" type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="currency">{t("page.ai.currency", locale)}</Label>
              <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1">
                <option value="USD">USD</option>
                <option value="HKD">HKD</option>
                <option value="CNY">CNY</option>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.start_recommend", locale)}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        {error && (
          <Card>
            <CardContent className="py-8 text-center text-red-500">{error}</CardContent>
          </Card>
        )}

        {!loading && results.length === 0 && !error && (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{t("page.ai.hint", locale)}</p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-purple-400" />
              <p>{t("page.ai.analyzing", locale)}</p>
            </CardContent>
          </Card>
        )}

        {results.map((rec, idx) => (
          <Card key={idx} className={idx === 0 ? "ring-2 ring-purple-200" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  {idx < 3 ? (
                    <Trophy className={`h-5 w-5 ${medalColors[idx]}`} />
                  ) : (
                    <span className="text-sm font-bold text-gray-400">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{rec.product}</h3>
                    <Badge variant="secondary">{rec.company}</Badge>
                    <Badge>{rec.currency}</Badge>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    {rec.irr20 != null && (
                      <span>
                        20{locale === "en" ? "Y" : "年"} IRR:{" "}
                        <span className="font-semibold text-green-600">{formatPercent(rec.irr20)}</span>
                      </span>
                    )}
                    {rec.premiumTerm > 0 && (
                      <span>{locale === "en" ? `Term: ${rec.premiumTerm}Y` : `缴费期: ${rec.premiumTerm}年`}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {rec.reasons.map((r, ri) => (
                      <span key={ri} className="inline-block text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-purple-600">{rec.score}</div>
                  <div className="text-xs text-gray-400">{t("page.ai.score", locale)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FinderTab({ locale }: { locale: Locale }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [minIrr, setMinIrr] = useState("");
  const [productsWithIRR, setProductsWithIRR] = useState<ProductWithIRR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
    ]).then(([prods, comps]) => {
      setProducts(prods);
      setCompanies(comps);
      setLoading(false);
    });
  }, []);

  const computeIRRs = useCallback(async () => {
    const results: ProductWithIRR[] = [];
    for (const product of products) {
      if (!product._count?.cashValueEntries) {
        results.push({ id: product.id, name: product.name, company: product.company.name, currency: product.currency, irr20: null });
        continue;
      }
      try {
        const res = await fetch(`/api/products/${product.id}/cash-values`);
        const entries: CashValueEntry[] = await res.json();
        const year20 = entries.filter((e) => e.policyYear === 20);
        let bestIrr: number | null = null;
        for (const entry of year20) {
          const cashflows = buildCashflowsForIRR(entry.annualPremium, entry.premiumTerm, entry.totalCV, 20);
          const irr = calculateIRR(cashflows);
          if (irr != null && (bestIrr == null || irr > bestIrr)) bestIrr = irr;
        }
        results.push({ id: product.id, name: product.name, company: product.company.name, currency: product.currency, irr20: bestIrr });
      } catch {
        results.push({ id: product.id, name: product.name, company: product.company.name, currency: product.currency, irr20: null });
      }
    }
    setProductsWithIRR(results);
  }, [products]);

  useEffect(() => {
    if (products.length > 0) computeIRRs();
  }, [products, computeIRRs]);

  const filtered = productsWithIRR
    .filter((p) => {
      if (filterCompany && p.company !== filterCompany) return false;
      if (filterCurrency && p.currency !== filterCurrency) return false;
      if (minIrr && p.irr20 != null && p.irr20 < Number(minIrr) / 100) return false;
      if (minIrr && p.irr20 == null) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.irr20 == null && b.irr20 == null) return 0;
      if (a.irr20 == null) return 1;
      if (b.irr20 == null) return -1;
      return b.irr20 - a.irr20;
    });

  const uniqueCurrencies = [...new Set(products.map((p) => p.currency))];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fCompany">{locale === "en" ? "Company" : "公司"}</Label>
              <Select id="fCompany" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="mt-1">
                <option value="">{t("page.ai.all_companies", locale)}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fCurrency">{t("page.ai.currency", locale)}</Label>
              <Select id="fCurrency" value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} className="mt-1">
                <option value="">{t("page.ai.all_currencies", locale)}</option>
                {uniqueCurrencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fIrr">{t("page.ai.min_irr", locale)}</Label>
              <Input id="fIrr" type="number" step="0.1" min={0} placeholder="e.g. 3.5" value={minIrr} onChange={(e) => setMinIrr(e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
            {t("common.loading", locale)}
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Search className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>{t("page.ai.no_match", locale)}</p>
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("page.ai.results", locale)} ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">#</th>
                    <th className="px-6 py-3 font-medium text-gray-500">{locale === "en" ? "Product" : "产品名称"}</th>
                    <th className="px-6 py-3 font-medium text-gray-500">{locale === "en" ? "Company" : "公司"}</th>
                    <th className="px-6 py-3 font-medium text-gray-500">{t("page.ai.currency", locale)}</th>
                    <th className="px-6 py-3 font-medium text-gray-500">20{locale === "en" ? "Y" : "年"} IRR</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-gray-600">{p.company}</td>
                      <td className="px-6 py-3"><Badge variant="secondary">{p.currency}</Badge></td>
                      <td className="px-6 py-3">
                        {p.irr20 != null ? (
                          <span className="font-semibold text-green-600">{formatPercent(p.irr20)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
