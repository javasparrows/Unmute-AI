import { requireAdmin } from "@/lib/admin";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";

const ADMIN_TABS = [
  { href: "/admin/overview", label: "概要" },
  { href: "/admin/acquisition", label: "ユーザー獲得" },
  { href: "/admin/plans", label: "プラン" },
  { href: "/admin/users", label: "ユーザー" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">管理ダッシュボード</h1>
        </div>
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b">
          {ADMIN_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
