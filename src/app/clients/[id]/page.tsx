"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GitCompareArrows, Calculator, FileText, Trash2 } from "lucide-react";

interface SchemeProduct {
  product: { name: string; currency: string; company: { name: string } };
}

interface Scheme {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  products: SchemeProduct[];
}

interface ClientDetail {
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
  schemes: Scheme[];
}

const statusLabels: Record<string, { label: string; variant: "default" | "success" | "secondary" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  SENT: { label: "已发送", variant: "success" },
  ARCHIVED: { label: "已归档", variant: "default" },
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}`);
    if (res.ok) setClient(await res.json());
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  async function deleteScheme(schemeId: string) {
    if (!confirm("确认删除此方案？")) return;
    await fetch(`/api/schemes/${schemeId}`, { method: "DELETE" });
    await fetchClient();
  }

  if (!client) return <div className="text-gray-400 py-12 text-center">加载中...</div>;

  return (
    <div>
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/clients")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回客户列表
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {client.age && <span>{client.age}岁</span>}
            {client.gender && <span>{client.gender === "M" ? "男" : "女"}</span>}
            {client.smoker && <Badge variant="warning">吸烟</Badge>}
            {client.phone && <span>{client.phone}</span>}
            {client.email && <span>{client.email}</span>}
          </div>
          {client.budget && (
            <p className="text-sm text-gray-500 mt-1">
              预算：{client.currency || "USD"} {client.budget.toLocaleString()}/年
            </p>
          )}
          {client.notes && <p className="text-sm text-gray-400 mt-1">{client.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/compare?clientId=${client.id}`}>
            <Button variant="outline">
              <GitCompareArrows className="h-4 w-4 mr-2" />
              新建对比方案
            </Button>
          </Link>
          <Link href={`/financing?clientId=${client.id}`}>
            <Button variant="outline">
              <Calculator className="h-4 w-4 mr-2" />
              新建融资方案
            </Button>
          </Link>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">方案记录</h2>

      {client.schemes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="h-10 w-10 mb-2" />
            <p className="font-medium">暂无方案</p>
            <p className="text-sm mt-1">点击上方按钮为此客户创建对比或融资方案</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {client.schemes.map((s) => {
            const st = statusLabels[s.status] || statusLabels.DRAFT;
            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {s.type === "COMPARE" ? (
                        <GitCompareArrows className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <Calculator className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <p className="font-medium text-gray-900 truncate">{s.title}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {s.products.map((sp, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {sp.product.company.name} - {sp.product.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(s.updatedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteScheme(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
