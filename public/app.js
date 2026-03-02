// 「新华智鉴」Demo v3 — 全实时交互版
(function () {
  "use strict";

  var PRIMARY = "#1a3c6d", GREEN = "#10b981", DANGER = "#ef4444";
  var charts = {}, currentBrandId = null, apiConfigured = false;

  var $ = function (sel) { return document.querySelector(sel); };
  var heroSection = $("#hero-section");
  var brandInput = $("#brand-input");
  var brandSearchBtn = $("#brand-search-btn");
  var loadingOverlay = $("#loading-overlay");
  var loadingText = $(".loading-text");
  var questionInput = $("#question-input");
  var questionAskBtn = $("#question-ask-btn");

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
        var s = $("#api-status");
        if (apiConfigured) {
          s.textContent = "AI API \u5df2\u8fde\u63a5 (" + data.api_provider + ")";
          s.className = "header-status live";
          $("#live-mode-badge").textContent = "\u5b9e\u65f6\u6a21\u5f0f";
          $("#live-mode-badge").className = "section-badge live";
        } else {
          s.textContent = "\u6f14\u793a\u6a21\u5f0f";
          s.className = "header-status demo";
          $("#live-mode-badge").textContent = "\u6f14\u793a\u6a21\u5f0f";
          $("#live-mode-badge").className = "section-badge demo-mode";
        }
      })
      .catch(function () {
        $("#api-status").textContent = "\u7eaf\u524d\u7aef\u6a21\u5f0f";
        $("#api-status").className = "header-status demo";
      });
  }

  function showSection(id, delay) {
    var el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () {
      el.classList.remove("hidden");
      el.classList.add("visible");
      if (id === "section-diagnosis") setTimeout(resizeCharts, 150);
      if (id === "section-sources") setTimeout(resizeCharts, 150);
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

  function scrollTo(id) {
    var el = document.getElementById(id);
    if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 200);
  }

  // ==================== Brand Search ====================
  function handleBrandSearch() {
    var query = brandInput.value.trim();
    if (!query) return;

    hideAllSections();
    loadingOverlay.classList.add("show");
    loadingText.textContent = "AI \u6b63\u5728\u5206\u6790\u300c" + query + "\u300d\u7684 AI \u53ef\u89c1\u5ea6\u2026";
    heroSection.classList.add("compact");
    brandSearchBtn.disabled = true;

    var dots = 0;
    var loadTimer = setInterval(function () {
      dots = (dots + 1) % 4;
      var d = [".", "..", "...", ""][dots];
      loadingText.textContent = "AI \u6b63\u5728\u6df1\u5ea6\u5206\u6790\u300c" + query + "\u300d\u7684 AI \u53ef\u89c1\u5ea6" + d + "\uff08\u7ea610-20\u79d2\uff09";
    }, 600);

    apiPost("/api/analyze", { query: query })
      .then(function (data) {
        clearInterval(loadTimer);
        loadingOverlay.classList.remove("show");
        brandSearchBtn.disabled = false;

        if (data.mode === "live" && data.brand) {
          renderAllFromAI(data, query);
        } else if (data.mode === "error") {
          alert("AI\u5206\u6790\u5931\u8d25\uff1a" + (data.error || "\u672a\u77e5\u9519\u8bef") + "\n\u5c06\u5c55\u793a\u9884\u7f6e\u793a\u4f8b\u6570\u636e");
          renderFromPreset(query, data.error);
        } else if (data.mode === "demo") {
          renderFromPreset(query, data.message);
        } else {
          renderFromPreset(query, null);
        }
      })
      .catch(function (err) {
        clearInterval(loadTimer);
        loadingOverlay.classList.remove("show");
        brandSearchBtn.disabled = false;
        alert("\u7f51\u7edc\u8bf7\u6c42\u5931\u8d25\uff0c\u5c06\u5c55\u793a\u9884\u7f6e\u6570\u636e");
        renderFromPreset(query, null);
      });
  }

  // ==================== Render All from AI ====================
  function renderAllFromAI(data, query) {
    var brand = data.brand;
    $("#diagnosis-brand-name").textContent = brand.name + " / " + brand.company;
    renderGauge(brand.overallScore, brand.level);
    renderRadar(brand.dimensions);
    renderEngineChart(brand.engines || []);
    renderDimensionCards(brand);

    if (data.sourceAnalysis) {
      renderSourceChart(data.sourceAnalysis.sources || []);
      renderDetailTable(data.sourceAnalysis.questionDetails || []);
      renderCompetitorChart(data.sourceAnalysis.competitorMatrix || []);
    }

    if (data.questions && data.questions.length > 0) {
      renderQuestionsFromAI(data.questions);
    }

    if (data.geoSimulation) {
      renderGEOFromAI(data.geoSimulation);
    }

    showSection("section-diagnosis", 0);
    showSection("section-sources", 300);
    showSection("section-live", 600);
    showSection("section-geo", 900);
    scrollTo("section-diagnosis");
  }

  function renderFromPreset(query, msg) {
    var brandId = matchBrandLocal(query) || "lianhua";
    currentBrandId = brandId;
    var brand = DEMO_DATA.brands[brandId];
    if (!brand) return;

    var label = brand.name + " / " + brand.company;
    if (msg) label += " (" + msg + ")";
    $("#diagnosis-brand-name").textContent = label;

    renderGauge(brand.overallScore, brand.level);
    renderRadar(brand.dimensions);
    renderEngineChart(brand.engines);
    renderDimensionCards(brand);
    renderSourceChart(DEMO_DATA.sourceAnalysis.sources);
    renderDetailTable(DEMO_DATA.sourceAnalysis.questionDetails);
    renderCompetitorChart(DEMO_DATA.sourceAnalysis.competitorMatrix);
    renderGEOFromAI(DEMO_DATA.geoSimulation);

    showSection("section-diagnosis", 0);
    showSection("section-sources", 300);
    showSection("section-live", 600);
    showSection("section-geo", 900);
    scrollTo("section-diagnosis");
  }

  function matchBrandLocal(query) {
    var q = query.toLowerCase();
    var map = {
      "\u8fde\u82b1\u6e05\u761f": "lianhua", "\u4ee5\u5cad\u836f\u4e1a": "lianhua",
      "\u65b0\u534e\u7f51": "xinhua_health", "\u65b0\u534e": "xinhua_health",
    };
    for (var key in map) {
      if (q.indexOf(key.toLowerCase()) !== -1 || key.toLowerCase().indexOf(q) !== -1) return map[key];
    }
    return null;
  }

  // ==================== Chart Renderers ====================
  function renderGauge(score, level) {
    var c = document.getElementById("gauge-chart"); if (!c) return;
    if (!charts.gauge) charts.gauge = echarts.init(c);
    var color = score >= 70 ? GREEN : score >= 50 ? "#f59e0b" : DANGER;
    charts.gauge.setOption({
      series: [{
        type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100, splitNumber: 10,
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
    var c = document.getElementById("radar-chart"); if (!c) return;
    if (!charts.radar) charts.radar = echarts.init(c);
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
        data: [{ value: keys.map(function (k) { return dims[k].score; }),
          areaStyle: { color: "rgba(26,60,109,.12)" },
          lineStyle: { color: PRIMARY, width: 2 }, itemStyle: { color: PRIMARY },
        }],
        symbol: "circle", symbolSize: 6,
      }],
    });
  }

  function renderEngineChart(engines) {
    var c = document.getElementById("engine-chart"); if (!c) return;
    if (!charts.engine) charts.engine = echarts.init(c);
    var defaultColors = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
    charts.engine.setOption({
      grid: { left: 100, right: 40, top: 10, bottom: 30 },
      xAxis: { type: "value", max: 100, splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { color: "#94a3b8" } },
      yAxis: {
        type: "category",
        data: engines.map(function (e) { return e.name; }).reverse(),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 13 },
      },
      series: [{
        type: "bar",
        data: engines.map(function (e, i) {
          var cl = e.color || defaultColors[i % defaultColors.length];
          return {
            value: e.score,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: cl + "88" }, { offset: 1, color: cl },
              ]),
              borderRadius: [0, 6, 6, 0],
            },
          };
        }).reverse(),
        barWidth: 28,
        label: { show: true, position: "right", fontSize: 14, fontWeight: 700, color: "#475569", formatter: "{c}\u5206" },
      }],
      animationDuration: 800,
    });
  }

  function renderDimensionCards(brand) {
    var c = document.getElementById("dimension-cards"); if (!c) return;
    var dims = brand.dimensions;
    c.innerHTML = Object.keys(dims).map(function (k) {
      var d = dims[k];
      var cl = d.score >= 60 ? GREEN : d.score >= 40 ? "#f59e0b" : DANGER;
      return '<div class="dim-card"><div class="dim-score" style="color:' + cl + '">' +
        d.score + '</div><div class="dim-label">' + d.label + "</div></div>";
    }).join("");
  }

  function renderSourceChart(sources) {
    var c = document.getElementById("source-chart"); if (!c) return;
    if (!charts.source) charts.source = echarts.init(c);
    charts.source.setOption({
      grid: { left: 120, right: 40, top: 10, bottom: 30 },
      xAxis: { type: "value", axisLabel: { color: "#94a3b8", formatter: "{value}\u6b21" }, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      yAxis: {
        type: "category",
        data: sources.map(function (d) { return d.name; }).reverse(),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: {
          fontSize: 13,
          rich: { xinhua: { color: DANGER, fontWeight: 700, fontSize: 14 }, normal: { color: "#475569", fontSize: 13 } },
          formatter: function (v) { return v === "\u65b0\u534e\u7f51" ? "{xinhua|" + v + "}" : "{normal|" + v + "}"; },
        },
      },
      series: [{
        type: "bar",
        data: sources.map(function (d) {
          return {
            value: d.count,
            itemStyle: { color: d.isXinhua ? DANGER : PRIMARY, borderRadius: [0, 4, 4, 0], opacity: d.isXinhua ? 1 : 0.7 },
            label: { show: true, position: "right", formatter: d.isXinhua ? "{c}\u6b21 \u2190 \u65b0\u534e\u7f51" : "{c}\u6b21", color: d.isXinhua ? DANGER : "#94a3b8", fontWeight: d.isXinhua ? 700 : 400 },
          };
        }).reverse(),
        barWidth: 22,
      }],
      animationDuration: 1200,
    });
  }

  function renderDetailTable(details) {
    var tbody = document.getElementById("detail-tbody"); if (!tbody) return;
    tbody.innerHTML = details.map(function (item) {
      return "<tr><td>" + item.q + "</td><td>" +
        (item.hasCoverage ? '<span class="badge-yes">\u6709 (' + item.articles + "\u7bc7)</span>" : '<span class="badge-no">\u65e0</span>') +
        "</td><td>" + item.articles + '</td><td><span class="badge-no">\u672a\u8fdb\u5165</span></td><td><strong>' + item.topSource + "</strong></td></tr>";
    }).join("");
  }

  function renderCompetitorChart(matrix) {
    var c = document.getElementById("competitor-chart"); if (!c) return;
    if (!charts.competitor) charts.competitor = echarts.init(c);
    charts.competitor.setOption({
      grid: { left: 60, right: 30, top: 40, bottom: 50 },
      xAxis: { name: "\u5185\u5bb9\u8d28\u91cf", nameLocation: "center", nameGap: 30, nameTextStyle: { color: "#64748b", fontSize: 13 }, min: 0, max: 100, axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      yAxis: { name: "AI\u53ef\u89c1\u5ea6", nameLocation: "center", nameGap: 35, nameTextStyle: { color: "#64748b", fontSize: 13 }, min: 0, max: 100, axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      series: [{
        type: "scatter", symbolSize: 20,
        data: matrix.map(function (d) {
          return { value: [d.quality, d.visibility], name: d.name,
            itemStyle: { color: d.name === "\u65b0\u534e\u7f51" ? DANGER : d.name.indexOf("\u592e\u5e7f") !== -1 ? "#f59e0b" : PRIMARY } };
        }),
        label: { show: true, formatter: function (p) { return p.data.name; }, position: "top", fontSize: 13, color: "#475569" },
      }],
      graphic: [
        { type: "text", left: "72%", top: "8%", style: { text: "\u7406\u60f3\u533a\u57df \u2192", fill: GREEN, fontSize: 13, fontWeight: 600 } },
        { type: "text", left: "8%", bottom: "16%", style: { text: "\u2190 \u65b0\u534e\u7f51\u5f53\u524d\u4f4d\u7f6e\n\uff08\u9ad8\u8d28\u91cf \u4f4e\u53ef\u89c1\u5ea6\uff09", fill: DANGER, fontSize: 12 } },
      ],
      animationDuration: 1000,
    });
  }

  // ==================== AI Q&A Render ====================
  function renderQuestionsFromAI(questions) {
    var container = document.getElementById("preset-questions-container"); if (!container) return;
    document.getElementById("preset-result").classList.remove("hidden");
    document.getElementById("demo-banner").style.display = "none";

    container.innerHTML = questions.map(function (item) {
      var srcHtml = (item.sources || []).map(function (s) {
        return '<div class="source-item' + (s.isXinhua ? " xinhua" : "") + '"><span class="source-name">' + s.name + '</span><span class="source-url">' + s.url + '</span></div>';
      }).join("");
      var tagHtml = []
        .concat((item.analysis.positive || []).map(function (t) { return '<div class="tag tag-positive">' + t + "</div>"; }))
        .concat((item.analysis.warning || []).map(function (t) { return '<div class="tag tag-warning">' + t + "</div>"; }))
        .concat((item.analysis.negative || []).map(function (t) { return '<div class="tag tag-negative">' + t + "</div>"; }))
        .join("");
      return '<div class="question-card"><div class="question-label">' + item.q +
        '</div><div class="question-engine">AI\u5f15\u64ce\uff1a' + item.engine +
        '</div><div class="answer-box">' + item.answer +
        '</div><div class="card-title" style="margin:14px 0 8px">\u5f15\u7528\u4fe1\u6e90</div><div class="source-list">' + srcHtml +
        '</div><div class="card-title" style="margin:14px 0 8px">\u667a\u80fd\u5206\u6790</div><div class="analysis-tags">' + tagHtml + '</div></div>';
    }).join("");
  }

  // ==================== GEO Render ====================
  function renderGEOFromAI(sim) {
    var geoQ = document.getElementById("geo-question");
    if (geoQ) geoQ.textContent = "\u7528\u6237\u63d0\u95ee\uff1a\u300c" + sim.question + "\u300d";

    var ba = document.getElementById("before-answer"), aa = document.getElementById("after-answer");
    if (ba) ba.textContent = sim.before.answer;
    if (aa) aa.textContent = sim.after.answer;

    renderGeoSources("before-sources", sim.before.sources || []);
    renderGeoSources("after-sources", sim.after.sources || []);

    var bs = document.getElementById("before-score"), as2 = document.getElementById("after-score");
    if (bs) bs.innerHTML = '<div class="score-badge low">' + sim.before.score + '</div><div class="score-badge-label">AI\u5065\u5eb7\u5ea6</div>';
    if (as2) as2.innerHTML = '<div class="score-badge high">' + sim.after.score + '</div><div class="score-badge-label">AI\u5065\u5eb7\u5ea6</div>';

    renderImproveBars(sim.improvements || []);
  }

  function renderGeoSources(id, sources) {
    var el = document.getElementById(id); if (!el) return;
    el.innerHTML = sources.map(function (s) {
      return '<div class="source-item' + (s.isXinhua ? " xinhua" : "") + '"><span class="source-name">' + s.name +
        '</span><span class="source-url">' + s.domain + '</span><span style="margin-left:8px;font-size:12px;color:#94a3b8">\u6743\u5a01\u6027\uff1a' + s.authority + '</span></div>';
    }).join("");
  }

  function renderImproveBars(imps) {
    var c = document.getElementById("improve-bars"); if (!c) return;
    c.innerHTML = imps.map(function (i) {
      return '<div class="improve-row"><div class="improve-label">' + i.label +
        '</div><div class="improve-bar"><div class="improve-fill-before" style="width:0%" data-w="' + i.before +
        '%"></div><div class="improve-fill-after" style="width:0%" data-w="' + i.after +
        '%"></div></div><div class="improve-values"><span class="val-before">' + i.before + i.unit +
        '</span> \u2192 <span class="val-after">' + i.after + i.unit + '</span></div></div>';
    }).join("");
    requestAnimationFrame(function () {
      setTimeout(function () {
        c.querySelectorAll(".improve-fill-before").forEach(function (el) { el.style.width = el.dataset.w; });
        c.querySelectorAll(".improve-fill-after").forEach(function (el) { el.style.width = el.dataset.w; });
      }, 100);
    });
  }

  // ==================== Live Q&A ====================
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
        if (data.mode === "live") renderLiveResult(data);
        else renderPresetFallback(question);
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

    var sum = document.getElementById("live-source-summary");
    sum.innerHTML = "";
    sum.innerHTML += '<div class="source-pill ' + (data.sources.mentions_xinhua ? "yes" : "no") + '"><span class="dot"></span>' + (data.sources.mentions_xinhua ? "\u5f15\u7528\u4e86\u65b0\u534e\u7f51" : "\u672a\u5f15\u7528\u65b0\u534e\u7f51") + '</div>';
    if (data.sources.mentions_wedoctor) sum.innerHTML += '<div class="source-pill yes"><span class="dot"></span>\u63d0\u53ca\u5fae\u533b</div>';
    sum.innerHTML += '<div class="source-pill ' + (data.sources.urls.length > 0 ? "yes" : "no") + '"><span class="dot"></span>' + data.sources.urls.length + '\u4e2a\u5f15\u7528\u94fe\u63a5</div>';

    var srcEl = document.getElementById("live-sources");
    if (data.sources.urls.length > 0) {
      srcEl.innerHTML = data.sources.urls.map(function (s) {
        var isXH = s.domain.indexOf("news.cn") !== -1 || s.domain.indexOf("xinhua") !== -1;
        return '<div class="source-item' + (isXH ? " xinhua" : "") + '"><span class="source-name">' + s.domain + '</span><span class="source-url">' + s.url + '</span></div>';
      }).join("");
    } else if (data.sources.named_sources.length > 0) {
      srcEl.innerHTML = data.sources.named_sources.map(function (s) { return '<div class="source-item"><span class="source-name">' + s + '</span></div>'; }).join("");
    } else {
      srcEl.innerHTML = '<div class="source-item"><span class="source-name" style="color:#94a3b8">AI\u672a\u63d0\u4f9b\u660e\u786e\u6765\u6e90\u94fe\u63a5</span></div>';
    }

    var aEl = document.getElementById("live-analysis");
    var tags = [];
    (data.analysis.positive || []).forEach(function (t) { tags.push('<div class="tag tag-positive">' + t + '</div>'); });
    (data.analysis.warning || []).forEach(function (t) { tags.push('<div class="tag tag-warning">' + t + '</div>'); });
    (data.analysis.negative || []).forEach(function (t) { tags.push('<div class="tag tag-negative">' + t + '</div>'); });
    aEl.innerHTML = '<div class="analysis-tags">' + tags.join("") + '</div>';

    var sr = document.getElementById("live-score-row");
    var cls = data.score >= 70 ? "high" : data.score >= 45 ? "mid" : "low";
    sr.innerHTML = '<div class="live-score-circle ' + cls + '">' + data.score + '</div><div style="font-size:14px;color:#64748b">\u6743\u5a01\u6027\u8bc4\u5206</div>';
    scrollTo("live-result");
  }

  function renderPresetFallback(question) {
    var el = document.getElementById("preset-result");
    el.classList.remove("hidden");
    document.getElementById("demo-banner").style.display = "";
    document.getElementById("demo-banner").textContent = "\u6f14\u793a\u6a21\u5f0f\uff1a\u5c55\u793a\u9884\u7f6e\u6570\u636e";
    var brand = DEMO_DATA.brands[currentBrandId || "lianhua"];
    if (!brand || !brand.questions) return;
    var container = document.getElementById("preset-questions-container");
    container.innerHTML = brand.questions.map(function (item) {
      var srcHtml = item.sources.map(function (s) { return '<div class="source-item' + (s.isXinhua ? " xinhua" : "") + '"><span class="source-name">' + s.name + '</span><span class="source-url">' + s.url + '</span></div>'; }).join("");
      var tagHtml = [].concat((item.analysis.positive || []).map(function (t) { return '<div class="tag tag-positive">' + t + "</div>"; })).concat((item.analysis.warning || []).map(function (t) { return '<div class="tag tag-warning">' + t + "</div>"; })).concat((item.analysis.negative || []).map(function (t) { return '<div class="tag tag-negative">' + t + "</div>"; })).join("");
      return '<div class="question-card"><div class="question-label">' + item.q + '</div><div class="question-engine">AI\u5f15\u64ce\uff1a' + item.engine + '</div><div class="answer-box">' + item.answer + '</div><div class="card-title" style="margin:14px 0 8px">\u5f15\u7528\u4fe1\u6e90</div><div class="source-list">' + srcHtml + '</div><div class="card-title" style="margin:14px 0 8px">\u667a\u80fd\u5206\u6790</div><div class="analysis-tags">' + tagHtml + '</div></div>';
    }).join("");
  }

  // ==================== Events ====================
  brandSearchBtn.addEventListener("click", handleBrandSearch);
  brandInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleBrandSearch(); });
  questionAskBtn.addEventListener("click", handleQuestion);
  questionInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleQuestion(); });
  document.querySelectorAll(".hint-tag[data-q]").forEach(function (b) { b.addEventListener("click", function () { brandInput.value = this.dataset.q; handleBrandSearch(); }); });
  document.querySelectorAll(".hint-tag[data-live]").forEach(function (b) { b.addEventListener("click", function () { questionInput.value = this.dataset.live; handleQuestion(); }); });
  window.addEventListener("resize", resizeCharts);

  checkApiStatus();
})();
