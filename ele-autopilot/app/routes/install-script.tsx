import type { LoaderFunctionArgs } from 'react-router';

import { externalOrigin } from '@/lib/origin';

const PKG_NAME = 'ele-autopilot-local';
const BIN_NAME = 'ele-autopilot';

function renderScript(base: string): string {
  return `#!/usr/bin/env bash
# install.sh — install ${BIN_NAME} (QA AutoPilot local agent).
#
# Usage:
#   curl -fsSL ${base}/install.sh | bash

set -euo pipefail

BASE="${base}"
PKG_NAME="${PKG_NAME}"
BIN_NAME="${BIN_NAME}"

err()  { printf 'error: %s\\n' "$*" >&2; exit 1; }
info() { printf '%s\\n' "$*"; }

command -v curl >/dev/null 2>&1 || err "curl is required"

ensure_runtime() {
  if command -v uv >/dev/null 2>&1; then
    return 0
  fi
  info "==> Preparing runtime"
  log="$(mktemp)"
  if ! curl -LsSf https://astral.sh/uv/install.sh | sh >"$log" 2>&1; then
    cat "$log" >&2
    rm -f "$log"
    err "runtime bootstrap failed"
  fi
  rm -f "$log"
  for cand in "$HOME/.local/bin" "$HOME/.cargo/bin"; do
    [ -x "$cand/uv" ] && PATH="$cand:$PATH"
  done
  export PATH
  command -v uv >/dev/null 2>&1 || err "runtime bootstrap failed"
}
ensure_runtime

# wheel 由 autopilot 镜像构建期打进 /app/releases/local (合规原名, 单版本 = 当前部署镜像的 lockstep 版本).
# uv/pip 从 wheel 文件名解析 version/python/abi/platform tag, 文件名必须合规, 故按版本拼出原名.
resolved="$(curl -fsSL "$BASE/releases/local/latest.txt" | tr -d '[:space:]')"
[ -n "$resolved" ] || err "no version found at $BASE/releases/local/latest.txt"

# Hatchling 把包名的 '-' 规范化为 '_'; 纯 Python 包 tag 恒为 py3-none-any.
pkg_us="$(printf '%s' "$PKG_NAME" | tr '-' '_')"
wheel="\${pkg_us}-\${resolved}-py3-none-any.whl"
wheel_url="$BASE/releases/local/$wheel"

info "==> Installing $PKG_NAME $resolved"
info "    base:  $BASE"
info "    wheel: $wheel"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
tmp_wheel="$tmpdir/$wheel"

info "==> Downloading"
curl -fsSL --retry 3 -o "$tmp_wheel" "$wheel_url" || err "download failed: $wheel_url"

info "==> Installing"
if [ "$(uname -sm)" = "Darwin x86_64" ]; then
  # Intel Mac 无 cryptography>=45 预编译 wheel, 走 sdist 需 rust/openssl. 降到 44.x (最后一个含 macosx_x86_64 wheel 的系列).
  info "    note:  Intel Mac detected, pinning cryptography<45"
  overrides="$tmpdir/overrides.txt"
  printf 'cryptography<45\n' > "$overrides"
  uv tool install --reinstall --overrides "$overrides" "$tmp_wheel"
else
  uv tool install --reinstall "$tmp_wheel"
fi

# 把 uv tool bin dir 写进 shell rc, 让新 shell 直接能跑 ele-autopilot. 幂等.
uv tool update-shell >/dev/null 2>&1 || true

info ""
info "==> Done: $BIN_NAME $resolved installed."
info "    新开终端 (或 source shell rc) 后可直接执行: $BIN_NAME"
info "    升级: 重跑 curl -fsSL $BASE/install.sh | bash"
`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const base = externalOrigin(request);
  return new Response(renderScript(base), {
    headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
