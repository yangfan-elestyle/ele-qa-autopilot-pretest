#!/usr/bin/env bash
# 统一版本号写入器: VERSION 是唯一真值, 一条命令同步落到四 manifest + uv.lock.
# 用法: scripts/set-version.sh 1.29.0   (不含 v 前缀)
# 幂等: 传当前版本号 git diff 应为空.
set -euo pipefail

V="${1:-}"
if [[ ! "$V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: $0 X.Y.Z   (e.g. 1.29.0, no leading v)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 1) 真值文件
printf '%s\n' "$V" > VERSION

# 2) 三个 package.json (jq 非原地写入)
for pkg in gateway/package.json ele-autopilot/package.json ele-autotesting/package.json; do
  tmp="$(mktemp)"
  jq --arg v "$V" '.version = $v' "$pkg" > "$tmp"
  mv "$tmp" "$pkg"
done

# 3) pyproject.toml: 只改 [project] 顶层 version 行 (依赖行带缩进, 不受影响)
sed -i '' -E 's/^version = "[^"]*"/version = "'"$V"'"/' ele-autopilot-local/pyproject.toml

# 4) uv.lock: 别 sed, 用 uv 重新求解以同步自身 editable version
( cd ele-autopilot-local && uv lock )

echo "version set to $V (VERSION + 4 manifest + uv.lock)"
