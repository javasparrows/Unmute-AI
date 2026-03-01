import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-serif font-bold tracking-tight">
          Unmute AI
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link
            href="/#features"
            className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
          >
            Pricing
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {session?.user ? (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <UserMenu user={session.user} />
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
