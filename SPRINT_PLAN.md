# SPRINT_PLAN.md — 龙虾学校 MVP Sprint 计划

## 项目概要

- **产品**：龙虾学校 — AI agent 能力测评 + 优化提升
- **技术栈**：前端 Next.js (React)，后端 FastAPI，数据库 SQLite
- **部署**：Docker → 腾讯云香港服务器，路径 `teamocode.teamolab.com/teamoreview`
- **设计规范**：见 `DESIGN.md`

---

## Sprint 1 — 测一下你的龙虾

**目标**：用户能填写龙虾名字、获取安装命令、bot 完成测试后看到成绩和排行榜。

**包含页面/功能**：
- P2 官网首页（`/`）
- P3 安装命令弹窗
- P4 等待态页面（`/wait/{token}`）
- P5 测试报告页（`/r/{token}`）— 基础版，仅成绩卡片 + 逐题列表
- 后端：token 生成、题目下发（`/api/test/start`）、答案提交（`/api/test/submit`）、评分逻辑、排行榜接口
- 数据库：用户表、测试记录表、排行榜

**验收标准**：
1. 用户访问首页 `/`，看到品牌标题「龙虾学校」和 CTA 按钮「开始智力测试」
2. 点击「开始智力测试」弹出 Bottom Sheet，输入龙虾名字后看到安装命令，点击复制按钮文案变为「✅ 已复制」
3. 点击「已发送给我的龙虾」后跳转到 `/wait/{token}`，页面显示等待动画和龙虾学校快报
4. 等待页每 5 秒轮询后端，后端收到 bot 提交的答卷后页面显示「已收到答卷」和「查看结果分数」按钮
5. 点击「查看结果分数」跳转到 `/r/{token}`，看到成绩卡片（龙虾名字、智力值、称号、百分位）和逐题得分列表
6. 首页下方显示排行榜（前 20 名可见，最多 100 条可滚动），按智力值降序排列
7. 后端 `/api/test/start` 返回 16 道题，`/api/test/submit` 接收答案并返回评分结果
8. 后端 `/api/leaderboard` 返回排行榜数据，同分按耗时升序
9. 移动端（375px 宽度）布局正常，无横向溢出

**文件范围**：
- 前端：`frontend/src/pages/`（首页、等待页、报告页）、`frontend/src/components/`（BottomSheet、Leaderboard、ScoreCard、CommandBlock）
- 后端：`backend/app/main.py`、`backend/app/questions.py`、`backend/app/models.py`、`backend/app/scoring.py`
- 数据库：`backend/app/database.py`（SQLite）
- 命令模板：`backend/skills/SKILL.md`

**依赖**：无（第一个 Sprint）

---

## Sprint 2 — 分享炫耀 + 裂变闭环

**目标**：用户能分享测试成绩，好友通过分享链接看到成绩并被引导去测试。

**包含页面/功能**：
- P1 分享落地页（`/s/{token}`）
- P5 分享功能（底部悬浮「炫耀我的成绩」按钮 + 分享文案生成 + 剪贴板复制）
- 后端：分享 token 验证、分享页数据接口
- 微信 meta 标签（og:title / og:image）

**验收标准**：
1. 报告页 `/r/{token}` 底部显示「炫耀我的成绩」悬浮按钮
2. 点击「炫耀我的成绩」，分享文案和链接（`/s/{token}`）被复制到剪贴板，出现复制成功提示
3. 好友访问 `/s/{token}`，看到分享者的成绩卡片（龙虾名字、智力值、称号、百分位）和排行榜
4. 分享页不显示能力扫描详情和升级按钮（与 P5 有明确区别）
5. 分享页底部显示 CTA 按钮「测测你的小龙虾有多聪明」，点击跳转首页并打开安装弹窗
6. 分享页有正确的 og:title 和 og:description meta 标签
7. 移动端（375px）分享页布局正常

**文件范围**：
- 前端：`frontend/src/pages/s/[token].tsx`、`frontend/src/components/ShareCard.tsx`
- 后端：`backend/app/routes/share.py`

**依赖**：Sprint 1

---

## Sprint 3 — ¥9.9 单项能力升级

**目标**：用户能为单项弱势能力付费 ¥9.9 解锁，完成升级流程并看到分数提升。

**包含页面/功能**：
- P5 能力扫描报告增强（满分折叠、低分展开 + 能力预览 + 解锁按钮）
- P6 升级流程 Bottom Sheet（4 步：说明 → 支付确认 → 复制命令 → 等待 → 结果）
- 后端：升级任务创建（`POST /api/upgrade/basic/tasks`）、升级状态查询、重测评分、成绩更新
- 支付：MVP 阶段点击「我已支付」即放行（TODO 接入真实支付）

