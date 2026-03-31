"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Company {
  id: string;
  name: string;
  nameEn: string | null;
  logoUrl: string | null;
  rating: string | null;
  notes: string | null;
  _count?: { products: number };
}

const emptyForm = { name: "", nameEn: "", logoUrl: "", rating: "", notes: "" };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh-CN");

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    setCompanies(await res.json());
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setLocale(getSavedLocale());
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Company) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      nameEn: c.nameEn || "",
      logoUrl: c.logoUrl || "",
      rating: c.rating || "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setLoading(true);
    const url = editingId ? `/api/companies/${editingId}` : "/api/companies";
    const method = editingId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    await fetchCompanies();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("page.companies.confirm_delete", locale))) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    await fetchCompanies();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("page.companies.title", locale)}</h1>
          <p className="text-gray-500 mt-1">{t("page.companies.desc", locale)}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("page.companies.add", locale)}
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">{t("page.companies.empty", locale)}</p>
            <p className="text-sm mt-1">{t("page.companies.empty_hint", locale)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {c.nameEn && <p className="text-sm text-gray-500">{c.nameEn}</p>}
                {c.rating && <p className="text-sm text-gray-500 mt-1">{`${t("page.companies.rating", locale)}：${c.rating}`}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  {c._count?.products ?? 0} {t("page.companies.products_count", locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{editingId ? t("page.companies.edit", locale) : t("page.companies.create", locale)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("page.companies.name_cn", locale)} *</Label>
            <Input
              className="mt-1.5"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：友邦保险"
            />
          </div>
          <div>
            <Label>{t("page.companies.name_en", locale)}</Label>
            <Input
              className="mt-1.5"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              placeholder="如：AIA"
            />
          </div>
          <div>
            <Label>{t("page.companies.rating", locale)}</Label>
            <Input
              className="mt-1.5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              placeholder="如：A+"
            />
          </div>
          <div>
            <Label>{t("common.notes", locale)}</Label>
            <Input
              className="mt-1.5"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="可选备注信息"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            {t("common.cancel", locale)}
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name || loading}>
            {loading ? t("common.saving", locale) : t("common.save", locale)}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
