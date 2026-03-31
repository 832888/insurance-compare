"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { GitCompareArrows, Plus, X, Printer, Save, FileDown } from "lucide-react";
import { SaveSchemeDialog } from "@/components/save-scheme-dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { calculateIRR, buildCashflowsForIRR, formatCurrency, formatPercent } from "@/lib/utils";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Company { id: string; name: string; nameEn: string | null; }
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
  guaranteedCV: number;
  nonGuaranteedCV: number;
  totalCV: number;
  guaranteedDeathBenefit: number;
  totalDeathBenefit: number;
  annualPremium: number;
  premiumTerm: number;
  totalPremium: number;
}
interface ProductDetail {
  id: string;
  name: string;
  currency: string;
  premiumTerms: string;
  fulfillmentRatio: number | null;
  company: Company;
  cashValueEntries: CashValueEntry[];
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626"];
const COLOR_NAMES = ["蓝色", "绿色", "橙色", "红色"];

export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => { setLocale(getSavedLocale()); }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = () => {
    if (selectedIds.length >= 4) return;
    setSelectedIds((prev) => [...prev, ""]);
  };

  const removeProduct = (index: number) => {
    setSelectedIds((prev) => prev.filter((_, i) => i !== index));
    setProductDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, productId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = productId;
      return next;
    });
  };

  const handleCompare = async () => {
    const validIds = selectedIds.filter(Boolean);
    if (validIds.length < 2) {
      alert("请至少选择 2 个产品进行对比");
      return;
    }
    setLoading(true);
    const details = await Promise.all(
      validIds.map(async (pid) => {
        const res = await fetch(`/api/products/${pid}`);
        return res.json() as Promise<ProductDetail>;
      })
    );
    setProductDetails(details);
    setLoading(false);
  };

  const chartData = useMemo(() => {
    if (productDetails.length === 0) return [];
    const maxYear = Math.max(
      ...productDetails.map((p) =>
        p.cashValueEntries.length > 0
          ? Math.max(...p.cashValueEntries.map((e) => e.policyYear))
          : 0
      )
    );
    const data = [];
    for (let y = 1; y <= maxYear; y++) {
      const point: Record<string, unknown> = { year: y };
      productDetails.forEach((p, i) => {
        const entry = p.cashValueEntries.find((e) => e.policyYear === y);
        point[`total_${i}`] = entry?.totalCV ?? null;
        point[`guaranteed_${i}`] = entry?.guaranteedCV ?? null;
      });
      data.push(point);
    }
    return data;
  }, [productDetails]);

  const irrTable = useMemo(() => {
    const milestones = [5, 10, 15, 20, 25, 30];
    return milestones.map((year) => {
      const row: Record<string, unknown> = { year };
      productDetails.forEach((p, i) => {
        const entry = p.cashValueEntries.find((e) => e.policyYear === year);
        if (entry) {
          const gFlows = buildCashflowsForIRR(entry.annualPremium, entry.premiumTerm, entry.guaranteedCV, year);
          const tFlows = buildCashflowsForIRR(entry.annualPremium, entry.premiumTerm, entry.totalCV, year);
          row[`gIRR_${i}`] = calculateIRR(gFlows);
          row[`tIRR_${i}`] = calculateIRR(tFlows);
          row[`totalPremium_${i}`] = entry.totalPremium;
          row[`guaranteedCV_${i}`] = entry.guaranteedCV;
          row[`totalCV_${i}`] = entry.totalCV;
        }
      });
      return row;
    });
  }, [productDetails]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("page.compare.title", locale)}</h1>
      <p className="text-gray-500 mb-6">{t("page.compare.desc", locale)}</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择对比产品</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedIds.map((sid, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i] }}
                />
                <Select
                  className="flex-1"
                  value={sid}
                  onChange={(e) => selectProduct(i, e.target.value)}
                >
                  <option value="">-- 选择产品 --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company.name} - {p.name} ({p.currency})
                      {(p._count?.cashValueEntries ?? 0) === 0 ? " [无数据]" : ""}
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeProduct(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={addProduct} disabled={selectedIds.length >= 4}>
              <Plus className="h-4 w-4 mr-2" />
              添加产品
            </Button>
            <Button onClick={handleCompare} disabled={loading || selectedIds.filter(Boolean).length < 2}>
              <GitCompareArrows className="h-4 w-4 mr-2" />
              {loading ? "加载中..." : "开始对比"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {productDetails.length >= 2 && (
        <>
          <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
              <Save className="h-4 w-4 mr-2" />
              {t("common.save_scheme", locale)}
            </Button>
            <Button variant="outline" onClick={async () => {
              const res = await fetch("/api/export/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: selectedIds.filter(Boolean) }),
              });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `comparison_${Date.now()}.xlsx`;
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

          {/* Cash Value Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>现金价值增长曲线</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-3">
                {productDetails.map((p, i) => (
                  <Badge key={p.id} style={{ backgroundColor: COLORS[i], color: "#fff" }}>
                    {p.company.name} - {p.name}
                  </Badge>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: "保单年度", position: "insideBottom", offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  {productDetails.map((p, i) => (
                    <Line
                      key={`total_${i}`}
                      type="monotone"
                      dataKey={`total_${i}`}
                      name={`${p.name} (预期)`}
                      stroke={COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                  {productDetails.map((p, i) => (
                    <Line
                      key={`guaranteed_${i}`}
                      type="monotone"
                      dataKey={`guaranteed_${i}`}
                      name={`${p.name} (保证)`}
                      stroke={COLORS[i]}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* IRR Comparison Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>IRR 内部回报率对比</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">年度</th>
                      {productDetails.map((p, i) => (
                        <th key={p.id} colSpan={2} className="px-4 py-3 text-center font-medium" style={{ color: COLORS[i] }}>
                          {p.company.name} - {p.name}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b bg-gray-50/50">
                      <th className="px-4 py-2"></th>
                      {productDetails.map((p) => (
                        <Fragment key={p.id}>
                          <th className="px-4 py-2 text-center text-xs text-gray-500 font-normal">保证 IRR</th>
                          <th className="px-4 py-2 text-center text-xs text-gray-500 font-normal">预期 IRR</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {irrTable.map((row) => (
                      <tr key={row.year as number} className="border-b hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-700">第 {row.year as number} 年</td>
                        {productDetails.map((_, i) => {
                          const gIRR = row[`gIRR_${i}`] as number | null;
                          const tIRR = row[`tIRR_${i}`] as number | null;
                          return (
                            <Fragment key={i}>
                              <td className="px-4 py-2.5 text-center">
                                {gIRR != null ? formatPercent(gIRR) : "-"}
                              </td>
                              <td className="px-4 py-2.5 text-center font-medium">
                                {tIRR != null ? formatPercent(tIRR) : "-"}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cash Value Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>现金价值汇总</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">年度</th>
                      {productDetails.map((p, i) => (
                        <th key={p.id} colSpan={2} className="px-4 py-3 text-center font-medium" style={{ color: COLORS[i] }}>
                          {p.name}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b bg-gray-50/50">
                      <th className="px-4 py-2"></th>
                      {productDetails.map((p) => (
                        <Fragment key={p.id}>
                          <th className="px-4 py-2 text-center text-xs text-gray-500 font-normal">保证</th>
                          <th className="px-4 py-2 text-center text-xs text-gray-500 font-normal">预期总计</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {irrTable.map((row) => (
                      <tr key={row.year as number} className="border-b hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-700">第 {row.year as number} 年</td>
                        {productDetails.map((p, i) => (
                          <Fragment key={i}>
                            <td className="px-4 py-2.5 text-right">
                              {row[`guaranteedCV_${i}`] != null
                                ? formatCurrency(row[`guaranteedCV_${i}`] as number, p.currency)
                                : "-"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium">
                              {row[`totalCV_${i}`] != null
                                ? formatCurrency(row[`totalCV_${i}`] as number, p.currency)
                                : "-"}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {productDetails.length === 0 && selectedIds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <GitCompareArrows className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">开始对比</p>
            <p className="text-sm mt-1">点击「添加产品」选择要对比的储蓄分红产品</p>
          </CardContent>
        </Card>
      )}

      <SaveSchemeDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        type="COMPARE"
        productIds={selectedIds.filter(Boolean)}
        defaultTitle={
          productDetails.length >= 2
            ? productDetails.map((p) => p.name).join(" vs ")
            : ""
        }
      />
    </div>
  );
}

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
