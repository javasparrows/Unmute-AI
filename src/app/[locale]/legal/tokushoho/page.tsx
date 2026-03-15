import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteFooter } from "@/components/layout/site-footer";

const BASE_URL = "https://unmute-ai.com";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.tokushoho" });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${BASE_URL}${prefix}/legal/tokushoho`;
  }

  const url =
    locale === routing.defaultLocale
      ? `${BASE_URL}/legal/tokushoho`
      : `${BASE_URL}/${locale}/legal/tokushoho`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url, languages },
  };
}

const rows = [
  {
    label: "販売業者",
    value: "株式会社AI Driven",
  },
  {
    label: "所在地",
    value: "〒104-0061 東京都中央区銀座1-12-4 N&E BLD.6F",
  },
  {
    label: "連絡先",
    value: "support@unmute-ai.com",
  },
  {
    label: "販売価格",
    value:
      "Free プラン: 無料 / Pro プラン: 月額980円（税込） / Max プラン: 月額2,980円（税込）",
  },
  {
    label: "支払方法",
    value: "クレジットカード決済（Stripe経由）",
  },
  {
    label: "支払時期",
    value: "サブスクリプション登録時に初回決済、以降毎月自動更新",
  },
  {
    label: "サービス提供時期",
    value: "お支払い確認後、直ちにご利用いただけます",
  },
  {
    label: "返品・キャンセル",
    value:
      "デジタルサービスの性質上、お支払い後の返金は行っておりません。サブスクリプションはいつでもキャンセル可能で、キャンセル後は次回更新日まで引き続きご利用いただけます。",
  },
  {
    label: "動作環境",
    value:
      "最新版のGoogle Chrome、Safari、Firefox、Microsoft Edgeを推奨。安定したインターネット接続が必要です。",
  },
] as const;

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b py-4">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            href="/"
            className="font-serif font-bold text-lg hover:text-primary transition-colors"
          >
            Unmute AI
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12">
        <article className="mx-auto max-w-3xl px-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight mb-2">
            特定商取引法に基づく表記
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            最終更新日: 2026年3月2日
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b">
                    <th className="text-start py-3 pe-6 font-semibold align-top whitespace-nowrap w-40">
                      {row.label}
                    </th>
                    <td className="py-3 text-foreground/85 leading-relaxed">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
