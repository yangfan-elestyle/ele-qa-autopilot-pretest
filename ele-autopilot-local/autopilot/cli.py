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


UPGRADE_SHIM_PATH = os.path.join(
    os.path.expanduser("~"), ".local", "bin", "ele-autopilot-upgrade"
)


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
    sub.add_parser(
        "upgrade",
        aliases=["update"],
        help="重新拉取并安装最新版本 (执行 install.sh 安装时写入的 shim).",
        description=(
            "执行 ~/.local/bin/ele-autopilot-upgrade. 该 shim 在首装时由 install.sh 生成, "
            "BASE 字面值已烧入. 切换 gateway 请重跑对应 install.sh."
        ),
    )
    return parser


def _run_upgrade() -> int:
    if not os.path.isfile(UPGRADE_SHIM_PATH):
        print(
            f"error: 未找到升级 shim {UPGRADE_SHIM_PATH}. "
            "请重跑一次 `curl -fsSL <gateway>/install.sh | bash` 完成首装/补装.",
            file=sys.stderr,
        )
        return 2
    print(f"==> Running: {UPGRADE_SHIM_PATH}", file=sys.stderr)
    return subprocess.run(["bash", UPGRADE_SHIM_PATH]).returncode


def cli():
    """CLI 入口: 无参数启动 HTTP 服务; 子命令 upgrade/update 触发重装."""
    args = _build_parser().parse_args()

    if args.command in ("upgrade", "update"):
        sys.exit(_run_upgrade())

    uvicorn.run("autopilot.cli:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    cli()
