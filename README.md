# 新华智鉴 — AI品牌权威诊断系统 (云端部署版)

支持实时 AI 问答（DeepSeek API），手机/PC 均可访问。

## 一键部署（推荐 3 种方式，任选其一）

### 方式一：Render.com（最简单，推荐）

1. 打开 https://render.com → 注册/登录（支持 GitHub 登录）
2. 点击 **New → Web Service**
3. 选择 **"Build and deploy from a Git repository"**
4. 如已推送到 GitHub：选择仓库；如未推送：选 **"Public Git repository"** 填入 URL
5. 设置：
   - **Name**: `xinhua-geo-demo`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
6. 在 **Environment Variables** 中添加：
   - Key: `DEEPSEEK_API_KEY`  Value: `你的 DeepSeek API Key`
7. 点击 **Create Web Service** → 等待 2-3 分钟
8. 获得公网 URL，如 `https://xinhua-geo-demo.onrender.com`

### 方式二：Vercel（全球 CDN，速度快）

1. 打开终端，运行：
   ```bash
   cd demo-deploy
   npx vercel login      # 在浏览器中完成登录
   npx vercel deploy --prod
   ```
2. 在 Vercel 控制台 → Settings → Environment Variables 添加 `DEEPSEEK_API_KEY`
3. 获得公网 URL，如 `https://xinhua-geo-demo.vercel.app`

### 方式三：Docker 部署（任何云服务器）

```bash
cd demo-deploy
docker build -t xinhua-demo .
docker run -p 5001:5001 -e DEEPSEEK_API_KEY=你的key xinhua-demo
```

## 本地测试

```bash
cd demo-deploy
pip install -r requirements.txt
export DEEPSEEK_API_KEY="你的key"
python app.py
# 打开 http://localhost:5001
```

## 文件说明

```
app.py              # Flask 主应用（路由 + AI API 代理）
requirements.txt    # Python 依赖
Procfile            # Render/Heroku 启动命令
render.yaml         # Render.com 配置
vercel.json         # Vercel 配置
Dockerfile          # Docker 镜像定义
api/                # Vercel Python Serverless Functions
  status.py
  diagnose.py
  ask.py
public/             # 前端静态文件
  index.html        # 交互式页面
  style.css         # 样式
  app.js            # 交互逻辑
  data.js           # 预置数据
```
