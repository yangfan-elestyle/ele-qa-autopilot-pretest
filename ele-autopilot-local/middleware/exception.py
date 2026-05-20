from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            "data": None,
        },
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    error_messages = []
    for error in errors:
        loc = " -> ".join(str(x) for x in error["loc"])
        error_messages.append(f"{loc}: {error['msg']}")

    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "message": "Validation Error",
            "data": {"errors": error_messages},
        },
    )


async def pydantic_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    errors = exc.errors()
    error_messages = []
    for error in errors:
        loc = " -> ".join(str(x) for x in error["loc"])
        error_messages.append(f"{loc}: {error['msg']}")

    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "message": "Validation Error",
            "data": {"errors": error_messages},
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "Internal Server Error",
            "data": None,
        },
    )
