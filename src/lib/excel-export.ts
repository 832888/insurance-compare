import * as XLSX from "xlsx";

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export function generateExcelBuffer(sheets: ExcelSheet[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = sheet.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map((r) => String(r[i] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 30) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
