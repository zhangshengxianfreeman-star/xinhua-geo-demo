import json
from http.server import BaseHTTPRequestHandler

BRAND_DB = {
    "\u8fde\u82b1\u6e05\u761f": "lianhua",
    "\u4ee5\u5cad\u836f\u4e1a": "lianhua",
    "lianhua": "lianhua",
    "\u65b0\u534e\u7f51": "xinhua_health",
    "\u65b0\u534e\u7f51\u5065\u5eb7": "xinhua_health",
    "\u65b0\u534e": "xinhua_health",
    "xinhua": "xinhua_health",
}


def match_brand(query):
    q = query.strip().lower()
    for keyword, brand_id in BRAND_DB.items():
        if keyword.lower() in q or q in keyword.lower():
            return brand_id
    return None


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw)
        except Exception:
            body = {}

        query = body.get("query", "").strip()
        if not query:
            self._json(400, {"error": "\u8bf7\u8f93\u5165\u54c1\u724c\u540d\u79f0"})
            return

        brand_id = match_brand(query)
        if brand_id:
            self._json(200, {"mode": "preset", "brand_id": brand_id})
        else:
            self._json(200, {
                "mode": "generic",
                "brand_id": None,
                "message": "\u300c" + query + "\u300d\u6682\u65e0\u9884\u7f6e\u6570\u636e\uff0c\u8bf7\u5c1d\u8bd5\u8f93\u5165\u201c\u8fde\u82b1\u6e05\u761f\u201d\u6216\u201c\u65b0\u534e\u7f51\u201d\u67e5\u770b\u5b8c\u6574\u8bca\u65ad",
            })

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False)
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))
