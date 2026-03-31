"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CsvImport } from "@/components/csv-import";

interface CashValueEntry {
  id: string;
  policyYear: number;
  guaranteedCV: number;
  nonGuaranteedCV: number;
  totalCV: number;
  guaranteedDeathBenefit: number;
  totalDeathBenefit: number;
}

interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  currency: string;
  premiumTerms: string;
  fulfillmentRatio: number | null;
  company: { name: string; nameEn: string | null };
  cashValueEntries: CashValueEntry[];
}

interface CashValueRow {
  policyYear: number;
  guaranteedCV: string;
  nonGuaranteedCV: string;
  totalCV: string;
  guaranteedDeathBenefit: string;
  totalDeathBenefit: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [entryAge, setEntryAge] = useState("35");
  const [gender, setGender] = useState("M");
  const [smoker, setSmoker] = useState("false");
  const [annualPremium, setAnnualPremium] = useState("50000");
  const [premiumTerm, setPremiumTerm] = useState("5");
  const [rows, setRows] = useState<CashValueRow[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchProduct = useCallback(async () => {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) return;
    const data: Product = await res.json();
    setProduct(data);
    const terms = JSON.parse(data.premiumTerms || "[]");
    if (terms.length > 0) setPremiumTerm(terms[0].toString());

    if (data.cashValueEntries.length > 0) {
      setRows(
        data.cashValueEntries.map((e) => ({
          policyYear: e.policyYear,
          guaranteedCV: e.guaranteedCV.toString(),
          nonGuaranteedCV: e.nonGuaranteedCV.toString(),
          totalCV: e.totalCV.toString(),
          guaranteedDeathBenefit: e.guaranteedDeathBenefit.toString(),
          totalDeathBenefit: e.totalDeathBenefit.toString(),
        }))
      );
    } else {
      generateEmptyRows(30);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  function generateEmptyRows(years: number) {
    setRows(
      Array.from({ length: years }, (_, i) => ({
        policyYear: i + 1,
        guaranteedCV: "",
        nonGuaranteedCV: "",
        totalCV: "",
        guaranteedDeathBenefit: "",
        totalDeathBenefit: "",
      }))
    );
  }

  function updateRow(index: number, field: keyof CashValueRow, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "guaranteedCV" || field === "nonGuaranteedCV") {
        const g = parseFloat(next[index].guaranteedCV) || 0;
        const ng = parseFloat(next[index].nonGuaranteedCV) || 0;
        next[index].totalCV = (g + ng).toString();
      }
      if (field === "guaranteedDeathBenefit" || field === "totalDeathBenefit") {
        // no auto-calc for death benefit
      }
      return next;
    });
  }

  function addRow() {
    const lastYear = rows.length > 0 ? rows[rows.length - 1].policyYear : 0;
    setRows((prev) => [
      ...prev,
      {
        policyYear: lastYear + 1,
        guaranteedCV: "",
        nonGuaranteedCV: "",
        totalCV: "",
        guaranteedDeathBenefit: "",
        totalDeathBenefit: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    const totalPrem = Number(annualPremium) * Number(premiumTerm);
    const entries = rows
      .filter((r) => r.guaranteedCV || r.nonGuaranteedCV || r.totalCV)
      .map((r) => ({
        entryAge: Number(entryAge),
        gender,
        smoker: smoker === "true",
        annualPremium: Number(annualPremium),
        premiumTerm: Number(premiumTerm),
        totalPremium: totalPrem,
        policyYear: r.policyYear,
        guaranteedCV: Number(r.guaranteedCV) || 0,
        nonGuaranteedCV: Number(r.nonGuaranteedCV) || 0,
        totalCV: Number(r.totalCV) || 0,
        guaranteedDeathBenefit: Number(r.guaranteedDeathBenefit) || 0,
        totalDeathBenefit: Number(r.totalDeathBenefit) || 0,
      }));

    await fetch(`/api/products/${id}/cash-values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setSaving(false);
    alert("现金价值数据已保存！");
  }

  if (!product) {
    return <div className="text-gray-400 py-12 text-center">加载中...</div>;
  }

  const premTerms: number[] = JSON.parse(product.premiumTerms || "[]");

  return (
    <div>
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/products")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回产品列表
      </Button>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        <Badge>{product.currency}</Badge>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-gray-500">
          {product.company.name}
          {product.nameEn ? ` · ${product.nameEn}` : ""}
          {product.fulfillmentRatio ? ` · 分红实现率 ${product.fulfillmentRatio}%` : ""}
        </p>
      </div>
      <div className="mb-6">
        <Link href={`/products/${id}/fulfillment`}>
          <Button variant="outline" size="sm">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            分红实现率
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>现金价值表录入条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>投保年龄</Label>
              <Input className="mt-1.5" type="number" value={entryAge} onChange={(e) => setEntryAge(e.target.value)} />
            </div>
            <div>
              <Label>性别</Label>
              <Select className="mt-1.5" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="M">男</option>
                <option value="F">女</option>
              </Select>
            </div>
            <div>
              <Label>吸烟</Label>
              <Select className="mt-1.5" value={smoker} onChange={(e) => setSmoker(e.target.value)}>
                <option value="false">非吸烟</option>
                <option value="true">吸烟</option>
              </Select>
            </div>
            <div>
              <Label>年缴保费 ({product.currency})</Label>
              <Input className="mt-1.5" type="number" value={annualPremium} onChange={(e) => setAnnualPremium(e.target.value)} />
            </div>
            <div>
              <Label>供款期</Label>
              <Select className="mt-1.5" value={premiumTerm} onChange={(e) => setPremiumTerm(e.target.value)}>
                {premTerms.map((t) => (
                  <option key={t} value={t}>{t} 年</option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3">
            总保费：{product.currency} {(Number(annualPremium) * Number(premiumTerm)).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <CsvImport
        productId={id}
        entryAge={Number(entryAge)}
        gender={gender}
        smoker={smoker === "true"}
        annualPremium={Number(annualPremium)}
        premiumTerm={Number(premiumTerm)}
        onImportComplete={fetchProduct}
      />

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>现金价值数据（手动录入）</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => generateEmptyRows(30)}>
              重置 30 年
            </Button>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              添加行
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "保存中..." : "保存数据"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600 w-16">年度</th>
                  <th className="px-4 py-3 font-medium text-gray-600">保证现金价值</th>
                  <th className="px-4 py-3 font-medium text-gray-600">非保证现金价值</th>
                  <th className="px-4 py-3 font-medium text-gray-600">总现金价值</th>
                  <th className="px-4 py-3 font-medium text-gray-600">保证身故赔偿</th>
                  <th className="px-4 py-3 font-medium text-gray-600">总身故赔偿</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-600 font-medium">{row.policyYear}</td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={row.guaranteedCV}
                        onChange={(e) => updateRow(i, "guaranteedCV", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={row.nonGuaranteedCV}
                        onChange={(e) => updateRow(i, "nonGuaranteedCV", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={row.totalCV}
                        className="h-8 text-sm bg-gray-50"
                        readOnly
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={row.guaranteedDeathBenefit}
                        onChange={(e) => updateRow(i, "guaranteedDeathBenefit", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={row.totalDeathBenefit}
                        onChange={(e) => updateRow(i, "totalDeathBenefit", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
