"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="ml-60 min-h-full">
        <div className="px-8 py-6">{children}</div>
      </main>
    </>
  );
}
