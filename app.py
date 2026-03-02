# -*- coding: utf-8 -*-
"""
新华智鉴 Demo — 云端部署版（全实时 v3）
"""
import json
import os
import re
import traceback
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="public", static_url_path="")

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


def _call_deepseek(system, user, max_tokens=2500, temperature=0.5):
    import requests as req
    resp = req.post(
        DEEPSEEK_ENDPOINT,
        headers={
            "Authorization": "Bearer " + DEEPSEEK_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _extract_json(text):
    """Extract JSON from AI response, handling markdown fences."""
    m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        text = m.group(1).strip()
    text = re.sub(r',\s*([}\]])', r'\1', text)
    return json.loads(text)


ANALYZE_PROMPT = '''你是GEO分析专家。请分析品牌「{brand}」在AI搜索引擎中的表现，直接返回JSON（不要markdown代码块）：
{{
  "brand":{{
    "name":"{brand}","company":"所属公司名",
    "overallScore":38,"level":"需优化",
    "dimensions":{{
      "exposure":{{"score":30,"label":"AI曝光度"}},
      "sentiment":{{"score":55,"label":"正面性"}},
      "accuracy":{{"score":50,"label":"准确性"}},
      "authority":{{"score":15,"label":"权威源占比"}}
    }},
    "engines":[
      {{"name":"Kimi","score":42,"color":"#6366f1"}},
      {{"name":"豆包","score":45,"color":"#f59e0b"}},
      {{"name":"Perplexity","score":35,"color":"#10b981"}},
      {{"name":"ChatGPT","score":30,"color":"#3b82f6"}},
      {{"name":"DeepSeek","score":38,"color":"#8b5cf6"}}
    ]
  }},
  "sourceAnalysis":{{
    "sources":[
      {{"name":"百度百科","count":8,"isXinhua":false}},
      {{"name":"丁香医生","count":6,"isXinhua":false}},
      {{"name":"好大夫","count":5,"isXinhua":false}},
      {{"name":"药品说明书","count":4,"isXinhua":false}},
      {{"name":"知乎","count":3,"isXinhua":false}},
      {{"name":"新华网","count":0,"isXinhua":true}}
    ],
    "questionDetails":[
      {{"q":"问题1","hasCoverage":true,"articles":3,"topSource":"百度百科"}},
      {{"q":"问题2","hasCoverage":true,"articles":2,"topSource":"丁香医生"}}
    ],
    "competitorMatrix":[
      {{"name":"新华网","quality":92,"visibility":5}},
      {{"name":"百度百科","quality":50,"visibility":90}},
      {{"name":"丁香医生","quality":75,"visibility":80}},
      {{"name":"好大夫","quality":65,"visibility":70}},
      {{"name":"知乎","quality":45,"visibility":60}}
    ]
  }},
  "questions":[
    {{
      "q":"关于该品牌的核心问题","engine":"Kimi",
      "answer":"AI的典型回答约150字",
      "sources":[{{"url":"baike.baidu.com","name":"百度百科","isXinhua":false}}],
      "analysis":{{"positive":["回答准确"],"warning":["缺少权威央媒引用"],"negative":["未引用新华网"]}}
    }}
  ],
  "geoSimulation":{{
    "question":"关于该品牌最核心的问题",
    "before":{{
      "answer":"优化前AI回答(约100字,不引用新华网)",
      "sources":[{{"name":"百度百科","domain":"baike.baidu.com","authority":"中","isXinhua":false}},{{"name":"丁香医生","domain":"dxy.com","authority":"中","isXinhua":false}}],
      "score":38
    }},
    "after":{{
      "answer":"GEO优化后AI回答(约150字,引用新华网报道,数据更权威)",
      "sources":[{{"name":"新华网健康","domain":"news.cn/health","authority":"极高","isXinhua":true}},{{"name":"国家卫健委","domain":"nhc.gov.cn","authority":"极高","isXinhua":false}},{{"name":"百度百科","domain":"baike.baidu.com","authority":"中","isXinhua":false}}],
      "score":82
    }},
    "improvements":[
      {{"label":"健康度评分","before":38,"after":82,"unit":"分"}},
      {{"label":"权威源占比","before":8,"after":85,"unit":"%"}},
      {{"label":"信息准确性","before":60,"after":92,"unit":"%"}},
      {{"label":"AI曝光度","before":20,"after":78,"unit":"%"}}
    ]
  }}
}}

要求：
1. 根据「{brand}」的真实情况填写公司名、分数、信源等，不要照抄示例数字
2. 分数要合理：大多数医疗品牌AI健康度在25-55之间
3. 信源排行要体现核心痛点：新华网有内容但AI不引用（count为0或1）
4. GEO优化前后对比要体现效果
5. 只返回JSON，不要其他文字'''


@app.route("/")
def index():
    return send_from_directory("public", "index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "api_configured": bool(DEEPSEEK_API_KEY),
        "api_provider": "DeepSeek" if DEEPSEEK_API_KEY else None,
    })


@app.route("/api/analyze", methods=["POST"])
def analyze():
    body = request.get_json(force=True)
    query = body.get("query", "").strip()
    if not query:
        return jsonify({"error": "请输入品牌名称"}), 400

    if not DEEPSEEK_API_KEY:
        return jsonify({"mode": "demo", "message": "未配置 API Key"})

    try:
        prompt = ANALYZE_PROMPT.replace("{brand}", query)
        raw = _call_deepseek(
            "你是GEO分析专家，只返回合法JSON，不添加任何markdown标记或额外文字。",
            prompt,
            max_tokens=2800,
            temperature=0.4,
        )
        data = _extract_json(raw)
        data["mode"] = "live"
        return jsonify(data)
    except json.JSONDecodeError as e:
        return jsonify({"mode": "error", "error": "JSON解析失败: " + str(e)[:100]})
    except Exception as e:
        return jsonify({"mode": "error", "error": str(e)[:200]})


@app.route("/api/ask", methods=["POST"])
def ask():
    body = request.get_json(force=True)
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "请输入问题"}), 400

    if not DEEPSEEK_API_KEY:
        return jsonify({"mode": "demo", "message": "未配置 API Key"})

    try:
        system = (
            "你是医疗健康知识助手。回答用户问题，要求：\n"
            "1. 专业、准确、有条理\n"
            "2. 尽量引用权威来源（新华网、国家卫健委、权威医学期刊等）\n"
            "3. 末尾列出参考信息来源（格式：【来源】网站名 - URL）\n"
            "4. 如涉及新华网(news.cn)报道，优先引用"
        )
        answer_text = _call_deepseek(system, question, max_tokens=1500)
        sources = _extract_sources(answer_text)
        score, analysis = _analyze_answer(answer_text, sources)
        return jsonify({
            "mode": "live", "question": question, "answer": answer_text,
            "sources": sources, "score": score, "analysis": analysis,
        })
    except Exception as e:
        return jsonify({"mode": "error", "error": str(e)[:200]})


def _extract_sources(text):
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


def _analyze_answer(text, sources):
    score = 40
    analysis = {"positive": [], "warning": [], "negative": []}
    if len(text) > 200:
        score += 10
        analysis["positive"].append("回答内容详实")
    if sources["mentions_xinhua"]:
        score += 25
        analysis["positive"].append("引用了新华网权威信源")
    else:
        score -= 10
        analysis["negative"].append("未引用新华网等权威央媒信源")
    if len(sources["urls"]) >= 2:
        score += 10
        analysis["positive"].append("提供了" + str(len(sources["urls"])) + "个参考来源")
    elif len(sources["named_sources"]) >= 1:
        score += 5
        analysis["positive"].append("提供了命名参考来源")
    else:
        analysis["warning"].append("缺少明确的参考来源链接")
    return max(10, min(95, score)), analysis


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print("\n  新华智鉴 Demo 启动中...")
    print("  API:", "已配置 (DeepSeek)" if DEEPSEEK_API_KEY else "未配置")
    print("  http://localhost:" + str(port) + "\n")
    app.run(host="0.0.0.0", port=port)
