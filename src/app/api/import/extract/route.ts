import * as XLSX from "xlsx";

interface ExtractedCashValue {
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

interface ExtractedProduct {
  companyName: string;
  productName: string;
  currency: string;
  premiumTerms: number[];
  cashValues: ExtractedCashValue[];
}

const VISION_PROMPT = `You are an expert at reading Hong Kong insurance product illustration documents (保险计划书/建议书).

Analyze this image and extract the following structured data. Return ONLY valid JSON, no markdown.

{
  "companyName": "insurance company name in Chinese",
  "productName": "product name in Chinese",
  "currency": "USD or HKD or RMB",
  "annualPremium": 10000,
  "premiumTerm": 5,
  "cashValues": [
    {
      "policyYear": 1,
      "guaranteedCV": 0,
      "nonGuaranteedCV": 0,
      "totalCV": 0,
      "guaranteedDeathBenefit": 0,
      "totalDeathBenefit": 0
    }
  ]
}

Rules:
- Extract ALL years visible in the table
- Cash values (现金价值/退保价值) include guaranteed (保证) and non-guaranteed (非保证) components
- Death benefit (身故赔偿) similarly has guaranteed and total
- If a column is not visible, set it to 0
- Currency: look for $ or USD or HKD or 美元 or 港币
- Annual premium (年缴保费): the yearly payment amount
- Premium term (供款期/缴费年期): how many years to pay
- If you cannot extract certain fields, use reasonable defaults
- Return ONLY the JSON object, nothing else`;

// ---- Excel / CSV parsing (unchanged) ----

function parseExcelOrCsv(buffer: Buffer, filename: string): ExtractedProduct {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rows.length < 2) throw new Error("文件内容为空");

  const headerRowIdx = findHeaderRow(rows);
  const headers = (rows[headerRowIdx] as string[]).map((h) =>
    String(h ?? "").trim().toLowerCase()
  );

  const colMap = mapColumns(headers);

  let companyName = "";
  let productName = "";
  let currency = "USD";
  for (let i = 0; i < Math.min(headerRowIdx, 5); i++) {
    const rowStr = (rows[i] as string[]).map((c) => String(c ?? "")).join(" ");
    if (/公司|company|保险|insurance/i.test(rowStr)) {
      companyName = extractValue(rowStr, /公司|company|保险|insurance/i);
    }
    if (/产品|product|计划|plan/i.test(rowStr)) {
      productName = extractValue(rowStr, /产品|product|计划|plan/i);
    }
    if (/HKD|港币|港幣/i.test(rowStr)) currency = "HKD";
    if (/RMB|人民币|人民幣/i.test(rowStr)) currency = "RMB";
    if (/USD|美元/i.test(rowStr)) currency = "USD";
  }

  if (!companyName) companyName = filename.split(/[_\-\.]/)[0] || "Unknown";
  if (!productName) productName = filename.replace(/\.[^.]+$/, "");

  const cashValues: ExtractedCashValue[] = [];
  let detectedPremiumTerm = 0;
  let detectedAnnualPremium = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as (string | number)[];
    if (!row || row.length === 0) continue;

    const year = num(row[colMap.year]);
    if (year <= 0 || year > 100) continue;

    const annualPremium = num(row[colMap.annualPremium]);
    const guaranteedCV = num(row[colMap.guaranteedCV]);
    const totalCV = num(row[colMap.totalCV]);
    const nonGuaranteedCV = colMap.nonGuaranteedCV >= 0
      ? num(row[colMap.nonGuaranteedCV])
      : Math.max(0, totalCV - guaranteedCV);

    const guaranteedDB = num(row[colMap.guaranteedDB]);
    const totalDB = num(row[colMap.totalDB]);

    const premiumTerm = colMap.premiumTerm >= 0 ? num(row[colMap.premiumTerm]) : 0;
    const totalPremium = colMap.totalPremium >= 0 ? num(row[colMap.totalPremium]) : 0;

