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

const VISION_PROMPT = `You extract data from Hong Kong insurance illustration documents: 储蓄分红计划书、建议书、以及「保费融资 / Premium Financing」测算表（常见为 Excel 导出或扫描件）。

Typical layout you MUST handle:
- Title area: product name e.g.「丰饶传承储蓄保险计划 III」; insurer may appear in 风险声明 footer (e.g. 中国人寿保险(海外)有限公司).
- Header block: 投保金额、总保费(连保费征费)、首日退保价值、LTV、借贷金额、客户首付、杠杆比率 — use these to infer currency and scale.
- Main grid: rows = 保单年度 / Year 1–N; merged column groups like「保费融资」(贷款利率、贷款利息、退保金额、退保价值) and「预期退保发还金额」(回报单利、内回报 IRR、净回报).
- Numbers may show HK$ and USD side-by-side: pick ONE currency for ALL numeric fields — prefer the column used for the main 退保价值 series (usually HKD for HK illustrations).

Map columns to our schema (critical):
- policyYear = 保单年度终结 / 年度 / Policy year (1,2,3…).
- totalCV =「退保价值」total surrender / account value for that year (NOT the 净回报 column). Use the large HKD figures in the main projection block.
- guaranteedCV =「退保金额」under「保证基础」/ guaranteed surrender / guaranteed cash value column if present; else estimate from context or set to 0.
- nonGuaranteedCV = max(0, totalCV - guaranteedCV) if no separate 非保证 column.
- guaranteedDeathBenefit / totalDeathBenefit = 0 if the table has no 身故 columns (common for financing sheets).
- annualPremium: from 年缴保费 or divide「总保费」by 供款年期; if single premium / lump sum, put total premium in annualPremium and set premiumTerm to 1.
- premiumTerm: 供款年期 / years of premium payment from header; if unclear, use the number of rows that still show premium-related logic or the document default (e.g. 5 or 10).

Ignore: 贷款利率、每月还款利息、净回报、IRR、单利 — those are financing metrics, do not put them in cashValues. Only map surrender/cash value columns as above.

Parse all digits: remove commas, HK$, USD, 千萬 shorthand if obvious. Use plain numbers (no strings).

Return ONLY one JSON object, no markdown, no commentary:

{
  "companyName": "保险公司中文名",
  "productName": "产品中文全称",
  "currency": "HKD",
  "annualPremium": 0,
  "premiumTerm": 5,
  "cashValues": [
    {
      "policyYear": 1,
      "annualPremium": 0,
      "premiumTerm": 5,
      "totalPremium": 0,
      "guaranteedCV": 0,
      "nonGuaranteedCV": 0,
      "totalCV": 0,
      "guaranteedDeathBenefit": 0,
      "totalDeathBenefit": 0
    }
  ]
}

Include every policy year row visible in the main table (usually 1–10 or 1–30). For each row, repeat annualPremium/premiumTerm/totalPremium when they are constant across years. If a field is missing, use 0.`;

/**
 * Gemini often wraps JSON in markdown fences or adds prose after the object.
 * Greedy /\{[\s\S]*\}/ breaks when two objects exist or when trailing text follows valid JSON.
 */
