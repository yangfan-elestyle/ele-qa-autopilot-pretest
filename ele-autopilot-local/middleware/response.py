import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
from fastapi.responses import JSONResponse


class ResponseWrapperMiddleware(BaseHTTPMiddleware):
    """把 JSON 响应统一包成 `{code, message, data}`. OpenAPI 文档路径直通."""

    EXCLUDE_PATHS = ["/docs", "/redoc", "/openapi.json"]

    async def dispatch(self, request: Request, call_next) -> Response:
        if any(request.url.path.startswith(path) for path in self.EXCLUDE_PATHS):
            return await call_next(request)

        response = await call_next(request)

        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        if isinstance(response, StreamingResponse):
            body_parts = []
            async for chunk in response.body_iterator:
                body_parts.append(chunk)
            body = b"".join(body_parts)
        else:
            body = b""
            async for chunk in response.body_iterator:
                body += chunk

        try:
            original_data = json.loads(body.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return response

        if self._is_wrapped_response(original_data):
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type="application/json",
            )

        wrapped_data = {"code": 0, "message": "success", "data": original_data}

        return JSONResponse(
            content=wrapped_data,
            status_code=response.status_code,
            headers={
                k: v
                for k, v in response.headers.items()
                if k.lower() != "content-length"
            },
        )

    def _is_wrapped_response(self, data: dict) -> bool:
        if not isinstance(data, dict):
            return False
        return (
            "code" in data
            and "message" in data
            and isinstance(data.get("code"), int)
            and isinstance(data.get("message"), str)
        )
