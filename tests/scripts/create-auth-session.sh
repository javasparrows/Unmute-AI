#!/bin/bash
# =============================================================================
# E2E用のAuth.jsセッションをDBに直接作成し、Cookie文字列を出力する
#
# 使い方:
#   ./tests/scripts/create-auth-session.sh [EMAIL] [NAME]
#
# 出力:
#   authjs.session-token=xxxx
# =============================================================================

set -euo pipefail

EMAIL="${1:-e2e-ci@example.com}"
NAME="${2:-E2E CI User}"
SESSION_DAYS="${E2E_SESSION_DAYS:-7}"

SESSION_TOKEN=$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
)

SESSION_ID=$(python3 - <<'PY'
import uuid
print(f"e2e_session_{uuid.uuid4().hex}")
PY
)

EXPIRES_AT=$(python3 - "$SESSION_DAYS" <<'PY'
import sys
from datetime import datetime, timedelta, timezone
days = int(sys.argv[1])
expires = datetime.now(timezone.utc) + timedelta(days=days)
print(expires.strftime("%Y-%m-%d %H:%M:%S"))
PY
)

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

cat > "$TMP_SQL" <<SQL
INSERT INTO "User" ("id", "email", "name", "emailVerified", "createdAt")
VALUES ('${SESSION_ID}_user', '${EMAIL}', '${NAME}', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "emailVerified" = COALESCE("User"."emailVerified", NOW());

DELETE FROM "Session"
WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = '${EMAIL}');

INSERT INTO "Session" ("id", "sessionToken", "userId", "expires")
VALUES (
  '${SESSION_ID}',
  '${SESSION_TOKEN}',
  (SELECT "id" FROM "User" WHERE "email" = '${EMAIL}'),
  TIMESTAMP '${EXPIRES_AT}'
);
SQL

npx prisma db execute --file "$TMP_SQL" >/dev/null

echo "authjs.session-token=${SESSION_TOKEN}"
