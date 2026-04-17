#!/usr/bin/env bash
# One-shot dev setup: installs deps, wires pre-commit hook.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"

echo "[dev-setup] installing pnpm deps..."
cd "$root"
pnpm install

echo "[dev-setup] installing pre-commit hook..."
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<HOOK
#!/usr/bin/env bash
bash "$root/scripts/check-secrets.sh"
HOOK
chmod +x .git/hooks/pre-commit

echo "[dev-setup] done. You may need to install gitleaks separately."