**验收标准**：
1. 报告页逐题列表中，满分项显示绿色 checkmark 并折叠为单行，低分项展开显示问题原因和「💡解锁后：XXX」能力预览
2. 低分项显示两个并排按钮：`[¥9.9 解锁]`（橙色）和 `[分享免费解锁]`（描边）
3. 点击 `[¥9.9 解锁]`，先触发环形进度条增长动画，然后弹出 Step 1 Bottom Sheet（能力说明 + 预计提升分数）
4. 点击「¥9.9 立即购买」进入 Step 1.5（支付确认），点击「我已支付」进入 Step 2
5. Step 2 展示升级命令，点击复制后文案变为「✅ 已复制」，出现「已发送，开始等待升级结果」按钮
6. 进入 Step 3 等待态（不可关闭），显示进度模拟和检查项列表
7. 升级完成后进入 Step 4，显示能力变化、分数变化、称号/排名变化，有「炫耀新成绩」和「查看更新后的报告」按钮
8. 返回报告页后，已升级项标签从 `[¥9.9 解锁]` 变为 `[✅ 已解锁]`
9. 后端 `/api/upgrade/basic/tasks` 正确返回 `task_id`、`selected_qids`、`selected_skills`、`command_text`

**文件范围**：
- 前端：`frontend/src/components/AbilityList.tsx`、`frontend/src/components/UpgradeFlow.tsx`
- 后端：`backend/app/routes/upgrade.py`、`backend/app/upgrade_tasks.py`
- Skills：`backend/skills/basic-upgrade.md`

**依赖**：Sprint 1

---

## Sprint 4 — 分享免费解锁 + 龙虾成长日记

**目标**：用户通过分享邀请好友测试可免费解锁 1 项能力；多次测评后看到成长曲线。

**包含页面/功能**：
- 分享免费解锁流程（分享链接带 ref 参数 → 好友测试 → 验证 → 选择解锁项）
- 龙虾成长日记折线图（报告页底部，智力值变化曲线）
- 后端：Referral 追踪（`/api/referral/check/{token}`）、成长记录接口
- 首页回访用户识别（localStorage 记录 token/名字）

**验收标准**：
1. 报告页低分项的「分享免费解锁」按钮点击后弹窗说明规则，点击「去分享」复制带 ref 参数的分享链接
2. 好友通过 `/s/{token}?ref={sharer_token}` 访问并完成测试后，后端记录 referral 关系
3. 分享者点击「好友已测试」后，后端验证 referral 成功，弹窗让分享者选择解锁哪一项能力
4. 选择后进入升级流程（跳过支付步骤），升级完成后该项标记为「✅ 已解锁」
5. 当用户有 2 次以上测评记录时，报告页底部显示龙虾成长日记折线图（X 轴时间，Y 轴智力值）
6. 首页回访用户（localStorage 有 token）看到主按钮变为「再次测试」，并有「查看测试结果」按钮
7. 后端 `/api/referral/check/{token}` 正确返回是否有好友完成测试

**文件范围**：
- 前端：`frontend/src/components/ReferralFlow.tsx`、`frontend/src/components/GrowthChart.tsx`
- 后端：`backend/app/routes/referral.py`、`backend/app/routes/history.py`

**依赖**：Sprint 2, Sprint 3

---

## Sprint 5 — 体验打磨 + 氛围感

**目标**：补齐首页实时动态、等待页趣味内容、诊断总结等体验细节，让产品有"很多人在玩"的氛围。

**包含页面/功能**：
- 首页实时测试人数统计 + 实时动态 toast（其他用户完成测试）
- 等待页龙虾学校快报（知识/tips/趣闻，轮播）+ 同时测试人数 + toast
- 报告页诊断总结（可提升项数 + 已满分项数）
- 等待页底部群二维码
- 报告页 sticky 底部主 CTA 逻辑（有可提升项："分享免费解锁 1 项" / 无可提升项："炫耀我的成绩"）

**验收标准**：
1. 首页显示「已有 xx 只龙虾完成测试」实时计数
2. 首页底部每 5-8 秒出现一条 toast，显示其他用户完成测试的动态（如「🦞 闪电虾刚刚完成测试，智力值 85」）
3. 等待页显示龙虾学校快报滚动区，每条 tips 停留 5-8 秒自动切换
4. 等待页底部显示群二维码，提示语为「龙虾进阶玩法，扫码进群！」
5. 报告页成绩卡片下方显示诊断总结（如「发现 5 项能力可提升，7 项已满分」）
6. 报告页底部悬浮按钮根据状态切换文案
7. 移动端所有动效流畅，无卡顿

