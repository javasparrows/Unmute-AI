import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="font-serif font-bold text-foreground">Unmute AI</div>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/legal/tokushoho"
            className="hover:text-foreground transition-colors"
          >
            特商法表記
          </Link>
        </div>
        <div>&copy; {new Date().getFullYear()} Unmute AI</div>
      </div>
    </footer>
  );
}
