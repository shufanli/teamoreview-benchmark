# Session Start Hook 模板

在项目的 `.claude/settings.json` 中配置：

```json
{
  "hooks": {
    "PreToolUse": [],
    "PostToolUse": [],
    "Notification": [],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "cat NEXT_STEP.md 2>/dev/null && echo '---' && cat SPRINT_PLAN.md 2>/dev/null | head -50"
          }
        ]
      }
    ]
  }
}
```

## 更关键的：在 CLAUDE.md 头部放"锚点"

CLAUDE.md 每次 session 开始都会被读取。把最重要的信息放在最前面：

```markdown
# 🎯 目标锚点（每次 session 开始必读）

## 你的唯一目标
把龙虾学校从 PRD 做成一个可访问、可使用、可付费的线上产品。

## 当前在哪
读 NEXT_STEP.md

## 什么算完成
- [ ] 产品部署在 clawschooldev.teamolab.com 上，外网可访问
- [ ] 用户可以走完：输入名字→复制命令→等待→看报告→分享→付费 全流程
- [ ] Stripe 测试支付可走通
- [ ] 核心漏斗每层有埋点

## 你不是助手，你是负责人。不要停下来问问题。
```

这段话在上下文被压缩时也不会被丢掉（因为 CLAUDE.md 是系统级注入，不参与压缩）。
