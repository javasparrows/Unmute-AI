import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/auth/user-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("header");

  const navLinks = session?.user
    ? [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/paste-cleaner", label: t("pasteCleaner") },
        { href: "/pricing", label: t("pricing") },
      ]
    : [
        { href: "/#features", label: t("features") },
        { href: "/paste-cleaner", label: t("pasteCleaner") },
        { href: "/pricing", label: t("pricing") },
      ];

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-serif font-bold tracking-tight">
          Unmute AI
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              {t("dashboard")}
            </Link>
          ) : (
            <Link
              href="/#features"
              className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
            >
              {t("features")}
            </Link>
          )}
          <Link
            href="/paste-cleaner"
            className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
          >
            {t("pasteCleaner")}
          </Link>
          <Link
            href="/pricing"
            className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
          >
            {t("pricing")}
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <MobileNav
          links={navLinks}
          loginLabel={t("login")}
          getStartedLabel={t("getStarted")}
        />
        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>
        {session?.user ? (
          <div className="hidden sm:block">
            <UserMenu user={session.user} role={session.user.role} />
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t("login")}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                {t("getStarted")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