    if (annualPremium > 0 && detectedAnnualPremium === 0) detectedAnnualPremium = annualPremium;
    if (premiumTerm > 0 && detectedPremiumTerm === 0) detectedPremiumTerm = premiumTerm;
    if (annualPremium > 0 && year > detectedPremiumTerm) detectedPremiumTerm = year;

    cashValues.push({
      policyYear: year,
      annualPremium: annualPremium || detectedAnnualPremium,
      premiumTerm: premiumTerm || detectedPremiumTerm,
      totalPremium: totalPremium || (annualPremium || detectedAnnualPremium) * (premiumTerm || detectedPremiumTerm || 5),
      guaranteedCV,
      nonGuaranteedCV,
      totalCV: totalCV || guaranteedCV + nonGuaranteedCV,
      guaranteedDeathBenefit: guaranteedDB,
      totalDeathBenefit: totalDB,
    });
  }

  if (detectedPremiumTerm === 0 && cashValues.length > 0) {
    const withPremium = cashValues.filter((cv) => cv.annualPremium > 0);
    detectedPremiumTerm = withPremium.length > 0 ? withPremium[withPremium.length - 1].policyYear : 5;
  }

  cashValues.forEach((cv) => {
    if (!cv.premiumTerm) cv.premiumTerm = detectedPremiumTerm;
    if (!cv.annualPremium) cv.annualPremium = detectedAnnualPremium;
    if (!cv.totalPremium) cv.totalPremium = cv.annualPremium * cv.premiumTerm;
  });

  const premiumTerms = detectedPremiumTerm > 0 ? [detectedPremiumTerm] : [5];
  return { companyName, productName, currency, premiumTerms, cashValues };
}

function findHeaderRow(rows: unknown[][]): number {
  const keywords = ["year", "年", "年度", "policy", "保单", "保單"];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowStr = (rows[i] as string[]).map((c) => String(c ?? "").toLowerCase()).join(" ");
    if (keywords.some((k) => rowStr.includes(k))) return i;
  }
  return 0;
}

function mapColumns(headers: string[]) {
  const map = {
    year: -1, annualPremium: -1, premiumTerm: -1, totalPremium: -1,
    guaranteedCV: -1, nonGuaranteedCV: -1, totalCV: -1,
    guaranteedDB: -1, totalDB: -1,
  };

  headers.forEach((h, i) => {
    const s = h.replace(/\s+/g, "");
    if (/^(year|年度?|policyyear|保[单單]年度?)$/.test(s)) map.year = i;
    else if (/年[缴繳]保[费費]|annualpremium|premium/i.test(s) && !/total/i.test(s)) map.annualPremium = i;
    else if (/[缴繳][费費]期|premiumterm|供款期/i.test(s)) map.premiumTerm = i;
    else if (/[总總][保]?[费費]|totalpremium/i.test(s)) map.totalPremium = i;
    else if (/保[证證].*[现現]金|guaranteed.*cash|保[证證].*退保/i.test(s)) map.guaranteedCV = i;
    else if (/非保[证證]|non.?guaranteed.*cash|非保[证證].*[现現]金/i.test(s)) map.nonGuaranteedCV = i;
    else if (/(预期)?[总總].*[现現]金|total.*cash|[总總].*退保|预期.*[现現]金/i.test(s)) map.totalCV = i;
    else if (/保[证證].*身故|guaranteed.*death/i.test(s)) map.guaranteedDB = i;
    else if (/[总總].*身故|total.*death|预期.*身故/i.test(s)) map.totalDB = i;
  });

  if (map.year === -1) map.year = 0;
  if (map.guaranteedCV === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (/[现現]金|cash|退保/i.test(headers[i]) && map.guaranteedCV === -1) {
        map.guaranteedCV = i;
      } else if (/[现現]金|cash|退保/i.test(headers[i]) && map.totalCV === -1) {
        map.totalCV = i;
      }
    }
  }

  return map;
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,，\s$¥]/g, ""));
  return isNaN(n) ? 0 : n;
}

function extractValue(str: string, pattern: RegExp): string {
  const parts = str.split(/[：:]/);
  for (let i = 0; i < parts.length; i++) {
    if (pattern.test(parts[i]) && parts[i + 1]) {
      return parts[i + 1].trim();
    }
  }
  return str.replace(pattern, "").trim().split(/\s+/)[0] || "";
}

