# MCP Server 配置

## 概述

以下是实验所需的所有 MCP Server。在 Claude Code 的 settings 或项目的 `.mcp.json` 中配置。

## 配置方式

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--api-key", "sk_test_YOUR_KEY"]
    },
    "dbhub": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "sqlite:///path/to/your/db.sqlite"]
    },
    "cloudbase": {
      "command": "npx",
      "args": ["-y", "@cloudbase/mcp-server"]
    },
    "google-analytics": {
      "command": "npx",
      "args": ["-y", "google-analytics-mcp"]
    }
  }
}
```

## 各 MCP 详细说明

### 1. Stripe MCP（支付）

**来源：** [github.com/stripe/ai](https://github.com/stripe/ai) (1,404 star)
**维护：** Stripe 官方

```bash
# 本地运行
npx -y @stripe/mcp --api-key=sk_test_xxx

# 或使用远程 MCP（支持 OAuth）
# 地址: mcp.stripe.com
```

**提供的工具（25 个）：**
- 客户管理：创建/查询/更新客户
- 产品/价格：创建产品和定价
- 支付：创建 PaymentIntent / Checkout Session
- 订阅：创建/取消/更新订阅
- 发票：创建/发送发票
- 退款：处理退款
- Webhook：配置和管理

**需要：** Stripe API Key（测试环境 `sk_test_xxx`）

---

### 2. dbhub（数据库）

**来源：** [github.com/bytebase/dbhub](https://github.com/bytebase/dbhub) (2,408 star)
**维护：** Bytebase

```bash
# SQLite
npx -y @bytebase/dbhub --dsn "sqlite:///path/to/db.sqlite"

# PostgreSQL
npx -y @bytebase/dbhub --dsn "postgres://user:pass@host:5432/dbname"
```

**提供的工具：**
- 执行 SQL 查询
- 查看 schema
- 表结构管理

**需要：** 数据库文件路径或连接字符串

---

### 3. CloudBase-MCP（腾讯云）

**来源：** [github.com/TencentCloudBase/CloudBase-MCP](https://github.com/TencentCloudBase/CloudBase-MCP) (980 star)
**维护：** 腾讯云开发团队

```bash
npx -y @cloudbase/mcp-server
```

**提供的工具：**
- 云函数部署和管理
- 云数据库 CRUD
- 身份认证
- 静态网站托管
- 从 AI 提示词直接部署到线上

**需要：** 腾讯云 CloudBase 环境 ID + API 密钥

---

### 4. Google Analytics MCP（数据分析）

**来源：** [github.com/surendranb/google-analytics-mcp](https://github.com/surendranb/google-analytics-mcp) (193 star)

```bash
npx -y google-analytics-mcp
```

**提供的工具：**
- 查询 GA4 报告数据
- Schema 发现
- 服务端聚合分析

**需要：** GA4 Property ID + Google Cloud 服务账号 JSON

---

## 安装优先级

| 优先级 | MCP | 原因 |
|--------|-----|------|
| P0 | dbhub | 开发阶段立即需要数据库操作 |
| P0 | Stripe MCP | 支付是核心变现功能 |
| P1 | CloudBase-MCP | 部署阶段需要 |
| P2 | GA MCP | 上线后数据分析需要 |
