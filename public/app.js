// 「新华智鉴」Demo v2 — 交互式应用逻辑
(function () {
  "use strict";

  const PRIMARY = "#1a3c6d";
  const RED = "#b22222";
  const GREEN = "#10b981";
  const DANGER = "#ef4444";

  let charts = {};
  let currentBrandId = null;
  let apiConfigured = false;

  // ========== DOM refs ==========
  const $ = (sel) => document.querySelector(sel);
  const heroSection = $("#hero-section");
  const brandInput = $("#brand-input");
  const brandSearchBtn = $("#brand-search-btn");
  const loadingOverlay = $("#loading-overlay");
  const questionInput = $("#question-input");
  const questionAskBtn = $("#question-ask-btn");

  // ========== API helpers ==========
  function apiPost(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function checkApiStatus() {
    fetch("/api/status")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        apiConfigured = data.api_configured;
        var statusEl = $("#api-status");
        if (apiConfigured) {
          statusEl.textContent = "AI API 已连接 (" + data.api_provider + ")";
          statusEl.className = "header-status live";
          $("#live-mode-badge").textContent = "实时模式";
          $("#live-mode-badge").className = "section-badge live";
        } else {
          statusEl.textContent = "演示模式";
          statusEl.className = "header-status demo";
          $("#live-mode-badge").textContent = "演示模式";
          $("#live-mode-badge").className = "section-badge demo-mode";
        }
      })
      .catch(function () {
        apiConfigured = false;
        var statusEl = $("#api-status");
        statusEl.textContent = "纯前端模式";
        statusEl.className = "header-status demo";
      });
  }

  // ========== Section visibility ==========
  function showSection(id, delay) {
    var el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () {
      el.classList.remove("hidden");
      el.classList.add("visible");
      if (id === "section-diagnosis") {
        setTimeout(function () { resizeCharts(); }, 100);
      }
    }, delay || 0);
  }

  function hideAllSections() {
    document.querySelectorAll(".result-section").forEach(function (s) {
      s.classList.add("hidden");
      s.classList.remove("visible");
    });
  }

  function resizeCharts() {
    Object.values(charts).forEach(function (c) { if (c && c.resize) c.resize(); });
  }

  // ========== Brand Search ==========
  function handleBrandSearch() {
    var query = brandInput.value.trim();
    if (!query) return;

    hideAllSections();
    loadingOverlay.classList.add("show");
    heroSection.classList.add("compact");
    brandSearchBtn.disabled = true;

    var brandId = matchBrandLocal(query);

    if (brandId) {
      setTimeout(function () {
        loadingOverlay.classList.remove("show");
        brandSearchBtn.disabled = false;
        currentBrandId = brandId;
        renderDiagnosis(brandId);
        showSection("section-diagnosis", 0);
        showSection("section-sources", 300);
        showSection("section-live", 600);
        showSection("section-geo", 900);
        scrollTo("section-diagnosis");
      }, 800);
    } else {
      apiPost("/api/diagnose", { query: query })
        .then(function (data) {
          loadingOverlay.classList.remove("show");
          brandSearchBtn.disabled = false;
          if (data.mode === "preset" && data.brand_id) {
            currentBrandId = data.brand_id;
            renderDiagnosis(data.brand_id);
            showSection("section-diagnosis", 0);
            showSection("section-sources", 300);
            showSection("section-live", 600);
            showSection("section-geo", 900);
            scrollTo("section-diagnosis");
          } else {
            currentBrandId = "lianhua";
            renderDiagnosis("lianhua");
            showSection("section-diagnosis", 0);
            showSection("section-sources", 300);
            showSection("section-live", 600);
            showSection("section-geo", 900);
            scrollTo("section-diagnosis");
            $("#diagnosis-brand-name").textContent =
              query + " (暂无预置数据，展示连花清瘟示例)";
          }
        })
        .catch(function () {
          loadingOverlay.classList.remove("show");
          brandSearchBtn.disabled = false;
          currentBrandId = "lianhua";
          renderDiagnosis("lianhua");
          showSection("section-diagnosis", 0);
          showSection("section-sources", 300);
          showSection("section-live", 600);
          showSection("section-geo", 900);
          scrollTo("section-diagnosis");
        });
    }
  }

  function matchBrandLocal(query) {
    var q = query.toLowerCase();
    var map = {
      "连花清瘟": "lianhua", "以岭药业": "lianhua", "lianhua": "lianhua",
      "新华网": "xinhua_health", "新华网健康": "xinhua_health",
      "新华": "xinhua_health", "xinhua": "xinhua_health",
    };
    for (var key in map) {
      if (q.indexOf(key.toLowerCase()) !== -1 || key.toLowerCase().indexOf(q) !== -1) {
        return map[key];
      }
    }
    return null;
  }

  function scrollTo(id) {
    var el = document.getElementById(id);
    if (el) {
      setTimeout(function () {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }

  // ========== Render Diagnosis ==========
  function renderDiagnosis(brandId) {
    var brand = DEMO_DATA.brands[brandId];
    if (!brand) return;

    $("#diagnosis-brand-name").textContent = brand.name + " / " + brand.company;

    renderGauge(brand.overallScore, brand.level);
    renderRadar(brand.dimensions);
    renderEngineChart(brand.engines);
    renderDimensionCards(brand);

    renderSourceAnalysis();
    renderGEO();
  }

  function renderGauge(score, level) {
    var container = document.getElementById("gauge-chart");
    if (!container) return;
    if (!charts.gauge) charts.gauge = echarts.init(container);
    var color = score >= 70 ? GREEN : score >= 50 ? "#f59e0b" : DANGER;
    charts.gauge.setOption({
      series: [{
        type: "gauge", startAngle: 200, endAngle: -20,
        min: 0, max: 100, splitNumber: 10,
        itemStyle: { color: color },
        progress: { show: true, width: 22, roundCap: true },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 22, color: [[1, "#e2e8f0"]] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true, fontSize: 42, fontWeight: 800, color: color,
          offsetCenter: [0, "0%"],
          formatter: function (v) { return v + "\n" + level; },
        },
        data: [{ value: score }],
      }],
    });
  }

  function renderRadar(dims) {
    var container = document.getElementById("radar-chart");
    if (!container) return;
    if (!charts.radar) charts.radar = echarts.init(container);
    var keys = Object.keys(dims);
    charts.radar.setOption({
      radar: {
        indicator: keys.map(function (k) { return { name: dims[k].label, max: 100 }; }),
        shape: "circle",
        splitArea: { areaStyle: { color: ["#f8fafc", "#fff"] } },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
        axisName: { color: "#475569", fontSize: 12 },
      },
      series: [{
        type: "radar",
        data: [{
          value: keys.map(function (k) { return dims[k].score; }),
          areaStyle: { color: "rgba(26,60,109,.12)" },
          lineStyle: { color: PRIMARY, width: 2 },
          itemStyle: { color: PRIMARY },
        }],
        symbol: "circle", symbolSize: 6,
      }],
    });
  }

  function renderEngineChart(engines) {
    var container = document.getElementById("engine-chart");
    if (!container) return;
    if (!charts.engine) charts.engine = echarts.init(container);
    charts.engine.setOption({
      grid: { left: 80, right: 30, top: 10, bottom: 30 },
      xAxis: { type: "value", max: 100, splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { color: "#94a3b8" } },
      yAxis: {
        type: "category",
        data: engines.map(function (e) { return e.name; }).reverse(),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 13 },
      },
      series: [{
        type: "bar",
        data: engines.map(function (e) {
          return {
            value: e.score,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: e.color + "88" },
                { offset: 1, color: e.color },
              ]),
              borderRadius: [0, 6, 6, 0],
            },
          };
        }).reverse(),
        barWidth: 28,
        label: { show: true, position: "right", fontSize: 14, fontWeight: 700, color: "#475569", formatter: "{c}分" },
      }],
      animationDuration: 800,
    });
  }

  function renderDimensionCards(brand) {
    var container = document.getElementById("dimension-cards");
    if (!container) return;
    var dims = brand.dimensions;
    container.innerHTML = Object.keys(dims).map(function (k) {
      var d = dims[k];
      var color = d.score >= 60 ? GREEN : d.score >= 40 ? "#f59e0b" : DANGER;
      return '<div class="dim-card"><div class="dim-score" style="color:' + color + '">' +
        d.score + '</div><div class="dim-label">' + d.label + "</div></div>";
    }).join("");
  }

  // ========== Source Analysis ==========
  function renderSourceAnalysis() {
    renderSourceChart();
    renderDetailTable();
    renderCompetitorChart();
  }

  function renderSourceChart() {
    var container = document.getElementById("source-chart");
    if (!container) return;
    if (!charts.source) charts.source = echarts.init(container);
    var data = DEMO_DATA.sourceAnalysis.sources;
    charts.source.setOption({
      grid: { left: 120, right: 40, top: 10, bottom: 30 },
      xAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", formatter: "{value}次" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      yAxis: {
        type: "category",
        data: data.map(function (d) { return d.name; }).reverse(),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: {
          fontSize: 13,
          rich: {
            xinhua: { color: DANGER, fontWeight: 700, fontSize: 14 },
            normal: { color: "#475569", fontSize: 13 },
          },
          formatter: function (value) {
            return value === "新华网" ? "{xinhua|" + value + "}" : "{normal|" + value + "}";
          },
        },
      },
      series: [{
        type: "bar",
        data: data.map(function (d) {
          return {
            value: d.count,
            itemStyle: {
              color: d.isXinhua ? DANGER : PRIMARY,
              borderRadius: [0, 4, 4, 0],
              opacity: d.isXinhua ? 1 : 0.7,
            },
            label: {
              show: true, position: "right",
              formatter: d.isXinhua ? "{c}次 ← 新华网" : "{c}次",
              color: d.isXinhua ? DANGER : "#94a3b8",
              fontWeight: d.isXinhua ? 700 : 400,
            },
          };
        }).reverse(),
        barWidth: 22,
      }],
      animationDuration: 1200,
    });
  }

  function renderDetailTable() {
    var tbody = document.getElementById("detail-tbody");
    if (!tbody) return;
    tbody.innerHTML = DEMO_DATA.sourceAnalysis.questionDetails.map(function (item) {
      return "<tr>" +
        "<td>" + item.q + "</td>" +
        "<td>" + (item.hasCoverage ? '<span class="badge-yes">有 (' + item.articles + "篇)</span>" : '<span class="badge-no">无</span>') + "</td>" +
        "<td>" + item.articles + "</td>" +
        "<td><span class=\"badge-no\">未进入</span></td>" +
        "<td><strong>" + item.topSource + "</strong></td>" +
        "</tr>";
    }).join("");
  }

  function renderCompetitorChart() {
    var container = document.getElementById("competitor-chart");
    if (!container) return;
    if (!charts.competitor) charts.competitor = echarts.init(container);
    var data = DEMO_DATA.sourceAnalysis.competitorMatrix;
    charts.competitor.setOption({
      grid: { left: 60, right: 30, top: 40, bottom: 50 },
      xAxis: {
        name: "内容质量", nameLocation: "center", nameGap: 30,
        nameTextStyle: { color: "#64748b", fontSize: 13 },
        min: 0, max: 100,
        axisLabel: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      yAxis: {
        name: "AI可见度", nameLocation: "center", nameGap: 35,
        nameTextStyle: { color: "#64748b", fontSize: 13 },
        min: 0, max: 100,
        axisLabel: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [{
        type: "scatter", symbolSize: 20,
        data: data.map(function (d) {
          return {
            value: [d.quality, d.visibility], name: d.name,
            itemStyle: { color: d.name === "新华网" ? DANGER : d.name === "央广网" ? "#f59e0b" : PRIMARY },
          };
        }),
        label: {
          show: true,
          formatter: function (p) { return p.data.name; },
          position: "top", fontSize: 13, color: "#475569",
        },
      }],
      graphic: [
        { type: "text", left: "72%", top: "8%", style: { text: "理想区域 →", fill: GREEN, fontSize: 13, fontWeight: 600 } },
        { type: "text", left: "8%", bottom: "16%", style: { text: "← 新华网当前位置\n（高质量 低可见度）", fill: DANGER, fontSize: 12 } },
      ],
      animationDuration: 1000,
    });
  }

  // ========== GEO Comparison ==========
  function renderGEO() {
    var sim = DEMO_DATA.geoSimulation;
    var geoQ = document.getElementById("geo-question");
    if (geoQ) geoQ.textContent = "用户提问：「" + sim.question + "」";

    var beforeAns = document.getElementById("before-answer");
    var afterAns = document.getElementById("after-answer");
    if (beforeAns) beforeAns.textContent = sim.before.answer;
    if (afterAns) afterAns.textContent = sim.after.answer;

    renderSourceList("before-sources", sim.before.sources);
    renderSourceList("after-sources", sim.after.sources);

    var beforeScore = document.getElementById("before-score");
    var afterScore = document.getElementById("after-score");
    if (beforeScore) {
      beforeScore.innerHTML =
        '<div class="score-badge low">' + sim.before.score + '</div><div class="score-badge-label">AI健康度</div>';
    }
    if (afterScore) {
      afterScore.innerHTML =
        '<div class="score-badge high">' + sim.after.score + '</div><div class="score-badge-label">AI健康度</div>';
    }

    renderImproveBars(sim.improvements);
  }

  function renderSourceList(containerId, sources) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = sources.map(function (s) {
      return '<div class="source-item' + (s.isXinhua ? " xinhua" : "") + '">' +
        '<span class="source-name">' + s.name + '</span>' +
        '<span class="source-url">' + s.domain + "</span>" +
        '<span style="margin-left:8px;font-size:12px;color:#94a3b8">权威性：' + s.authority + "</span></div>";
    }).join("");
  }

  function renderImproveBars(improvements) {
    var container = document.getElementById("improve-bars");
    if (!container) return;
    container.innerHTML = improvements.map(function (item) {
      return '<div class="improve-row">' +
        '<div class="improve-label">' + item.label + '</div>' +
        '<div class="improve-bar">' +
        '<div class="improve-fill-before" style="width:0%" data-w="' + item.before + '%"></div>' +
        '<div class="improve-fill-after" style="width:0%" data-w="' + item.after + '%"></div>' +
        '</div>' +
        '<div class="improve-values">' +
        '<span class="val-before">' + item.before + item.unit + '</span> → ' +
        '<span class="val-after">' + item.after + item.unit + '</span>' +
        '</div></div>';
    }).join("");

    requestAnimationFrame(function () {
      setTimeout(function () {
        container.querySelectorAll(".improve-fill-before").forEach(function (el) {
          el.style.width = el.dataset.w;
        });
        container.querySelectorAll(".improve-fill-after").forEach(function (el) {
          el.style.width = el.dataset.w;
        });
      }, 100);
    });
  }

  // ========== Live Q&A ==========
  function handleQuestion() {
    var question = questionInput.value.trim();
    if (!question) return;

    questionAskBtn.disabled = true;
    document.getElementById("live-result").classList.add("hidden");
    document.getElementById("preset-result").classList.add("hidden");
    document.getElementById("live-loading").classList.remove("hidden");

    apiPost("/api/ask", { question: question })
      .then(function (data) {
        document.getElementById("live-loading").classList.add("hidden");
        questionAskBtn.disabled = false;

        if (data.mode === "live") {
          renderLiveResult(data);
        } else if (data.mode === "demo" || data.mode === "error") {
          renderPresetResult(data, question);
        }
      })
      .catch(function () {
        document.getElementById("live-loading").classList.add("hidden");
        questionAskBtn.disabled = false;
        renderPresetFallback(question);
      });
  }

  function renderLiveResult(data) {
    var el = document.getElementById("live-result");
    el.classList.remove("hidden");

    document.getElementById("live-answer").textContent = data.answer;

    var summaryEl = document.getElementById("live-source-summary");
    summaryEl.innerHTML = "";
    if (data.sources.mentions_xinhua) {
      summaryEl.innerHTML += '<div class="source-pill yes"><span class="dot"></span>引用了新华网</div>';
    } else {
      summaryEl.innerHTML += '<div class="source-pill no"><span class="dot"></span>未引用新华网</div>';
    }
    if (data.sources.mentions_wedoctor) {
      summaryEl.innerHTML += '<div class="source-pill yes"><span class="dot"></span>提及微医</div>';
    }
    summaryEl.innerHTML += '<div class="source-pill ' + (data.sources.urls.length > 0 ? "yes" : "no") + '"><span class="dot"></span>' +
      data.sources.urls.length + '个引用链接</div>';

    var sourcesEl = document.getElementById("live-sources");
    if (data.sources.urls.length > 0) {
      sourcesEl.innerHTML = data.sources.urls.map(function (s) {
        var isXH = s.domain.indexOf("news.cn") !== -1 || s.domain.indexOf("xinhua") !== -1;
        return '<div class="source-item' + (isXH ? " xinhua" : "") + '">' +
          '<span class="source-name">' + s.domain + '</span>' +
          '<span class="source-url">' + s.url + '</span></div>';
      }).join("");
    } else if (data.sources.named_sources.length > 0) {
      sourcesEl.innerHTML = data.sources.named_sources.map(function (s) {
        return '<div class="source-item"><span class="source-name">' + s + '</span></div>';
      }).join("");
    } else {
      sourcesEl.innerHTML = '<div class="source-item"><span class="source-name" style="color:#94a3b8">AI未提供明确来源链接</span></div>';
    }

    var analysisEl = document.getElementById("live-analysis");
    var analysis = data.analysis;
    var tags = [];
    (analysis.positive || []).forEach(function (t) { tags.push('<div class="tag tag-positive">' + t + '</div>'); });
    (analysis.warning || []).forEach(function (t) { tags.push('<div class="tag tag-warning">' + t + '</div>'); });
    (analysis.negative || []).forEach(function (t) { tags.push('<div class="tag tag-negative">' + t + '</div>'); });
    analysisEl.innerHTML = '<div class="analysis-tags">' + tags.join("") + '</div>';

    var scoreRow = document.getElementById("live-score-row");
    var sc = data.score;
    var cls = sc >= 70 ? "high" : sc >= 45 ? "mid" : "low";
    scoreRow.innerHTML = '<div class="live-score-circle ' + cls + '">' + sc + '</div>' +
      '<div style="font-size:14px;color:#64748b">权威性评分</div>';

    scrollTo("live-result");
  }

  function renderPresetResult(data, question) {
    var el = document.getElementById("preset-result");
    el.classList.remove("hidden");

    var banner = document.getElementById("demo-banner");
    if (data.mode === "error") {
      banner.textContent = "API 调用异常：" + (data.error || "未知错误") + "，使用预置数据展示";
    } else {
      banner.textContent = "演示模式：展示预置数据（如需实时AI回答，请配置 API Key）";
    }

    renderPresetQuestions(question);
  }

  function renderPresetFallback(question) {
    var el = document.getElementById("preset-result");
    el.classList.remove("hidden");
    document.getElementById("demo-banner").textContent = "当前为纯前端模式，展示预置数据";
    renderPresetQuestions(question);
  }

  function renderPresetQuestions(question) {
    var container = document.getElementById("preset-questions-container");
    if (!container) return;

    var brand = DEMO_DATA.brands[currentBrandId || "lianhua"];
    if (!brand || !brand.questions) return;

    var matched = null;
    if (question) {
      brand.questions.forEach(function (item) {
        var overlap = 0;
        for (var i = 0; i < question.length; i++) {
          if (item.q.indexOf(question[i]) !== -1) overlap++;
        }
        if (overlap >= question.length * 0.3) matched = item;
      });
    }

    var items = matched ? [matched] : brand.questions;

    container.innerHTML = items.map(function (item, idx) {
      var sourcesHtml = item.sources.map(function (s) {
        return '<div class="source-item' + (s.isXinhua ? " xinhua" : "") + '">' +
          '<span class="source-name">' + s.name + "</span>" +
          '<span class="source-url">' + s.url + "</span></div>";
      }).join("");

      var tagsHtml = []
        .concat((item.analysis.positive || []).map(function (t) { return '<div class="tag tag-positive">' + t + "</div>"; }))
        .concat((item.analysis.warning || []).map(function (t) { return '<div class="tag tag-warning">' + t + "</div>"; }))
        .concat((item.analysis.negative || []).map(function (t) { return '<div class="tag tag-negative">' + t + "</div>"; }))
        .join("");

      return '<div class="question-card">' +
        '<div class="question-label">' + item.q + "</div>" +
        '<div class="question-engine">AI引擎：' + item.engine + "</div>" +
        '<div class="answer-box">' + item.answer + "</div>" +
        '<div class="card-title" style="margin:14px 0 8px">引用信源</div>' +
        '<div class="source-list">' + sourcesHtml + "</div>" +
        '<div class="card-title" style="margin:14px 0 8px">智能分析</div>' +
        '<div class="analysis-tags">' + tagsHtml + "</div>" +
        "</div>";
    }).join("");
  }

  // ========== Event Bindings ==========
  brandSearchBtn.addEventListener("click", handleBrandSearch);
  brandInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") handleBrandSearch();
  });

  questionAskBtn.addEventListener("click", handleQuestion);
  questionInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") handleQuestion();
  });

  document.querySelectorAll(".hint-tag[data-q]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      brandInput.value = this.dataset.q;
      handleBrandSearch();
    });
  });

  document.querySelectorAll(".hint-tag[data-live]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      questionInput.value = this.dataset.live;
      handleQuestion();
    });
  });

  window.addEventListener("resize", resizeCharts);

  // ========== Init ==========
  checkApiStatus();
})();
