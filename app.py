# -*- coding: utf-8 -*-
"""新华智鉴 Demo — 云端部署版（全实时 v3）"""
import json, os, re
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="public", static_url_path="")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


def _call(system, user, max_tokens=1200, temperature=0.4):
    import requests as req
    resp = req.post(
        DEEPSEEK_ENDPOINT,
        headers={"Authorization": "Bearer " + DEEPSEEK_API_KEY, "Content-Type": "application/json"},
        json={"model": DEEPSEEK_MODEL,
              "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
              "temperature": temperature, "max_tokens": max_tokens},
        timeout=90)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _json(text):
    m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        text = m.group(1).strip()
    text = re.sub(r',\s*([}\]])', r'\1', text)
    return json.loads(text)


# ---- Prompts (compact, no double-brace issue) ----

SYS_JSON = "你是GEO分析专家。只返回合法JSON，不要markdown代码块、不要额外文字。"

BRAND_PROMPT = '''分析品牌"__B__"在各AI搜索引擎中的表现。返回JSON：
{"brand":{"name":"__B__","company":"公司名","overallScore":38,"level":"需优化","dimensions":{"exposure":{"score":30,"label":"AI曝光度"},"sentiment":{"score":55,"label":"正面性"},"accuracy":{"score":50,"label":"准确性"},"authority":{"score":15,"label":"权威源占比"}},"engines":[{"name":"Kimi","score":42,"color":"#6366f1"},{"name":"豆包","score":45,"color":"#f59e0b"},{"name":"Perplexity","score":35,"color":"#10b981"},{"name":"ChatGPT","score":30,"color":"#3b82f6"},{"name":"DeepSeek","score":38,"color":"#8b5cf6"}]},"sourceAnalysis":{"sources":[{"name":"百度百科","count":8,"isXinhua":false},{"name":"丁香医生","count":6,"isXinhua":false},{"name":"好大夫","count":5,"isXinhua":false},{"name":"知乎","count":3,"isXinhua":false},{"name":"新华网","count":0,"isXinhua":true}],"questionDetails":[{"q":"问题","hasCoverage":true,"articles":3,"topSource":"百度百科"}],"competitorMatrix":[{"name":"新华网","quality":92,"visibility":5},{"name":"百度百科","quality":50,"visibility":90},{"name":"丁香医生","quality":75,"visibility":80}]}}
要求：根据__B__真实情况填写，分数25-55之间，新华网count为0或1。'''

GEO_PROMPT = '''分析品牌"__B__"的GEO优化前后对比。返回JSON：
{"questions":[{"q":"关于__B__的核心问题","engine":"Kimi","answer":"AI典型回答约100字","sources":[{"url":"baike.baidu.com","name":"百度百科","isXinhua":false}],"analysis":{"positive":["内容详实"],"warning":["缺少央媒引用"],"negative":["未引用新华网"]}}],"geoSimulation":{"question":"关于__B__的核心问题","before":{"answer":"优化前回答80字不引新华网","sources":[{"name":"百度百科","domain":"baike.baidu.com","authority":"中","isXinhua":false}],"score":35},"after":{"answer":"优化后回答120字引用新华网报道","sources":[{"name":"新华网健康","domain":"news.cn/health","authority":"极高","isXinhua":true},{"name":"国家卫健委","domain":"nhc.gov.cn","authority":"极高","isXinhua":false}],"score":82},"improvements":[{"label":"健康度评分","before":35,"after":82,"unit":"分"},{"label":"权威源占比","before":8,"after":85,"unit":"%"},{"label":"信息准确性","before":60,"after":92,"unit":"%"},{"label":"AI曝光度","before":20,"after":78,"unit":"%"}]}}
要求：answer字段写真实内容，体现优化效果。'''


@app.route("/")
def index():
    return send_from_directory("public", "index.html")


@app.route("/api/status")
def status():
    return jsonify({"api_configured": bool(DEEPSEEK_API_KEY),
                    "api_provider": "DeepSeek" if DEEPSEEK_API_KEY else None})


