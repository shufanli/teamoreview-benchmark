# Teamo Runner Agency Test

AI Agent 自主产品开发实验的全链路技能包。

## 这个仓库是什么

这是一个**技能武器库 + 运行引擎**。包含两部分：

1. **技能包**（skills/ + vendor/）：Agent 开发时按需读取的 skill 文件
2. **运行引擎**（scripts/run-forever.sh）：Planner + Generator + Evaluator 三 Agent 永续循环脚本

Agent 在另一个仓库（如 `clawschool-gstack`）工作，本仓库提供技能和驱动循环。

**重要：本仓库不包含 PRD、代码、DESIGN.md 等产品文件。这些在工作仓库里。**

## Agent 如何使用本仓库

```bash
# 1. 在工作仓库旁边 clone 本仓库
gh repo clone teamo-lab/teamo-runner-agency-test /tmp/teamo-skills

# 2. 需要某个技能时，读对应文件
# 例：做前端时
cat /tmp/teamo-skills/vendor/skills/frontend-design-3/SKILL.md
cat /tmp/teamo-skills/vendor/skills/vercel-react-best-practices/SKILL.md

# 例：做支付时
cat /tmp/teamo-skills/vendor/skills/stripe-best-practices/SKILL.md

# 例：不知道某个阶段需要什么 skill
cat /tmp/teamo-skills/skills/02-frontend.md    # 前端阶段的技能说明
cat /tmp/teamo-skills/skills/04-payment.md     # 支付阶段的技能说明
```

## 仓库结构

```
├── CLAUDE.md                    # Agent 工作规则（永远不要停 + 持续运行机制）
├── gaps.md                      # 缺什么 + 应对方案 + 需人类提供的资源
├── scripts/
│   └── auto-continue.sh         # Session 断了自动重启
├── skills/                      # 每个阶段的技能使用说明（告诉你需要什么、怎么用）
│   ├── 01-product-review.md
│   ├── 02-frontend.md
│   ├── 03-backend.md
│   ├── 04-payment.md
│   ├── 05-deployment.md
│   ├── 06-qa-and-security.md
│   ├── 07-analytics.md
│   └── 08-wechat-h5.md
├── mcp/
│   └── mcp-config.md            # MCP Server 配置（Stripe/数据库/腾讯云/GA4）
└── vendor/                      # 已下载的第三方 skill 源码（14 个 skill 包）
    └── skills/
        ├── frontend-design-3/         # React + Tailwind + Mobile-first
        ├── anthropics-frontend-design/ # Anthropic 官方前端
        ├── anthropic-frontend-design/  # Anthropic GitHub 版
        ├── anthropic-web-artifacts-builder/ # 复杂页面构建
        ├── nextjs-expert/             # Next.js App Router
        ├── tailwindcss/               # Tailwind 完整参考
        ├── vercel-react-best-practices/ # React 最佳实践（70+ rules）
        ├── vercel-composition-patterns/ # 组件组合模式
        ├── fastapi/                   # FastAPI 后端
        ├── sql-toolkit/               # 数据库操作
        ├── stripe-api/                # Stripe API 集成
        ├── stripe-best-practices/     # Stripe 官方最佳实践
        ├── stripe-upgrade/            # Stripe 升级指南
        └── docker/                    # Docker 部署
```

## 按阶段查找 skill 的速查表

| 你在做什么 | 读哪个说明 | 读哪个 vendor skill |
|-----------|-----------|-------------------|
| 前端开发 | `skills/02-frontend.md` | `vendor/skills/frontend-design-3/SKILL.md` + `vendor/skills/vercel-react-best-practices/SKILL.md` |
| 后端开发 | `skills/03-backend.md` | `vendor/skills/fastapi/SKILL.md` + `vendor/skills/sql-toolkit/SKILL.md` |
| 支付集成 | `skills/04-payment.md` | `vendor/skills/stripe-best-practices/SKILL.md` + `vendor/skills/stripe-api/SKILL.md` |
| 部署 | `skills/05-deployment.md` | `vendor/skills/docker/SKILL.md` |
| QA 测试 | `skills/06-qa-and-security.md` | 无需 vendor，用内置 /qa /cso /review |
| 数据埋点 | `skills/07-analytics.md` | 无 vendor，手动集成 SDK |
| 微信 H5 | `skills/08-wechat-h5.md` | 无 vendor，按文档中的代码模板自建 |
