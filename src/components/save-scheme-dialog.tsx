"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Client {
  id: string;
  name: string;
}

interface SaveSchemeDialogProps {
  open: boolean;
  onClose: () => void;
  type: "COMPARE" | "FINANCING";
  productIds: string[];
  defaultTitle?: string;
  compareParams?: Record<string, unknown>;
  financingParams?: Record<string, unknown>;
  preSelectedClientId?: string;
}

export function SaveSchemeDialog({
  open,
  onClose,
  type,
  productIds,
  defaultTitle = "",
  compareParams,
  financingParams,
  preSelectedClientId,
}: SaveSchemeDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState(defaultTitle);
  const [clientId, setClientId] = useState(preSelectedClientId || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/clients").then((r) => r.json()).then(setClients);
      setTitle(defaultTitle);
      setClientId(preSelectedClientId || "");
      setNotes("");
      setSaved(false);
    }
  }, [open, defaultTitle, preSelectedClientId]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || `${type === "COMPARE" ? "对比" : "融资"}方案 - ${new Date().toLocaleDateString("zh-CN")}`,
        clientId: clientId || null,
        type,
        productIds,
        compareParams,
        financingParams,
        notes: notes || null,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>保存{type === "COMPARE" ? "对比" : "融资"}方案</DialogTitle>
      </DialogHeader>

      {saved ? (
        <div className="py-8 text-center">
          <p className="text-lg font-medium text-green-600">方案已保存！</p>
          <p className="text-sm text-gray-500 mt-1">可在「方案记录」中查看</p>
          <Button className="mt-4" onClick={onClose}>关闭</Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <Label>方案标题</Label>
              <Input
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${type === "COMPARE" ? "对比" : "融资"}方案 - ${new Date().toLocaleDateString("zh-CN")}`}
              />
            </div>
            <div>
              <Label>关联客户（可选）</Label>
              <Select className="mt-1.5" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">-- 不关联客户 --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>备注</Label>
              <Input
                className="mt-1.5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="方案备注信息"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存方案"}
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
