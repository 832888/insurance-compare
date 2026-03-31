"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { t, getSavedLocale, type Locale } from "@/lib/i18n";
import {
  LayoutDashboard, Building2, Package, GitCompareArrows, Landmark,
  Calculator, Users, FileText, Sparkles, Upload, KeyRound, LogOut, Loader2, Eye, EyeOff,
} from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface NavSection {
  titleKey?: string;
  items: { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
    ],
  },
  {
    titleKey: "section.data",
    items: [
      { href: "/companies", labelKey: "nav.companies", icon: Building2 },
      { href: "/products", labelKey: "nav.products", icon: Package },
      { href: "/products/import", labelKey: "nav.import", icon: Upload },
      { href: "/banks", labelKey: "nav.banks", icon: Landmark },
    ],
  },
  {
    titleKey: "section.analysis",
    items: [
      { href: "/compare", labelKey: "nav.compare", icon: GitCompareArrows },
      { href: "/financing", labelKey: "nav.financing", icon: Calculator },
      { href: "/financing/multi", labelKey: "nav.financing_multi", icon: Calculator },
    ],
  },
  {
    titleKey: "section.client",
    items: [
      { href: "/clients", labelKey: "nav.clients", icon: Users },
      { href: "/schemes", labelKey: "nav.schemes", icon: FileText },
    ],
  },
  {
    titleKey: "section.smart",
    items: [
      { href: "/ai", labelKey: "nav.ai", icon: Sparkles },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setLocale(getSavedLocale());
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleChangePassword() {
    setPwdError("");
    if (newPwd !== confirmPwd) {
      setPwdError(locale === "en" ? "Passwords don't match" : "两次密码不一致");
      return;
    }
    if (newPwd.length < 4) {
      setPwdError(locale === "en" ? "Min 4 characters" : "新密码至少 4 位");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdSuccess(true);
      setTimeout(() => {
        setPwdDialogOpen(false);
        setPwdSuccess(false);
        setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      }, 1500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setPwdLoading(false);
    }
  }

  const pwdLabels = {
    title: locale === "en" ? "Change Password" : "修改密码",
    oldPwd: locale === "en" ? "Current Password" : "当前密码",
    newPwd: locale === "en" ? "New Password" : "新密码",
    confirmPwd: locale === "en" ? "Confirm Password" : "确认新密码",
    success: locale === "en" ? "Password changed!" : "密码修改成功！",
    changePwd: locale === "en" ? "Change Password" : "修改密码",
    logout: locale === "en" ? "Logout" : "退出登录",
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 w-60 bg-gray-900 text-white flex flex-col print:hidden">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight">{t("app.title", locale)}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t("app.subtitle", locale)}</p>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.titleKey && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {t(section.titleKey, locale)}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {t(item.labelKey, locale)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-2 border-t border-gray-800 space-y-1">
          <button
            onClick={() => { setPwdDialogOpen(true); setPwdError(""); setPwdSuccess(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            {pwdLabels.changePwd}
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
            {pwdLabels.logout}
          </button>
        </div>

        <div className="px-4 py-3 border-t border-gray-800 space-y-2">
          <LocaleSwitcher />
          <p className="text-xs text-gray-500 text-center">v0.4.0</p>
        </div>
      </aside>

      <Dialog open={pwdDialogOpen} onClose={() => setPwdDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{pwdLabels.title}</DialogTitle>
        </DialogHeader>
        {pwdSuccess ? (
          <div className="py-8 text-center text-green-600 font-medium">{pwdLabels.success}</div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>{pwdLabels.oldPwd}</Label>
              <div className="relative mt-1.5">
                <Input type={showOld ? "text" : "password"} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showOld ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <Label>{pwdLabels.newPwd}</Label>
              <div className="relative mt-1.5">
                <Input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <Label>{pwdLabels.confirmPwd}</Label>
              <Input className="mt-1.5" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
            {pwdError && <p className="text-sm text-red-500">{pwdError}</p>}
          </div>
        )}
        {!pwdSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogOpen(false)}>{t("common.cancel", locale)}</Button>
            <Button onClick={handleChangePassword} disabled={pwdLoading || !oldPwd || !newPwd || !confirmPwd}>
              {pwdLoading ? t("common.saving", locale) : t("common.save", locale)}
            </Button>
          </DialogFooter>
        )}
      </Dialog>
    </>
  );
}
