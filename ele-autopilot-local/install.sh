#!/usr/bin/env bash
# install.sh — install ele-autopilot from GitHub Releases.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/install.sh | VERSION=v0.1.3 bash

set -euo pipefail

REPO="${REPO:-yangfan-elestyle/ele-autopilot-local-pretest}"
VERSION="${VERSION:-latest}"
PKG_NAME="${PKG_NAME:-ele-autopilot-local}"
BIN_NAME="${BIN_NAME:-ele-autopilot}"

err()  { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '%s\n' "$*"; }

command -v curl >/dev/null 2>&1 || err "curl is required"
command -v uv   >/dev/null 2>&1 || err "uv not found. install: curl -LsSf https://astral.sh/uv/install.sh | sh"

if [ "$VERSION" = "latest" ]; then
  info "==> Resolving latest release"
  VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep -oE '"tag_name":[[:space:]]*"[^"]+"' | head -1 | cut -d'"' -f4)"
  [ -n "$VERSION" ] || err "no release found for ${REPO}"
fi

ver_no_v="${VERSION#v}"
# Hatchling normalizes dashes to underscores in wheel filename.
pkg_us="$(printf '%s' "$PKG_NAME" | tr '-' '_')"
wheel="${pkg_us}-${ver_no_v}-py3-none-any.whl"
wheel_url="https://github.com/${REPO}/releases/download/${VERSION}/${wheel}"
checksums_url="https://github.com/${REPO}/releases/download/${VERSION}/checksums.txt"

info "==> Installing ${PKG_NAME} ${VERSION}"
info "    repo:  ${REPO}"
info "    wheel: ${wheel}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
tmp_wheel="${tmpdir}/${wheel}"

info "==> Downloading"
curl -fsSL --retry 3 -o "$tmp_wheel" "$wheel_url" || err "download failed: $wheel_url"

# Verify SHA256 if checksums.txt is published with the release (best-effort).
if hash_line="$(curl -fsSL --retry 3 "$checksums_url" 2>/dev/null | grep " ${wheel}$" || true)"; then
  if [ -n "$hash_line" ]; then
    expected="${hash_line%% *}"
    actual="$(shasum -a 256 "$tmp_wheel" | awk '{print $1}')"
    [ "$expected" = "$actual" ] || err "checksum mismatch for ${wheel} (expected ${expected}, got ${actual})"
    info "==> Checksum OK"
  fi
fi

info "==> Installing via uv tool"
uv tool install --reinstall "$tmp_wheel"

info ""
info "==> Done: ${BIN_NAME} ${VERSION} installed."
info "    run \`${BIN_NAME} --help\` to verify."
