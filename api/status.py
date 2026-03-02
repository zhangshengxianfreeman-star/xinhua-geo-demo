import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        body = json.dumps({
            "api_configured": bool(api_key),
            "api_provider": "DeepSeek" if api_key else None,
        })
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))
