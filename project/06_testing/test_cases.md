翻訳元のtext
```
Electronic Health Records (EHRs) contain a wealth of clinical information essential for public health surveillance, quality improvement, and epidemiological research. EHR systems are now widely implemented across OECD countries, with steady increases in adoption and maturity \cite{slawomirski2023progress}. EHRs consist of both structured and unstructured data; while structured data primarily comprises numerical values and has been the subject of extensive research, a substantial proportion of clinically relevant information is documented in unstructured clinical text \cite{seinen2025using}. Unstructured text—including physician notes, discharge summaries, and radiology reports—captures disease progression, treatment responses, and patient outcomes that may not be fully reflected in structured data alone. Although clinical text represents the most abundant and vital component of EHR data, it remains the most computationally challenging to process \cite{jensen2012mining}. The COVID-19 pandemic underscored the urgent need to unlock this text for timely public health surveillance \cite{ghildayal2024public}.

Clinical information extraction has progressed through several technological paradigms. Early approaches relied on rule-based systems, often incorporating keyword matching and dictionary lookup methods, which have limited capability in accounting for medical synonyms, negations, or complex clinical contexts \cite{wu2018semehr, wang2018clinical}. These traditional systems required extensive manual curation to handle the high variability of clinical language. This variability was subsequently addressed by machine learning techniques, which enabled named entity recognition and relation extraction through more flexible pattern recognition \cite{ford2016extracting}. Domain-specific pretrained language models marked a major advance: biomedical pretraining has been shown to improve text mining capabilities \cite{lee2020biobert, gu2021domain}, and models trained on large clinical datasets like MIMIC-III \cite{johnson2016mimic} have achieved state-of-the-art performance on clinical NLP benchmarks \cite{alsentzer2019publicly}. These pretrained models---from BERT-based architectures to more recent generative Large Language Models (LLMs)---have demonstrated strong performance on clinical concept extraction and semantic similarity tasks \cite{mutinda2021semantic}.
```

## テストケース

### TC-01: 原文→翻訳方向のハイライト同期
1. 上記テキストを原文パネルにペーストし、翻訳完了を待つ
2. 原文パネルで各文をクリックする
3. **期待結果**: 翻訳パネルで対応する文がハイライトされる
4. 特に `\cite{...}` やダッシュ `---` を含む文でも正確に対応すること

### TC-02: 翻訳→原文方向のハイライト同期（修正対象のバグ）
1. 翻訳パネルで各文をクリックする
2. **期待結果**: 原文パネルで**同じindex**の文がハイライトされる
3. **NGケース**: 翻訳の「COVID-19のパンデミックは...」をクリックした時に、原文で1つ後の "Clinical information extraction..." がハイライトされる → index ズレ
4. 段落をまたいだ場合（1段落目末尾→2段落目先頭）でもズレないこと

### TC-03: テキストのリロード永続化
1. 原文パネルにテキストをペーストし、翻訳完了を待つ
2. ブラウザをリロード（F5 / Cmd+R）する
3. **期待結果**: 原文・翻訳文が両方とも復元されている
4. 言語設定（English / 日本語）やジャーナル設定も保持されること

### TC-04: クリア後の再入力
1. テキストを入力し翻訳完了を待つ
2. 「クリア」ボタンを押す
3. 新しいテキスト（文の数が異なるもの）を入力する
4. **期待結果**: エラーなく翻訳が実行される
5. **NGケース**: `TypeError: Cannot read properties of undefined (reading 'match')` がコンソールに出る

### TC-05: 略語・特殊文字を含む文のハイライト
1. `e.g.`, `et al.`, `i.e.`, `Fig. 1` などのピリオドを含む略語がある文をテストする
2. **期待結果**: 略語内のピリオドで文が分割されず、正しい文単位でハイライトされる
3. **注意**: `splitSentences` は `[.。!?！？]` で分割するため、略語のピリオドも文境界として扱われる。これは既知の制約だが、原文・翻訳の両パネルで同じロジックを使うため、index のズレは発生しない

### TC-06: 改行・段落の保持
1. 複数段落のテキスト（段落間に空行）をペーストする
2. **期待結果**: 翻訳後も段落構造が保持される
3. 段落をまたいだハイライト同期が正しく動作すること
