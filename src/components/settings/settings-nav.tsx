"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { User, Settings, CreditCard, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/settings/profile", key: "profile", icon: User },
  { href: "/settings/preferences", key: "preferences", icon: Settings },
  { href: "/settings/billing", key: "billing", icon: CreditCard },
  { href: "/settings/analytics", key: "analytics", icon: BarChart3 },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings.nav");

  return (
    <nav className="flex flex-row md:flex-col gap-1">
      {navItems.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden md:inline">{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
