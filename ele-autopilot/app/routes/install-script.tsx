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

ensure_runtime() {
  if command -v uv >/dev/null 2>&1; then
    return 0
  fi
  info "==> Preparing runtime"
  log="\$(mktemp)"
  if ! curl -LsSf https://astral.sh/uv/install.sh | sh >"\$log" 2>&1; then
    cat "\$log" >&2
    rm -f "\$log"
    err "runtime bootstrap failed"
  fi
  rm -f "\$log"
  for cand in "\$HOME/.local/bin" "\$HOME/.cargo/bin"; do
    [ -x "\$cand/uv" ] && PATH="\$cand:\$PATH"
  done
  export PATH
  command -v uv >/dev/null 2>&1 || err "runtime bootstrap failed"
}
ensure_runtime

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

info "==> Installing"
uv tool install --reinstall "\$tmp_wheel"

# Install upgrade shim with BASE baked in (used by \`\$BIN_NAME upgrade\`).
shim="\$HOME/.local/bin/\$BIN_NAME-upgrade"
mkdir -p "\$(dirname "\$shim")"
cat > "\$shim" <<UPGRADE_EOF
#!/usr/bin/env bash
set -euo pipefail
curl -fsSL "\$BASE/install.sh" | bash
UPGRADE_EOF
chmod +x "\$shim"

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
