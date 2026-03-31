"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";

interface Bank {
  id: string;
  bankName: string;
  maxLtv: number;
  interestType: string;
  baseRate: number | null;
  spread: number | null;
  capRate: number | null;
  fixedRate: number | null;
  minLoanAmount: number | null;
  maxLoanTerm: number | null;
  notes: string | null;
}

const emptyForm = {
  bankName: "",
  maxLtv: "0.8",
  interestType: "HIBOR_SPREAD",
  baseRate: "",
  spread: "",
  capRate: "",
  fixedRate: "",
  minLoanAmount: "",
  maxLoanTerm: "",
  notes: "",
};

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh-CN");

  function displayRate(bank: Bank): string {
    if (bank.interestType === "FIXED" && bank.fixedRate) {
      return `${locale === "en" ? "Fixed" : "固定"} ${(bank.fixedRate * 100).toFixed(2)}%`;
    }
    let s = "";
    if (bank.baseRate != null) s += `HIBOR ${(bank.baseRate * 100).toFixed(2)}%`;
    if (bank.spread != null) s += ` + ${(bank.spread * 100).toFixed(2)}%`;
    if (bank.capRate != null) s += ` (${locale === "en" ? "Cap" : "封顶"} ${(bank.capRate * 100).toFixed(2)}%)`;
    return s || "-";
  }

  const fetchBanks = useCallback(async () => {
    const res = await fetch("/api/banks");
    setBanks(await res.json());
  }, []);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  useEffect(() => {
    setLocale(getSavedLocale());
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(b: Bank) {
    setEditingId(b.id);
    setForm({
      bankName: b.bankName,
      maxLtv: b.maxLtv.toString(),
      interestType: b.interestType,
      baseRate: b.baseRate?.toString() || "",
      spread: b.spread?.toString() || "",
      capRate: b.capRate?.toString() || "",
      fixedRate: b.fixedRate?.toString() || "",
      minLoanAmount: b.minLoanAmount?.toString() || "",
      maxLoanTerm: b.maxLoanTerm?.toString() || "",
      notes: b.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setLoading(true);
    const url = editingId ? `/api/banks/${editingId}` : "/api/banks";
    const method = editingId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    await fetchBanks();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("page.banks.confirm_delete", locale))) return;
    await fetch(`/api/banks/${id}`, { method: "DELETE" });
    await fetchBanks();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("page.banks.title", locale)}</h1>
          <p className="text-gray-500 mt-1">{t("page.banks.desc", locale)}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("page.banks.add", locale)}
        </Button>
      </div>

      {banks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Landmark className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">{t("page.banks.empty", locale)}</p>
            <p className="text-sm mt-1">{t("page.banks.empty_hint", locale)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banks.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{b.bankName}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                <div className="flex gap-2">
                  <Badge>LTV {(b.maxLtv * 100).toFixed(0)}%</Badge>
                  <Badge variant="secondary">{displayRate(b)}</Badge>
                </div>
                {b.minLoanAmount && (
                  <p className="text-sm text-gray-500">{`${t("page.banks.min_loan_label", locale)}：`}${b.minLoanAmount.toLocaleString()}</p>
                )}
                {b.notes && <p className="text-sm text-gray-400">{b.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingId ? t("page.banks.edit", locale) : t("page.banks.create", locale)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("page.banks.name", locale)}</Label>
            <Input className="mt-1.5" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="如：中银香港" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.banks.max_ltv", locale)}</Label>
              <Input className="mt-1.5" type="number" step="0.01" value={form.maxLtv} onChange={(e) => setForm({ ...form, maxLtv: e.target.value })} placeholder="如：0.8 表示 80%" />
            </div>
            <div>
              <Label>{t("page.banks.rate_type", locale)}</Label>
              <Select className="mt-1.5" value={form.interestType} onChange={(e) => setForm({ ...form, interestType: e.target.value })}>
                <option value="HIBOR_SPREAD">{t("page.banks.hibor_spread", locale)}</option>
                <option value="FIXED">{t("page.banks.fixed", locale)}</option>
                <option value="CAP">{t("page.banks.cap", locale)}</option>
              </Select>
            </div>
          </div>
          {form.interestType !== "FIXED" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>HIBOR（小数）</Label>
                <Input className="mt-1.5" type="number" step="0.0001" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} placeholder="如：0.043" />
              </div>
              <div>
                <Label>点差（小数）</Label>
                <Input className="mt-1.5" type="number" step="0.0001" value={form.spread} onChange={(e) => setForm({ ...form, spread: e.target.value })} placeholder="如：0.008" />
              </div>
              <div>
                <Label>封顶利率（小数）</Label>
                <Input className="mt-1.5" type="number" step="0.0001" value={form.capRate} onChange={(e) => setForm({ ...form, capRate: e.target.value })} placeholder="如：0.06" />
              </div>
            </div>
          )}
          {form.interestType === "FIXED" && (
            <div>
              <Label>{t("page.banks.fixed_rate", locale)}</Label>
              <Input className="mt-1.5" type="number" step="0.0001" value={form.fixedRate} onChange={(e) => setForm({ ...form, fixedRate: e.target.value })} placeholder="如：0.045" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("page.banks.min_loan", locale)}</Label>
              <Input className="mt-1.5" type="number" value={form.minLoanAmount} onChange={(e) => setForm({ ...form, minLoanAmount: e.target.value })} />
            </div>
            <div>
              <Label>{t("page.banks.max_term", locale)}</Label>
              <Input className="mt-1.5" type="number" value={form.maxLoanTerm} onChange={(e) => setForm({ ...form, maxLoanTerm: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t("common.notes", locale)}</Label>
            <Input className="mt-1.5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="其他条件说明" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel", locale)}</Button>
          <Button onClick={handleSubmit} disabled={!form.bankName || loading}>
            {loading ? t("common.saving", locale) : t("common.save", locale)}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
