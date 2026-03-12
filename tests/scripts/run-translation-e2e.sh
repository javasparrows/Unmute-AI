#!/bin/bash
# =============================================================================
# 翻訳E2E一括実行:
#   1) Next.jsサーバ起動
#   2) テスト用Auth.jsセッション生成
#   3) APIテスト / 部分vs全文比較テスト実行
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PORT="${PORT:-3000}"
APP_START_CMD="${APP_START_CMD:-yarn dev --hostname 127.0.0.1 --port ${PORT}}"
MIN_TOKEN_REDUCTION_PCT="${MIN_TOKEN_REDUCTION_PCT:-20}"
MIN_SPEEDUP_PCT="${MIN_SPEEDUP_PCT:-0}"
START_SERVER="${START_SERVER:-true}"
WAIT_SECONDS="${WAIT_SECONDS:-120}"
SESSION_EMAIL="${SESSION_EMAIL:-e2e-ci@example.com}"
SESSION_NAME="${SESSION_NAME:-E2E CI User}"
E2E_COOKIE="${E2E_COOKIE:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$ROOT_DIR/tests/logs"
SERVER_LOG="$LOG_DIR/e2e_server_$(date +"%Y%m%d_%H%M%S").log"
mkdir -p "$LOG_DIR"

SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for_server() {
  local elapsed=0
  while [ "$elapsed" -lt "$WAIT_SECONDS" ]; do
    if curl -sS -o /dev/null "${BASE_URL}/login"; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

echo "=== Translation E2E ==="
echo "Base URL: $BASE_URL"
echo "Start server: $START_SERVER"
echo "Min token reduction: ${MIN_TOKEN_REDUCTION_PCT}%"
echo "Min speedup: ${MIN_SPEEDUP_PCT}%"
echo ""

if [ "$START_SERVER" = "true" ]; then
  echo "[1/4] Starting app server..."
  (
    cd "$ROOT_DIR"
    eval "$APP_START_CMD"
  ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  echo "  PID: $SERVER_PID"
  echo "  Log: $SERVER_LOG"

  echo "[2/4] Waiting for server readiness..."
  if ! wait_for_server; then
    echo "Server did not become ready within ${WAIT_SECONDS}s" >&2
    echo "---- server log (tail) ----" >&2
    tail -n 120 "$SERVER_LOG" >&2 || true
    exit 1
  fi
else
  echo "[1/4] Skipping server startup (START_SERVER=false)"
fi

echo "[3/4] Creating test auth session..."
if [ -n "$E2E_COOKIE" ]; then
  COOKIE="$E2E_COOKIE"
  echo "  Using E2E_COOKIE from environment"
else
  COOKIE="$("$SCRIPT_DIR/create-auth-session.sh" "$SESSION_EMAIL" "$SESSION_NAME")"
  echo "  Session cookie generated"
fi

echo "[4/4] Running translation tests..."
(
  cd "$ROOT_DIR"
  "$SCRIPT_DIR/test-translate-api.sh" "$BASE_URL" "$COOKIE"
  "$SCRIPT_DIR/test-partial-vs-full.sh" \
    "$BASE_URL" \
    "$COOKIE" \
    "$MIN_TOKEN_REDUCTION_PCT" \
    "$MIN_SPEEDUP_PCT"
)

echo ""
echo "E2E translation tests passed."
