#!/bin/bash
# run-forever.sh — Planner + Generator + Evaluator 三 Agent 永续循环
#
# 架构（参考 Anthropic harness design 博文）：
#   Planner  → 把 PRD 拆成 Sprint，定义验收标准
#   Generator → 按 Sprint 写代码
#   Evaluator → 独立测试打分，不达标打回
#
# 用法：
#   ./scripts/run-forever.sh /path/to/working-repo
#
# 停止：
#   touch STOP

REPO_DIR="${1:-.}"
# 技能仓库路径：相对于脚本自身位置推导，不写死绝对路径
SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$REPO_DIR/agent-run.log"
MAX_ROUNDS=30

# 确保 PATH 包含所有需要的工具
export PATH="$HOME/Library/Python/3.9/bin:$HOME/.local/bin:/opt/homebrew/bin:$PATH"

cd "$REPO_DIR" || exit 1

# =============================================
# 环境预检
# =============================================
preflight() {
    local ok=true

    # tccli
    if ! command -v tccli &>/dev/null; then
        echo "❌ tccli 未安装，运行: pip3 install tccli"
        ok=false
    fi

    # Playwright 浏览器
    if [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
        echo "⚠️ Playwright 浏览器可能缺失，运行: npx playwright install chromium"
    fi

    # openclaw
    if ! command -v openclaw &>/dev/null; then
        echo "⚠️ openclaw CLI 不在 PATH 中"
    fi

    # gstack skills（/browse /qa 等依赖这些）
    if [ ! -d "$HOME/.claude/skills" ] && [ ! -d "$HOME/.gstack" ]; then
        echo "⚠️ gstack skills 可能未安装。如果 /browse /qa 等命令不可用，运行: npm install -g @anthropic-ai/gstack"
    fi

    # 把 .mcp.json 复制到工作仓库（如果技能仓库有的话）
    if [ -f "$SKILLS_DIR/.mcp.json" ] && [ ! -f "$REPO_DIR/.mcp.json" ]; then
        cp "$SKILLS_DIR/.mcp.json" "$REPO_DIR/.mcp.json"
        echo "✅ .mcp.json 已复制到工作仓库"
    fi

    # 确保工作仓库的 .gitignore 包含 .mcp.json
    if [ -f "$REPO_DIR/.gitignore" ]; then
        if ! grep -q ".mcp.json" "$REPO_DIR/.gitignore" 2>/dev/null; then
            echo ".mcp.json" >> "$REPO_DIR/.gitignore"
            echo "✅ .mcp.json 已添加到 .gitignore"
        fi
    fi

    if [ "$ok" = false ]; then
        echo "预检失败，请修复后重试"
        exit 1
    fi

    echo "✅ 环境预检通过"
}

preflight

log() {
    echo "$(date '+%H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# 杀掉之前残留的 dev server 进程
kill_dev_servers() {
    pkill -f "next dev" 2>/dev/null
    pkill -f "uvicorn" 2>/dev/null
    pkill -f "npm run dev" 2>/dev/null
    sleep 2
}

# 启动 dev server 并等待就绪（供 Evaluator 使用）
start_dev_server() {
    kill_dev_servers
    log "启动 dev server..."

    if [ -f "$REPO_DIR/DEV_SERVER.md" ]; then
        # 读取启动命令
        local cmd=$(grep -E "^(npm|npx|python|uvicorn|node)" "$REPO_DIR/DEV_SERVER.md" | head -1)
        if [ -n "$cmd" ]; then
            cd "$REPO_DIR" && eval "nohup $cmd > /tmp/dev-server.log 2>&1 &"
            log "Dev server 启动命令: $cmd"
        fi
    else
        # 尝试常见方式
        if [ -f "$REPO_DIR/frontend/package.json" ]; then
            cd "$REPO_DIR/frontend" && nohup npm run dev > /tmp/frontend.log 2>&1 &
            log "Frontend 启动: npm run dev"
        fi
        if [ -f "$REPO_DIR/backend/requirements.txt" ]; then
            cd "$REPO_DIR/backend" && nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
            log "Backend 启动: uvicorn"
        fi
    fi

    cd "$REPO_DIR"

    # 等待就绪（最多 30 秒）
    for i in $(seq 1 30); do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            log "Dev server 就绪 (${i}s)"
            return 0
        fi
        sleep 1
    done
    log "⚠️ Dev server 30 秒内未就绪，Evaluator 会自行处理"
}

check_stop() {
    if [ -f "$REPO_DIR/STOP" ]; then
        log "发现 STOP 文件，停止"
        kill_dev_servers
        rm "$REPO_DIR/STOP"
        exit 0
    fi
}

run_agent() {
    local role="$1"
    local prompt="$2"
    log "--- $role 启动 ---"

    # 目标锚点：每轮每个 agent 开头都注入，防止跑偏
    local anchor
    read -r -d '' anchor << ANCHOR_EOF
目标：把龙虾学校做成部署在 clawschooldev.teamolab.com 上、外网可访问、可付费的线上产品。
当前轮次：第 ${round} 轮。角色：${role}。
什么算完成：产品在服务器上跑着 + 用户全流程可走通 + Stripe 支付可用 + 核心漏斗有埋点。
不要停下来问问题。不要输出建议后停下来。直接做。
---
ANCHOR_EOF

    # -p (print mode): 非交互，执行完就退出，不会挂住
    # --dangerously-skip-permissions: 跳过权限确认
    claude -p --dangerously-skip-permissions "${anchor}${prompt}" 2>&1 | tee -a "$LOG_FILE"
    log "--- $role 退出 ---"
    git add -A && git commit -m "$role: auto-commit round $round" && git push 2>/dev/null
}

# =============================================
# 第 0 轮：Planner（只在开始时或需要重新规划时运行）
# =============================================

if [ ! -f "$REPO_DIR/SPRINT_PLAN.md" ]; then
    log "===== PLANNER（初始规划）====="

    read -r -d '' PLANNER_PROMPT << 'PLANNER_EOF'
你是 Planner Agent。你的工作是把 PRD 拆成可执行的 Sprint 计划。

## 任务

1. 读取 prd/ 目录下的 PRD 文档
2. 读取 DESIGN.md 了解设计规范
3. 把整个产品拆成 Sprint，每个 Sprint 是一个可独立交付和测试的功能块

## 拆分原则

- 每个 Sprint 对应一个用户可感知的功能（不是技术任务）
- 每个 Sprint 必须定义验收标准（Evaluator 会按这个标准测试）
- Sprint 之间有依赖关系的要标明顺序
- 前端和后端放在同一个 Sprint（不要前后端分开 Sprint）
- 范围要有雄心：不要缩减 PRD 的范围，PRD 里有的都要做

## 强制包含的 Sprint（不能遗漏）

除了功能 Sprint 之外，必须包含以下 Sprint：

**部署 Sprint**（放在功能 Sprint 之后）：
- Docker 化 + 通过 TAT 部署到服务器 43.159.0.211 端口 8001
- 验收标准必须是"外网通过 http://clawschooldev.teamolab.com 可访问"，不是"Dockerfile 存在"
- 读技能仓库的 skills/05-deployment.md 了解 TAT 部署方式
- tccli 路径：/Users/shufanli/Library/Python/3.9/bin/tccli

**支付集成 Sprint**：
- 接入 Stripe，读技能仓库 vendor/skills/stripe-best-practices/SKILL.md
- Stripe test key 在技能仓库 .env.dev 中
- 验收标准必须是"用测试卡号走通完整支付流程"，不是"支付代码存在"

**数据埋点 Sprint**：
- 核心漏斗每一层（访问→填名字→复制命令→等待→报告→分享→付费）都要有埋点
- 验收标准必须是"埋点数据可通过 API 查到"

**最终验收 Sprint**（最后一个）：
- 在服务器上走通完整用户旅程
- 验收标准：外网可访问 + 全流程可走通 + 支付可用 + 埋点有数据

## 输出格式

写入 SPRINT_PLAN.md：

```
# Sprint 计划

## Sprint 1: [名称]
**目标：** 一句话说清楚这个 Sprint 交付什么
**包含页面/功能：** 列出具体页面和功能点
**验收标准：**
- [ ] [具体的、可测试的标准]
- [ ] [...]
**技术要点：** 需要注意的技术点（可选）

## Sprint 2: [名称]
...
```

## 规则

- 不要写代码，只做规划
- 不要缩减 PRD 范围
- 验收标准必须具体到 Evaluator 可以用浏览器测试验证
- 完成后 git commit + push

开始规划。
PLANNER_EOF

    run_agent "PLANNER" "$PLANNER_PROMPT"
    check_stop
    sleep 5
fi

# =============================================
# 主循环：Generator + Evaluator
# =============================================

round=0
consecutive_pass=0  # 连续达标计数器，连续 2 轮达标触发 Planner 最终审视

while true; do
    check_stop

    round=$((round + 1))
    if [ "$round" -gt "$MAX_ROUNDS" ]; then
        log "达到最大轮次 $MAX_ROUNDS，停止"
        exit 0
    fi

    # =============================================
    # GENERATOR
    # =============================================
    log "===== 第 $round 轮 — GENERATOR ====="

    NEXT_STEP=""
    [ -f "$REPO_DIR/NEXT_STEP.md" ] && NEXT_STEP=$(cat "$REPO_DIR/NEXT_STEP.md")

    SPRINT_PLAN=""
    [ -f "$REPO_DIR/SPRINT_PLAN.md" ] && SPRINT_PLAN=$(cat "$REPO_DIR/SPRINT_PLAN.md")

    EVAL_FEEDBACK=""
    [ -f "$REPO_DIR/EVAL_FEEDBACK.md" ] && EVAL_FEEDBACK="
## Evaluator 上轮反馈（必须优先修复）
$(cat "$REPO_DIR/EVAL_FEEDBACK.md")"

    BLOCKED=""
    [ -f "$REPO_DIR/BLOCKED.md" ] && BLOCKED="
## 阻塞项
$(cat "$REPO_DIR/BLOCKED.md")"

    read -r -d '' GENERATOR_PROMPT << GENERATOR_EOF
你是 Generator Agent。你的工作是按 Sprint 计划写代码、实现功能、修 bug。

## Sprint 计划
$SPRINT_PLAN

## 当前状态
$NEXT_STEP
$EVAL_FEEDBACK
$BLOCKED

## 规则

1. 按 SPRINT_PLAN.md 中的 Sprint 顺序推进。当前 Sprint 的所有验收标准全部实现后，才进入下一个 Sprint。
2. 如果有 EVAL_FEEDBACK.md，优先修复 Evaluator 指出的问题，不要跳过任何一条。
3. 不要停下来问问题。自己做决定。
4. 不要输出计划/建议/总结然后停下来。直接写代码。
5. 每完成一个功能就 git commit + push。
6. 严格遵循 DESIGN.md 做视觉实现。
7. 退出前必须：
   - 更新 NEXT_STEP.md（当前在哪个 Sprint、做到哪了、下一步具体做什么）
   - 写入 DEV_SERVER.md（怎么启动应用、端口号）
   - 确保 dev server 可以正常启动

## 绝对不要做的事
- 不要输出"如果你需要我继续..."
- 不要问选择题
- 不要写总结后停下来
- 不要写功能存根（按钮存在但没接逻辑）——要么完整实现，要么不做

继续工作。
GENERATOR_EOF

    run_agent "GENERATOR" "$GENERATOR_PROMPT"
    check_stop
    sleep 5

    # =============================================
    # EVALUATOR
    # =============================================
    log "===== 第 $round 轮 — EVALUATOR ====="

    # 在 Evaluator 启动前，由脚本负责启动 dev server
    # 这样即使 Generator session 结束了，server 也在跑
    start_dev_server

    DEV_SERVER_INFO=""
    [ -f "$REPO_DIR/DEV_SERVER.md" ] && DEV_SERVER_INFO=$(cat "$REPO_DIR/DEV_SERVER.md")

    CURRENT_SPRINT=""
    if [ -f "$REPO_DIR/NEXT_STEP.md" ]; then
        CURRENT_SPRINT=$(cat "$REPO_DIR/NEXT_STEP.md")
    fi

    # 读取独立的 Evaluator prompt 文件
    EVAL_PROMPT_FILE="$SKILLS_DIR/evaluator-prompt.md"
    if [ -f "$EVAL_PROMPT_FILE" ]; then
        EVAL_BASE=$(cat "$EVAL_PROMPT_FILE")
    else
        EVAL_BASE="你是 Evaluator Agent。用 /browse 测试应用，逐条验证验收标准，写入 EVAL_FEEDBACK.md。"
    fi

    read -r -d '' EVALUATOR_PROMPT << EVAL_EOF
$EVAL_BASE

---

## 本轮上下文

### Dev Server
$DEV_SERVER_INFO

### 当前 Sprint 信息
$CURRENT_SPRINT

### Sprint 计划（含验收标准）
$SPRINT_PLAN

开始评估。
EVAL_EOF

    run_agent "EVALUATOR" "$EVALUATOR_PROMPT"
    check_stop

    # 检查结果
    if [ -f "$REPO_DIR/EVAL_FEEDBACK.md" ]; then
        if grep -q "全部达标" "$REPO_DIR/EVAL_FEEDBACK.md" 2>/dev/null; then
            consecutive_pass=$((consecutive_pass + 1))
            log "✅ Sprint 达标！（连续达标 ${consecutive_pass} 轮）"

            # 连续达标 2 轮 → 触发 Planner 最终审视
            if [ "$consecutive_pass" -ge 2 ]; then
                log "===== PLANNER（最终审视，连续达标 ${consecutive_pass} 轮触发）====="
                read -r -d '' FINAL_PROMPT << FINAL_EOF
你是 Planner Agent。Evaluator 连续 ${consecutive_pass} 轮判定全部达标。

做最终审视：
1. 读 PRD，对比 SPRINT_PLAN.md 和实际产出，有没有遗漏
2. 检查以下硬性条件是否满足：
   - 产品已部署到 clawschooldev.teamolab.com，外网可访问
   - Stripe 支付流程可走通（用测试卡号）
   - 核心漏斗每层有埋点且数据可查
   - 用户完整旅程可走通（输入名字→测试→报告→分享→付费）
3. 如果任何一条不满足，追加补充 Sprint 到 SPRINT_PLAN.md，更新 NEXT_STEP.md 为该 Sprint 的具体任务
4. 如果全部满足，在 NEXT_STEP.md 中写入"全部完成，产品就绪"

不要写总结，只做判断。如果不满足，Sprint 的验收标准必须具体到可测试。
FINAL_EOF
                run_agent "PLANNER-FINAL" "$FINAL_PROMPT"
                consecutive_pass=0  # 重置计数器

                if [ -f "$REPO_DIR/NEXT_STEP.md" ] && grep -q "全部完成\|产品就绪" "$REPO_DIR/NEXT_STEP.md" 2>/dev/null; then
                    log "🎉🎉🎉 Planner 确认产品就绪，循环结束！"
                    exit 0
                else
                    log "Planner 追加了补充 Sprint，继续循环"
                fi
            fi
        else
            consecutive_pass=0  # 有问题，重置连续达标计数
            log "🔴 有问题，下一轮 Generator 修复"
        fi
    else
        consecutive_pass=0
        log "⚠️ Evaluator 未产出反馈，继续"
    fi

    sleep 10
done