function parseJsonFromModelText(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  if (start === -1) throw new Error("AI 返回中未找到 JSON");

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try {
          return JSON.parse(slice) as Record<string, unknown>;
        } catch (e) {
          throw new Error(
            `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }
  }
  throw new Error("AI 返回的 JSON 不完整（括号不匹配）");
}

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
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v).replace(/[,，\s$¥]/g, "").replace(/HKD?|USD|RMB|CNY|港币|美元/gi, "");
  const n = parseFloat(s);
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

// ---- Gemini native API ----

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string }) => m.name.replace("models/", ""))
      .filter((name: string) => /gemini.*(flash|pro)/i.test(name));
  } catch {
    return [];
  }
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
  // Get all available models dynamically
  const available = await listModels(apiKey);
  console.log("Available Gemini models:", available);

  // Preferred order: try lite/flash variants that are more likely to have free quota
  const preferred = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-2.5-flash-preview-04-17",
  ];

  // Build model list: preferred ones first (if available), then any remaining
  const modelsToTry: string[] = [];
  for (const p of preferred) {
    if (available.includes(p)) modelsToTry.push(p);
  }
  for (const m of available) {
    if (!modelsToTry.includes(m)) modelsToTry.push(m);
  }

  if (modelsToTry.length === 0) {
    throw new Error("API Key 无法获取可用模型列表。请检查 Key 是否正确（应以 AIzaSy 开头）。");
  }

  // Try each model until one works
  const errors: string[] = [];
  for (const model of modelsToTry.slice(0, 6)) {
    console.log(`Trying model: ${model}`);
    const result = await callGeminiOnce(model, base64, mimeType, apiKey);

    if (result.ok) {
      if (!result.text) throw new Error("Gemini 返回空内容，请换一张更清晰的图片");
      console.log(`Success with model: ${model}`);
      return result.text;
    }

    if (result.status === 400) {
      throw new Error(`请求被拒绝 (400): ${result.error}`);
    }
    if (result.status === 403) {
      throw new Error(`API Key 无权限 (403): ${result.error}`);
    }

    errors.push(`${model}: ${result.status}`);
    console.log(`Model ${model} failed: ${result.status} - ${result.error?.slice(0, 100)}`);

    // 429 with limit:0 means this model has no quota, skip immediately to next
    if (result.status === 429 && /limit:\s*0/i.test(result.error || "")) {
      continue;
    }

    // 429 with actual limit > 0 means temporary rate limit, wait and retry same model
    if (result.status === 429) {
      const retryMatch = result.error?.match(/retry in ([\d.]+)s/i);
      const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 10;
      console.log(`Rate limited, waiting ${waitSec}s...`);
      await sleep(waitSec * 1000);
      const retry = await callGeminiOnce(model, base64, mimeType, apiKey);
      if (retry.ok && retry.text) return retry.text;
    }

    // 404 = model not available via this API version, try next
    if (result.status === 404) continue;
  }

  throw new Error(
    `所有可用模型均无配额。已尝试: ${errors.join(", ")}。\n\n` +
    `解决方案:\n` +
    `1. 前往 console.cloud.google.com/billing 绑定信用卡（可设 $0 预算，不会扣费）\n` +
    `2. 或等待免费配额刷新（通常每分钟重置）\n` +
    `3. 或直接上传 Excel/CSV 格式的测算表（无需 AI）`
  );
}

async function extractFromImage(base64: string, mimeType: string, apiKey: string): Promise<ExtractedProduct> {
  const text = await callGemini(base64, mimeType, apiKey);

  let data: Record<string, unknown>;
  try {
    data = parseJsonFromModelText(text);
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : "AI 返回无法解析为 JSON，请重试或换一张图片"
    );
  }

  const annualPremium = num(data.annualPremium);
  const premiumTerm = num(data.premiumTerm) || 5;
  const rawCv = data.cashValues;
  const cashRows = Array.isArray(rawCv) ? rawCv : [];

  return {
    companyName: String(data.companyName ?? "Unknown"),
    productName: String(data.productName ?? "Unknown Product"),
    currency: String(data.currency ?? "USD"),
    premiumTerms: [premiumTerm],
    cashValues: cashRows.map((cv: Record<string, unknown>) => {
      const ap = num(cv.annualPremium) || annualPremium;
      const pt = num(cv.premiumTerm) || premiumTerm;
      const g = num(cv.guaranteedCV);
      const ng = num(cv.nonGuaranteedCV);
      let t = num(cv.totalCV);
      if (!t && (g || ng)) t = g + ng;
      return {
        policyYear: num(cv.policyYear) || 0,
        annualPremium: ap,
        premiumTerm: pt,
        totalPremium: num(cv.totalPremium) || ap * pt,
        guaranteedCV: g,
        nonGuaranteedCV: ng || Math.max(0, t - g),
        totalCV: t || g + ng,
        guaranteedDeathBenefit: num(cv.guaranteedDeathBenefit),
        totalDeathBenefit: num(cv.totalDeathBenefit),
      };
    }),
  };
}

function mimeForImage(filename: string, reported: string): string {
  if (reported && reported !== "application/octet-stream") return reported;
  const n = filename.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".bmp")) return "image/bmp";
  return "image/jpeg";
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
      result = await extractFromImage(
        base64,
        mimeForImage(file.name, file.type),
        key
      );
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
