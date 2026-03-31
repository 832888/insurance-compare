"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { GitCompareArrows, Calculator, FileText, Trash2, User } from "lucide-react";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface SchemeProduct {
  product: { name: string; currency: string; company: { name: string } };
}

interface Scheme {
  id: string;
  title: string;
  type: string;
  status: string;
  client: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  products: SchemeProduct[];
}

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => { setLocale(getSavedLocale()); }, []);

  const statusLabels: Record<string, { label: string; variant: "default" | "success" | "secondary" }> = {
    DRAFT: { label: t("page.schemes.draft", locale), variant: "secondary" },
    SENT: { label: t("page.schemes.sent", locale), variant: "success" },
    ARCHIVED: { label: t("page.schemes.archived", locale), variant: "default" },
  };

  const dateLocale = locale === "en" ? "en-US" : locale === "zh-TW" ? "zh-TW" : "zh-CN";

  const fetchSchemes = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    const res = await fetch(`/api/schemes?${params}`);
    setSchemes(await res.json());
  }, [filterType]);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  async function deleteScheme(id: string) {
    if (!confirm(t("page.schemes.confirm_delete", locale))) return;
    await fetch(`/api/schemes/${id}`, { method: "DELETE" });
    await fetchSchemes();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/schemes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchSchemes();
  }

  const filtered = schemes.filter((s) => !filterStatus || s.status === filterStatus);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("page.schemes.title", locale)}</h1>
          <p className="text-gray-500 mt-1">{t("page.schemes.desc", locale)}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select className="w-40" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">{t("page.schemes.all_types", locale)}</option>
          <option value="COMPARE">{t("page.schemes.compare", locale)}</option>
          <option value="FINANCING">{t("page.schemes.financing", locale)}</option>
        </Select>
        <Select className="w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{t("page.schemes.all_status", locale)}</option>
          <option value="DRAFT">{t("page.schemes.draft", locale)}</option>
          <option value="SENT">{t("page.schemes.sent", locale)}</option>
          <option value="ARCHIVED">{t("page.schemes.archived", locale)}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">{t("page.schemes.empty", locale)}</p>
            <p className="text-sm mt-1">{t("page.schemes.empty_hint", locale)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const st = statusLabels[s.status] || statusLabels.DRAFT;
            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.type === "COMPARE" ? (
                        <GitCompareArrows className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <Calculator className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {s.type === "COMPARE" && <Badge>{t("page.schemes.compare", locale)}</Badge>}
                      {s.type === "FINANCING" && <Badge variant="warning">{t("page.schemes.financing", locale)}</Badge>}
                    </div>

                    {s.client && (
                      <Link href={`/clients/${s.client.id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                        <User className="h-3 w-3" />
                        {s.client.name}
                      </Link>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {s.products.map((sp, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {sp.product.company.name} - {sp.product.name}
                        </Badge>
                      ))}
                    </div>

                    {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}

                    <p className="text-xs text-gray-400 mt-1">
                      {t("page.schemes.created_at", locale)} {new Date(s.createdAt).toLocaleDateString(dateLocale)} ·
                      {" "}{t("page.schemes.updated_at", locale)} {new Date(s.updatedAt).toLocaleDateString(dateLocale)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Select
                      className="w-24 h-8 text-xs"
                      value={s.status}
                      onChange={(e) => updateStatus(s.id, e.target.value)}
                    >
                      <option value="DRAFT">{t("page.schemes.draft", locale)}</option>
                      <option value="SENT">{t("page.schemes.sent", locale)}</option>
                      <option value="ARCHIVED">{t("page.schemes.archived", locale)}</option>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => deleteScheme(s.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
