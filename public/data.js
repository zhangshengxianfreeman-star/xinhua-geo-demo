// 「新华智鉴」Demo 数据层
// 基于 2026-03-02 实验采集的真实数据

const DEMO_DATA = {
  brands: {
    lianhua: {
      name: "连花清瘟",
      company: "以岭药业",
      overallScore: 42,
      level: "需优化",
      dimensions: {
        exposure: { score: 35, label: "AI曝光度" },
        sentiment: { score: 55, label: "正面性" },
        accuracy: { score: 48, label: "准确性" },
        authority: { score: 30, label: "权威源占比" },
      },
      engines: [
        { name: "Kimi", score: 45, color: "#6366f1" },
        { name: "豆包", score: 50, color: "#f59e0b" },
        { name: "Perplexity", score: 38, color: "#10b981" },
        { name: "ChatGPT", score: 35, color: "#3b82f6" },
      ],
      questions: [
        {
          q: "连花清瘟胶囊的功效和适用症状是什么？",
          engine: "Kimi",
          answer: "连花清瘟胶囊是一种中成药，具有清瘟解毒、宣肺泄热的功效。主要用于治疗流行性感冒属热毒袭肺证，表现为发热或高热、恶寒、肌肉酸痛、鼻塞流涕、咳嗽、头痛、咽干咽痛等症状。在新冠肺炎疫情期间，连花清瘟也被纳入《新型冠状病毒肺炎诊疗方案》。",
          sources: [
            { url: "baike.baidu.com/连花清瘟胶囊", name: "百度百科", isXinhua: false },
            { url: "yiling.cn/pro/lianhua", name: "以岭药业官网", isXinhua: false },
            { url: "zh.wikipedia.org/连花清瘟", name: "维基百科", isXinhua: false },
          ],
          analysis: {
            positive: ["基本功效描述准确", "提到了诊疗方案推荐"],
            warning: ["未引用任何权威媒体报道", "缺少最新临床研究数据"],
            negative: ["未提及北京流感防治方案推荐（新华网2024年12月已报道）"],
          },
        },
        {
          q: "连花清瘟和奥司他韦哪个治感冒更好？",
          engine: "豆包",
          answer: "连花清瘟和奥司他韦的适用场景不同。奥司他韦是抗病毒药物，主要针对甲型和乙型流感病毒；连花清瘟是中成药，具有广谱抗病毒和抗炎作用。轻症可选连花清瘟，确诊流感建议优先使用奥司他韦。两者可在医生指导下联合使用。",
          sources: [
            { url: "dxy.cn/drugs/compare", name: "丁香园用药助手", isXinhua: false },
            { url: "health.baidu.com", name: "百度健康", isXinhua: false },
          ],
          analysis: {
            positive: ["对比分析较客观"],
            warning: ["缺乏权威机构推荐意见"],
            negative: ["未引用任何权威媒体", "新华网有相关研究报道但未被引用"],
          },
        },
      ],
    },
    xinhua_health: {
      name: "新华网健康频道",
      company: "新华网",
      overallScore: 28,
      level: "亟需优化",
      dimensions: {
        exposure: { score: 15, label: "AI曝光度" },
        sentiment: { score: 72, label: "正面性" },
        accuracy: { score: 85, label: "准确性" },
        authority: { score: 10, label: "权威源占比" },
      },
      engines: [
        { name: "Kimi", score: 30, color: "#6366f1" },
        { name: "豆包", score: 25, color: "#f59e0b" },
        { name: "Perplexity", score: 32, color: "#10b981" },
        { name: "ChatGPT", score: 22, color: "#3b82f6" },
      ],
      questions: [
        {
          q: "高血压患者日常饮食应该注意什么？",
          engine: "通用AI搜索",
          answer: "高血压患者饮食应遵循DASH饮食模式：减少钠盐摄入（每日<5g）、增加钾摄入、多食蔬菜水果和全谷物、选择低脂乳制品、限制酒精。",
          sources: [
            { url: "health.cnr.cn/降压食典", name: "央广网健康", isXinhua: false },
            { url: "health.baidu.com", name: "百度健康", isXinhua: false },
            { url: "familydoctor.cn", name: "家医大健康", isXinhua: false },
          ],
          analysis: {
            positive: ["回答内容准确"],
            warning: [],
            negative: [
              "新华网有5篇相关权威文章（含国家卫健委食养指南），但无一被引用",
              "央广网排第1，新华网完全缺席",
            ],
          },
        },
        {
          q: "中国医保集采政策对患者用药有什么影响？",
          engine: "通用AI搜索",
          answer: "国家医保集采通过集中采购大幅降低药品价格，前10批集采共纳入435种药品，中选仿制药价格平均降幅82.4%，累计节约医保基金约4400亿元。",
          sources: [
            { url: "bydrug.pharmcube.com", name: "医药魔方", isXinhua: false },
            { url: "m.medvalley.cn", name: "医谷网", isXinhua: false },
            { url: "nhsa.gov.cn", name: "国家医保局", isXinhua: false },
          ],
          analysis: {
            positive: ["数据准确"],
            warning: [],
            negative: [
              "政策报道是新华网的绝对强项，但AI引用了医药垂类媒体",
              "新华网有5篇深度政策分析文章全部未被引用",
            ],
          },
        },
      ],
    },
  },

  // 信源权重分析数据（来自实验）
  sourceAnalysis: {
    title: "AI引擎医疗回答信源分析",
    subtitle: "基于10个高频医疗问题 × 搜索引擎RAG检索实测",
    date: "2026年3月2日",
    totalQuestions: 10,
    xinhuaCoverage: 90,
    xinhuaVisibility: 0,
    sources: [
      { name: "百度健康", count: 4, pct: 14.3, type: "商业平台", isXinhua: false },
      { name: "Mayo Clinic中文", count: 2, pct: 7.1, type: "国际医疗", isXinhua: false },
      { name: "百度百科", count: 2, pct: 7.1, type: "百科平台", isXinhua: false },
      { name: "健康界", count: 2, pct: 7.1, type: "行业媒体", isXinhua: false },
      { name: "名医汇", count: 2, pct: 7.1, type: "医患平台", isXinhua: false },
      { name: "智慧医疗网", count: 2, pct: 7.1, type: "垂直媒体", isXinhua: false },
      { name: "家医大健康", count: 2, pct: 7.1, type: "健康媒体", isXinhua: false },
      { name: "好大夫在线", count: 1, pct: 3.6, type: "医患平台", isXinhua: false },
      { name: "丁香园", count: 1, pct: 3.6, type: "专业社区", isXinhua: false },
      { name: "梅斯医学", count: 1, pct: 3.6, type: "医学平台", isXinhua: false },
      { name: "澎湃新闻", count: 1, pct: 3.6, type: "媒体", isXinhua: false },
      { name: "央广网", count: 1, pct: 3.6, type: "央媒", isXinhua: false },
      { name: "新华网", count: 0, pct: 0, type: "央媒", isXinhua: true },
    ],
    questionDetails: [
      { q: "高血压饮食注意事项", hasCoverage: true, articles: 5, inTop5: false, topSource: "央广网" },
      { q: "糖尿病早期症状预防", hasCoverage: true, articles: 5, inTop5: false, topSource: "Mayo Clinic" },
      { q: "连花清瘟功效", hasCoverage: true, articles: 3, inTop5: false, topSource: "百度百科" },
      { q: "阿司匹林副作用", hasCoverage: true, articles: 5, inTop5: false, topSource: "梅斯医学" },
      { q: "北京心血管医院", hasCoverage: true, articles: 5, inTop5: false, topSource: "名医汇" },
      { q: "互联网医疗/微医", hasCoverage: true, articles: 5, inTop5: false, topSource: "百度百科" },
      { q: "医保集采影响", hasCoverage: true, articles: 5, inTop5: false, topSource: "医药魔方" },
      { q: "布洛芬vs对乙酰氨基酚", hasCoverage: false, articles: 0, inTop5: false, topSource: "澎湃新闻" },
      { q: "失眠调理就医", hasCoverage: true, articles: 5, inTop5: false, topSource: "Mayo Clinic" },
      { q: "AI医疗趋势", hasCoverage: true, articles: 5, inTop5: false, topSource: "智慧医疗网" },
    ],
    competitorMatrix: [
      { name: "新华网", quality: 95, visibility: 0, overall: 28 },
      { name: "百度健康", quality: 55, visibility: 90, overall: 72 },
      { name: "好大夫在线", quality: 75, visibility: 70, overall: 73 },
      { name: "丁香园", quality: 78, visibility: 65, overall: 71 },
      { name: "央广网", quality: 82, visibility: 15, overall: 35 },
      { name: "Mayo Clinic", quality: 92, visibility: 40, overall: 60 },
    ],
  },

  // GEO 优化模拟数据
  geoSimulation: {
    question: "高血压患者日常饮食应该注意什么？",
    before: {
      answer:
        "高血压患者应减少盐分摄入，多吃蔬菜水果，限制酒精饮用。建议采用DASH饮食模式，包括全谷物、低脂乳制品和瘦肉。每日食盐不超过5克。",
      sources: [
        { name: "央广网健康", domain: "health.cnr.cn", authority: "中", isXinhua: false },
        { name: "百度健康", domain: "health.baidu.com", authority: "低", isXinhua: false },
        { name: "家医大健康", domain: "familydoctor.cn", authority: "低", isXinhua: false },
      ],
      score: 42,
      metrics: { exposure: 15, sentiment: 60, accuracy: 65, authority: 10 },
    },
    after: {
      answer:
        '据新华网报道，国家卫生健康委发布的《成人高血压食养指南（2024年版）》建议：高血压患者应严格控制钠盐摄入（每日<5g），使用低钠盐可降低脑卒中风险14%、心血管事件风险13%。推荐DASH饮食模式：每日蔬菜不少于300g（深色蔬菜占一半以上），水果200-350g，全谷物50-150g。同时增加钾摄入（马铃薯、西红柿、南瓜等），选择低脂乳制品补充钙质。',
      sources: [
        { name: "新华网健康频道", domain: "news.cn/health", authority: "极高", isXinhua: true },
        { name: "国家卫健委", domain: "nhc.gov.cn", authority: "极高", isXinhua: false },
        { name: "中华心血管杂志", domain: "journal.cn", authority: "高", isXinhua: false },
      ],
      score: 89,
      metrics: { exposure: 85, sentiment: 88, accuracy: 92, authority: 90 },
    },
    improvements: [
      { label: "健康度评分", before: 42, after: 89, unit: "分" },
      { label: "权威源占比", before: 10, after: 90, unit: "%" },
      { label: "信息准确性", before: 65, after: 92, unit: "%" },
      { label: "AI曝光度", before: 15, after: 85, unit: "%" },
    ],
  },
};
