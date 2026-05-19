import type { LoaderFunctionArgs } from 'react-router';

const PKG_NAME = 'ele-autopilot-local';
const BIN_NAME = 'ele-autopilot';

function renderScript(base: string): string {
  return `#!/usr/bin/env bash
# install.sh — install ${BIN_NAME} (QA AutoPilot local agent).
#
# Usage:
#   curl -fsSL ${base}/install.sh | bash
#   curl -fsSL ${base}/install.sh | VERSION=v1.4.9 bash

set -euo pipefail

BASE="${base}"
PKG_NAME="${PKG_NAME}"
BIN_NAME="${BIN_NAME}"

err()  { printf 'error: %s\\n' "\$*" >&2; exit 1; }
info() { printf '%s\\n' "\$*"; }

command -v curl >/dev/null 2>&1 || err "curl is required"
command -v uv   >/dev/null 2>&1 || err "uv not found. install: curl -LsSf https://astral.sh/uv/install.sh | sh"

VERSION="\${VERSION:-latest}"
if [ "\$VERSION" = "latest" ]; then
  info "==> Resolving latest version"
  resolved="\$(curl -fsSL "\$BASE/releases/local/latest.txt" | tr -d '[:space:]')"
  [ -n "\$resolved" ] || err "no version found at \$BASE/releases/local/latest.txt"
  VERSION="v\$resolved"
fi

ver_no_v="\${VERSION#v}"
# Hatchling normalizes dashes to underscores in wheel filename.
pkg_us="\$(printf '%s' "\$PKG_NAME" | tr '-' '_')"
wheel="\${pkg_us}-\${ver_no_v}-py3-none-any.whl"
wheel_url="\$BASE/releases/local/\$ver_no_v/\$wheel"
checksums_url="\$BASE/releases/local/\$ver_no_v/checksums.txt"

info "==> Installing \$PKG_NAME \$VERSION"
info "    base:  \$BASE"
info "    wheel: \$wheel"

tmpdir="\$(mktemp -d)"
trap 'rm -rf "\$tmpdir"' EXIT
tmp_wheel="\$tmpdir/\$wheel"

info "==> Downloading"
curl -fsSL --retry 3 -o "\$tmp_wheel" "\$wheel_url" || err "download failed: \$wheel_url"

# Verify SHA256 if checksums.txt is published (best-effort).
if hash_line="\$(curl -fsSL --retry 3 "\$checksums_url" 2>/dev/null | grep " \$wheel\$" || true)"; then
  if [ -n "\$hash_line" ]; then
    expected="\${hash_line%% *}"
    actual="\$(shasum -a 256 "\$tmp_wheel" | awk '{print \$1}')"
    [ "\$expected" = "\$actual" ] || err "checksum mismatch for \$wheel (expected \$expected, got \$actual)"
    info "==> Checksum OK"
  fi
fi

info "==> Installing via uv tool"
uv tool install --reinstall "\$tmp_wheel"

info ""
info "==> Done: \$BIN_NAME \$VERSION installed."
info "    run \\\`\$BIN_NAME --help\\\` to verify."
`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const base = new URL(request.url).origin;
  return new Response(renderScript(base), {
    headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
