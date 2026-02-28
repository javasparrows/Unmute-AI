翻訳元のtext
```
Electronic Health Records (EHRs) contain a wealth of clinical information essential for public health surveillance, quality improvement, and epidemiological research. EHR systems are now widely implemented across OECD countries, with steady increases in adoption and maturity \cite{slawomirski2023progress}. EHRs consist of both structured and unstructured data; while structured data primarily comprises numerical values and has been the subject of extensive research, a substantial proportion of clinically relevant information is documented in unstructured clinical text \cite{seinen2025using}. Unstructured text—including physician notes, discharge summaries, and radiology reports—captures disease progression, treatment responses, and patient outcomes that may not be fully reflected in structured data alone. Although clinical text represents the most abundant and vital component of EHR data, it remains the most computationally challenging to process \cite{jensen2012mining}. The COVID-19 pandemic underscored the urgent need to unlock this text for timely public health surveillance \cite{ghildayal2024public}.

Clinical information extraction has progressed through several technological paradigms. Early approaches relied on rule-based systems, often incorporating keyword matching and dictionary lookup methods, which have limited capability in accounting for medical synonyms, negations, or complex clinical contexts \cite{wu2018semehr, wang2018clinical}. These traditional systems required extensive manual curation to handle the high variability of clinical language. This variability was subsequently addressed by machine learning techniques, which enabled named entity recognition and relation extraction through more flexible pattern recognition \cite{ford2016extracting}. Domain-specific pretrained language models marked a major advance: biomedical pretraining has been shown to improve text mining capabilities \cite{lee2020biobert, gu2021domain}, and models trained on large clinical datasets like MIMIC-III \cite{johnson2016mimic} have achieved state-of-the-art performance on clinical NLP benchmarks \cite{alsentzer2019publicly}. These pretrained models---from BERT-based architectures to more recent generative Large Language Models (LLMs)---have demonstrated strong performance on clinical concept extraction and semantic similarity tasks \cite{mutinda2021semantic}.
```

## テストケース

### TC-01: 原文→翻訳方向のハイライト同期
1. 上記テキストを原文パネルにペーストし、「→」ボタンで同期する
2. 原文パネルで各文をクリックする
3. **期待結果**: 翻訳パネルで対応する文がハイライトされる
4. 特に `\cite{...}` やダッシュ `---` を含む文でも正確に対応すること

### TC-02: 翻訳→原文方向のハイライト同期（アラインメントベース）
1. 翻訳パネルで各文をクリックする
2. **期待結果**: 原文パネルで意味的に対応する文がハイライトされる
3. 翻訳で文が統合・分割されていても正しく対応すること
4. 段落をまたいだ場合（1段落目末尾→2段落目先頭）でもズレないこと

### TC-03: テキストのリロード永続化
1. 原文パネルにテキストをペーストし、「→」ボタンで翻訳同期する
2. ブラウザをリロード（F5 / Cmd+R）する
3. **期待結果**: 原文・翻訳文が両方とも復元されている
4. 言語設定（English / 日本語）やジャーナル設定も保持されること

### TC-04: クリア後の再入力
1. テキストを入力し「→」ボタンで翻訳同期する
2. 「クリア」ボタンを押す
3. 新しいテキスト（文の数が異なるもの）を入力し「→」ボタンで同期する
4. **期待結果**: エラーなく翻訳が実行される

### TC-05: 略語・特殊文字を含む文のハイライト
1. `e.g.`, `et al.`, `i.e.`, `Fig. 1` などのピリオドを含む略語がある文をテストする
2. **期待結果**: アラインメントにより、略語で分割された断片も正しい対応文にマッピングされる

### TC-06: 改行・段落の保持
1. 複数段落のテキスト（段落間に空行）をペーストし「→」ボタンで同期する
2. **期待結果**: 翻訳後も段落構造が保持される
3. 段落をまたいだハイライト同期が正しく動作すること

### TC-07: 自動翻訳が発生しないこと
1. 左パネルにテキストを入力する
2. **期待結果**: 右パネルに自動で翻訳が表示されないこと
3. 「→」ボタンを押して初めて右パネルに翻訳が表示されること

### TC-08: 差分翻訳（変更文のみ翻訳）
1. 左パネルに複数文を入力し「→」ボタンで同期する
2. 左パネルの1文だけを変更する
3. 再度「→」ボタンを押す
4. **期待結果**: 変更した1文のみが翻訳更新され、他の文は前回の翻訳がそのまま保持されること

### TC-09: 逆方向同期（←）
1. 右パネルの翻訳を手動で修正する
2. 「←」ボタンを押す
3. **期待結果**: 左パネルの対応する文が更新されること

### TC-10: 段落追加・削除時の同期
1. 左パネルのテキストに新しい段落を追加する
2. 「→」ボタンで同期する
3. **期待結果**: 追加した段落が翻訳され、既存の段落はそのまま保持されること
4. 段落を削除した場合も、対応する翻訳が正しくカットされること

### TC-11: N:Mアラインメント（文の統合）
1. 原文に短い文を3つ入力し「→」ボタンで同期する
2. 翻訳で2つの文が1つに統合されるケースを確認する
3. 統合された翻訳文をクリックする
4. **期待結果**: 原文パネルで対応する複数文が同時にハイライトされること

### TC-12: N:Mアラインメント（文の分割）
1. 原文に長い複文を入力し「→」ボタンで同期する
2. 翻訳で1つの文が2つに分割されるケースを確認する
3. 原文の長い文をクリックする
4. **期待結果**: 翻訳パネルで分割された複数文が同時にハイライトされること

### TC-13: アラインメントフォールバック
1. アラインメントAPIがエラーを返すか、取得完了前にクリックする
2. **期待結果**: 位置ベースの1:1マッピングでフォールバック動作すること
3. エラーが発生してもアプリがクラッシュしないこと

### TC-14: 並列翻訳の順序保持
1. 20文以上の長いテキストを原文パネルにペーストし「→」ボタンで同期する
2. **期待結果**: 翻訳結果の文順が原文の文順と正しく対応していること
3. 各チャンクのレスポンス順序が入れ替わっても、最終結果は正しい順序であること
4. DevToolsのNetworkタブで並列リクエスト（最大4本）が確認できること

### TC-15: 並列翻訳のusage集約
1. 長いテキストを翻訳する（並列4チャンク）
2. **期待結果**: ヘッダーのコスト表示が全チャンクの合計値を正しく反映していること
