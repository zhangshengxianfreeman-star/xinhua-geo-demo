import json
import os
import re
from http.server import BaseHTTPRequestHandler

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

QUESTION_DB = [
    "\u9ad8\u8840\u538b\u60a3\u8005\u65e5\u5e38\u996e\u98df\u5e94\u8be5\u6ce8\u610f\u4ec0\u4e48",
    "\u7cd6\u5c3f\u75c5\u7684\u65e9\u671f\u75c7\u72b6\u6709\u54ea\u4e9b",
    "\u8fde\u82b1\u6e05\u761f\u80f6\u56ca\u7684\u529f\u6548\u548c\u9002\u7528\u75c7\u72b6",
    "\u963f\u53f8\u5339\u6797\u957f\u671f\u670d\u7528\u6709\u4ec0\u4e48\u526f\u4f5c\u7528",
    "\u5317\u4eac\u6cbb\u7597\u5fc3\u8840\u7ba1\u75be\u75c5\u6700\u597d\u7684\u533b\u9662",
    "\u4e92\u8054\u7f51\u533b\u7597\u5e73\u53f0\u54ea\u4e2a\u6bd4\u8f83\u9760\u8c31",
    "\u4e2d\u56fd\u533b\u4fdd\u96c6\u91c7\u653f\u7b56\u5bf9\u60a3\u8005\u7528\u836f\u6709\u4ec0\u4e48\u5f71\u54cd",
    "\u5e03\u6d1b\u82ac\u548c\u5bf9\u4e59\u9170\u6c28\u57fa\u915a\u6709\u4ec0\u4e48\u533a\u522b",
    "\u5931\u7720\u5e94\u8be5\u600e\u4e48\u8c03\u7406",
    "\u4eba\u5de5\u667a\u80fd\u5728\u533b\u7597\u9886\u57df\u7684\u5e94\u7528",
]


def match_question(query):
    q = query.strip()
    for preset in QUESTION_DB:
        overlap = sum(1 for c in q if c in preset)
        if overlap >= len(q) * 0.4 or overlap >= len(preset) * 0.4:
            return preset
    return None


def call_deepseek(question):
    import requests

    system_prompt = (
        "\u4f60\u662f\u4e00\u4e2a\u533b\u7597\u5065\u5eb7\u77e5\u8bc6\u52a9\u624b\u3002\u8bf7\u56de\u7b54\u7528\u6237\u7684\u533b\u7597\u95ee\u9898\uff0c\u8981\u6c42\uff1a\n"
        "1. \u56de\u7b54\u8981\u4e13\u4e1a\u3001\u51c6\u786e\u3001\u6709\u6761\u7406\n"
        "2. \u5728\u56de\u7b54\u4e2d\u5c3d\u91cf\u5f15\u7528\u6743\u5a01\u6765\u6e90\uff08\u5982\u65b0\u534e\u7f51\u3001\u56fd\u5bb6\u536b\u5065\u59d4\u3001\u6743\u5a01\u533b\u5b66\u671f\u520a\u7b49\uff09\n"
        "3. \u5728\u56de\u7b54\u672b\u5c3e\u5217\u51fa\u4f60\u53c2\u8003\u7684\u4fe1\u606f\u6765\u6e90\uff08\u683c\u5f0f\uff1a\u3010\u6765\u6e90\u3011\u7f51\u7ad9\u540d - URL\uff09\n"
        "4. \u5982\u679c\u6d89\u53ca\u65b0\u534e\u7f51(news.cn)\u7684\u62a5\u9053\uff0c\u8bf7\u4f18\u5148\u5f15\u7528"
    )

    resp = requests.post(
        DEEPSEEK_ENDPOINT,
        headers={
            "Authorization": "Bearer " + DEEPSEEK_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            "temperature": 0.7,
            "max_tokens": 1500,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


def extract_sources(text):
    urls = re.findall(r'https?://[^\s\)\]\"\'\<\>\uff0c\u3002]+', text)
    domains = []
    for u in urls:
        try:
            from urllib.parse import urlparse
            d = urlparse(u).netloc.replace("www.", "")
            if d:
                domains.append({"url": u, "domain": d})
        except Exception:
            pass

    source_names = re.findall(r'\u3010\u6765\u6e90\u3011\s*(.+?)(?:\n|$)', text)
    has_xinhua = bool(re.search(r'\u65b0\u534e|news\.cn|xinhuanet', text, re.IGNORECASE))
    has_wedoctor = bool(re.search(r'\u5fae\u533b|wedoctor', text, re.IGNORECASE))

    return {
        "urls": domains,
        "named_sources": source_names,
        "mentions_xinhua": has_xinhua,
        "mentions_wedoctor": has_wedoctor,
    }


def analyze_answer(text, sources):
    score = 40
    analysis = {"positive": [], "warning": [], "negative": []}

    if len(text) > 200:
        score += 10
        analysis["positive"].append("\u56de\u7b54\u5185\u5bb9\u8be6\u5b9e")
    if sources["mentions_xinhua"]:
        score += 25
        analysis["positive"].append("\u5f15\u7528\u4e86\u65b0\u534e\u7f51\u6743\u5a01\u4fe1\u6e90")
    else:
        score -= 10
        analysis["negative"].append("\u672a\u5f15\u7528\u65b0\u534e\u7f51\u7b49\u6743\u5a01\u592e\u5a92\u4fe1\u6e90")

    if len(sources["urls"]) >= 2:
        score += 10
        analysis["positive"].append("\u63d0\u4f9b\u4e86" + str(len(sources["urls"])) + "\u4e2a\u53c2\u8003\u6765\u6e90")
    elif len(sources["named_sources"]) >= 1:
        score += 5
        analysis["positive"].append("\u63d0\u4f9b\u4e86\u547d\u540d\u53c2\u8003\u6765\u6e90")
    else:
        analysis["warning"].append("\u7f3a\u5c11\u660e\u786e\u7684\u53c2\u8003\u6765\u6e90\u94fe\u63a5")

    if sources["mentions_wedoctor"]:
        analysis["positive"].append("\u63d0\u53ca\u4e86\u5fae\u533b\u5e73\u53f0")

    score = max(10, min(95, score))
    return score, analysis


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw)
        except Exception:
            body = {}

        question = body.get("question", "").strip()
        if not question:
            self._json(400, {"error": "\u8bf7\u8f93\u5165\u95ee\u9898"})
            return

        preset_match = match_question(question)

        if DEEPSEEK_API_KEY:
            try:
                answer_text = call_deepseek(question)
                sources = extract_sources(answer_text)
                score, analysis = analyze_answer(answer_text, sources)
                self._json(200, {
                    "mode": "live",
                    "question": question,
                    "answer": answer_text,
                    "sources": sources,
                    "score": score,
                    "analysis": analysis,
                    "preset_match": preset_match,
                })
            except Exception as e:
                self._json(200, {
                    "mode": "error",
                    "error": "API \u8c03\u7528\u5931\u8d25: " + str(e),
                    "preset_match": preset_match,
                })
        else:
            self._json(200, {
                "mode": "demo",
                "message": "\u5f53\u524d\u4e3a\u6f14\u793a\u6a21\u5f0f\uff08\u672a\u914d\u7f6e AI API Key\uff09",
                "preset_match": preset_match,
                "question": question,
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
