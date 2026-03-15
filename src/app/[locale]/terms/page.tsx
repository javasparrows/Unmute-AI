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
  const t = await getTranslations({ locale, namespace: "metadata.terms" });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${BASE_URL}${prefix}/terms`;
  }

  const url =
    locale === routing.defaultLocale
      ? `${BASE_URL}/terms`
      : `${BASE_URL}/${locale}/terms`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url, languages },
  };
}

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

          {/* ── 第1条 定義 ── */}
          <Section title="第1条（定義）">
            <p>本規約において、以下の用語は次の意味を有します。</p>
            <ul className="list-disc ps-6 space-y-1 mt-2">
              <li>
                <strong>「本サービス」</strong> —
                運営者が提供するAI学術翻訳支援サービス「Unmute AI」（Webアプリケーション、API、および関連するすべての機能を含みます）
              </li>
              <li>
                <strong>「運営者」</strong> — 本サービスの運営主体
              </li>
              <li>
                <strong>「ユーザー」</strong> —
                本サービスにアカウントを登録し、または本サービスを利用するすべての個人および法人
              </li>
              <li>
                <strong>「コンテンツ」</strong> —
                ユーザーが本サービスに入力する原文テキスト、文書データ、およびその他の情報
              </li>
              <li>
                <strong>「翻訳結果」</strong> —
                本サービスのAI技術により生成された翻訳文、校正文、およびその他の出力
              </li>
              <li>
                <strong>「AIテクノロジー」</strong> —
                本サービスが翻訳・校正に使用する機械学習モデル、生成AI、および第三者APIを含む技術基盤（Google
                Gemini API等）
              </li>
            </ul>
          </Section>

          {/* ── 第2条 適用 ── */}
          <Section title="第2条（適用）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                本利用規約（以下「本規約」）は、本サービスの利用に関する一切の関係に適用されます。
              </li>
              <li>
                ユーザーは、本サービスのアカウントを作成した時点、または本サービスの利用を開始した時点のいずれか早い方で、本規約に同意したものとみなされます。
              </li>
              <li>
                本規約の内容に同意いただけない場合は、本サービスを利用することはできません。
              </li>
            </ol>
          </Section>

          {/* ── 第3条 サービス内容 ── */}
          <Section title="第3条（サービス内容）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                本サービスは、AIテクノロジーを活用した学術論文の翻訳支援サービスです。ユーザーが入力した原文テキストを指定の言語に翻訳し、学術ジャーナルのスタイルに適合した翻訳結果を提供します。
              </li>
              <li>
                本サービスの具体的な機能、対応言語、対応ジャーナルスタイル、および利用制限は、プランおよびサービスの提供状況に応じて異なる場合があります。
              </li>
              <li>
                運営者は、使用するAIテクノロジーの種類・バージョンを予告なく変更する裁量を有します。
              </li>
            </ol>
          </Section>

          {/* ── 第4条 アカウント ── */}
          <Section title="第4条（アカウント）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                ユーザーは、Googleアカウントを使用して本サービスに登録するものとします。
              </li>
              <li>
                ユーザーは、自己のアカウントを適切に管理する責任を負い、アカウントの使用に起因するすべての活動について責任を負います。
              </li>
              <li>
                アカウントの第三者への譲渡、貸与、共有は禁止します。
              </li>
              <li>
                運営者は、本規約に違反するアカウント、または不正利用が疑われるアカウントを、事前の通知なく停止または削除する権利を有します。
              </li>
            </ol>
          </Section>

          {/* ── 第5条 料金・支払い ── */}
          <Section title="第5条（料金・支払い）">
            <p>本サービスは以下のプランを提供します。</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-2 pe-4 font-semibold">
                      プラン
                    </th>
                    <th className="text-start py-2 pe-4 font-semibold">
                      月額料金（税込）
                    </th>
                    <th className="text-left py-2 font-semibold">内容</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pe-4">Free</td>
                    <td className="py-2 pe-4">無料</td>
                    <td className="py-2">基本翻訳機能</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pe-4">Pro</td>
                    <td className="py-2 pe-4">980円</td>
                    <td className="py-2">翻訳回数上限拡大、優先翻訳</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pe-4">Max</td>
                    <td className="py-2 pe-4">2,980円</td>
                    <td className="py-2">無制限翻訳、全機能利用可能</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ol className="list-decimal ps-6 space-y-2 mt-4">
              <li>
                有料プランの支払いは、Stripeを通じたクレジットカード決済により行われます。クレジットカード情報はStripeが直接管理し、運営者のサーバーには保存されません。
              </li>
              <li>
                サブスクリプションは月単位で自動更新されます。更新日の前日までにキャンセルされない場合、翌月分の料金が自動的に請求されます。
              </li>
              <li>
                料金の変更がある場合は、変更の30日前までにユーザーに通知します。変更後も利用を継続した場合、新料金に同意したものとみなされます。
              </li>
              <li>
                すべての料金は日本円建て・税込表示です。
              </li>
            </ol>
          </Section>

          {/* ── 第6条 返金・キャンセル ── */}
          <Section title="第6条（返金・キャンセル）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                ユーザーは、設定画面からいつでもサブスクリプションをキャンセルできます。キャンセル後も、当該請求期間の終了時まで有料プランの機能を引き続き利用できます。
              </li>
              <li>
                デジタルサービスの性質上、既に支払い済みの料金の返金は原則として行いません。ただし、サービスの重大な不具合により利用が著しく困難であった場合は、個別に対応する場合があります。
              </li>
              <li>
                無料プランへのダウングレードは即時適用され、有料プラン固有の機能へのアクセスは請求期間終了時に停止されます。
              </li>
            </ol>
          </Section>

          {/* ── 第7条 データの取り扱い ── */}
          <Section title="第7条（データの取り扱い）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                ユーザーが入力したコンテンツおよび翻訳結果は、サービス提供に必要な範囲でのみ保存・処理されます。
              </li>
              <li>
                運営者は、ユーザーのコンテンツおよび翻訳結果を、AIモデルの学習・トレーニングの目的で使用することはありません。
              </li>
              <li>
                翻訳処理のため、コンテンツは第三者のAPI（Google Gemini
                API等）に送信されます。当該APIプロバイダーのデータ取り扱いについては、各社のプライバシーポリシーが適用されます。
              </li>
              <li>
                データの保管・削除に関する詳細は、
                <Link
                  href="/privacy"
                  className="text-primary hover:underline"
                >
                  プライバシーポリシー
                </Link>
                をご参照ください。
              </li>
            </ol>
          </Section>

          {/* ── 第8条 知的財産権 ── */}
          <Section title="第8条（知的財産権）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                ユーザーが入力したコンテンツに関する一切の権利は、ユーザーに帰属します。運営者は、サービス提供に必要な範囲でのみコンテンツを使用する非独占的なライセンスを取得します。
              </li>
              <li>
                本サービスにより生成された翻訳結果に関する権利は、ユーザーに帰属します。ユーザーは翻訳結果を自由に使用、公開、配布することができます。
              </li>
              <li>
                ユーザーは、入力するコンテンツについて適法な権利を有していること、または権利者から適切な許諾を得ていることを保証するものとします。共著論文等の場合、すべての権利者から必要な同意を得た上でご利用ください。
              </li>
              <li>
                本サービスのソフトウェア、UI/UXデザイン、ロゴ、ドキュメント等の知的財産権は運営者に帰属します。ユーザーには、本サービスを利用する非独占的、譲渡不能、再許諾不能なライセンスが付与されます。
              </li>
            </ol>
          </Section>

          {/* ── 第9条 AIテクノロジーに関する特記事項 ── */}
          <Section title="第9条（AIテクノロジーに関する特記事項）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                本サービスが提供する翻訳はAIテクノロジーにより自動生成されるものであり、翻訳の正確性、完全性、学術的妥当性、または特定目的への適合性を保証するものではありません。
              </li>
              <li>
                AIテクノロジーの性質上、同一または類似のコンテンツを入力した場合であっても、異なる翻訳結果が生成される場合があります。また、異なるユーザーが類似のコンテンツを入力した場合に、類似の翻訳結果が生成される可能性があります。翻訳結果の独自性・排他性は保証されません。
              </li>
              <li>
                本サービスは、法的文書、医療文書、特許文書等の専門的な翻訳を主たる目的としたものではなく、学術論文の翻訳補助として設計されています。重大な法的・財務的影響を伴う決定の唯一の根拠として使用すべきではありません。
              </li>
              <li>
                学術論文の投稿にあたっては、ユーザー自身の責任において翻訳結果を確認・校正してください。翻訳結果の使用、公開、配布に関する一切の責任はユーザーが負うものとします。
              </li>
              <li>
                学術出版におけるAI利用の開示に関して、ユーザーは投稿先のジャーナルや学会のポリシーに従い、AIツールの使用を適切に開示する責任を負います。
              </li>
            </ol>
          </Section>

          {/* ── 第10条 禁止事項 ── */}
          <Section title="第10条（禁止事項）">
            <p>ユーザーは、以下の行為を行ってはなりません。</p>
            <ul className="list-disc ps-6 space-y-1 mt-2">
              <li>法令または公序良俗に反する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>
                不正アクセス、リバースエンジニアリング、スクレイピング等の行為
              </li>
              <li>本サービスを利用した第三者への翻訳サービスの再販</li>
              <li>
                自動化ツール等による大量リクエストの送信、またはサービスに過度な負荷をかける行為
              </li>
              <li>
                第三者の著作権を侵害するコンテンツの入力（権利者の許諾がない場合）
              </li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </Section>

          {/* ── 第11条 サービスの可用性・変更・中断 ── */}
          <Section title="第11条（サービスの可用性・変更・中断）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                運営者は、本サービスの安定的な提供に努めますが、100%の稼働率を保証するものではありません。
              </li>
              <li>
                運営者は、サービスの改善、セキュリティ対応、または運営上の理由により、本サービスの内容を変更することがあります。重要な変更がある場合は、事前にユーザーに通知します。
              </li>
              <li>
                以下の事由による一時的なサービスの中断について、運営者は責任を負いません。
                <ul className="list-disc ps-6 space-y-1 mt-1">
                  <li>システムの保守・アップデート</li>
                  <li>天災、停電、通信障害等の不可抗力</li>
                  <li>
                    外部サービス（Google Gemini API、Stripe、Vercel等）の障害
                  </li>
                </ul>
              </li>
            </ol>
          </Section>

          {/* ── 第12条 解約・アカウント削除 ── */}
          <Section title="第12条（解約・アカウント削除）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                ユーザーは、設定画面からいつでもアカウントを削除し、本サービスの利用を終了できます。
              </li>
              <li>
                アカウント削除後、ユーザーのコンテンツおよび翻訳結果は合理的な期間内に削除されます。ただし、法令により保管が義務付けられている情報はこの限りではありません。
              </li>
              <li>
                運営者は、本規約への違反、不正利用、その他正当な理由がある場合に、ユーザーのアカウントを停止または削除することができます。
              </li>
            </ol>
          </Section>

          {/* ── 第13条 免責事項・責任制限 ── */}
          <Section title="第13条（免責事項・責任制限）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                本サービスは「現状有姿（as is）」および「提供可能な状態（as
                available）」で提供されます。運営者は、明示・黙示を問わず、商品性、特定目的への適合性、権利非侵害を含むいかなる保証も行いません。
              </li>
              <li>
                運営者の損害賠償責任は、当該損害の直接の原因となった事由が生じた時点から遡って過去12ヶ月間にユーザーが運営者に支払った利用料金の合計額を上限とします。
              </li>
              <li>
                運営者は、間接損害、付随的損害、特別損害、懲罰的損害、逸失利益、データの喪失、信用の毀損、またはその他の無形損害について、その予見可能性の有無にかかわらず、責任を負いません。
              </li>
              <li>
                無料プランの利用に関して生じた損害については、運営者の故意または重大な過失による場合を除き、運営者は責任を負いません。
              </li>
            </ol>
          </Section>

          {/* ── 第14条 補償 ── */}
          <Section title="第14条（補償）">
            <p>
              ユーザーは、以下の事由に起因または関連して、運営者が被った損害、損失、費用（合理的な弁護士費用を含む）を補償するものとします。
            </p>
            <ul className="list-disc ps-6 space-y-1 mt-2">
              <li>ユーザーによる本規約の違反</li>
              <li>
                ユーザーが入力したコンテンツが第三者の権利を侵害した場合
              </li>
              <li>
                翻訳結果のユーザーによる使用、公開、または配布
              </li>
            </ul>
          </Section>

          {/* ── 第15条 規約の変更 ── */}
          <Section title="第15条（規約の変更）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>
                運営者は、法令の改正、サービス内容の変更、その他の事由により、本規約を変更することがあります。
              </li>
              <li>
                重要な変更を行う場合は、変更の効力発生日の30日前までに、サービス内の通知またはメールにより、変更内容をユーザーに通知します。
              </li>
              <li>
                変更後も本サービスの利用を継続した場合、変更後の規約に同意したものとみなされます。
              </li>
              <li>
                最新の利用規約は、常にこのページに掲載されます。
              </li>
            </ol>
          </Section>

          {/* ── 第16条 準拠法・管轄裁判所 ── */}
          <Section title="第16条（準拠法・管轄裁判所）">
            <ol className="list-decimal ps-6 space-y-2 mt-2">
              <li>本規約は日本法に準拠し、日本法に基づいて解釈されるものとします。</li>
              <li>
                本サービスに関する紛争については、仙台地方裁判所を第一審の専属的合意管轄裁判所とします。
              </li>
            </ol>
          </Section>

          {/* ── 第17条 分離可能性 ── */}
          <Section title="第17条（分離可能性）">
            <p>
              本規約のいずれかの条項が管轄権を有する裁判所により無効または執行不能と判断された場合であっても、他の条項の有効性には影響しないものとします。当該無効な条項は、その趣旨に最も近い有効な条項に置き換えて解釈されます。
            </p>
          </Section>

          {/* ── 第18条 お問い合わせ先 ── */}
          <Section title="第18条（お問い合わせ先）">
            <p>
              本規約に関するお問い合わせは、以下までご連絡ください。
            </p>
            <p className="mt-2">
              メール:{" "}
              <a
                href="mailto:info@ai-driven.jp"
                className="text-primary hover:underline"
              >
                info@ai-driven.jp
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