@app.route("/api/analyze-brand", methods=["POST"])
def analyze_brand():
    body = request.get_json(force=True)
    q = body.get("query", "").strip()
    if not q:
        return jsonify({"error": "请输入品牌名称"}), 400
    if not DEEPSEEK_API_KEY:
        return jsonify({"mode": "demo"})
    try:
        raw = _call(SYS_JSON, BRAND_PROMPT.replace("__B__", q), max_tokens=1200)
        data = _json(raw)
        data["mode"] = "live"
        return jsonify(data)
    except json.JSONDecodeError:
        return jsonify({"mode": "error", "error": "JSON解析失败"})
    except Exception as e:
        return jsonify({"mode": "error", "error": str(e)[:200]})


@app.route("/api/analyze-geo", methods=["POST"])
def analyze_geo():
    body = request.get_json(force=True)
    q = body.get("query", "").strip()
    if not q:
        return jsonify({"error": "请输入品牌名称"}), 400
    if not DEEPSEEK_API_KEY:
        return jsonify({"mode": "demo"})
    try:
        raw = _call(SYS_JSON, GEO_PROMPT.replace("__B__", q), max_tokens=1500)
        data = _json(raw)
        data["mode"] = "live"
        return jsonify(data)
    except json.JSONDecodeError:
        return jsonify({"mode": "error", "error": "JSON解析失败"})
    except Exception as e:
        return jsonify({"mode": "error", "error": str(e)[:200]})


@app.route("/api/ask", methods=["POST"])
def ask():
    body = request.get_json(force=True)
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "请输入问题"}), 400
    if not DEEPSEEK_API_KEY:
        return jsonify({"mode": "demo"})
    try:
        ans = _call(
            "你是医疗健康知识助手。要求：1.专业准确 2.引用权威来源(新华网、卫健委等) "
            "3.末尾列参考来源(格式：【来源】网站名-URL) 4.优先引新华网报道",
            question, max_tokens=1500, temperature=0.7)
        src = _extract_sources(ans)
        sc, ana = _score(ans, src)
        return jsonify({"mode": "live", "question": question, "answer": ans,
                        "sources": src, "score": sc, "analysis": ana})
    except Exception as e:
        return jsonify({"mode": "error", "error": str(e)[:200]})


def _extract_sources(text):
    urls = re.findall(r'https?://[^\s\)\]\"\'\<\>\uff0c\u3002]+', text)
    domains = []
    for u in urls:
        try:
            from urllib.parse import urlparse
            d = urlparse(u).netloc.replace("www.", "")
            if d: domains.append({"url": u, "domain": d})
        except: pass
    named = re.findall(r'\u3010\u6765\u6e90\u3011\s*(.+?)(?:\n|$)', text)
    xh = bool(re.search(r'\u65b0\u534e|news\.cn|xinhuanet', text, re.I))
    wd = bool(re.search(r'\u5fae\u533b|wedoctor', text, re.I))
    return {"urls": domains, "named_sources": named, "mentions_xinhua": xh, "mentions_wedoctor": wd}


def _score(text, src):
    s = 40
    a = {"positive": [], "warning": [], "negative": []}
    if len(text) > 200: s += 10; a["positive"].append("\u56de\u7b54\u5185\u5bb9\u8be6\u5b9e")
    if src["mentions_xinhua"]: s += 25; a["positive"].append("\u5f15\u7528\u4e86\u65b0\u534e\u7f51\u6743\u5a01\u4fe1\u6e90")
    else: s -= 10; a["negative"].append("\u672a\u5f15\u7528\u65b0\u534e\u7f51\u7b49\u6743\u5a01\u592e\u5a92\u4fe1\u6e90")
    if len(src["urls"]) >= 2: s += 10; a["positive"].append("\u63d0\u4f9b\u4e86" + str(len(src["urls"])) + "\u4e2a\u53c2\u8003\u6765\u6e90")
    elif len(src["named_sources"]) >= 1: s += 5; a["positive"].append("\u63d0\u4f9b\u4e86\u547d\u540d\u53c2\u8003\u6765\u6e90")
    else: a["warning"].append("\u7f3a\u5c11\u660e\u786e\u7684\u53c2\u8003\u6765\u6e90\u94fe\u63a5")
    return max(10, min(95, s)), a


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