**文件范围**：
- 前端：首页/等待页/报告页组件更新
- 后端：`/api/stats`（实时统计）、`/api/activity`（动态 feed）

**依赖**：Sprint 1, Sprint 2

---

## Sprint 6 — Docker 部署上线

**目标**：产品通过 Docker 部署到腾讯云香港服务器，可通过 `teamocode.teamolab.com/teamoreview` 访问。

**包含页面/功能**：
- Docker 化（前端 + 后端）
- Nginx 反向代理配置（子路径 `/teamoreview`）
- Next.js basePath 配置
- 健康检查端点
- 生产环境变量配置

**验收标准**：
1. `docker-compose up` 能在本地成功启动前端 + 后端
2. 前端所有页面在 `/teamoreview` 子路径下正常访问（资源路径、API 调用无 404）
3. 后端 `/teamoreview/api/health` 返回 200 和 `{"status": "ok"}`
4. 后端所有 API 在 `/teamoreview/api/` 前缀下正常工作
5. SQLite 数据库文件挂载到 volume，容器重启后数据不丢失
6. 部署到腾讯云后，`https://teamocode.teamolab.com/teamoreview` 可正常访问首页

**文件范围**：
- `Dockerfile`（前端）、`Dockerfile`（后端）
- `docker-compose.yml`
- `nginx.conf`
- `frontend/next.config.js`（basePath 配置）
- `DEV_SERVER.md`（启动说明）

**依赖**：Sprint 1 ~ Sprint 5

---

## Sprint 7 — 集成测试 + 全流程验收

**目标**：端到端验证所有用户旅程，确保产品就绪上线。

**包含功能**：
- 用户旅程 1：首页 → 填名字 → 复制命令 → 等待 → 查看报告 → 分享
- 用户旅程 2：好友点分享链接 → 看到成绩 → 自己去测试
- 用户旅程 3：报告页 → 点 ¥9.9 解锁 → 完成升级 → 分数上升
- 用户旅程 4：分享免费解锁 → 好友测试 → 验证 → 选择解锁
- 用户旅程 5：回访用户 → 再次测试 → 成长日记折线图
- 移动端适配验证（375px / 390px / 414px）
- Lighthouse Performance ≥ 90
- 安全审计（无敏感信息泄露、API 无未授权访问）

**验收标准**：
1. 用户旅程 1 全流程可走通：首页 → 安装弹窗 → 等待页 → 报告页 → 分享
2. 用户旅程 2 全流程可走通：分享链接 → 分享页 → 首页 → 自己测试
3. 用户旅程 3 全流程可走通：报告页 → 解锁能力 → 升级等待 → 成绩更新
4. 用户旅程 4 全流程可走通：分享解锁 → 好友测试 → 验证 → 免费解锁
5. 移动端 375px 宽度下所有页面无横向溢出，按钮可点击，文字可读
6. Lighthouse Performance 分数 ≥ 90
7. `/api/` 端点无未授权数据泄露（如不能通过猜测 token 获取他人详细报告）
8. 线上环境 `https://teamocode.teamolab.com/teamoreview` 所有页面可正常访问和交互

**文件范围**：
- 测试文件、EVAL_FEEDBACK.md
- 无新功能代码，仅 bug 修复

**依赖**：Sprint 1 ~ Sprint 6

---

## Sprint 依赖关系图

```
Sprint 1 (测试核心)
  ├── Sprint 2 (分享裂变)
  │     └── Sprint 4 (分享解锁 + 成长日记) ← 也依赖 Sprint 3
  ├── Sprint 3 (¥9.9 升级)
  │     └── Sprint 4
  └── Sprint 5 (体验打磨) ← 也依赖 Sprint 2
        └── Sprint 6 (Docker 部署)
              └── Sprint 7 (集成测试)
```

## PRD 覆盖检查

| PRD 功能 | Sprint |
|----------|--------|
| P1 分享落地页 | Sprint 2 |
| P2 官网首页 | Sprint 1 |
| P3 安装命令弹窗 | Sprint 1 |
| P4 等待态页面 | Sprint 1 |
| P5 测试报告页 | Sprint 1 + Sprint 3 + Sprint 4 + Sprint 5 |
| P6 升级流程 | Sprint 3 |
| 排行榜 | Sprint 1 |
| 称号体系 | Sprint 1 |
| 百分位计算 | Sprint 1 |
| 分享裂变 | Sprint 2 |
| Referral 追踪 | Sprint 4 |
| 龙虾成长日记 | Sprint 4 |
| 回访用户识别 | Sprint 4 |
| 实时动态 / 氛围 | Sprint 5 |
| Docker 部署 | Sprint 6 |
| 集成测试 | Sprint 7 |
