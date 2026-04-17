#!/usr/bin/env bash
# Pre-commit secret scanner. Wraps gitleaks + a few custom patterns.
set -euo pipefail

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[check-secrets] gitleaks not found — install from https://github.com/gitleaks/gitleaks"
  exit 1
fi

echo "[check-secrets] running gitleaks on staged changes..."
gitleaks protect --staged --redact --verbose

echo "[check-secrets] custom patterns..."
if git diff --cached | grep -E '10\.0\.0\.[0-9]+|Bearer +[A-Za-z0-9]{30,}|sk-ant-[A-Za-z0-9]{20,}|eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp' >/dev/null; then
  echo "[check-secrets] suspicious pattern in staged diff — aborting"
  exit 2
fi

echo "[check-secrets] OK"
