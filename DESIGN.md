# DESIGN.md — 龙虾学校设计系统

## 设计哲学

龙虾学校是面向年轻用户的趣味测评产品，设计需要：
- **有趣但不幼稚**：用龙虾/虾的隐喻保持趣味性，但排版和信息层级要专业
- **竞争感**：排行榜、百分位、进度条都要传递"你还可以更强"的信号
- **移动端优先**：所有页面首先适配 375px 宽度，向上适配桌面端

## 色彩系统

### 主色

| 用途 | 色值 | 说明 |
|------|------|------|
| Primary | `#FF6B35` | 龙虾橙，CTA 按钮、高亮元素 |
| Primary Hover | `#E55A2B` | 按钮 hover/active 态 |
| Primary Light | `#FFF3EE` | 橙色背景底色（卡片、提示） |

### 辅助色

| 用途 | 色值 | 说明 |
|------|------|------|
| Success | `#22C55E` | 满分/通过/已解锁 |
| Warning | `#F59E0B` | 部分得分/良好 |
| Danger | `#EF4444` | 0 分/未通过/需修复 |
| Info | `#3B82F6` | 链接、信息提示 |

### 中性色

| 用途 | 色值 | 说明 |
|------|------|------|
| Text Primary | `#1A1A2E` | 主文本 |
| Text Secondary | `#6B7280` | 辅助文本 |
| Text Muted | `#9CA3AF` | 提示文本 |
| Border | `#E5E7EB` | 分割线、边框 |
| Background | `#FAFAFA` | 页面背景 |
| Card Background | `#FFFFFF` | 卡片背景 |

### 称号色系

| 段位 | 色值 | 对应称号 |
|------|------|---------|
| 金/黑 | `#FFD700` / `#1A1A2E` | 波士顿龙虾 |
| 红 | `#DC2626` | 锦绣龙虾 ~ 阿根廷红虾 |
| 橙 | `#FF6B35` | 黑虎虾 ~ 北极甜虾 |
| 黄 | `#F59E0B` | 青虾 ~ 基围虾 |
| 蓝 | `#3B82F6` | 黄油焗大虾 |
| 灰 | `#9CA3AF` | 蒜蓉大虾及以下 |

## 字体

```css
--font-display: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
--font-body: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace; /* 命令展示 */
```

### 字号层级

| 层级 | 移动端 | 桌面端 | 用途 |
|------|--------|--------|------|
| H1 | 28px / 700 | 36px / 700 | 页面标题（龙虾学校） |
| H2 | 22px / 600 | 28px / 600 | 区块标题（成绩卡片智力值数字） |
| H3 | 18px / 600 | 22px / 600 | 子标题（Sprint/能力名称） |
| Body | 15px / 400 | 16px / 400 | 正文 |
| Small | 13px / 400 | 14px / 400 | 辅助信息、标签 |
| Tiny | 11px / 400 | 12px / 400 | 排行榜序号、时间戳 |

## 间距系统（4px 基准）

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-1` | 4px | 图标与文字间距 |
| `--space-2` | 8px | 紧凑元素内间距 |
| `--space-3` | 12px | 卡片内间距 |
| `--space-4` | 16px | 通用内间距 |
| `--space-5` | 20px | 区块间距 |
| `--space-6` | 24px | 卡片间距 |
| `--space-8` | 32px | 页面区域间距 |
| `--space-10` | 40px | 大区域分隔 |

## 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 6px | 小按钮、标签 |
| `--radius-md` | 12px | 卡片、输入框 |
| `--radius-lg` | 16px | 弹窗、Bottom Sheet |
| `--radius-full` | 9999px | 圆形头像、pill 按钮 |

## 阴影

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | 卡片 |
| `--shadow-modal` | `0 -4px 20px rgba(0,0,0,0.15)` | Bottom Sheet |
| `--shadow-float` | `0 4px 12px rgba(0,0,0,0.12)` | 悬浮按钮 |

## 断点（Mobile-first）

| 断点 | 值 | 用途 |
|------|-----|------|
| `sm` | 640px | 小屏平板 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 桌面端 |

移动端最大内容宽度：100vw - 32px（左右各 16px padding）
桌面端最大内容宽度：480px（居中，模拟手机体验）

## 组件规范

### 按钮

| 类型 | 样式 | 用途 |
|------|------|------|
| Primary | 背景 `#FF6B35`，白色文字，圆角 `--radius-full`，高度 48px | CTA（开始测试、立即购买） |
| Secondary | 透明背景，`#FF6B35` 边框+文字，圆角 `--radius-full`，高度 44px | 次要操作（分享免费解锁） |
| Ghost | 透明背景，`#6B7280` 文字 | 稍后再说、关闭 |
| Danger | 背景 `#EF4444`，白色文字 | 仅用于破坏性操作 |

按钮间距：相邻按钮间距 12px，按钮内左右 padding 24px。

### 卡片

```css
.card {
  background: var(--card-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4);
}
```

### Bottom Sheet 弹窗

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-modal);
  padding: var(--space-6);
  max-height: 85vh;
  overflow-y: auto;
}
.bottom-sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--border);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-4);
}
```

### 排行榜行

```css
.leaderboard-row {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  gap: var(--space-3);
}
.leaderboard-row.highlight {
  background: var(--primary-light);
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
}
```

### 进度条

- **线性进度条**（分享页成绩）：高度 8px，圆角 4px，背景 `#E5E7EB`，填充色按称号色系
- **环形进度条**（报告页智力值）：直径 160px，线宽 12px，背景 `#E5E7EB`，填充色按称号色系，中心显示智力值数字

### 能力标签

| 状态 | 背景 | 文字 | 图标 |
|------|------|------|------|
| 满分 | `#DCFCE7` | `#16A34A` | checkmark |
| 良好 | `#DCFCE7` | `#16A34A` | checkmark |
| 可解锁 | `#FFF7ED` | `#EA580C` | lock |
| 已解锁 | `#DBEAFE` | `#2563EB` | unlock |

### Toast 通知

```css
.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.85);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: 13px;
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 4.7s;
}
```

### 命令展示区

```css
.command-block {
  background: #1E1E2E;
  color: #CDD6F4;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  position: relative;
}
.copy-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
}
```

## 动效

| 场景 | 动效 | 时长 |
|------|------|------|
| 页面过渡 | fade-in + slide-up | 300ms ease |
| Bottom Sheet 弹出 | slide-up | 350ms cubic-bezier(0.32, 0.72, 0, 1) |
| 进度条填充 | width 增长 | 800ms ease-out |
| 环形进度条 | stroke-dashoffset | 1200ms ease-out |
| 数字递增 | countUp | 1000ms |
| Toast | slide-up + fade-out | 300ms / 300ms |
| 排行榜自动滚动 | smooth scroll | 500ms |

## 页面布局模板

### 通用页面结构（移动端）

```
[导航栏 48px] — sticky top
[主内容区] — padding 16px，max-width 480px 居中
[悬浮按钮 48px] — sticky bottom，距底部 16px
```

### 安全区域

```css
padding-bottom: calc(16px + env(safe-area-inset-bottom));
```

## 暗色模式

MVP 阶段不做暗色模式，统一浅色。

## 无障碍

- 所有可点击元素最小触摸区域 44x44px
- 按钮文字与背景对比度 >= 4.5:1
- 输入框 focus 态有明显边框色变化
- 图片有 alt 属性
