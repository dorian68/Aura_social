import type { PropsWithChildren } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuraOperator } from "@/components/operator/AuraOperator";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen pt-[74px] lg:pl-72 lg:pt-0">{children}</main>
      <AuraOperator />
    </div>
  );
}
