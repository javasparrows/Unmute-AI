import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { fontSans, fontSerif, fontMono, fontCJK } from "@/app/layout";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

const RTL_LOCALES = new Set(['ar', 'fa']);
const CJK_LOCALES = new Set(['ja', 'zh-CN', 'zh-TW', 'ko']);

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} ${CJK_LOCALES.has(locale) ? fontCJK.variable : ""} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-center" />
          </TooltipProvider>
          <PageViewTracker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
