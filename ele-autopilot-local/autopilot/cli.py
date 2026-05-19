"""CLI 入口点和 FastAPI 应用定义.

`uv tool install` 后通过 `ele-autopilot` 启动 HTTP 服务 (默认 0.0.0.0:8000).
"""

import argparse
import os
import subprocess
import sys

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from autopilot.app_meta import project_name, project_version
from routers import system, autopilot
from middleware import (
    ResponseWrapperMiddleware,
    http_exception_handler,
    validation_exception_handler,
    pydantic_exception_handler,
    generic_exception_handler,
)


app = FastAPI(
    title=project_name(),
    description="Local autopilot service",
    version=project_version(),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ResponseWrapperMiddleware)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ValidationError, pydantic_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(system.router)
app.include_router(autopilot.router)


@app.get("/")
async def root():
    return {"message": "Hello from ele-autopilot-local!"}


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ele-autopilot",
        description="QA AutoPilot 本地浏览器自动化 HTTP 服务. 无参数启动 uvicorn 监听 0.0.0.0:8000.",
    )
    parser.add_argument(
        "-V",
        "--version",
        action="version",
        version=f"%(prog)s {project_version()}",
    )

    sub = parser.add_subparsers(dest="command", metavar="{upgrade,update}")
    upgrade = sub.add_parser(
        "upgrade",
        aliases=["update"],
        help="重新拉取并安装最新版本 (复用 install.sh).",
        description="通过 gateway 的 install.sh 重新安装本 CLI 到最新版本.",
    )
    upgrade.add_argument(
        "--base",
        metavar="URL",
        default=os.environ.get("ELE_AUTOPILOT_BASE"),
        help="gateway base URL (默认读环境变量 ELE_AUTOPILOT_BASE), 例如 https://qa.<account-sub>.workers.dev",
    )
    return parser


def _run_upgrade(base: str | None) -> int:
    if not base:
        print(
            "error: 缺少 gateway base URL. 使用 `--base https://qa.<account-sub>.workers.dev` 或设置环境变量 ELE_AUTOPILOT_BASE.",
            file=sys.stderr,
        )
        return 2
    base = base.rstrip("/")
    cmd = f"curl -fsSL {base}/install.sh | bash"
    print(f"==> Running: {cmd}", file=sys.stderr)
    return subprocess.run(["bash", "-c", cmd]).returncode


def cli():
    """CLI 入口: 无参数启动 HTTP 服务; 子命令 upgrade/update 触发重装."""
    args = _build_parser().parse_args()

    if args.command in ("upgrade", "update"):
        sys.exit(_run_upgrade(args.base))

    uvicorn.run("autopilot.cli:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    cli()
