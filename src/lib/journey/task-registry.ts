export interface TaskDefinition {
  id: string;
  phase: number;
  name: string;
  description: string;
  estimatedMinutes: number;
  dependencies: string[];
  linkedFeature: string; // component/tab to navigate to
  linkedTab?: "write" | "citations" | "review";
}

export interface PhaseDefinition {
  phase: number;
  name: string;
  nameEn: string;
  description: string;
  estimatedHours: string;
}

export const PHASES: PhaseDefinition[] = [
  { phase: 1, name: "準備", nameEn: "Preparation", description: "研究テーマの定義とターゲットジャーナルの選定", estimatedHours: "1-2" },
  { phase: 2, name: "文献調査", nameEn: "Literature Review", description: "関連論文の検索、検証、エビデンス抽出", estimatedHours: "8-16" },
  { phase: 3, name: "構成設計", nameEn: "Structure", description: "アウトラインと段落構成の設計", estimatedHours: "2-4" },
  { phase: 4, name: "執筆", nameEn: "Writing", description: "各セクションの執筆", estimatedHours: "40-80" },
  { phase: 5, name: "引用検証", nameEn: "Citations", description: "引用の挿入とエビデンスの検証", estimatedHours: "4-8" },
  { phase: 6, name: "レビュー", nameEn: "Review", description: "構成チェックとフロー分析", estimatedHours: "4-8" },
  { phase: 7, name: "投稿準備", nameEn: "Submission", description: "フォーマット調整とエクスポート", estimatedHours: "2-4" },
];

