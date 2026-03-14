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
  const t = await getTranslations({ locale, namespace: "metadata.privacy" });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${BASE_URL}${prefix}/privacy`;
  }

  const url =
    locale === routing.defaultLocale
      ? `${BASE_URL}/privacy`
      : `${BASE_URL}/${locale}/privacy`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url, languages },
  };
}

export default function PrivacyPage() {
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
        <article className="mx-auto max-w-3xl px-6 prose prose-neutral">
          <h1 className="font-serif text-3xl font-bold tracking-tight mb-2">
            プライバシーポリシー
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            最終更新日: 2026年3月2日
          </p>

          <Section title="1. はじめに">
            <p>
              Unmute AI（以下「本サービス」）は、ユーザーの個人情報の保護を重要な責務と考え、個人情報の保護に関する法律（個人情報保護法）およびその他の関連法令を遵守します。本プライバシーポリシーは、本サービスが収集する情報、その利用目的、および保護方法について説明するものです。
            </p>
          </Section>

          <Section title="2. 収集する個人情報">
            <p>本サービスでは、以下の情報を収集する場合があります。</p>
            <h4 className="font-semibold mt-4 mb-2">
              (a) Google OAuth 認証情報
            </h4>
            <p>
              アカウント登録・ログイン時に、Googleアカウントの氏名、メールアドレス、プロフィール画像URLを取得します。パスワードは一切取得・保存しません。
            </p>
            <h4 className="font-semibold mt-4 mb-2">(b) 翻訳データ</h4>
            <p>
              ユーザーが入力した原文テキストおよび翻訳結果テキストを、サービス提供のために保存します。
            </p>
            <h4 className="font-semibold mt-4 mb-2">(c) 決済情報</h4>
            <p>
              有料プランのお支払いにはStripeを利用しています。クレジットカード番号等の決済情報はStripeが直接管理し、本サービスのサーバーには保存されません。本サービスが保持するのは、Stripeの顧客IDおよびサブスクリプション状態のみです。
            </p>
            <h4 className="font-semibold mt-4 mb-2">(d) ログ情報</h4>
            <p>
              サービスの改善・運用監視のため、アクセスログ（IPアドレス、ブラウザ情報、アクセス日時等）を収集する場合があります。
            </p>
          </Section>

          <Section title="3. 利用目的">
            <p>収集した個人情報は、以下の目的で利用します。</p>
            <ul className="list-disc ps-6 space-y-1 mt-2">
              <li>本サービスの提供・維持・改善</li>
              <li>ユーザー認証およびアカウント管理</li>
              <li>有料プランの課金処理</li>
              <li>ユーザーサポートへの対応</li>
              <li>利用状況の分析およびサービス改善</li>
              <li>重要なお知らせの通知</li>
            </ul>
          </Section>

          <Section title="4. 第三者提供">
            <p>
              本サービスは、以下のサービスプロバイダーと情報を共有する場合があります。いずれも、サービス提供に必要な範囲に限定されます。
            </p>
            <ul className="list-disc ps-6 space-y-1 mt-2">
              <li>
                <strong>Google</strong> — OAuth認証
              </li>
              <li>
                <strong>Stripe</strong> — 決済処理
              </li>
              <li>
                <strong>Google Gemini API</strong> —
                翻訳処理（入力テキストをAPIに送信します）
              </li>
              <li>
                <strong>Vercel</strong> — ホスティング・インフラ
              </li>
              <li>
                <strong>Neon</strong> — データベースホスティング
              </li>
            </ul>
            <p className="mt-2">
              上記以外の第三者に対して、法令に基づく場合を除き、ユーザーの同意なく個人情報を提供することはありません。
            </p>
          </Section>

          <Section title="5. Cookie">
            <p>
              本サービスでは、認証セッションの維持を目的としてCookieを使用します。Cookieを無効にすることも可能ですが、その場合サービスの一部機能が利用できなくなる場合があります。
            </p>
          </Section>

          <Section title="6. データ保管期間">
            <p>
              個人情報は、利用目的の達成に必要な期間保管します。アカウントを削除された場合、合理的な期間内に関連する個人情報を削除します。ただし、法令により保管が義務付けられている場合はこの限りではありません。
            </p>
          </Section>

          <Section title="7. ユーザーの権利">
            <p>
              ユーザーは、個人情報保護法に基づき、以下の権利を有します。
            </p>
            <ul className="list-disc ps-6 space-y-1 mt-2">
              <li>個人情報の開示請求</li>
              <li>個人情報の訂正・追加・削除請求</li>
              <li>個人情報の利用停止・消去請求</li>
              <li>個人情報の第三者提供の停止請求</li>
            </ul>
            <p className="mt-2">
              これらの請求は、本ページ末尾のお問い合わせ先までご連絡ください。
            </p>
          </Section>

          <Section title="8. 安全管理措置">
            <p>
              本サービスは、個人情報への不正アクセス、紛失、破壊、改ざん、漏洩を防止するため、SSL/TLS暗号化通信、アクセス制御、定期的なセキュリティレビュー等の合理的な安全管理措置を講じます。
            </p>
          </Section>

          <Section title="9. ポリシーの変更">
            <p>
              本プライバシーポリシーは、法令の改正やサービス内容の変更に伴い、事前の通知なく改定される場合があります。重要な変更がある場合は、サービス内で通知します。最新のポリシーは常に本ページに掲載されます。
            </p>
          </Section>

          <Section title="10. お問い合わせ先">
            <p>
              プライバシーポリシーに関するお問い合わせは、以下までご連絡ください。
            </p>
            <p className="mt-2">
              {/* TODO: 正式なメールアドレスに置き換え */}
              メール:{" "}
              <a
                href="mailto:support@unmute-ai.com"
                className="text-primary hover:underline"
              >
                support@unmute-ai.com
              </a>
            </p>
          </Section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mt-8 mb-3">{title}</h2>
      <div className="text-sm leading-relaxed text-foreground/85 space-y-2">
        {children}
      </div>
    </section>
  );
}
