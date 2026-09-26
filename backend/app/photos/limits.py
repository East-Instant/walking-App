"""Bound the entire multipart body before Starlette parses/spools its parts."""
from tempfile import SpooledTemporaryFile
from starlette.responses import JSONResponse

MAX_REQUEST_BYTES = 10 * 1024 * 1024 + 64 * 1024


class PhotoUploadLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get('path', '').rstrip('/')
        if scope['type'] != 'http' or scope.get('method') != 'POST' or not (path.startswith('/pins/') and path.endswith('/photos')):
            return await self.app(scope, receive, send)
        headers = dict(scope.get('headers', []))
        try:
            length = int(headers.get(b'content-length', b'0'))
        except ValueError:
            length = MAX_REQUEST_BYTES + 1
        async def reject():
            await JSONResponse({'detail': '写真は10MB以内にしてください'}, status_code=413)(scope, receive, send)
        if length > MAX_REQUEST_BYTES:
            return await reject()
        # Handles missing/false Content-Length and chunked requests as well.
        with SpooledTemporaryFile(max_size=1024 * 1024) as body:
            total = 0
            while True:
                message = await receive()
                if message['type'] == 'http.disconnect':
                    return
                chunk = message.get('body', b'')
                total += len(chunk)
                if total > MAX_REQUEST_BYTES:
                    return await reject()
                body.write(chunk)
                if not message.get('more_body', False):
                    break
            body.seek(0)
            finished = False
            async def replay():
                nonlocal finished
                if finished:
                    return await receive()
                chunk = body.read(64 * 1024)
                finished = body.tell() == total
                return {'type': 'http.request', 'body': chunk, 'more_body': not finished}
            await self.app(scope, replay, send)
