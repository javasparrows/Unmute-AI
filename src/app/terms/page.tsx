import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "利用規約 | Unmute AI",
  description: "Unmute AI の利用規約",
};

export default function TermsPage() {
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
            利用規約
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            最終更新日: 2026年3月2日
          </p>

          <Section title="第1条（適用）">
            <p>
              本利用規約（以下「本規約」）は、Unmute AI（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。
            </p>
          </Section>

          <Section title="第2条（サービス内容）">
            <p>
              本サービスは、AI技術を活用した学術論文の翻訳支援サービスです。ユーザーが入力した原文テキストを指定の言語に翻訳し、学術ジャーナルのスタイルに適合した翻訳結果を提供します。
            </p>
          </Section>

          <Section title="第3条（アカウント）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                ユーザーは、Googleアカウントを使用して本サービスに登録するものとします。
              </li>
              <li>
                ユーザーは、自己のアカウントを適切に管理する責任を負います。
              </li>
              <li>
                アカウントの第三者への譲渡、貸与は禁止します。
              </li>
            </ol>
          </Section>

          <Section title="第4条（料金・支払い）">
            <p>本サービスは以下のプランを提供します。</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">
                      プラン
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold">
                      月額料金（税込）
                    </th>
                    <th className="text-left py-2 font-semibold">内容</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Free</td>
                    <td className="py-2 pr-4">無料</td>
                    <td className="py-2">基本翻訳機能</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Pro</td>
                    <td className="py-2 pr-4">980円</td>
                    <td className="py-2">翻訳回数上限拡大、優先翻訳</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Max</td>
                    <td className="py-2 pr-4">2,980円</td>
                    <td className="py-2">無制限翻訳、全機能利用可能</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ol className="list-decimal pl-6 space-y-2 mt-4">
              <li>
                有料プランの支払いはStripeを通じたクレジットカード決済により行われます。
              </li>
              <li>
                サブスクリプションは月単位で自動更新されます。
              </li>
              <li>
                料金の変更がある場合は、事前にユーザーに通知します。
              </li>
            </ol>
          </Section>

          <Section title="第5条（禁止事項）">
            <p>ユーザーは、以下の行為を行ってはなりません。</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>法令または公序良俗に反する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>
                不正アクセス、リバースエンジニアリング、スクレイピング等の行為
              </li>
              <li>本サービスを利用した第三者への翻訳サービスの再販</li>
              <li>自動化ツール等による大量リクエストの送信</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </Section>

          <Section title="第6条（知的財産権）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                ユーザーが入力した原文テキストの著作権は、ユーザーに帰属します。
              </li>
              <li>
                本サービスによる翻訳結果の著作権は、ユーザーに帰属します。
              </li>
              <li>
                本サービスのソフトウェア、デザイン、ロゴ等の知的財産権は、運営者に帰属します。
              </li>
            </ol>
          </Section>

          <Section title="第7条（AI翻訳の免責）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                本サービスが提供する翻訳はAI（人工知能）によるものであり、翻訳の正確性、完全性、特定目的への適合性を保証するものではありません。
              </li>
              <li>
                学術論文の投稿にあたっては、ユーザー自身の責任において翻訳結果を確認・校正してください。
              </li>
              <li>
                翻訳結果の利用により生じた損害について、運営者は一切の責任を負いません。
              </li>
            </ol>
          </Section>

          <Section title="第8条（サービスの変更・中断）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                運営者は、事前の通知なく本サービスの内容を変更、または一時的に中断することがあります。
              </li>
              <li>
                システムの保守、天災、外部サービスの障害等やむを得ない事由による中断について、運営者は責任を負いません。
              </li>
            </ol>
          </Section>

          <Section title="第9条（解約）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                ユーザーは、設定画面からいつでもアカウントを削除し、本サービスの利用を終了できます。
              </li>
              <li>
                有料プランのユーザーは、サブスクリプションをキャンセルすることで次回更新日以降の課金を停止できます。キャンセル後も、当月の残り期間はサービスを利用可能です。
              </li>
              <li>
                既に支払済みの料金の返金は行いません。
              </li>
            </ol>
          </Section>

          <Section title="第10条（免責事項・責任制限）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                本サービスは「現状有姿」で提供され、明示・黙示を問わず、いかなる保証も行いません。
              </li>
              <li>
                運営者の責任は、ユーザーが過去1ヶ月間に支払った利用料金の合計額を上限とします。
              </li>
              <li>
                運営者は、間接損害、逸失利益、データの喪失等について責任を負いません。
              </li>
            </ol>
          </Section>

          <Section title="第11条（準拠法・管轄裁判所）">
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>本規約は日本法に準拠するものとします。</li>
              <li>
                本サービスに関する紛争は、仙台地方裁判所を第一審の専属的合意管轄裁判所とします。
              </li>
            </ol>
          </Section>

          <Section title="第12条（お問い合わせ先）">
            <p>
              本規約に関するお問い合わせは、以下までご連絡ください。
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
