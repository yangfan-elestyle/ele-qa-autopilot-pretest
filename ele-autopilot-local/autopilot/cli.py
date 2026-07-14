"""CLI 入口点和 FastAPI 应用定义.

`uv tool install` 后通过 `ele-autopilot` 启动 HTTP 服务 (默认 0.0.0.0:8000).
"""

import argparse

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
    # 不开 credentials: 本地 API 无 session / cookie 鉴权, 浏览器规范也不允许
    # `allow_origins=["*"]` 与 `allow_credentials=True` 同时生效 (cookie 仍发不出去),
    # 关闭后明确这一事实, 同时避免在路由层误以为可凭跨站 cookie 鉴权.
    allow_credentials=False,
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
    return parser


def cli():
    """CLI 入口: 无参数启动 HTTP 服务; -V/--version 查看版本. 升级 = 重跑 install.sh."""
    _build_parser().parse_args()
    uvicorn.run("autopilot.cli:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    cli()
