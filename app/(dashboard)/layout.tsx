import { BottomNav } from "@/components/BottomNav";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><main className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-8">{children}</main><BottomNav /></>;
}
