#!/usr/bin/env bash
# Reads Notion database IDs from ../.notion-databases and pushes them to the
# NOTION_DATABASE_ID GitHub secret as a comma-separated list.
#
# Requirements:
#   - gh CLI installed and authenticated (gh auth login)
#   - Run from any directory inside the repo

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="$REPO_ROOT/.notion-databases"

if [[ ! -f "$DB_FILE" ]]; then
  echo "Error: $DB_FILE not found." >&2
  exit 1
fi

# Strip comment lines and blank lines, join with commas
IDS="$(grep -v '^\s*#' "$DB_FILE" | grep -v '^\s*$' | tr '\n' ',' | sed 's/,$//')"

if [[ -z "$IDS" ]]; then
  echo "Error: no database IDs found in $DB_FILE." >&2
  exit 1
fi

echo "Setting NOTION_DATABASE_ID to: $IDS"
printf '%s' "$IDS" | gh secret set NOTION_DATABASE_ID --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Done."
