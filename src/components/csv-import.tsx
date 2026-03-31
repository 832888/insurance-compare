"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";

interface CsvImportProps {
  productId: string;
  entryAge: number;
  gender: string;
  smoker: boolean;
  annualPremium: number;
  premiumTerm: number;
  onImportComplete: () => void;
}

interface CsvRow {
  policyYear: string;
  guaranteedCV: string;
  nonGuaranteedCV: string;
  totalCV?: string;
  guaranteedDeathBenefit?: string;
  totalDeathBenefit?: string;
  [key: string]: string | undefined;
}

const COLUMN_MAP: Record<string, string> = {
  "policy_year": "policyYear",
  "policyyear": "policyYear",
  "year": "policyYear",
  "保单年度": "policyYear",
  "年度": "policyYear",
  "guaranteed_cv": "guaranteedCV",
  "guaranteedcv": "guaranteedCV",
  "guaranteed": "guaranteedCV",
  "保证现金价值": "guaranteedCV",
  "保证": "guaranteedCV",
  "non_guaranteed_cv": "nonGuaranteedCV",
  "nonguaranteedcv": "nonGuaranteedCV",
  "non_guaranteed": "nonGuaranteedCV",
  "非保证现金价值": "nonGuaranteedCV",
  "非保证": "nonGuaranteedCV",
  "total_cv": "totalCV",
  "totalcv": "totalCV",
  "total": "totalCV",
  "总现金价值": "totalCV",
  "总计": "totalCV",
  "guaranteed_death_benefit": "guaranteedDeathBenefit",
  "guaranteeddeathbenefit": "guaranteedDeathBenefit",
  "保证身故赔偿": "guaranteedDeathBenefit",
  "total_death_benefit": "totalDeathBenefit",
  "totaldeathbenefit": "totalDeathBenefit",
  "总身故赔偿": "totalDeathBenefit",
};

function normalizeHeader(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return COLUMN_MAP[clean] || clean;
}

export function CsvImport({
  productId,
  entryAge,
  gender,
  smoker,
  annualPremium,
  premiumTerm,
  onImportComplete,
}: CsvImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => {
        const rows = results.data as CsvRow[];
        setPreview(rows.slice(0, 5));

        if (rows.length === 0) {
          setResult({ success: false, message: "CSV 文件没有有效数据行" });
          return;
        }
        const first = rows[0];
        if (!first.policyYear || !first.guaranteedCV) {
          setResult({
            success: false,
            message: `未找到必需列。检测到的列: ${Object.keys(first).join(", ")}。需要: policyYear, guaranteedCV`,
          });
          return;
        }
      },
      error: (err) => {
        setResult({ success: false, message: `解析错误: ${err.message}` });
      },
    });
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: async (results) => {
        const rows = results.data as CsvRow[];
        const totalPremium = annualPremium * premiumTerm;

        const entries = rows
          .filter((r) => r.policyYear && (r.guaranteedCV || r.nonGuaranteedCV || r.totalCV))
          .map((r) => {
            const gCV = Number(r.guaranteedCV) || 0;
            const ngCV = Number(r.nonGuaranteedCV) || 0;
            const tCV = Number(r.totalCV) || gCV + ngCV;
            return {
              entryAge,
              gender,
              smoker,
              annualPremium,
              premiumTerm,
              totalPremium,
              policyYear: Number(r.policyYear),
              guaranteedCV: gCV,
              nonGuaranteedCV: ngCV,
              totalCV: tCV,
              guaranteedDeathBenefit: Number(r.guaranteedDeathBenefit) || 0,
              totalDeathBenefit: Number(r.totalDeathBenefit) || 0,
            };
          });

        try {
          const res = await fetch(`/api/products/${productId}/cash-values`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries }),
          });
          const data = await res.json();
          setResult({ success: true, message: `成功导入 ${data.count} 条数据` });
          onImportComplete();
        } catch {
          setResult({ success: false, message: "导入失败，请检查网络连接" });
        }
        setImporting(false);
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          CSV 批量导入
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-3">
              支持 CSV 格式，表头支持中英文自动匹配
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file"
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              选择文件
            </Button>
          </div>

          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-500 mb-1">CSV 格式说明：</p>
            <p>必需列: <code>policyYear</code>(或年度), <code>guaranteedCV</code>(或保证现金价值)</p>
            <p>可选列: <code>nonGuaranteedCV</code>, <code>totalCV</code>, <code>guaranteedDeathBenefit</code>, <code>totalDeathBenefit</code></p>
            <p className="mt-1">示例首行: <code>policyYear,guaranteedCV,nonGuaranteedCV,totalCV</code></p>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">数据预览（前 5 行）：</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(preview[0]).map((k) => (
                        <th key={k} className="px-2 py-1 border text-left">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1 border">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {result.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {result.message}
            </div>
          )}

          {preview.length > 0 && !result?.success && (
            <Button onClick={handleImport} disabled={importing} className="w-full">
              {importing ? "导入中..." : "确认导入"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
