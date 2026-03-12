#!/bin/bash
# =============================================================================
# translate-sentence API テストスクリプト
#
# 使い方:
#   ./tests/scripts/test-translate-api.sh [BASE_URL] [COOKIE]
#
# 引数:
#   BASE_URL  - APIのベースURL (デフォルト: http://localhost:3000)
#   COOKIE    - 認証用Cookie文字列 (authjs.session-token=xxx)
#
# ログ出力: tests/logs/ に日時付きJSONとサマリーを出力
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
COOKIE="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/translate_test_${TIMESTAMP}.json"
SUMMARY_FILE="$LOG_DIR/translate_summary_${TIMESTAMP}.txt"

# 色付き出力
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo " translate-sentence API テスト"
echo " Base URL: $BASE_URL"
echo " Log: $LOG_FILE"
echo "============================================"
echo ""

# Cookie未指定時の警告
CURL_COOKIE_FLAG=""
if [ -n "$COOKIE" ]; then
  CURL_COOKIE_FLAG="-b $COOKIE"
else
  echo -e "${YELLOW}[WARN] Cookie未指定 - 認証が必要なAPIは401になります${NC}"
  echo ""
fi

# テスト結果を格納する配列
declare -a TEST_RESULTS=()
TOTAL_INPUT_TOKENS=0
TOTAL_OUTPUT_TOKENS=0
TOTAL_SENTENCES=0
TOTAL_TIME_MS=0
PASS_COUNT=0
FAIL_COUNT=0

run_test() {
  local test_name="$1"
  local sentences_json="$2"
  local source_lang="$3"
  local target_lang="$4"
  local journal="${5:-general}"
  local expected_status="${6:-200}"

  echo -n "  [$test_name] ... "

  local body
  body=$(cat <<EOF
{
  "sentences": $sentences_json,
  "sourceLang": "$source_lang",
  "targetLang": "$target_lang",
  "journal": "$journal"
}
EOF
  )

  local start_ms
  start_ms=$(python3 -c "import time; print(int(time.time()*1000))")

  local http_code response_body
  response_body=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    $CURL_COOKIE_FLAG \
    -d "$body" \
    "$BASE_URL/api/translate-sentence" 2>/dev/null) || true

  local end_ms
  end_ms=$(python3 -c "import time; print(int(time.time()*1000))")
  local elapsed=$((end_ms - start_ms))

  # HTTPステータスコードを分離
  http_code=$(echo "$response_body" | tail -1)
  response_body=$(echo "$response_body" | sed '$d')

  # メトリクス抽出
  local input_tokens=0
  local output_tokens=0
  local translation_count=0

  if [ "$http_code" = "200" ]; then
    input_tokens=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('inputTokens',0))" 2>/dev/null || echo 0)
    output_tokens=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('outputTokens',0))" 2>/dev/null || echo 0)
    translation_count=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('translations',[])))" 2>/dev/null || echo 0)
  fi

  # 結果判定
  local passed="false"
  if [ "$http_code" = "$expected_status" ]; then
    passed="true"
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${GREEN}PASS${NC} (HTTP $http_code, ${elapsed}ms, in:${input_tokens} out:${output_tokens} tokens, ${translation_count} translations)"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${RED}FAIL${NC} (HTTP $http_code, expected $expected_status, ${elapsed}ms)"
    echo "    Response: $(echo "$response_body" | head -c 200)"
  fi

  # 累計
  TOTAL_INPUT_TOKENS=$((TOTAL_INPUT_TOKENS + input_tokens))
  TOTAL_OUTPUT_TOKENS=$((TOTAL_OUTPUT_TOKENS + output_tokens))
  TOTAL_SENTENCES=$((TOTAL_SENTENCES + translation_count))
  TOTAL_TIME_MS=$((TOTAL_TIME_MS + elapsed))

  # JSON ログ
  local result_json
  result_json=$(cat <<JSONEOF
{
  "test": "$test_name",
  "passed": $passed,
  "httpStatus": $http_code,
  "expectedStatus": $expected_status,
  "elapsedMs": $elapsed,
  "inputTokens": $input_tokens,
  "outputTokens": $output_tokens,
  "translationCount": $translation_count,
  "sentencesSent": $(echo "$sentences_json" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0),
  "request": $body,
  "response": $(echo "$response_body" | python3 -c "import sys,json; json.dump(json.load(sys.stdin),sys.stdout)" 2>/dev/null || echo "\"$response_body\"")
}
JSONEOF
  )
  TEST_RESULTS+=("$result_json")
}