// ---- Gemini native API with retry + fallback model ----

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiOnce(model: string, base64: string, mimeType: string, apiKey: string): Promise<{ ok: boolean; text?: string; status?: number; error?: string }> {
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: VISION_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    let detail = "";
    try {
      const parsed = JSON.parse(errBody);
      detail = parsed?.error?.message || errBody;
    } catch {
      detail = errBody;
    }
    return { ok: false, status: res.status, error: detail };
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return { ok: true, text: text || "" };
}

async function callGemini(base64: string, mimeType: string, apiKey: string): Promise<string> {
  let lastError = "";

  for (const model of MODELS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = await callGeminiOnce(model, base64, mimeType, apiKey);

      if (result.ok) {
        if (!result.text) throw new Error("Gemini 返回空内容，请换一张更清晰的图片");
        return result.text;
      }

      lastError = `[${model}] ${result.status}: ${result.error}`;
      console.log(`Gemini attempt ${attempt + 1}/${MAX_RETRIES} with ${model} failed: ${lastError}`);

      if (result.status === 429) {
        await sleep(RETRY_DELAYS[attempt] || 30000);
        continue;
      }

      if (result.status === 400) {
        throw new Error(`API Key 无效或请求格式错误: ${result.error}`);
      }
      if (result.status === 403) {
        throw new Error(`API Key 无权限，请检查是否已启用 Gemini API: ${result.error}`);
      }

      break;
    }
    console.log(`Model ${model} exhausted, trying next model...`);
  }

  throw new Error(`Gemini 持续限流，请等待 1 分钟后重试。最后错误: ${lastError}`);
}

async function extractFromImage(base64: string, mimeType: string, apiKey: string): Promise<ExtractedProduct> {
  const text = await callGemini(base64, mimeType, apiKey);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI 未能识别文档内容");

  const data = JSON.parse(jsonMatch[0]);

  const annualPremium = data.annualPremium || 0;
  const premiumTerm = data.premiumTerm || 5;

  return {
    companyName: data.companyName || "Unknown",
    productName: data.productName || "Unknown Product",
    currency: data.currency || "USD",
    premiumTerms: [premiumTerm],
    cashValues: (data.cashValues || []).map((cv: Record<string, number>) => ({
      policyYear: cv.policyYear || 0,
      annualPremium: cv.annualPremium || annualPremium,
      premiumTerm: cv.premiumTerm || premiumTerm,
      totalPremium: cv.totalPremium || annualPremium * premiumTerm,
      guaranteedCV: cv.guaranteedCV || 0,
      nonGuaranteedCV: cv.nonGuaranteedCV || 0,
      totalCV: cv.totalCV || (cv.guaranteedCV || 0) + (cv.nonGuaranteedCV || 0),
      guaranteedDeathBenefit: cv.guaranteedDeathBenefit || 0,
      totalDeathBenefit: cv.totalDeathBenefit || 0,
    })),
  };
}

// ---- Route handler ----

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const apiKey = formData.get("apiKey") as string | null;

    if (!file) {
      return Response.json({ error: "未上传文件" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let result: ExtractedProduct;

    if (filename.endsWith(".csv") || filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      result = parseExcelOrCsv(buffer, file.name);
    } else if (/\.(jpg|jpeg|png|webp|gif|bmp)$/.test(filename)) {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) {
        return Response.json({ error: "图片识别需要提供 Gemini API Key（在设置中填写或配置环境变量 GEMINI_API_KEY）" }, { status: 400 });
      }
      const base64 = buffer.toString("base64");
      result = await extractFromImage(base64, file.type, key);
    } else if (filename.endsWith(".pdf")) {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) {
        return Response.json({ error: "PDF 识别需要提供 Gemini API Key" }, { status: 400 });
      }
      const base64 = buffer.toString("base64");
      result = await extractFromImage(base64, "application/pdf", key);
    } else {
      return Response.json({ error: `不支持的文件格式: ${filename}` }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "解析失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
