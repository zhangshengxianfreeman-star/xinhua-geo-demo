# 新华智鉴 Demo — Render.com 部署教程（从零到上线）

> 预计耗时：10 分钟
> 费用：完全免费（Render Free Tier）
> 结果：获得一个公网 URL，手机/电脑均可访问，支持实时 AI 问答

---

## 第一步：注册 GitHub 并创建仓库（如已有 GitHub 账号跳到 1.3）

### 1.1 注册 GitHub
- 打开 https://github.com/signup
- 用邮箱注册，完成验证

### 1.2 登录 GitHub

### 1.3 创建新仓库
- 打开 https://github.com/new
- **Repository name** 填：`xinhua-geo-demo`
- **Description** 填：`新华智鉴 AI品牌权威诊断系统 Demo`
- 选择 **Public**（免费账号必须 Public 才能在 Render 免费部署）
- **不要**勾选 "Add a README file"
- 点击 **Create repository**

### 1.4 推送代码到 GitHub

创建完仓库后，页面会显示推送指令。打开你 Mac 的**终端**（Terminal），执行以下命令：

```bash
# 进入部署目录
cd ~/cursor/新华geo\ demo/demo-deploy

# 添加 GitHub 远程仓库（把 YOUR_USERNAME 替换成你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/xinhua-geo-demo.git

# 推送代码
git branch -M main
git push -u origin main
```

> **如果提示输入密码**：GitHub 不再支持密码登录，需要用 Personal Access Token：
> 1. 打开 https://github.com/settings/tokens/new
> 2. Note 填 `render-deploy`，Expiration 选 30 days
> 3. 勾选 `repo` 权限
> 4. 点击 Generate token，复制生成的 token
> 5. 在终端密码框中粘贴这个 token（不是你的 GitHub 密码）

推送成功后，刷新 GitHub 仓库页面，应该能看到所有文件。

---

## 第二步：注册 Render.com

### 2.1 打开 https://render.com

### 2.2 点击右上角 **"Get Started for Free"**

### 2.3 选择 **"GitHub"** 登录（最方便，直接关联 GitHub 账号）

### 2.4 授权 Render 访问你的 GitHub 仓库

---

## 第三步：创建 Web Service

### 3.1 进入 Render Dashboard 后，点击顶部的 **"New +"** 按钮

### 3.2 选择 **"Web Service"**

### 3.3 连接 GitHub 仓库
- 在 "Connect a repository" 页面搜索 `xinhua-geo-demo`
- 点击 **Connect** 按钮

### 3.4 填写配置

| 配置项 | 填写内容 |
|--------|----------|
| **Name** | `xinhua-geo-demo` |
| **Region** | `Singapore (Southeast Asia)` 或 `Oregon (US West)` |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT` |

### 3.5 选择免费套餐
- Instance Type 选择 **Free**
- Free 套餐限制：512MB 内存，0.1 CPU，休眠后首次请求有 30s 冷启动（完全够 Demo 用）

---

## 第四步：配置 DeepSeek API Key（实时 AI 功能的关键）

### 4.1 获取 DeepSeek API Key（如已有跳到 4.2）
- 打开 https://platform.deepseek.com/
- 注册/登录
- 进入 "API Keys" 页面
- 点击 "Create new API key"
- 复制生成的 key（格式如 `sk-xxxxxxxxxxxxxxxx`）
- DeepSeek 新用户有免费额度，每百万 token 约 1 元

### 4.2 在 Render 中添加环境变量
- 在创建 Web Service 的页面往下滚动，找到 **"Environment Variables"** 区域
- 点击 **"Add Environment Variable"**
- **Key** 填：`DEEPSEEK_API_KEY`
- **Value** 填：你的 DeepSeek API Key（如 `sk-xxxxxxxxxxxxxxxx`）

> **重要**：这一步配好后，Demo 的"实时AI问答"功能就能真正调用 AI 引擎了。
> 不配也能部署，但问答区域只会展示预置数据。

---

## 第五步：部署

### 5.1 点击页面底部的 **"Create Web Service"** 按钮

### 5.2 等待部署完成
- Render 会自动拉取代码、安装依赖、启动服务
- 页面上方会显示部署日志，正常流程大约 2-3 分钟
- 看到 `==> Your service is live 🎉` 表示部署成功

### 5.3 获取公网 URL
- 部署完成后，页面顶部会显示你的 URL，格式如：
  ```
  https://xinhua-geo-demo.onrender.com
  ```
- **这个 URL 可以直接发给任何人，在手机浏览器打开即可使用**

---

## 第六步：验证

### 6.1 电脑上打开 URL
- 看到搜索框 → 输入"连花清瘟" → 点击"开始诊断"
- 应该看到完整的诊断仪表盘、信源分析、GEO 对比

### 6.2 测试实时 AI
- 滚动到"实时AI问答测试"区域
- 输入"高血压患者日常饮食应该注意什么？"
- 如果配置了 API Key → 应该看到 AI 实时生成的回答
- 右上角状态栏应显示 "AI API 已连接 (DeepSeek)"

### 6.3 手机测试
- 把 URL 发到微信/短信
- 在手机浏览器中打开
- 所有功能在手机上同样可用

---

## 常见问题

### Q: 部署后右上角显示"演示模式"？
A: 说明 DEEPSEEK_API_KEY 没有配置或不正确。去 Render Dashboard → 你的服务 → Environment → 检查变量。

### Q: 实时问答显示"API 调用失败"？
A: 检查 DeepSeek API Key 是否有效、余额是否充足。可以在 https://platform.deepseek.com/ 查看。

### Q: 首次打开很慢？
A: Render 免费套餐会在 15 分钟无访问后休眠，下次访问需要约 30 秒冷启动。付费套餐无此限制。

### Q: 如何更新代码？
A: 在本地修改代码后：
```bash
cd ~/cursor/新华geo\ demo/demo-deploy
git add -A
git commit -m "update demo"
git push
```
Render 会自动检测到 push 并重新部署。

### Q: 如何绑定自定义域名？
A: Render Dashboard → 你的服务 → Settings → Custom Domains → 添加域名并配置 DNS。

---

## 快速命令汇总（复制粘贴用）

```bash
# 一次性执行：进入目录 → 添加远程仓库 → 推送
cd ~/cursor/新华geo\ demo/demo-deploy
git remote add origin https://github.com/YOUR_USERNAME/xinhua-geo-demo.git
git branch -M main
git push -u origin main
```

推送完成后，剩下的全部在浏览器里操作：
1. render.com → New → Web Service → 连接仓库
2. 填好 Build/Start Command
3. 添加 DEEPSEEK_API_KEY 环境变量
4. Create → 等 2 分钟 → 获得 URL → 搞定
