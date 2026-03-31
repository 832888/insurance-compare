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
import { Plus, Pencil, Trash2, Users, Eye, Search } from "lucide-react";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  smoker: boolean;
  budget: number | null;
  currency: string | null;
  occupation: string | null;
  notes: string | null;
  _count?: { schemes: number };
}

const emptyForm = {
  name: "", phone: "", email: "", age: "",
  gender: "", smoker: "false", budget: "",
  currency: "USD", occupation: "", notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => { setLocale(getSavedLocale()); }, []);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    setClients(await res.json());
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Client) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      age: c.age?.toString() || "",
      gender: c.gender || "",
      smoker: c.smoker ? "true" : "false",
      budget: c.budget?.toString() || "",
      currency: c.currency || "USD",
      occupation: c.occupation || "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setLoading(true);
    const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
    const method = editingId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    await fetchClients();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("page.clients.confirm_delete", locale))) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    await fetchClients();
  }

  const filtered = clients.filter((c) =>
    !search || c.name.includes(search) || c.phone?.includes(search) || c.email?.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("page.clients.title", locale)}</h1>
          <p className="text-gray-500 mt-1">{t("page.clients.desc", locale)}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("page.clients.add", locale)}
        </Button>
      </div>

      {clients.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder={t("page.clients.search", locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">{search ? t("page.clients.no_match", locale) : t("page.clients.empty", locale)}</p>
            <p className="text-sm mt-1">{search ? t("page.clients.try_other", locale) : t("page.clients.empty_hint", locale)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{c.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {c.age && <span className="text-xs text-gray-500">{locale === "en" ? `${c.age} yrs` : `${c.age}岁`}</span>}
                    {c.gender && (
                      <span className="text-xs text-gray-500">{c.gender === "M" ? t("gender.male", locale) : t("gender.female", locale)}</span>
                    )}
                    {c.smoker && <Badge variant="warning" className="text-[10px] px-1.5">{t("smoker.yes", locale)}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/clients/${c.id}`}>
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
                {c.email && <p className="text-sm text-gray-500">{c.email}</p>}
                {c.budget && (
                  <p className="text-sm text-gray-500">
                    {locale === "en" ? "Budget: " : "预算："}{c.currency || "USD"} {c.budget.toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {c._count?.schemes ?? 0} {t("page.clients.schemes_count", locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingId ? t("page.clients.edit", locale) : t("page.clients.create", locale)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.clients.name", locale)}</Label>
              <Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("page.clients.phone", locale)}</Label>
              <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+852 XXXX XXXX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.clients.email", locale)}</Label>
              <Input className="mt-1.5" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>{t("page.clients.occupation", locale)}</Label>
              <Input className="mt-1.5" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>{t("page.clients.age", locale)}</Label>
              <Input className="mt-1.5" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <Label>{t("page.clients.gender", locale)}</Label>
              <Select className="mt-1.5" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">{t("gender.unset", locale)}</option>
                <option value="M">{t("gender.male", locale)}</option>
                <option value="F">{t("gender.female", locale)}</option>
              </Select>
            </div>
            <div>
              <Label>{t("page.clients.smoker", locale)}</Label>
              <Select className="mt-1.5" value={form.smoker} onChange={(e) => setForm({ ...form, smoker: e.target.value })}>
                <option value="false">{t("page.clients.no", locale)}</option>
                <option value="true">{t("page.clients.yes", locale)}</option>
              </Select>
            </div>
            <div>
              <Label>{locale === "en" ? "Currency" : "货币"}</Label>
              <Select className="mt-1.5" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="HKD">HKD</option>
                <option value="RMB">RMB</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("page.clients.budget", locale)}</Label>
            <Input className="mt-1.5" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div>
            <Label>{t("common.notes", locale)}</Label>
            <Input className="mt-1.5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel", locale)}</Button>
          <Button onClick={handleSubmit} disabled={!form.name || loading}>
            {loading ? t("common.saving", locale) : t("common.save", locale)}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
