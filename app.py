# -*- coding: utf-8 -*-
"""
新华智鉴 Demo — 云端部署版
兼容 Vercel Serverless / Render / Railway / 任何 WSGI 平台
"""
import json
import os
import re
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="public", static_url_path="")

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

BRAND_DB = {
    "\u8fde\u82b1\u6e05\u761f": "lianhua",
    "\u4ee5\u5cad\u836f\u4e1a": "lianhua",
    "lianhua": "lianhua",
    "\u65b0\u534e\u7f51": "xinhua_health",
    "\u65b0\u534e\u7f51\u5065\u5eb7": "xinhua_health",
    "\u65b0\u534e": "xinhua_health",
    "xinhua": "xinhua_health",
}

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


def match_brand(query):
    q = query.strip().lower()
    for keyword, brand_id in BRAND_DB.items():
        if keyword.lower() in q or q in keyword.lower():
            return brand_id
    return None


def match_question(query):
    q = query.strip()
    for preset in QUESTION_DB:
        overlap = sum(1 for c in q if c in preset)
        if overlap >= len(q) * 0.4 or overlap >= len(preset) * 0.4:
            return preset
    return None


def call_deepseek(question):
    import requests as req
    system_prompt = (
        "\u4f60\u662f\u4e00\u4e2a\u533b\u7597\u5065\u5eb7\u77e5\u8bc6\u52a9\u624b\u3002\u8bf7\u56de\u7b54\u7528\u6237\u7684\u533b\u7597\u95ee\u9898\uff0c\u8981\u6c42\uff1a\n"
        "1. \u56de\u7b54\u8981\u4e13\u4e1a\u3001\u51c6\u786e\u3001\u6709\u6761\u7406\n"
        "2. \u5728\u56de\u7b54\u4e2d\u5c3d\u91cf\u5f15\u7528\u6743\u5a01\u6765\u6e90\uff08\u5982\u65b0\u534e\u7f51\u3001\u56fd\u5bb6\u536b\u5065\u59d4\u3001\u6743\u5a01\u533b\u5b66\u671f\u520a\u7b49\uff09\n"
        "3. \u5728\u56de\u7b54\u672b\u5c3e\u5217\u51fa\u4f60\u53c2\u8003\u7684\u4fe1\u606f\u6765\u6e90\uff08\u683c\u5f0f\uff1a\u3010\u6765\u6e90\u3011\u7f51\u7ad9\u540d - URL\uff09\n"
        "4. \u5982\u679c\u6d89\u53ca\u65b0\u534e\u7f51(news.cn)\u7684\u62a5\u9053\uff0c\u8bf7\u4f18\u5148\u5f15\u7528"
    )
    resp = req.post(
        DEEPSEEK_ENDPOINT,
        headers={"Authorization": "Bearer " + DEEPSEEK_API_KEY, "Content-Type": "application/json"},
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
    return resp.json()["choices"][0]["message"]["content"].strip()


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
        "urls": domains, "named_sources": source_names,
        "mentions_xinhua": has_xinhua, "mentions_wedoctor": has_wedoctor,
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
    return max(10, min(95, score)), analysis


def call_deepseek_json(system_prompt, user_prompt, max_tokens=3000):
    import requests as req
    resp = req.post(
        DEEPSEEK_ENDPOINT,
        headers={"Authorization": "Bearer " + DEEPSEEK_API_KEY, "Content-Type": "application/json"},
        json={
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.7,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    resp.raise_for_status()
    text = resp.json()["choices"][0]["message"]["content"].strip()
    return json.loads(text)


ANALYZE_SYSTEM_PROMPT = """你是一个GEO（生成式引擎优化）分析专家。用户会输入一个品牌名称（可能是药品、医疗机构、健康平台等），你需要分析该品牌在AI搜索引擎中的表现。

请严格返回以下JSON格式（不要添加任何注释或额外文字）：
{
  "brand": {
    "name": "品牌名",
    "company": "所属公司",
    "overallScore": 42,
    "level": "需优化|一般|良好|优秀",
    "dimensions": {
      "exposure": {"score": 35, "label": "AI曝光度"},
      "sentiment": {"score": 55, "label": "正面性"},
      "accuracy": {"score": 48, "label": "准确性"},
      "authority": {"score": 30, "label": "权威源占比"}
    },
    "engines": [
      {"name": "Kimi", "score": 45, "color": "#6366f1"},
      {"name": "豆包", "score": 50, "color": "#f59e0b"},
      {"name": "Perplexity", "score": 38, "color": "#10b981"},
      {"name": "ChatGPT", "score": 35, "color": "#3b82f6"},
      {"name": "DeepSeek", "score": 40, "color": "#8b5cf6"}
    ]
  },
  "sourceAnalysis": {
    "sources": [
      {"name": "信源名称", "count": 4, "isXinhua": false},
      {"name": "新华网", "count": 0, "isXinhua": true}
    ],
    "questionDetails": [
      {"q": "相关问题", "hasCoverage": true, "articles": 5, "topSource": "排第1的信源"}
    ],
    "competitorMatrix": [
      {"name": "新华网", "quality": 95, "visibility": 0},
      {"name": "竞争者", "quality": 60, "visibility": 80}
    ]
  },
  "questions": [
    {
      "q": "用户最可能问的关于该品牌的问题",
      "engine": "某AI引擎",
      "answer": "AI引擎对此问题的典型回答（150-200字）",
      "sources": [
        {"url": "example.com/path", "name": "来源名称", "isXinhua": false}
      ],
      "analysis": {
        "positive": ["优点"],
        "warning": ["注意点"],
        "negative": ["不足"]
      }
    }
  ],
  "geoSimulation": {
    "question": "该品牌最核心的一个问题",
    "before": {
      "answer": "优化前的典型AI回答（100-150字，不包含新华网引用）",
      "sources": [
        {"name": "来源名", "domain": "domain.com", "authority": "低|中|高", "isXinhua": false}
      ],
      "score": 42
    },
    "after": {
      "answer": "GEO优化后的AI回答（150-200字，包含新华网报道引用，数据更准确）",
      "sources": [
        {"name": "新华网健康频道", "domain": "news.cn/health", "authority": "极高", "isXinhua": true},
        {"name": "其他权威源", "domain": "example.gov.cn", "authority": "极高", "isXinhua": false}
      ],
      "score": 85
    },
    "improvements": [
      {"label": "健康度评分", "before": 42, "after": 85, "unit": "分"},
      {"label": "权威源占比", "before": 10, "after": 85, "unit": "%"},
      {"label": "信息准确性", "before": 60, "after": 90, "unit": "%"},
      {"label": "AI曝光度", "before": 15, "after": 80, "unit": "%"}
    ]
  }
}

评分规则：
- overallScore: 综合考虑品牌在AI引擎中被提及的频率、引用权威性、信息准确度。大多数品牌得分在25-55之间（AI引擎目前普遍不引用权威央媒）。
- 各维度score: 0-100，AI曝光度和权威源占比通常偏低（因为AI引擎倾向引用百科和商业健康平台而非央媒）。
- engines分数: 不同引擎表现有差异，Kimi和豆包通常稍好。
- sourceAnalysis.sources: 列出AI引擎回答该品牌相关问题时最常引用的8-12个信源，按引用次数降序。新华网(news.cn)应当出现但count为0或很低（这是GEO要解决的核心问题）。
- questions: 生成2个该品牌最核心的问题及AI的典型回答，要真实反映当前AI不引用新华网的问题。
- geoSimulation: before体现当前问题（不引新华网），after体现优化后效果（引用新华网权威报道，数据更精准）。

关键：分析要真实、专业，体现"新华网有内容但AI不引用"这个核心痛点。"""


@app.route("/")
def index():
    return send_from_directory("public", "index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    body = request.get_json(force=True)
    query = body.get("query", "").strip()
    if not query:
        return jsonify({"error": "\u8bf7\u8f93\u5165\u54c1\u724c\u540d\u79f0"}), 400

    if not DEEPSEEK_API_KEY:
        return jsonify({"mode": "demo", "message": "\u672a\u914d\u7f6e API Key"})

    try:
        data = call_deepseek_json(
            ANALYZE_SYSTEM_PROMPT,
            "\u8bf7\u5206\u6790\u54c1\u724c\uff1a" + query,
            max_tokens=3500,
        )
        data["mode"] = "live"
        return jsonify(data)
    except json.JSONDecodeError:
        return jsonify({"mode": "error", "error": "AI\u8fd4\u56de\u683c\u5f0f\u89e3\u6790\u5931\u8d25"})
    except Exception as e:
        return jsonify({"mode": "error", "error": str(e)})


@app.route("/api/status")
def status():
    return jsonify({
        "api_configured": bool(DEEPSEEK_API_KEY),
        "api_provider": "DeepSeek" if DEEPSEEK_API_KEY else None,
    })


@app.route("/api/diagnose", methods=["POST"])
def diagnose():
    body = request.get_json(force=True)
    query = body.get("query", "").strip()
    if not query:
        return jsonify({"error": "\u8bf7\u8f93\u5165\u54c1\u724c\u540d\u79f0"}), 400
    brand_id = match_brand(query)
    if brand_id:
        return jsonify({"mode": "preset", "brand_id": brand_id})
    return jsonify({
        "mode": "generic", "brand_id": None,
        "message": "\u300c" + query + "\u300d\u6682\u65e0\u9884\u7f6e\u6570\u636e\uff0c\u8bf7\u5c1d\u8bd5\u8f93\u5165\u201c\u8fde\u82b1\u6e05\u761f\u201d\u6216\u201c\u65b0\u534e\u7f51\u201d",
    })


@app.route("/api/ask", methods=["POST"])
def ask():
    body = request.get_json(force=True)
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "\u8bf7\u8f93\u5165\u95ee\u9898"}), 400

    preset_match = match_question(question)

    if DEEPSEEK_API_KEY:
        try:
            answer_text = call_deepseek(question)
            sources = extract_sources(answer_text)
            score, analysis = analyze_answer(answer_text, sources)
            return jsonify({
                "mode": "live", "question": question, "answer": answer_text,
                "sources": sources, "score": score, "analysis": analysis,
                "preset_match": preset_match,
            })
        except Exception as e:
            return jsonify({
                "mode": "error",
                "error": "API \u8c03\u7528\u5931\u8d25: " + str(e),
                "preset_match": preset_match,
            })
    else:
        return jsonify({
            "mode": "demo",
            "message": "\u5f53\u524d\u4e3a\u6f14\u793a\u6a21\u5f0f\uff08\u672a\u914d\u7f6e AI API Key\uff09",
            "preset_match": preset_match, "question": question,
        })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print("\n  \u65b0\u534e\u667a\u9274 Demo \u542f\u52a8\u4e2d...")
    print("  API:", "\u5df2\u914d\u7f6e (DeepSeek)" if DEEPSEEK_API_KEY else "\u672a\u914d\u7f6e")
    print("  http://localhost:" + str(port) + "\n")
    app.run(host="0.0.0.0", port=port)
