"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Package, Eye } from "lucide-react";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Company {
  id: string;
  name: string;
  nameEn: string | null;
}

interface Product {
  id: string;
  companyId: string;
  company: Company;
  name: string;
  nameEn: string | null;
  currency: string;
  premiumTerms: string;
  minPremium: number | null;
  fulfillmentRatio: number | null;
  notes: string | null;
  _count?: { cashValueEntries: number };
}

const emptyForm = {
  companyId: "",
  name: "",
  nameEn: "",
  currency: "USD",
  premiumTerms: "2,5",
  minPremium: "",
  minEntryAge: "",
  maxEntryAge: "",
  fulfillmentRatio: "",
  notes: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh-CN");

  const fetchData = useCallback(async () => {
    const [prodRes, compRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/companies"),
    ]);
    setProducts(await prodRes.json());
    setCompanies(await compRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setLocale(getSavedLocale());
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, companyId: companies[0]?.id || "" });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    const terms = JSON.parse(p.premiumTerms || "[]");
    setEditingId(p.id);
    setForm({
      companyId: p.companyId,
      name: p.name,
      nameEn: p.nameEn || "",
      currency: p.currency,
      premiumTerms: terms.join(","),
      minPremium: p.minPremium?.toString() || "",
      minEntryAge: "",
      maxEntryAge: "",
      fulfillmentRatio: p.fulfillmentRatio?.toString() || "",
      notes: p.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setLoading(true);
    const payload = {
      ...form,
      premiumTerms: form.premiumTerms.split(",").map((s) => Number(s.trim())).filter(Boolean),
    };
    const url = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setDialogOpen(false);
    await fetchData();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("page.products.confirm_delete", locale))) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await fetchData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("page.products.title", locale)}</h1>
          <p className="text-gray-500 mt-1">{t("page.products.desc", locale)}</p>
        </div>
        <Button onClick={openCreate} disabled={companies.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          {t("page.products.add", locale)}
        </Button>
      </div>

      {companies.length === 0 && (
        <Card className="mb-4">
          <CardContent className="py-4 text-center text-amber-600">
            {t("page.products.no_company", locale)}
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">{t("page.products.empty", locale)}</p>
            <p className="text-sm mt-1">{t("page.products.empty_hint", locale)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {p.company.name}
                    {p.nameEn ? ` · ${p.nameEn}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/products/${p.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge>{p.currency}</Badge>
                  {JSON.parse(p.premiumTerms || "[]").map((pt: number) => (
                    <Badge key={pt} variant="secondary">{pt}{t("page.products.year_pay", locale)}</Badge>
                  ))}
                  {p.fulfillmentRatio && (
                    <Badge variant="success">{t("page.products.fulfillment", locale)} {p.fulfillmentRatio}%</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  {p._count?.cashValueEntries ?? 0} {t("page.products.cv_count", locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingId ? t("page.products.edit", locale) : t("page.products.create", locale)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("page.products.company_label", locale)}</Label>
            <Select
              className="mt-1.5"
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.nameEn ? `(${c.nameEn})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.products.name_cn", locale)} *</Label>
              <Input
                className="mt-1.5"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：盈御多元货币计划3"
              />
            </div>
            <div>
              <Label>{t("page.products.name_en", locale)}</Label>
              <Input
                className="mt-1.5"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="如：Evergreen Wealth 3"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.products.currency", locale)}</Label>
              <Select
                className="mt-1.5"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="USD">{t("currency.usd", locale)}</option>
                <option value="HKD">{t("currency.hkd", locale)}</option>
                <option value="RMB">{t("currency.rmb", locale)}</option>
              </Select>
            </div>
            <div>
              <Label>{t("page.products.premium_terms", locale)}</Label>
              <Input
                className="mt-1.5"
                value={form.premiumTerms}
                onChange={(e) => setForm({ ...form, premiumTerms: e.target.value })}
                placeholder="如：2,5,8,10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.products.min_premium", locale)}</Label>
              <Input
                className="mt-1.5"
                type="number"
                value={form.minPremium}
                onChange={(e) => setForm({ ...form, minPremium: e.target.value })}
                placeholder="如：4000"
              />
            </div>
            <div>
              <Label>{t("page.products.fulfillment", locale)} (%)</Label>
              <Input
                className="mt-1.5"
                type="number"
                value={form.fulfillmentRatio}
                onChange={(e) => setForm({ ...form, fulfillmentRatio: e.target.value })}
                placeholder="如：100"
              />
            </div>
          </div>
          <div>
            <Label>{t("common.notes", locale)}</Label>
            <Input
              className="mt-1.5"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="产品特色、注意事项等"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel", locale)}</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.companyId || loading}>
            {loading ? t("common.saving", locale) : t("common.save", locale)}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
