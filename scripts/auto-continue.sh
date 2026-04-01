#!/bin/bash
# auto-continue.sh
# 当 Claude Code session 结束时，自动读取 NEXT_STEP.md 并启动新 session
#
# 使用方式：
# 1. 在 Claude Code settings.json 中配置为 post-session hook
# 2. 或用 cron 定时检查并重启
#
# 用法：
#   ./scripts/auto-continue.sh /path/to/repo

REPO_DIR="${1:-$(pwd)}"
NEXT_STEP="$REPO_DIR/NEXT_STEP.md"
BLOCKED="$REPO_DIR/BLOCKED.md"

# 检查是否有下一步
if [ ! -f "$NEXT_STEP" ]; then
  echo "No NEXT_STEP.md found, nothing to continue."
  exit 0
fi

# 检查是否全部完成
if grep -q "全部完成" "$NEXT_STEP" 2>/dev/null; then
  echo "All phases completed. Stopping."
  exit 0
fi

# 检查是否被阻塞且无其他可做的工作
if [ -f "$BLOCKED" ] && grep -q "全部阻塞" "$BLOCKED" 2>/dev/null; then
  echo "All work blocked. Waiting for human intervention."
  exit 0
fi

echo "$(date): Auto-continuing from NEXT_STEP.md..."
echo "---"
cat "$NEXT_STEP"
echo "---"

# 启动新的 Claude Code session（-p 非交互模式，不会挂住）
cd "$REPO_DIR"
claude -p --dangerously-skip-permissions "读取 NEXT_STEP.md，继续上次未完成的工作。不要停下来，按照 CLAUDE.md 的规则持续工作直到产品上线。"
