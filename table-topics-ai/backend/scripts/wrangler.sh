#!/bin/sh
# Project-scoped wrangler wrapper.
#
# All wrangler calls authenticate via the API token in the repo root .env
# (CLOUDFLARE_SECRET) instead of the interactive `wrangler login` OAuth
# session, which points at a different Cloudflare account.
#
# Usage (from backend/):  pnpm cf <any wrangler args>
#   e.g. pnpm cf d1 execute health-tracker-db --remote --command "SELECT 1"
#        pnpm cf secret put INGEST_SECRET
set -e

DIR="$(CDPATH= cd "$(dirname "$0")/../.." && pwd)"

if [ -f "$DIR/.env" ]; then
  set -a
  . "$DIR/.env"
  set +a
fi

# Prefer an already-exported token, then the account token from .env.
: "${CLOUDFLARE_API_TOKEN:=${CLOUDFLARE_SECRET:-}}"
export CLOUDFLARE_API_TOKEN
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] && export CLOUDFLARE_ACCOUNT_ID

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "wrangler.sh: no CLOUDFLARE_API_TOKEN / CLOUDFLARE_SECRET found in environment or .env" >&2
  exit 1
fi

exec pnpm exec wrangler "$@"
