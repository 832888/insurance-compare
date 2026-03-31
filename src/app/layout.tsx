import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "保险方案比较系统",
  description: "香港储蓄分红保险 & 保费融资 对比分析工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK" className="h-full">
      <body className="h-full bg-gray-50 font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
