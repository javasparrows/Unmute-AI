import type { SubmissionCheckItem } from "./types";

let idCounter = 0;
function item(
  category: string,
  label: string,
  required = true,
): SubmissionCheckItem {
  return {
    id: `check-${++idCounter}`,
    category,
    label,
    checked: false,
    required,
    notes: undefined,
  };
}

export function getDefaultChecklist(): SubmissionCheckItem[] {
  idCounter = 0;
  return [
    // Manuscript quality
    item(
      "原稿品質",
      "全セクション（Abstract, Introduction, Methods, Results, Discussion）が完成している",
    ),
    item("原稿品質", "全ての図表にキャプション・番号が付いている"),
    item("原稿品質", "略語は初出時に定義されている"),
    item("原稿品質", "ジャーナルの文字数制限を確認した"),
    item("原稿品質", "スペルチェック・文法チェックを実施した"),

    // Citations & References
    item("引用・参考文献", "全ての引用がDOI/PMIDで検証済み"),
    item(
      "引用・参考文献",
      "引用の根拠箇所をエビデンスマッピングで確認した",
    ),
    item(
      "引用・参考文献",
      "参考文献リストのフォーマットがジャーナル規定に一致している",
    ),
    item("引用・参考文献", "自己引用が過度でないか確認した"),

    // AI & Ethics
    item(
      "AI・倫理",
      "生成AIの使用を適切に開示した（GAMER準拠）",
    ),
    item(
      "AI・倫理",
      "IRB/倫理審査の承認番号を記載した",
    ),
    item("AI・倫理", "データプライバシーに関する記述がある"),
    item(
      "AI・倫理",
      "利益相反（COI）の申告を準備した",
    ),
    item(
      "AI・倫理",
      "患者の同意に関する記述がある（該当する場合）",
      false,
    ),

    // Reporting Guidelines
    item(
      "ガイドライン",
      "適切なレポーティングガイドラインに準拠している",
    ),
    item(
      "ガイドライン",
      "ガイドラインのチェックリストを添付する準備がある",
    ),

    // Submission logistics
    item("投稿準備", "共著者全員の承認を得た"),
    item("投稿準備", "共著者全員のORCID IDを確認した", false),
    item("投稿準備", "カバーレターを作成した"),
    item("投稿準備", "推薦査読者リストを準備した", false),
    item(
      "投稿準備",
      "除外査読者がいる場合はリストした",
      false,
    ),
    item(
      "投稿準備",
      "ファイル形式がジャーナル規定に一致している（LaTeX/Word）",
    ),
    item(
      "投稿準備",
      "Supplementary materials を準備した（該当する場合）",
      false,
    ),

    // Data & Code
    item(
      "データ・コード",
      "データ共有ポリシーに対応した（Data Availability Statement）",
    ),
    item(
      "データ・コード",
      "コード公開の準備がある（GitHub等）",
      false,
    ),
    item(
      "データ・コード",
      "再現性に必要な情報がMethods内に記載されている",
    ),
  ];
}
