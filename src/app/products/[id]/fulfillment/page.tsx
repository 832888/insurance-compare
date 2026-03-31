"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FulfillmentRecord {
  id: string;
  year: number;
  ratio: number;
  source: string | null;
  notes: string | null;
}

interface FormRow {
  year: string;
  ratio: string;
  source: string;
  notes: string;
}

export default function FulfillmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [records, setRecords] = useState<FulfillmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormRow>({
    year: new Date().getFullYear().toString(),
    ratio: "",
    source: "GN16",
    notes: "",
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/products/${id}/fulfillment`);
    if (res.ok) {
      const data: FulfillmentRecord[] = await res.json();
      setRecords(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function handleAdd() {
    const year = parseInt(form.year);
    const ratio = parseFloat(form.ratio);
    if (isNaN(year) || isNaN(ratio)) return;

    setSaving(true);
    const res = await fetch(`/api/products/${id}/fulfillment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: [
          {
            year,
            ratio,
            source: form.source || null,
            notes: form.notes || null,
          },
        ],
      }),
    });

    if (res.ok) {
      setForm({
        year: (year + 1).toString(),
        ratio: "",
        source: "GN16",
        notes: "",
      });
      await fetchRecords();
    }
    setSaving(false);
  }

  const chartData = [...records]
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ year: r.year, ratio: r.ratio }));

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push(`/products/${id}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回产品详情
      </Button>

      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">GN16 分红实现率</h1>
      </div>

      {/* Chart */}
      {chartData.length >= 2 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>历年趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value)}%`, "实现率"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>添加年度数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label>年份</Label>
              <Input
                className="mt-1.5"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div>
              <Label>实现率 (%)</Label>
              <Input
                className="mt-1.5"
                type="number"
                step="0.1"
                placeholder="e.g. 102"
                value={form.ratio}
                onChange={(e) => setForm({ ...form, ratio: e.target.value })}
              />
            </div>
            <div>
              <Label>来源</Label>
              <Input
                className="mt-1.5"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </div>
            <div>
              <Label>备注</Label>
              <Input
                className="mt-1.5"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div>
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {saving ? "保存中..." : "添加"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>历史数据</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-gray-400 py-8 text-center">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-gray-400 py-8 text-center">
              暂无数据，请添加年度分红实现率
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">
                      年份
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      实现率
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      来源
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      备注
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium">{r.year}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            r.ratio >= 100 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {r.ratio}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.source || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
