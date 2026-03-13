import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/auth/user-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("header");

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
            href="/pricing"
            className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
          >
            {t("pricing")}
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        {session?.user ? (
          <UserMenu user={session.user} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
