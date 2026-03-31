export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Package, Landmark, GitCompareArrows, Users, FileText, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";
import { buildCashflowsForIRR, calculateIRR, formatPercent } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "zh-CN";

  const [companyCount, productCount, bankCount, clientCount, schemeCount, recentSchemes, products] =
    await Promise.all([
      prisma.company.count(),
      prisma.product.count(),
      prisma.financingBank.count(),
      prisma.client.count(),
      prisma.scheme.count(),
      prisma.scheme.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          client: { select: { name: true } },
          products: {
            include: { product: { select: { name: true, company: { select: { name: true } } } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.product.findMany({
        include: {
          company: { select: { name: true } },
          cashValueEntries: {
            where: { policyYear: 20 },
            take: 1,
          },
        },
      }),
    ]);

  const irrRankings = products
    .map((p) => {
      const entry = p.cashValueEntries[0];
      if (!entry) return null;
      const flows = buildCashflowsForIRR(entry.annualPremium, entry.premiumTerm, entry.totalCV, 20);
      const irr = calculateIRR(flows);
      const gFlows = buildCashflowsForIRR(entry.annualPremium, entry.premiumTerm, entry.guaranteedCV, 20);
      const gIrr = calculateIRR(gFlows);
      return { name: p.name, company: p.company.name, irr, gIrr, currency: p.currency };
    })
    .filter(Boolean)
    .sort((a, b) => (b!.irr ?? 0) - (a!.irr ?? 0)) as {
      name: string; company: string; irr: number | null; gIrr: number | null; currency: string;
    }[];

  const stats = [
    { label: t("dash.companies", locale), value: companyCount, icon: Building2, href: "/companies", color: "bg-blue-500" },
    { label: t("dash.products", locale), value: productCount, icon: Package, href: "/products", color: "bg-emerald-500" },
    { label: t("dash.banks", locale), value: bankCount, icon: Landmark, href: "/banks", color: "bg-amber-500" },
    { label: t("dash.clients", locale), value: clientCount, icon: Users, href: "/clients", color: "bg-purple-500" },
    { label: t("dash.schemes", locale), value: schemeCount, icon: FileText, href: "/schemes", color: "bg-rose-500" },
  ];

  const quickActions = [
    { label: t("dash.new_compare", locale), href: "/compare", icon: GitCompareArrows, desc: t("dash.new_compare_desc", locale) },
    { label: t("dash.financing_analysis", locale), href: "/financing", icon: Calculator, desc: t("dash.financing_desc", locale) },
    { label: t("dash.multi_financing", locale), href: "/financing/multi", icon: TrendingUp, desc: t("dash.multi_desc", locale) },
    { label: t("dash.client_mgmt", locale), href: "/clients", icon: Users, desc: t("dash.client_desc", locale) },
  ];

  const dateLocale = locale === "en" ? "en-US" : locale === "zh-TW" ? "zh-TW" : "zh-CN";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("dash.title", locale)}</h1>
      <p className="text-gray-500 mt-1 mb-6">{t("dash.subtitle", locale)}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`${s.color} p-2.5 rounded-lg`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              {t("dash.irr_rank", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {irrRankings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t("common.no_data", locale)}</p>
            ) : (
              <div className="space-y-3">
                {irrRankings.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                        i === 1 ? "bg-gray-100 text-gray-700" :
                        i === 2 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        {p.irr != null ? formatPercent(p.irr) : "-"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t("insurance.guaranteed", locale)} {p.gIrr != null ? formatPercent(p.gIrr) : "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {t("dash.recent", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSchemes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t("dash.no_scheme", locale)}</p>
            ) : (
              <div className="space-y-3">
                {recentSchemes.map((s) => (
                  <div key={s.id} className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {s.type === "COMPARE" ? (
                          <GitCompareArrows className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Calculator className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                      </div>
                      {s.client && (
                        <p className="text-xs text-gray-500 mt-0.5">{t("dash.client_label", locale)}：{s.client.name}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.products.slice(0, 3).map((sp, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {sp.product.company.name} - {sp.product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {new Date(s.updatedAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dash.quick", locale)}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-start gap-3 py-4">
                <div className="bg-gray-100 p-2 rounded-lg mt-0.5">
                  <a.icon className="h-4.5 w-4.5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