export const TASKS: TaskDefinition[] = [
  // Phase 1: Preparation
  { id: "1.1", phase: 1, name: "研究トピック・タイトルの定義", description: "論文の仮タイトルと研究トピックを設定", estimatedMinutes: 5, dependencies: [], linkedFeature: "start-paper", linkedTab: "write" },
  { id: "1.2", phase: 1, name: "ターゲットジャーナルの選定", description: "投稿先ジャーナルとスタイルを選択", estimatedMinutes: 10, dependencies: ["1.1"], linkedFeature: "journal-selector", linkedTab: "write" },
  { id: "1.3", phase: 1, name: "ガイドラインの確認", description: "研究デザインに応じたガイドラインを確認", estimatedMinutes: 30, dependencies: ["1.1"], linkedFeature: "guidelines", linkedTab: "review" },

  // Phase 2: Literature Review
  { id: "2.1", phase: 2, name: "関連論文の検索", description: "Evidence Searchで候補論文を発見", estimatedMinutes: 120, dependencies: ["1.1"], linkedFeature: "evidence-search", linkedTab: "citations" },
  { id: "2.2", phase: 2, name: "引用候補の検証", description: "DOI/PMIDで論文の実在を確認", estimatedMinutes: 60, dependencies: ["2.1"], linkedFeature: "evidence-verify", linkedTab: "citations" },
  { id: "2.3", phase: 2, name: "エビデンスの抽出", description: "フルテキストからClaimCardを作成", estimatedMinutes: 120, dependencies: ["2.2"], linkedFeature: "evidence-extract", linkedTab: "citations" },
  { id: "2.4", phase: 2, name: "先行研究のギャップ分析", description: "Coverage Analysisで不足分野を特定", estimatedMinutes: 60, dependencies: ["2.1"], linkedFeature: "evidence-coverage", linkedTab: "citations" },

  // Phase 3: Structure Design
  { id: "3.1", phase: 3, name: "アウトライン作成", description: "IMRaDセクション構造を設定", estimatedMinutes: 30, dependencies: [], linkedFeature: "section-rail", linkedTab: "write" },
  { id: "3.2", phase: 3, name: "段落構成の設計", description: "各段落の役割を設計", estimatedMinutes: 60, dependencies: ["3.1"], linkedFeature: "paragraph-design", linkedTab: "write" },
  { id: "3.3", phase: 3, name: "ガイドライン事前チェック", description: "テンプレートに基づく構成確認", estimatedMinutes: 30, dependencies: ["3.1"], linkedFeature: "compliance-check", linkedTab: "review" },

  // Phase 4: Writing
  { id: "4.1", phase: 4, name: "Introduction 執筆", description: "背景→課題→先行研究→ギャップ→本研究", estimatedMinutes: 480, dependencies: ["2.1"], linkedFeature: "editor-introduction", linkedTab: "write" },
  { id: "4.2", phase: 4, name: "Methods 執筆", description: "データ・手法・評価指標の記述", estimatedMinutes: 480, dependencies: [], linkedFeature: "editor-methods", linkedTab: "write" },
  { id: "4.3", phase: 4, name: "Results 執筆", description: "結果の記述（図表参照含む）", estimatedMinutes: 480, dependencies: ["4.2"], linkedFeature: "editor-results", linkedTab: "write" },
  { id: "4.4", phase: 4, name: "Discussion 執筆", description: "解釈→比較→限界→貢献", estimatedMinutes: 480, dependencies: ["4.3"], linkedFeature: "editor-discussion", linkedTab: "write" },
  { id: "4.5", phase: 4, name: "Abstract 執筆", description: "全体のサマリー（最後に書く）", estimatedMinutes: 60, dependencies: ["4.1", "4.4"], linkedFeature: "editor-abstract", linkedTab: "write" },

  // Phase 5: Citations & Evidence
  { id: "5.1", phase: 5, name: "Citation Auto-Pilot", description: "文ごとの引用候補提示と挿入", estimatedMinutes: 120, dependencies: ["4.1"], linkedFeature: "citation-autopilot", linkedTab: "citations" },
  { id: "5.2", phase: 5, name: "エビデンスマッピング", description: "各引用の根拠箇所を特定", estimatedMinutes: 60, dependencies: ["5.1"], linkedFeature: "evidence-mapping", linkedTab: "citations" },
  { id: "5.3", phase: 5, name: "Human Verification", description: "人間の目で各エビデンスを検証", estimatedMinutes: 120, dependencies: ["5.2"], linkedFeature: "human-verify", linkedTab: "citations" },
  { id: "5.4", phase: 5, name: "エビデンスレポート作成", description: "PPTXエクスポート（指導教員提出用）", estimatedMinutes: 15, dependencies: ["5.3"], linkedFeature: "export-evidence", linkedTab: "citations" },

  // Phase 6: Review & Polish
  { id: "6.1", phase: 6, name: "段落フロー分析", description: "論理的流れの検証", estimatedMinutes: 30, dependencies: ["4.1"], linkedFeature: "flow-analysis", linkedTab: "review" },
  { id: "6.2", phase: 6, name: "構成チェック", description: "IMRaD準拠の最終確認", estimatedMinutes: 30, dependencies: ["4.5"], linkedFeature: "structure-check", linkedTab: "review" },
  { id: "6.3", phase: 6, name: "ガイドライン最終チェック", description: "全項目の充足確認", estimatedMinutes: 30, dependencies: ["6.2"], linkedFeature: "compliance-final", linkedTab: "review" },
  { id: "6.4", phase: 6, name: "Adversarial Review", description: "AIによる厳格な査読シミュレーション", estimatedMinutes: 15, dependencies: ["6.1"], linkedFeature: "adversarial-review", linkedTab: "review" },

  // Phase 7: Submission
  { id: "7.1", phase: 7, name: "フォーマット調整", description: "ジャーナルスタイルの適用", estimatedMinutes: 30, dependencies: ["6.3"], linkedFeature: "format-adjust", linkedTab: "write" },
  { id: "7.2", phase: 7, name: "エクスポート", description: "LaTeX/Wordでダウンロード", estimatedMinutes: 10, dependencies: ["7.1"], linkedFeature: "export-dialog", linkedTab: "write" },
  { id: "7.3", phase: 7, name: "投稿チェックリスト", description: "共著者確認、倫理審査番号等", estimatedMinutes: 30, dependencies: [], linkedFeature: "submission-checklist", linkedTab: "review" },
  { id: "7.4", phase: 7, name: "最終確認・投稿", description: "カバーレター準備と最終確認", estimatedMinutes: 30, dependencies: ["7.2", "7.3"], linkedFeature: "final-submit", linkedTab: "write" },
];

export function getPhase(phaseNumber: number): PhaseDefinition | undefined {
  return PHASES.find((p) => p.phase === phaseNumber);
}

export function getTask(taskId: string): TaskDefinition | undefined {
  return TASKS.find((t) => t.id === taskId);
}

export function getTasksForPhase(phaseNumber: number): TaskDefinition[] {
  return TASKS.filter((t) => t.phase === phaseNumber);
}

export function getProgress(taskStatuses: Record<string, string>): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = TASKS.length;
  const completed = Object.values(taskStatuses).filter(
    (s) => s === "completed" || s === "skipped",
  ).length;
  return { completed, total, percentage: Math.round((completed / total) * 100) };
}
