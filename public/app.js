// 「新华智鉴」Demo v3 — 全实时 · 分步渲染
(function () {
  "use strict";

  var PRIMARY = "#1a3c6d", GREEN = "#10b981", DANGER = "#ef4444";
  var charts = {}, currentBrandId = null, apiConfigured = false;

  var $ = function (s) { return document.querySelector(s); };
  var heroSection = $("#hero-section");
  var brandInput = $("#brand-input");
  var brandSearchBtn = $("#brand-search-btn");
  var loadingOverlay = $("#loading-overlay");
  var loadingText = $(".loading-text");
  var questionInput = $("#question-input");
  var questionAskBtn = $("#question-ask-btn");

  function apiPost(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function checkApiStatus() {
    fetch("/api/status").then(function (r) { return r.json(); }).then(function (d) {
      apiConfigured = d.api_configured;
      var s = $("#api-status");
      s.textContent = apiConfigured ? "AI API \u5df2\u8fde\u63a5 (" + d.api_provider + ")" : "\u6f14\u793a\u6a21\u5f0f";
      s.className = "header-status " + (apiConfigured ? "live" : "demo");
      var b = $("#live-mode-badge");
      b.textContent = apiConfigured ? "\u5b9e\u65f6\u6a21\u5f0f" : "\u6f14\u793a\u6a21\u5f0f";
      b.className = "section-badge " + (apiConfigured ? "live" : "demo-mode");
    }).catch(function () {});
  }

  function showSection(id, delay) {
    var el = document.getElementById(id); if (!el) return;
    setTimeout(function () {
      el.classList.remove("hidden"); el.classList.add("visible");
      setTimeout(resizeCharts, 150);
    }, delay || 0);
  }

  function hideAllSections() {
    document.querySelectorAll(".result-section").forEach(function (s) { s.classList.add("hidden"); s.classList.remove("visible"); });
  }

  function resizeCharts() { Object.values(charts).forEach(function (c) { if (c && c.resize) c.resize(); }); }

  function scrollTo(id) {
    var el = document.getElementById(id);
    if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 200);
  }

  // ===================== Brand Search =====================
  function handleBrandSearch() {
    var query = brandInput.value.trim();
    if (!query) return;

    hideAllSections();
    loadingOverlay.classList.add("show");
    heroSection.classList.add("compact");
    brandSearchBtn.disabled = true;

    var dots = 0;
    var loadTimer = setInterval(function () {
      dots = (dots + 1) % 4;
      loadingText.textContent = "AI \u6b63\u5728\u6df1\u5ea6\u5206\u6790\u300c" + query + "\u300d" + [".", "..", "...", ""][dots] + "\uff08\u7ea610-20\u79d2\uff09";
    }, 500);

    var brandDone = false, geoDone = false;

    function checkAllDone() {
      if (brandDone && geoDone) {
        clearInterval(loadTimer);
        loadingOverlay.classList.remove("show");
        brandSearchBtn.disabled = false;
      }
    }

    // Call 1: Brand diagnosis + source analysis
    apiPost("/api/analyze-brand", { query: query })
      .then(function (data) {
        brandDone = true;
        if (data.mode === "live" && data.brand) {
          renderBrandFromAI(data);
          showSection("section-diagnosis", 0);
          showSection("section-sources", 200);
          scrollTo("section-diagnosis");
        } else {
          renderBrandFromPreset(query);
          showSection("section-diagnosis", 0);
          showSection("section-sources", 200);
          scrollTo("section-diagnosis");
        }
        showSection("section-live", 400);
        checkAllDone();
      })
      .catch(function () {
        brandDone = true;
        renderBrandFromPreset(query);
        showSection("section-diagnosis", 0);
        showSection("section-sources", 200);
        showSection("section-live", 400);
        scrollTo("section-diagnosis");
        checkAllDone();
      });

    // Call 2: GEO simulation + questions
    apiPost("/api/analyze-geo", { query: query })
      .then(function (data) {
        geoDone = true;
        if (data.mode === "live") {
          if (data.questions && data.questions.length > 0) renderQuestionsFromAI(data.questions);
          if (data.geoSimulation) renderGEOFromAI(data.geoSimulation);
        } else {
          renderGEOFromPreset();
        }
        showSection("section-geo", 100);
        checkAllDone();
      })
      .catch(function () {
        geoDone = true;
        renderGEOFromPreset();
        showSection("section-geo", 100);
        checkAllDone();
      });
  }

  // ===================== Brand Render =====================
  function renderBrandFromAI(data) {
    var b = data.brand;
    $("#diagnosis-brand-name").textContent = b.name + " / " + b.company;
    renderGauge(b.overallScore, b.level);
    renderRadar(b.dimensions);
    renderEngineChart(b.engines || []);
    renderDimensionCards(b);
    if (data.sourceAnalysis) {
      renderSourceChart(data.sourceAnalysis.sources || []);
      renderDetailTable(data.sourceAnalysis.questionDetails || []);
      renderCompetitorChart(data.sourceAnalysis.competitorMatrix || []);
    }
  }

  function renderBrandFromPreset(query) {
    var id = matchLocal(query) || "lianhua";
    currentBrandId = id;
    var b = DEMO_DATA.brands[id]; if (!b) return;
    $("#diagnosis-brand-name").textContent = b.name + " / " + b.company + " (\u9884\u7f6e\u793a\u4f8b)";
    renderGauge(b.overallScore, b.level);
    renderRadar(b.dimensions);
    renderEngineChart(b.engines);
    renderDimensionCards(b);
    renderSourceChart(DEMO_DATA.sourceAnalysis.sources);
    renderDetailTable(DEMO_DATA.sourceAnalysis.questionDetails);
    renderCompetitorChart(DEMO_DATA.sourceAnalysis.competitorMatrix);
  }

  function renderGEOFromPreset() {
    var sim = DEMO_DATA.geoSimulation;
    renderGEOFromAI(sim);
  }

  function matchLocal(q) {
    q = q.toLowerCase();
    var m = { "\u8fde\u82b1\u6e05\u761f": "lianhua", "\u4ee5\u5cad": "lianhua", "\u65b0\u534e\u7f51": "xinhua_health", "\u65b0\u534e": "xinhua_health" };
    for (var k in m) { if (q.indexOf(k) !== -1 || k.indexOf(q) !== -1) return m[k]; }
    return null;
  }

  // ===================== Charts =====================
  function renderGauge(score, level) {
    var c = document.getElementById("gauge-chart"); if (!c) return;
    if (!charts.gauge) charts.gauge = echarts.init(c);
    var cl = score >= 70 ? GREEN : score >= 50 ? "#f59e0b" : DANGER;
    charts.gauge.setOption({
      series: [{ type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100, splitNumber: 10,
        itemStyle: { color: cl }, progress: { show: true, width: 22, roundCap: true }, pointer: { show: false },
        axisLine: { lineStyle: { width: 22, color: [[1, "#e2e8f0"]] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, title: { show: false },
        detail: { valueAnimation: true, fontSize: 42, fontWeight: 800, color: cl, offsetCenter: [0, "0%"],
          formatter: function (v) { return v + "\n" + level; } },
        data: [{ value: score }] }] });
  }

  function renderRadar(dims) {
    var c = document.getElementById("radar-chart"); if (!c) return;
    if (!charts.radar) charts.radar = echarts.init(c);
    var ks = Object.keys(dims);
    charts.radar.setOption({
      radar: { indicator: ks.map(function (k) { return { name: dims[k].label, max: 100 }; }), shape: "circle",
        splitArea: { areaStyle: { color: ["#f8fafc", "#fff"] } }, axisLine: { lineStyle: { color: "#e2e8f0" } },
        splitLine: { lineStyle: { color: "#e2e8f0" } }, axisName: { color: "#475569", fontSize: 12 } },
      series: [{ type: "radar", data: [{ value: ks.map(function (k) { return dims[k].score; }),
        areaStyle: { color: "rgba(26,60,109,.12)" }, lineStyle: { color: PRIMARY, width: 2 }, itemStyle: { color: PRIMARY } }],
        symbol: "circle", symbolSize: 6 }] });
  }

  function renderEngineChart(engines) {
    var c = document.getElementById("engine-chart"); if (!c) return;
    if (!charts.engine) charts.engine = echarts.init(c);
    var cols = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
    charts.engine.setOption({
      grid: { left: 100, right: 40, top: 10, bottom: 30 },
      xAxis: { type: "value", max: 100, splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { color: "#94a3b8" } },
      yAxis: { type: "category", data: engines.map(function (e) { return e.name; }).reverse(),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 13 } },
      series: [{ type: "bar", data: engines.map(function (e, i) {
        var cl = e.color || cols[i % 5];
        return { value: e.score, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0,
          [{ offset: 0, color: cl + "88" }, { offset: 1, color: cl }]), borderRadius: [0, 6, 6, 0] } };
      }).reverse(), barWidth: 28,
        label: { show: true, position: "right", fontSize: 14, fontWeight: 700, color: "#475569", formatter: "{c}\u5206" } }],
      animationDuration: 800 });
  }

  function renderDimensionCards(brand) {
    var c = document.getElementById("dimension-cards"); if (!c) return;
    var d = brand.dimensions;
    c.innerHTML = Object.keys(d).map(function (k) {
      var v = d[k], cl = v.score >= 60 ? GREEN : v.score >= 40 ? "#f59e0b" : DANGER;
      return '<div class="dim-card"><div class="dim-score" style="color:' + cl + '">' + v.score + '</div><div class="dim-label">' + v.label + "</div></div>";
    }).join("");
  }

  function renderSourceChart(sources) {
    var c = document.getElementById("source-chart"); if (!c) return;
    if (!charts.source) charts.source = echarts.init(c);
    charts.source.setOption({
      grid: { left: 120, right: 40, top: 10, bottom: 30 },
      xAxis: { type: "value", axisLabel: { color: "#94a3b8", formatter: "{value}\u6b21" }, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      yAxis: { type: "category", data: sources.map(function (d) { return d.name; }).reverse(),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontSize: 13, rich: { xinhua: { color: DANGER, fontWeight: 700, fontSize: 14 }, normal: { color: "#475569", fontSize: 13 } },
          formatter: function (v) { return v === "\u65b0\u534e\u7f51" ? "{xinhua|" + v + "}" : "{normal|" + v + "}"; } } },
      series: [{ type: "bar", data: sources.map(function (d) { return { value: d.count,
        itemStyle: { color: d.isXinhua ? DANGER : PRIMARY, borderRadius: [0, 4, 4, 0], opacity: d.isXinhua ? 1 : 0.7 },
        label: { show: true, position: "right", formatter: d.isXinhua ? "{c}\u6b21 \u2190 \u65b0\u534e\u7f51" : "{c}\u6b21", color: d.isXinhua ? DANGER : "#94a3b8", fontWeight: d.isXinhua ? 700 : 400 } };
      }).reverse(), barWidth: 22 }], animationDuration: 1200 });
  }

  function renderDetailTable(details) {
    var t = document.getElementById("detail-tbody"); if (!t) return;
    t.innerHTML = details.map(function (i) {
      return "<tr><td>" + i.q + "</td><td>" + (i.hasCoverage ? '<span class="badge-yes">\u6709(' + i.articles + '\u7bc7)</span>' : '<span class="badge-no">\u65e0</span>') +
        "</td><td>" + i.articles + '</td><td><span class="badge-no">\u672a\u8fdb\u5165</span></td><td><strong>' + i.topSource + "</strong></td></tr>";
    }).join("");
  }

  function renderCompetitorChart(matrix) {
    var c = document.getElementById("competitor-chart"); if (!c) return;
    if (!charts.competitor) charts.competitor = echarts.init(c);
    charts.competitor.setOption({
      grid: { left: 60, right: 30, top: 40, bottom: 50 },
      xAxis: { name: "\u5185\u5bb9\u8d28\u91cf", nameLocation: "center", nameGap: 30, nameTextStyle: { color: "#64748b", fontSize: 13 },
        min: 0, max: 100, axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      yAxis: { name: "AI\u53ef\u89c1\u5ea6", nameLocation: "center", nameGap: 35, nameTextStyle: { color: "#64748b", fontSize: 13 },
        min: 0, max: 100, axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      series: [{ type: "scatter", symbolSize: 20,
        data: matrix.map(function (d) { return { value: [d.quality, d.visibility], name: d.name,
          itemStyle: { color: d.name === "\u65b0\u534e\u7f51" ? DANGER : d.name.indexOf("\u592e\u5e7f") !== -1 ? "#f59e0b" : PRIMARY } }; }),
        label: { show: true, formatter: function (p) { return p.data.name; }, position: "top", fontSize: 13, color: "#475569" } }],
      graphic: [
        { type: "text", left: "72%", top: "8%", style: { text: "\u7406\u60f3\u533a\u57df \u2192", fill: GREEN, fontSize: 13, fontWeight: 600 } },
        { type: "text", left: "8%", bottom: "16%", style: { text: "\u2190 \u65b0\u534e\u7f51\u5f53\u524d\u4f4d\u7f6e\n(\u9ad8\u8d28\u91cf \u4f4e\u53ef\u89c1\u5ea6)", fill: DANGER, fontSize: 12 } }],
      animationDuration: 1000 });
  }

  // ===================== AI Q&A =====================
  function renderQuestionsFromAI(questions) {
    var c = document.getElementById("preset-questions-container"); if (!c) return;
    document.getElementById("preset-result").classList.remove("hidden");
    document.getElementById("demo-banner").style.display = "none";
    c.innerHTML = questions.map(function (it) {
      var s = (it.sources || []).map(function (x) { return '<div class="source-item' + (x.isXinhua ? " xinhua" : "") + '"><span class="source-name">' + x.name + '</span><span class="source-url">' + x.url + '</span></div>'; }).join("");
      var t = [].concat((it.analysis.positive || []).map(function (x) { return '<div class="tag tag-positive">' + x + "</div>"; }))
        .concat((it.analysis.warning || []).map(function (x) { return '<div class="tag tag-warning">' + x + "</div>"; }))
        .concat((it.analysis.negative || []).map(function (x) { return '<div class="tag tag-negative">' + x + "</div>"; })).join("");
      return '<div class="question-card"><div class="question-label">' + it.q + '</div><div class="question-engine">AI\u5f15\u64ce\uff1a' + it.engine +
        '</div><div class="answer-box">' + it.answer + '</div><div class="card-title" style="margin:14px 0 8px">\u5f15\u7528\u4fe1\u6e90</div><div class="source-list">' + s +
        '</div><div class="card-title" style="margin:14px 0 8px">\u667a\u80fd\u5206\u6790</div><div class="analysis-tags">' + t + '</div></div>';
    }).join("");
  }

  // ===================== GEO =====================
  function renderGEOFromAI(sim) {
    var q = document.getElementById("geo-question");
    if (q) q.textContent = "\u7528\u6237\u63d0\u95ee\uff1a\u300c" + sim.question + "\u300d";
    var ba = document.getElementById("before-answer"), aa = document.getElementById("after-answer");
    if (ba) ba.textContent = sim.before.answer;
    if (aa) aa.textContent = sim.after.answer;
    renderGeoSrc("before-sources", sim.before.sources || []);
    renderGeoSrc("after-sources", sim.after.sources || []);
    var bs = document.getElementById("before-score"), as2 = document.getElementById("after-score");
    if (bs) bs.innerHTML = '<div class="score-badge low">' + sim.before.score + '</div><div class="score-badge-label">AI\u5065\u5eb7\u5ea6</div>';
    if (as2) as2.innerHTML = '<div class="score-badge high">' + sim.after.score + '</div><div class="score-badge-label">AI\u5065\u5eb7\u5ea6</div>';
    renderImprove(sim.improvements || []);
  }

  function renderGeoSrc(id, src) {
    var e = document.getElementById(id); if (!e) return;
    e.innerHTML = src.map(function (s) {
      return '<div class="source-item' + (s.isXinhua ? " xinhua" : "") + '"><span class="source-name">' + s.name +
        '</span><span class="source-url">' + s.domain + '</span><span style="margin-left:8px;font-size:12px;color:#94a3b8">\u6743\u5a01\u6027\uff1a' + s.authority + '</span></div>';
    }).join("");
  }

  function renderImprove(imps) {
    var c = document.getElementById("improve-bars"); if (!c) return;
    c.innerHTML = imps.map(function (i) {
      return '<div class="improve-row"><div class="improve-label">' + i.label + '</div><div class="improve-bar">' +
        '<div class="improve-fill-before" style="width:0%" data-w="' + i.before + '%"></div>' +
        '<div class="improve-fill-after" style="width:0%" data-w="' + i.after + '%"></div></div>' +
        '<div class="improve-values"><span class="val-before">' + i.before + i.unit + '</span> \u2192 <span class="val-after">' + i.after + i.unit + '</span></div></div>';
    }).join("");
    requestAnimationFrame(function () { setTimeout(function () {
      c.querySelectorAll(".improve-fill-before").forEach(function (e) { e.style.width = e.dataset.w; });
      c.querySelectorAll(".improve-fill-after").forEach(function (e) { e.style.width = e.dataset.w; });
    }, 100); });
  }

  // ===================== Live Q&A =====================
  function handleQuestion() {
    var q = questionInput.value.trim(); if (!q) return;
    questionAskBtn.disabled = true;
    document.getElementById("live-result").classList.add("hidden");
    document.getElementById("preset-result").classList.add("hidden");
    document.getElementById("live-loading").classList.remove("hidden");
    apiPost("/api/ask", { question: q }).then(function (d) {
      document.getElementById("live-loading").classList.add("hidden");
      questionAskBtn.disabled = false;
      if (d.mode === "live") renderLive(d); else renderPresetFall(q);
    }).catch(function () {
      document.getElementById("live-loading").classList.add("hidden");
      questionAskBtn.disabled = false; renderPresetFall(q);
    });
  }

  function renderLive(d) {
    var e = document.getElementById("live-result"); e.classList.remove("hidden");
    document.getElementById("live-answer").textContent = d.answer;
    var sm = document.getElementById("live-source-summary"); sm.innerHTML = "";
    sm.innerHTML += '<div class="source-pill ' + (d.sources.mentions_xinhua ? "yes" : "no") + '"><span class="dot"></span>' + (d.sources.mentions_xinhua ? "\u5f15\u7528\u4e86\u65b0\u534e\u7f51" : "\u672a\u5f15\u7528\u65b0\u534e\u7f51") + '</div>';
    sm.innerHTML += '<div class="source-pill ' + (d.sources.urls.length > 0 ? "yes" : "no") + '"><span class="dot"></span>' + d.sources.urls.length + '\u4e2a\u5f15\u7528\u94fe\u63a5</div>';
    var sl = document.getElementById("live-sources");
    if (d.sources.urls.length > 0) sl.innerHTML = d.sources.urls.map(function (s) {
      var x = s.domain.indexOf("news.cn") !== -1 || s.domain.indexOf("xinhua") !== -1;
      return '<div class="source-item' + (x ? " xinhua" : "") + '"><span class="source-name">' + s.domain + '</span><span class="source-url">' + s.url + '</span></div>';
    }).join("");
    else sl.innerHTML = '<div class="source-item"><span class="source-name" style="color:#94a3b8">AI\u672a\u63d0\u4f9b\u660e\u786e\u6765\u6e90\u94fe\u63a5</span></div>';
    var tags = [];
    (d.analysis.positive || []).forEach(function (t) { tags.push('<div class="tag tag-positive">' + t + '</div>'); });
    (d.analysis.warning || []).forEach(function (t) { tags.push('<div class="tag tag-warning">' + t + '</div>'); });
    (d.analysis.negative || []).forEach(function (t) { tags.push('<div class="tag tag-negative">' + t + '</div>'); });
    document.getElementById("live-analysis").innerHTML = '<div class="analysis-tags">' + tags.join("") + '</div>';
    var sc = d.score, cls = sc >= 70 ? "high" : sc >= 45 ? "mid" : "low";
    document.getElementById("live-score-row").innerHTML = '<div class="live-score-circle ' + cls + '">' + sc + '</div><div style="font-size:14px;color:#64748b">\u6743\u5a01\u6027\u8bc4\u5206</div>';
    scrollTo("live-result");
  }

  function renderPresetFall(q) {
    var el = document.getElementById("preset-result"); el.classList.remove("hidden");
    document.getElementById("demo-banner").style.display = "";
    document.getElementById("demo-banner").textContent = "\u6f14\u793a\u6a21\u5f0f\uff1a\u5c55\u793a\u9884\u7f6e\u6570\u636e";
  }

  // ===================== Events =====================
  brandSearchBtn.addEventListener("click", handleBrandSearch);
  brandInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleBrandSearch(); });
  questionAskBtn.addEventListener("click", handleQuestion);
  questionInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleQuestion(); });
  document.querySelectorAll(".hint-tag[data-q]").forEach(function (b) { b.addEventListener("click", function () { brandInput.value = this.dataset.q; handleBrandSearch(); }); });
  document.querySelectorAll(".hint-tag[data-live]").forEach(function (b) { b.addEventListener("click", function () { questionInput.value = this.dataset.live; handleQuestion(); }); });
  window.addEventListener("resize", resizeCharts);
  checkApiStatus();
})();
