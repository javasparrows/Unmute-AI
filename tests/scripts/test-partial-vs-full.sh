#!/bin/bash
# =============================================================================
# 全文翻訳 vs 部分翻訳 比較テスト
#
# 目的: 同じ文章セットで全文翻訳と部分翻訳(3文)のトークン数・時間を比較
#
# 使い方:
#   ./tests/scripts/test-partial-vs-full.sh [BASE_URL] [COOKIE] [MIN_TOKEN_REDUCTION_PCT] [MIN_SPEEDUP_PCT]
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
COOKIE="${2:-}"
MIN_TOKEN_REDUCTION_PCT="${3:-0}"
MIN_SPEEDUP_PCT="${4:-0}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/partial_vs_full_${TIMESTAMP}.json"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# 10文の論文テキスト
FULL_SENTENCES='[
  "本研究では、新規抗がん剤の有効性を検証した。",
  "対象は20歳以上の成人患者100名である。",
  "ランダム化比較試験を実施した。",
  "投与群と対照群に無作為に割り付けた。",
  "主要評価項目は6ヶ月後の生存率とした。",
  "副次評価項目として副作用の発生頻度を記録した。",
  "統計解析にはカイ二乗検定を用いた。",
  "投与群の生存率は85%であった。",
  "対照群の生存率は72%であった。",
  "以上の結果から、新規抗がん剤は有効であると結論づけた。"
]'

# 部分翻訳: 変更された1文 + 前後1文（3文）
PARTIAL_SENTENCES='[
  "副次評価項目として副作用の発生頻度を記録した。",
  "統計解析にはt検定およびカイ二乗検定を用いた。",
  "投与群の生存率は85%であった。"
]'

call_api() {
  local label="$1"
  local sentences="$2"
  local sent_count
  sent_count=$(echo "$sentences" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")

  local body
  body=$(cat <<EOF
{
  "sentences": $sentences,
  "sourceLang": "ja",
  "targetLang": "en",
  "journal": "general"
}
EOF
)

  local start_ms
  start_ms=$(python3 -c "import time; print(int(time.time()*1000))")

  local response_with_status
  if [ -n "$COOKIE" ]; then
    response_with_status=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -b "$COOKIE" \
      -d "$body" \
      "$BASE_URL/api/translate-sentence" 2>/dev/null) || true
  else
    response_with_status=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$BASE_URL/api/translate-sentence" 2>/dev/null) || true
  fi

  local end_ms
  end_ms=$(python3 -c "import time; print(int(time.time()*1000))")
  local elapsed=$((end_ms - start_ms))

  local http_code response_body
  http_code=$(echo "$response_with_status" | tail -n 1)
  response_body=$(echo "$response_with_status" | sed '$d')

  local input_tokens=0
  local output_tokens=0
  local translation_count=0
  local passed=false
  local error_message=""

  if [ "$http_code" = "200" ]; then
    passed=true
    input_tokens=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('inputTokens',0))" 2>/dev/null || echo 0)
    output_tokens=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('outputTokens',0))" 2>/dev/null || echo 0)
    translation_count=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('translations',[])))" 2>/dev/null || echo 0)
  else
    error_message=$(echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || true)
    if [ -z "$error_message" ]; then
      error_message=$(echo "$response_body" | head -c 200 | tr '\n' ' ')
    fi
  fi

  {
    if [ "$passed" = true ]; then
      echo -e "  ${CYAN}[$label]${NC} ${GREEN}PASS${NC}"
      echo "    HTTP:         $http_code"
      echo "    送信文数:     $sent_count"
      echo "    翻訳結果数:   $translation_count"
      echo "    入力トークン: $input_tokens"
      echo "    出力トークン: $output_tokens"
      echo "    合計トークン: $((input_tokens + output_tokens))"
      echo "    所要時間:     ${elapsed}ms"
    else
      echo -e "  ${CYAN}[$label]${NC} ${RED}FAIL${NC}"
      echo "    HTTP:         $http_code"
      echo "    送信文数:     $sent_count"
      echo "    所要時間:     ${elapsed}ms"
      echo "    Error:        ${error_message:-<empty>}"
    fi
    echo ""
  } >&2

  python3 - "$label" "$sent_count" "$http_code" "$elapsed" "$input_tokens" "$output_tokens" "$translation_count" "$passed" "$error_message" <<'PY'
import json
import sys

label = sys.argv[1]
sent_count = int(sys.argv[2])
http_code = sys.argv[3]
elapsed = int(sys.argv[4])
input_tokens = int(sys.argv[5])
output_tokens = int(sys.argv[6])
translation_count = int(sys.argv[7])
passed = sys.argv[8].lower() == "true"
error_message = sys.argv[9] if len(sys.argv) > 9 else ""

