"""CLI 入口点和 FastAPI 应用定义.

`uv tool install` 后通过 `ele-autopilot` 启动 HTTP 服务 (默认 0.0.0.0:8000).
"""

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


def cli():
    """启动 HTTP 服务 (0.0.0.0:8000)."""
    uvicorn.run("autopilot.cli:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    cli()
