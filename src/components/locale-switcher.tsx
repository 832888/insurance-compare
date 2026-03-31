"use client";

import { useState, useEffect } from "react";
import { type Locale, getLocales } from "@/lib/i18n";

export function LocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved) setLocale(saved);
  }, []);

  function handleChange(newLocale: Locale) {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  }

  const locales = getLocales();

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
      className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {locales.map((l) => (
        <option key={l.value} value={l.value}>{l.label}</option>
      ))}
    </select>
  );
}