print(
    json.dumps(
        {
            "label": label,
            "passed": passed,
            "httpStatus": http_code,
            "sentencesSent": sent_count,
            "translationCount": translation_count,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "totalTokens": input_tokens + output_tokens,
            "elapsedMs": elapsed,
            "error": error_message,
        },
        ensure_ascii=False,
    )
)
PY
}

echo "============================================"
echo " 全文翻訳 vs 部分翻訳 比較テスト"
echo " Base URL: $BASE_URL"
echo " Min token reduction: ${MIN_TOKEN_REDUCTION_PCT}%"
echo " Min speedup:         ${MIN_SPEEDUP_PCT}%"
echo "============================================"
echo ""

echo "--- 全文翻訳 (10文すべて送信) ---"
FULL_RESULT=$(call_api "全文翻訳(10文)" "$FULL_SENTENCES")

echo "--- 部分翻訳 (変更1文 + 前後コンテキスト = 3文) ---"
PARTIAL_RESULT=$(call_api "部分翻訳(3文)" "$PARTIAL_SENTENCES")

full_pass=$(echo "$FULL_RESULT" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('passed') else 'false')")
partial_pass=$(echo "$PARTIAL_RESULT" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('passed') else 'false')")

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} 比較結果${NC}"
echo -e "${GREEN}============================================${NC}"

full_tokens=$(echo "$FULL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalTokens'])")
partial_tokens=$(echo "$PARTIAL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalTokens'])")
full_time=$(echo "$FULL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['elapsedMs'])")
partial_time=$(echo "$PARTIAL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['elapsedMs'])")

echo "  全文翻訳:   ${full_tokens} tokens, ${full_time}ms"
echo "  部分翻訳:   ${partial_tokens} tokens, ${partial_time}ms"

if [ "$full_pass" = "true" ] && [ "$partial_pass" = "true" ] && [ "$full_tokens" -gt 0 ]; then
  savings=$(python3 -c "print(f'{(1 - $partial_tokens / $full_tokens) * 100:.1f}')")
  echo -e "  ${YELLOW}トークン削減率: ${savings}%${NC}"
fi

if [ "$full_pass" = "true" ] && [ "$partial_pass" = "true" ] && [ "$full_time" -gt 0 ]; then
  speedup=$(python3 -c "print(f'{(1 - $partial_time / $full_time) * 100:.1f}')")
  echo -e "  ${YELLOW}速度向上率:     ${speedup}%${NC}"
fi

echo ""

# ログ保存
cat > "$LOG_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "baseUrl": "$BASE_URL",
  "full": $FULL_RESULT,
  "partial": $PARTIAL_RESULT
}
EOF

echo "  ログ: $LOG_FILE"

if [ "$full_pass" != "true" ] || [ "$partial_pass" != "true" ]; then
  echo -e "${RED}比較テストに失敗したケースがあります。ログを確認してください。${NC}"
  exit 1
fi

if [ "$MIN_TOKEN_REDUCTION_PCT" != "0" ]; then
  if [ "$full_tokens" -le 0 ]; then
    echo -e "${RED}トークン削減率を判定できません（全文翻訳トークンが0）${NC}"
    exit 1
  fi
  current_reduction=$(python3 -c "print((1 - $partial_tokens / $full_tokens) * 100)" )
  token_check=$(python3 -c "print('ok' if $current_reduction >= float('$MIN_TOKEN_REDUCTION_PCT') else 'ng')")
  if [ "$token_check" != "ok" ]; then
    echo -e "${RED}トークン削減率が閾値未満です: ${current_reduction}% < ${MIN_TOKEN_REDUCTION_PCT}%${NC}"
    exit 1
  fi
fi

if [ "$MIN_SPEEDUP_PCT" != "0" ]; then
  if [ "$full_time" -le 0 ]; then
    echo -e "${RED}速度向上率を判定できません（全文翻訳時間が0ms）${NC}"
    exit 1
  fi
  current_speedup=$(python3 -c "print((1 - $partial_time / $full_time) * 100)" )
  speed_check=$(python3 -c "print('ok' if $current_speedup >= float('$MIN_SPEEDUP_PCT') else 'ng')")
  if [ "$speed_check" != "ok" ]; then
    echo -e "${RED}速度向上率が閾値未満です: ${current_speedup}% < ${MIN_SPEEDUP_PCT}%${NC}"
    exit 1
  fi
fi
