# 数据埋点和分析技能

## 概述

为产品添加数据埋点，搭建转化漏斗，支持上线后的数据驱动决策。

## 当前可用的工具

### MCP Server

| MCP | 来源 | Star | 说明 |
|-----|------|------|------|
| **google-analytics-mcp** | `github.com/surendranb/google-analytics-mcp` | 193 | GA4 数据接入，分析流量和用户行为 |
| **search-console-mcp** | `github.com/saurabhsharma2u/search-console-mcp` | 71 | Google Search Console + Bing + GA4 |

### 缺失的（市场上不成熟）

| 需求 | 现状 | 应对 |
|------|------|------|
| Mixpanel MCP | GitHub 0 star，不可靠 | 直接用 Mixpanel JS SDK 手动集成 |
| PostHog MCP | GitHub 3 star，太早期 | 直接用 PostHog JS SDK 手动集成 |
| Amplitude | 无 MCP | 直接用 Amplitude JS SDK |

## 推荐方案

### 方案 A：Google Analytics 4（最快）

```javascript
// 安装
npm install gtag.js
// 或直接在 HTML 中加入 GA4 脚本

// 埋点
gtag('event', 'test_started', { lobster_name: name });
gtag('event', 'test_completed', { score: score });
gtag('event', 'payment_initiated', { plan: 'basic', price: 19.9 });
gtag('event', 'payment_completed', { plan: 'basic', price: 19.9 });
gtag('event', 'share_clicked', { platform: 'wechat' });
```

优点：免费、与 GA4 MCP 配合可以用 AI 分析数据
缺点：实时性差（4-24h 延迟）、漏斗分析不如专业工具

### 方案 B：PostHog（推荐，开源免费）

```javascript
// 安装
npm install posthog-js

// 初始化
import posthog from 'posthog-js'
posthog.init('YOUR_KEY', { api_host: 'https://app.posthog.com' })

// 埋点
posthog.capture('test_started', { lobster_name: name })
posthog.capture('test_completed', { score: score })
posthog.capture('payment_initiated', { plan: 'basic' })
posthog.capture('share_clicked', { platform: 'wechat' })
```

优点：开源免费（1M events/月）、实时漏斗、Session Replay
缺点：MCP 不成熟，需要手动去 PostHog 后台看数据

## 必须埋的点（龙虾学校核心漏斗）

```
L0: 页面访问（UV/PV + 来源渠道）
L1: 填入龙虾名字
L2: 复制安装命令
L3: 测试结果上传成功
L4: 查看报告
L5: 点击分享 / 点击付费
L6: 分享成功 / 付费成功
L7: 被分享者访问（裂变回流）
```

## 关键原则

1. **埋点和功能同步开发**：不要功能做完再补埋点
2. **每一层都要埋**：不只埋"完成"，也要埋"开始"（才能算转化率）
3. **区分来源**：分享链路 vs 直接访问 vs 不同渠道，用 UTM 参数区分
4. **过滤测试数据**：内部测试用户打标，数据可过滤

## 需要人类提供的资源

- [ ] GA4 Measurement ID（如用方案 A）
- [ ] PostHog Project API Key（如用方案 B）

## 状态：⚠️ 可用但需要手动集成 SDK，无成熟的自动化 skill
