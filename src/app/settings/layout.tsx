import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
          <p className="text-muted-foreground">
            アカウントとアプリケーションの設定を管理します
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-48 shrink-0">
            <SettingsNav />
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