# =============================================================================
# テストケース
# =============================================================================

echo "--- Test Case 1: 全文翻訳 (5文 ja→en) ---"
run_test "full_5_sentences_ja_en" \
  '["細胞を37度で培養した。","結果は統計的に有意であった。","この手法は先行研究に基づく。","考察を以下に述べる。","結論として、仮説は支持された。"]' \
  "ja" "en" "general" "200"

echo ""
echo "--- Test Case 2: 部分翻訳シミュレーション (2文 ja→en) ---"
echo "    (全文翻訳後に1文だけ変更した場合のイメージ)"
run_test "partial_2_sentences_ja_en" \
  '["結果は非常に有意であった。","考察を以下に述べる。"]' \
  "ja" "en" "general" "200"

echo ""
echo "--- Test Case 3: 全文翻訳 (5文 en→ja) ---"
run_test "full_5_sentences_en_ja" \
  '["Cells were cultured at 37 degrees.","The results were statistically significant.","This method is based on prior research.","Discussion follows below.","In conclusion, the hypothesis was supported."]' \
  "en" "ja" "general" "200"

echo ""
echo "--- Test Case 4: 部分翻訳シミュレーション (2文 en→ja) ---"
run_test "partial_2_sentences_en_ja" \
  '["The results were highly significant.","Discussion follows below."]' \
  "en" "ja" "general" "200"

echo ""
echo "--- Test Case 5: 1文のみ (最小ケース) ---"
run_test "single_sentence" \
  '["本研究の目的は以下の通りである。"]' \
  "ja" "en" "general" "200"

echo ""
echo "--- Test Case 6: 空文のフィルタリング ---"
run_test "with_empty_sentences" \
  '["","細胞を培養した。","","結果は有意であった。",""]' \
  "ja" "en" "general" "200"

echo ""
echo "--- Test Case 7: 同一言語エラー ---"
run_test "same_language_error" \
  '["テスト"]' \
  "ja" "ja" "general" "400"

echo ""
echo "--- Test Case 8: 空配列 ---"
run_test "empty_sentences" \
  '[]' \
  "ja" "en" "general" "200"

# =============================================================================
# サマリー出力
# =============================================================================

echo ""
echo "============================================"
echo " テスト結果サマリー"
echo "============================================"
echo -e "  合計: $((PASS_COUNT + FAIL_COUNT)) テスト"
echo -e "  ${GREEN}PASS: $PASS_COUNT${NC}"
echo -e "  ${RED}FAIL: $FAIL_COUNT${NC}"
echo ""
echo "  合計入力トークン:  $TOTAL_INPUT_TOKENS"
echo "  合計出力トークン:  $TOTAL_OUTPUT_TOKENS"
echo "  合計翻訳文数:      $TOTAL_SENTENCES"
echo "  合計所要時間:      ${TOTAL_TIME_MS}ms"
echo ""

# 全文 vs 部分の比較 (テスト1 vs テスト2)
echo "  --- 全文 vs 部分翻訳の比較 (ja→en) ---"
echo "  全文(5文): テスト1のトークン数・時間を参照"
echo "  部分(2文): テスト2のトークン数・時間を参照"
echo "  → 具体的な数値はログファイルを確認してください"
echo ""

# JSON ログ書き出し
{
  echo "["
  for i in "${!TEST_RESULTS[@]}"; do
    if [ "$i" -gt 0 ]; then echo ","; fi
    echo "${TEST_RESULTS[$i]}"
  done
  echo "]"
} > "$LOG_FILE"

# サマリーファイル
cat > "$SUMMARY_FILE" <<SUMMARY
translate-sentence API テスト結果
==================================
実行日時: $(date)
Base URL: $BASE_URL

テスト結果: PASS=$PASS_COUNT / FAIL=$FAIL_COUNT / TOTAL=$((PASS_COUNT + FAIL_COUNT))

メトリクス:
  合計入力トークン:  $TOTAL_INPUT_TOKENS
  合計出力トークン:  $TOTAL_OUTPUT_TOKENS
  合計翻訳文数:      $TOTAL_SENTENCES
  合計所要時間:      ${TOTAL_TIME_MS}ms

ログファイル: $LOG_FILE
SUMMARY

echo "  ログ: $LOG_FILE"
echo "  サマリー: $SUMMARY_FILE"
echo ""

# 終了コード
if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
