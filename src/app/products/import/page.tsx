"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, ImageIcon, Loader2, CheckCircle2,
  AlertCircle, ArrowLeft, ArrowRight, Eye, Settings2,
} from "lucide-react";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface CashValueRow {
  policyYear: number;
  annualPremium: number;
  premiumTerm: number;
  totalPremium: number;
  guaranteedCV: number;
  nonGuaranteedCV: number;
  totalCV: number;
  guaranteedDeathBenefit: number;
  totalDeathBenefit: number;
}

interface ExtractedData {
  companyName: string;
  productName: string;
  currency: string;
  premiumTerms: number[];
  cashValues: CashValueRow[];
}

interface Company {
  id: string;
  name: string;
  nameEn: string | null;
}

type Step = "upload" | "preview" | "confirm";

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [step, setStep] = useState<Step>("upload");

  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [editedValues, setEditedValues] = useState<CashValueRow[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [premiumTerms, setPremiumTerms] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedProductId, setImportedProductId] = useState("");

  useEffect(() => {
    setLocale(getSavedLocale());
    const savedKey = localStorage.getItem("ai_api_key") || "";
    const savedBase = localStorage.getItem("ai_api_base") || "";
    setApiKey(savedKey);
    setApiBase(savedBase);
  }, []);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    setCompanies(await res.json());
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    if (apiKey) {
      formData.append("apiKey", apiKey);
      localStorage.setItem("ai_api_key", apiKey);
    }
    if (apiBase) {
      formData.append("apiBase", apiBase);
      localStorage.setItem("ai_api_base", apiBase);
    }

    try {
      const res = await fetch("/api/import/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "解析失败");

      setExtracted(data);
      setEditedValues(data.cashValues || []);
      setProductName(data.productName || "");
      setCurrency(data.currency || "USD");
      setPremiumTerms((data.premiumTerms || []).join(","));

      const matchedCompany = companies.find(
        (c) => c.name.includes(data.companyName) || data.companyName.includes(c.name)
      );
      if (matchedCompany) {
        setSelectedCompanyId(matchedCompany.id);
      } else {
        setNewCompanyName(data.companyName || "");
        setSelectedCompanyId("__new__");
      }

      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function updateRow(index: number, field: keyof CashValueRow, value: string) {
    setEditedValues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: parseFloat(value) || 0 };
      return next;
    });
  }

  function deleteRow(index: number) {
    setEditedValues((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleImport() {
    setImporting(true);
    setError("");

    try {
      let companyId = selectedCompanyId;

      if (companyId === "__new__" && newCompanyName) {
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCompanyName }),
        });
        const newComp = await res.json();
        companyId = newComp.id;
      }

      if (!companyId || companyId === "__new__") {
        throw new Error("请选择或创建保险公司");
      }

      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: productName,
          currency,
          premiumTerms: premiumTerms.split(",").map((s) => Number(s.trim())).filter(Boolean),
        }),
      });
      const product = await productRes.json();
      if (!productRes.ok) throw new Error(product.error || "创建产品失败");

      const cashValuesPayload = editedValues.map((cv) => ({
        policyYear: cv.policyYear,
        annualPremium: cv.annualPremium,
        premiumTerm: cv.premiumTerm,
        totalPremium: cv.totalPremium,
        guaranteedCV: cv.guaranteedCV,
        nonGuaranteedCV: cv.nonGuaranteedCV,
        totalCV: cv.totalCV,
        guaranteedDeathBenefit: cv.guaranteedDeathBenefit,
        totalDeathBenefit: cv.totalDeathBenefit,
      }));

      const cvRes = await fetch(`/api/products/${product.id}/cash-values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: cashValuesPayload }),
      });
      if (!cvRes.ok) throw new Error("导入现金价值数据失败");

      setImportedProductId(product.id);
      setImportSuccess(true);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  const isImageFile = /\.(jpg|jpeg|png|webp|gif|bmp|pdf)$/i.test(fileName);

  const labels = {
    title: locale === "en" ? "Smart Import" : "智能导入",
    desc: locale === "en"
      ? "Upload calculation sheets (Excel/CSV) or scan images to auto-extract product data"
      : "上传产品测算表（Excel/CSV）或扫描件/图片，自动提取产品数据",
    dropHint: locale === "en"
      ? "Drag & drop file here, or click to select"
      : "拖拽文件到此处，或点击选择文件",
    supported: locale === "en"
      ? "Supports: Excel (.xlsx), CSV (.csv), Images (.jpg/.png), PDF"
      : "支持：Excel (.xlsx)、CSV (.csv)、图片 (.jpg/.png)、PDF",
    excelDirect: locale === "en" ? "Direct parsing" : "直接解析",
    imageAi: locale === "en" ? "AI recognition" : "AI 识别",
    apiSettings: locale === "en" ? "AI API Settings" : "AI API 设置",
    apiKeyLabel: locale === "en" ? "API Key (OpenAI or compatible)" : "API Key（OpenAI 或兼容接口）",
    apiBaseLabel: locale === "en" ? "API Base URL (optional)" : "API Base URL（可选，默认 OpenAI）",
    analyzing: locale === "en" ? "Analyzing document..." : "正在解析文档...",
    previewTitle: locale === "en" ? "Data Preview" : "数据预览",
    productInfo: locale === "en" ? "Product Information" : "产品信息",
    company: locale === "en" ? "Company" : "保险公司",
    createNew: locale === "en" ? "Create new company" : "创建新公司",
    product: locale === "en" ? "Product Name" : "产品名称",
    cvData: locale === "en" ? "Cash Value Data" : "现金价值数据",
    rows: locale === "en" ? "rows" : "行",
    year: locale === "en" ? "Year" : "年度",
    premium: locale === "en" ? "Premium" : "保费",
    gCV: locale === "en" ? "G.CV" : "保证CV",
    tCV: locale === "en" ? "Total CV" : "预期CV",
    gDB: locale === "en" ? "G.Death" : "保证身故",
    tDB: locale === "en" ? "Total Death" : "预期身故",
    importBtn: locale === "en" ? "Import to System" : "导入系统",
    importing: locale === "en" ? "Importing..." : "导入中...",
    success: locale === "en" ? "Import Successful!" : "导入成功！",
    successDesc: locale === "en"
      ? "Product and cash value data have been imported"
      : "产品及现金价值数据已成功导入系统",
    viewProduct: locale === "en" ? "View Product" : "查看产品",
    importMore: locale === "en" ? "Import More" : "继续导入",
    back: locale === "en" ? "Back" : "返回",
    next: locale === "en" ? "Next" : "下一步",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-500" />
            {labels.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{labels.desc}</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: "upload", label: locale === "en" ? "Upload" : "上传文件" },
          { key: "preview", label: locale === "en" ? "Preview" : "预览确认" },
          { key: "confirm", label: locale === "en" ? "Done" : "完成" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-gray-300" />}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
              step === s.key ? "bg-blue-100 text-blue-700 font-medium" :
              (step === "preview" && s.key === "upload") || step === "confirm"
                ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {(step === "preview" && s.key === "upload") || (step === "confirm" && s.key !== "confirm")
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : <span className="w-4 text-center text-xs">{i + 1}</span>}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 py-3 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <>
          <div className="flex justify-end mb-3">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings2 className="h-4 w-4 mr-1.5" />
              {labels.apiSettings}
            </Button>
          </div>

          {showSettings && (
            <Card className="mb-4">
              <CardContent className="py-4 space-y-3">
                <div>
                  <Label className="text-xs">{labels.apiKeyLabel}</Label>
                  <Input
                    className="mt-1"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <Label className="text-xs">{labels.apiBaseLabel}</Label>
                  <Input
                    className="mt-1"
                    value={apiBase}
                    onChange={(e) => setApiBase(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {locale === "en"
                    ? "API key is stored locally in your browser. Required only for image/PDF files."
                    : "API Key 仅保存在浏览器本地。仅图片/PDF文件需要。"}
                </p>
              </CardContent>
            </Card>
          )}

          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleInputChange}
            />
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-blue-500" />
                <p className="text-gray-700 font-medium">{labels.analyzing}</p>
                {isImageFile && (
                  <p className="text-xs text-gray-400 mt-1">AI {locale === "en" ? "processing" : "识别中"}...</p>
                )}
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-700 font-medium">{labels.dropHint}</p>
                <p className="text-xs text-gray-400 mt-2">{labels.supported}</p>
                <div className="flex justify-center gap-3 mt-4">
                  <Badge variant="secondary" className="gap-1">
                    <FileSpreadsheet className="h-3 w-3" /> Excel/CSV → {labels.excelDirect}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <ImageIcon className="h-3 w-3" /> {locale === "en" ? "Image/PDF" : "图片/PDF"} → {labels.imageAi}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Step 2: Preview & Edit */}
      {step === "preview" && extracted && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">{labels.productInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{labels.company}</Label>
                  <Select
                    className="mt-1.5"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                  >
                    <option value="__new__">+ {labels.createNew}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                  {selectedCompanyId === "__new__" && (
                    <Input
                      className="mt-2"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder={locale === "en" ? "New company name" : "新公司名称"}
                    />
                  )}
                </div>
                <div>
                  <Label>{labels.product}</Label>
                  <Input className="mt-1.5" value={productName} onChange={(e) => setProductName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("page.products.currency", locale)}</Label>
                  <Select className="mt-1.5" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">{t("currency.usd", locale)}</option>
                    <option value="HKD">{t("currency.hkd", locale)}</option>
                    <option value="RMB">{t("currency.rmb", locale)}</option>
                  </Select>
                </div>
                <div>
                  <Label>{t("page.products.premium_terms", locale)}</Label>
                  <Input className="mt-1.5" value={premiumTerms} onChange={(e) => setPremiumTerms(e.target.value)} placeholder="2,5,8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{labels.cvData}</span>
                <Badge variant="secondary">{editedValues.length} {labels.rows}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="px-3 py-2 font-medium text-gray-600 text-xs">{labels.year}</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-xs">{labels.premium}</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-xs">{labels.gCV}</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-xs">{labels.tCV}</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-xs">{labels.gDB}</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-xs">{labels.tDB}</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedValues.map((cv, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50/50">
                        <td className="px-3 py-1.5">
                          <Input className="h-7 w-16 text-xs" type="number" value={cv.policyYear}
                            onChange={(e) => updateRow(i, "policyYear", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input className="h-7 w-24 text-xs" type="number" value={cv.annualPremium}
                            onChange={(e) => updateRow(i, "annualPremium", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input className="h-7 w-24 text-xs" type="number" value={cv.guaranteedCV}
                            onChange={(e) => updateRow(i, "guaranteedCV", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input className="h-7 w-24 text-xs" type="number" value={cv.totalCV}
                            onChange={(e) => updateRow(i, "totalCV", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input className="h-7 w-24 text-xs" type="number" value={cv.guaranteedDeathBenefit}
                            onChange={(e) => updateRow(i, "guaranteedDeathBenefit", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input className="h-7 w-24 text-xs" type="number" value={cv.totalDeathBenefit}
                            onChange={(e) => updateRow(i, "totalDeathBenefit", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <button onClick={() => deleteRow(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep("upload"); setExtracted(null); setError(""); }}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {labels.back}
            </Button>
            <Button onClick={handleImport} disabled={importing || !productName || editedValues.length === 0}>
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{labels.importing}</>
              ) : (
                <><ArrowRight className="h-4 w-4 mr-1.5" />{labels.importBtn}</>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Success */}
      {step === "confirm" && importSuccess && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">{labels.success}</h2>
            <p className="text-gray-500 mt-1">{labels.successDesc}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary">{productName}</Badge>
              <Badge>{currency}</Badge>
              <Badge variant="secondary">{editedValues.length} {labels.rows}</Badge>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => router.push(`/products/${importedProductId}`)}>
                <Eye className="h-4 w-4 mr-1.5" />
                {labels.viewProduct}
              </Button>
              <Button onClick={() => {
                setStep("upload");
                setExtracted(null);
                setEditedValues([]);
                setImportSuccess(false);
                setError("");
                setFileName("");
              }}>
                <Upload className="h-4 w-4 mr-1.5" />
                {labels.importMore}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
