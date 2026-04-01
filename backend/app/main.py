"""FastAPI backend for 龙虾学校"""

import json
import uuid
import time
import random
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, get_connection
from .questions import get_all_questions, get_question_map
from .scoring import score_answers, get_title, get_title_color
from .models import (
    StartTestRequest,
    StartTestResponse,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
    ScoreDetail,
    TestStatusResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    ShareDataResponse,
    CreateUpgradeTaskRequest,
    CreateUpgradeTaskResponse,
    UpgradeStatusResponse,
    CompleteUpgradeResponse,
    ReferralRecordRequest,
    ReferralCheckResponse,
    ReferralRedeemRequest,
    ReferralRedeemResponse,
    HistoryEntry,
    HistoryResponse,
)

# 部署路径前缀
ROOT_PATH = "/teamoreview"
DOMAIN = "teamocode.teamolab.com"

app = FastAPI(title="龙虾学校 API", root_path=ROOT_PATH)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---- Sprint 5: Stats & Activity Endpoints ----

# 模拟龙虾名字池（产品早期数据不足时使用）
FAKE_LOBSTER_NAMES = [
    "闪电虾", "学霸虾", "懒虾", "暴躁虾", "佛系虾", "卷王虾",
    "摸鱼虾", "内卷虾", "躺平虾", "冲浪虾", "肌肉虾", "诗人虾",
    "夜猫虾", "早起虾", "社恐虾", "社牛虾", "吃货虾", "健身虾",
    "学渣虾", "天才虾", "呆萌虾", "酷飒虾", "养生虾", "熬夜虾",
    "打工虾", "老板虾", "文艺虾", "理工虾", "音乐虾", "舞蹈虾",
]


@app.get("/api/stats")
def get_stats():
    """返回总测试人数和当前同时测试人数"""
    with get_connection() as conn:
        total_done = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done'"
        ).fetchone()[0]
        currently_testing = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='pending'"
        ).fetchone()[0]

    # 早期数据不足时，给一个基础值让产品有氛围
    display_total = max(total_done, 42) + total_done * 3

    return {
        "total_completed": display_total,
        "currently_testing": max(currently_testing, random.randint(2, 5)),
    }


@app.get("/api/activity")
def get_activity(limit: int = 10):
    """返回最近完成测试的动态，数据不足时用模拟数据填充"""
    limit = min(limit, 20)
    activities = []

    with get_connection() as conn:
        rows = conn.execute(
            """SELECT lobster_name, iq, completed_at
            FROM tests WHERE status='done'
            ORDER BY completed_at DESC
            LIMIT ?""",
            (limit,),
        ).fetchall()

    for row in rows:
        activities.append({
            "lobster_name": row["lobster_name"],
            "iq": row["iq"],
            "completed_at": row["completed_at"] or "",
            "is_fake": False,
        })

    # 数据不足时用模拟数据填充
    while len(activities) < limit:
        fake_name = random.choice(FAKE_LOBSTER_NAMES)
        fake_iq = random.randint(55, 135)
        activities.append({
            "lobster_name": fake_name,
            "iq": fake_iq,
            "completed_at": "",
            "is_fake": True,
        })

    # 混合真实和模拟数据，随机打乱
    random.shuffle(activities)

    return {"activities": activities}


@app.post("/api/test/start", response_model=StartTestResponse)
def start_test(req: StartTestRequest):
    """创建测试，返回 token + 16 道题 + 安装命令"""
    token = uuid.uuid4().hex[:12]
    questions = get_all_questions()

    skill_url = f"https://{DOMAIN}{ROOT_PATH}/skill.md?token={token}"
    command_text = (
        f"请帮我安装龙虾学校智力测试 skill。"
        f"用 exec 执行 curl -sS {skill_url} 下载内容，"
        f"然后用 write 工具保存到 skills/clawschool/SKILL.md 文件。"
        f"保存好后，帮我做一次龙虾学校智力测试。"
    )

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO tests (token, lobster_name, status) VALUES (?, ?, 'pending')",
            (token, req.lobster_name),
        )
        # Sprint 4: Record referral relationship if ref token provided
        if req.ref:
            sharer_exists = conn.execute(
                "SELECT token FROM tests WHERE token = ?", (req.ref,)
            ).fetchone()
            if sharer_exists:
                conn.execute(
                    "INSERT INTO referrals (sharer_token, friend_token) VALUES (?, ?)",
                    (req.ref, token),
                )

    return StartTestResponse(
        token=token,
        lobster_name=req.lobster_name,
        questions=questions,
        skill_url=skill_url,
        command_text=command_text,
    )


@app.post("/api/test/submit", response_model=SubmitAnswersResponse)
def submit_test(req: SubmitAnswersRequest):
    """Bot 提交答案，返回评分结果"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM tests WHERE token = ?", (req.token,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")

        result = score_answers(req.answers, req.duration_seconds)

        # 计算百分位
        total = conn.execute("SELECT COUNT(*) FROM tests WHERE status='done'").fetchone()[0]
        below = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done' AND iq < ?",
            (result["iq"],),
        ).fetchone()[0]
        percentile = round((below / max(total, 1)) * 100, 1)

        conn.execute(
            """UPDATE tests SET
                status='done',
                completed_at=CURRENT_TIMESTAMP,
                total_score=?, speed_score=?, skill_bonus=?,
                iq=?, title=?, percentile=?,
                duration_seconds=?,
                answers_json=?, scores_json=?
            WHERE token=?""",
            (
                result["base_score"],
                result["speed_score"],
                result["skill_bonus"],
                result["iq"],
                result["title"],
                percentile,
                req.duration_seconds,
                json.dumps(req.answers, ensure_ascii=False),
                json.dumps(result["scores"], ensure_ascii=False),
                req.token,
            ),
        )

        # Sprint 4: Mark referral as friend_completed
        conn.execute(
            "UPDATE referrals SET friend_completed = 1 WHERE friend_token = ?",
            (req.token,),
        )

    qmap = get_question_map()
    score_details = []
    for q in qmap.values():
        if q["qid"] == "q12":
            continue
        answer = req.answers.get(q["qid"], {})
        reason = None
        if isinstance(answer, dict):
            reason = answer.get("reason")
        score_details.append(
            ScoreDetail(
                qid=q["qid"],
                title=q["title"],
                score=result["scores"].get(q["qid"], 0),
                max_score=q["max_score"],
                category=q["category"],
                reason=reason,
                unlock_preview=q["unlock_preview"],
            )
        )

    return SubmitAnswersResponse(
        token=req.token,
        lobster_name=row["lobster_name"],
        iq=result["iq"],
        title=result["title"],
        title_color=result["title_color"],
        base_score=result["base_score"],
        speed_score=result["speed_score"],
        skill_bonus=result["skill_bonus"],
        percentile=percentile,
        duration_seconds=req.duration_seconds,
        score_details=score_details,
    )


@app.get("/api/test/status/{token}", response_model=TestStatusResponse)
def test_status(token: str):
    """轮询测试状态"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT token, lobster_name, status, iq, title FROM tests WHERE token = ?",
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        return TestStatusResponse(
            token=row["token"],
            lobster_name=row["lobster_name"],
            status=row["status"],
            iq=row["iq"] if row["status"] == "done" else None,
            title=row["title"] if row["status"] == "done" else None,
        )


@app.get("/api/test/result/{token}")
def test_result(token: str):
    """获取完整测试结果（报告页用）"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM tests WHERE token = ?", (token,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        if row["status"] != "done":
            raise HTTPException(status_code=400, detail="Test not completed yet")

        scores = json.loads(row["scores_json"]) if row["scores_json"] else {}
        answers = json.loads(row["answers_json"]) if row["answers_json"] else {}

        # 重新计算百分位
        total = conn.execute("SELECT COUNT(*) FROM tests WHERE status='done'").fetchone()[0]
        below = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done' AND iq < ?",
            (row["iq"],),
        ).fetchone()[0]
        percentile = round((below / max(total, 1)) * 100, 1)

        qmap = get_question_map()
        score_details = []
        for q in qmap.values():
            if q["qid"] == "q12":
                continue
            answer = answers.get(q["qid"], {})
            reason = None
            if isinstance(answer, dict):
                reason = answer.get("reason")
            score_details.append({
                "qid": q["qid"],
                "title": q["title"],
                "score": scores.get(q["qid"], 0),
                "max_score": q["max_score"],
                "category": q["category"],
                "reason": reason,
                "unlock_preview": q["unlock_preview"],
            })

        title = row["title"] or get_title(row["iq"])
        title_color = get_title_color(title)

        return {
            "token": row["token"],
            "lobster_name": row["lobster_name"],
            "iq": row["iq"],
            "title": title,
            "title_color": title_color,
            "base_score": row["total_score"],
            "speed_score": row["speed_score"],
            "skill_bonus": row["skill_bonus"],
            "percentile": percentile,
            "duration_seconds": row["duration_seconds"],
            "score_details": score_details,
        }


@app.get("/api/leaderboard", response_model=LeaderboardResponse)
def leaderboard(limit: int = 100):
    """排行榜：按智力值降序，同分按耗时升序"""
    limit = min(limit, 100)
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT lobster_name, iq, title, duration_seconds
            FROM tests WHERE status='done'
            ORDER BY iq DESC, duration_seconds ASC
            LIMIT ?""",
            (limit,),
        ).fetchall()

        total = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done'"
        ).fetchone()[0]

    entries = []
    for i, row in enumerate(rows, 1):
        title = row["title"] or get_title(row["iq"])
        entries.append(
            LeaderboardEntry(
                rank=i,
                lobster_name=row["lobster_name"],
                iq=row["iq"],
                title=title,
                title_color=get_title_color(title),
                duration_seconds=row["duration_seconds"],
            )
        )

    return LeaderboardResponse(entries=entries, total_count=total)


@app.get("/api/share/{token}", response_model=ShareDataResponse)
def share_data(token: str):
    """分享页数据：成绩卡片 + 排行榜（不含能力扫描详情）"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM tests WHERE token = ?", (token,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        if row["status"] != "done":
            raise HTTPException(status_code=400, detail="Test not completed yet")

        # 百分位
        total = conn.execute("SELECT COUNT(*) FROM tests WHERE status='done'").fetchone()[0]
        below = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done' AND iq < ?",
            (row["iq"],),
        ).fetchone()[0]
        percentile = round((below / max(total, 1)) * 100, 1)

        title = row["title"] or get_title(row["iq"])
        title_color = get_title_color(title)

        # 排行榜前 20
        lb_rows = conn.execute(
            """SELECT lobster_name, iq, title, duration_seconds
            FROM tests WHERE status='done'
            ORDER BY iq DESC, duration_seconds ASC
            LIMIT 20""",
        ).fetchall()

        lb_total = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done'"
        ).fetchone()[0]

    lb_entries = []
    for i, r in enumerate(lb_rows, 1):
        t = r["title"] or get_title(r["iq"])
        lb_entries.append(
            LeaderboardEntry(
                rank=i,
                lobster_name=r["lobster_name"],
                iq=r["iq"],
                title=t,
                title_color=get_title_color(t),
                duration_seconds=r["duration_seconds"],
            )
        )

    return ShareDataResponse(
        token=token,
        lobster_name=row["lobster_name"],
        iq=row["iq"],
        title=title,
        title_color=title_color,
        percentile=percentile,
        leaderboard=LeaderboardResponse(entries=lb_entries, total_count=lb_total),
    )


@app.get("/skill.md")
def serve_skill(token: str):
    """动态生成 SKILL.md 给 bot 下载"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT token, lobster_name FROM tests WHERE token = ?", (token,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")

    api_base = f"https://{DOMAIN}{ROOT_PATH}/api"

    skill_content = f"""# 龙虾学校智力测试 SKILL

## 测试信息
- Token: {token}
- 龙虾名字: {row["lobster_name"]}

## 测试流程

1. 用 exec 工具执行以下命令获取题目：
   ```
   curl -sS "{api_base}/test/start" -X POST -H "Content-Type: application/json" -d '{{"lobster_name": "{row["lobster_name"]}"}}'
   ```
   注意：如果返回了新 token，后续使用该新 token。

2. 记录开始时间。

3. 逐题完成 16 道测试题，每题根据题目描述执行相应任务。

4. 所有题目完成后，记录结束时间，计算耗时（秒）。

5. 用 exec 工具提交答案：
   ```
   curl -sS "{api_base}/test/submit" -X POST -H "Content-Type: application/json" -d '{{"token": "{token}", "answers": {{}}, "duration_seconds": 0}}'
   ```
   其中 answers 格式为：{{"q1": {{"score": 10}}, "q2": {{"score": 0, "reason": "未安装浏览器 MCP"}}, ...}}

6. 查看评分结果。

## 重要提示
- 每题满分 10 分
- 诚实评估能力，不要虚报分数
- 耗时影响速度分（越快越高）
"""

    return Response(content=skill_content, media_type="text/markdown")


# ---- Sprint 3: Upgrade Endpoints ----


@app.post("/api/upgrade/basic/tasks", response_model=CreateUpgradeTaskResponse)
def create_upgrade_task(req: CreateUpgradeTaskRequest):
    """创建升级任务：选中弱项 qid，返回 skill 包信息和安装命令"""
    qmap = get_question_map()

    # 验证 token 存在且测试已完成
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM tests WHERE token = ?", (req.token,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        if row["status"] != "done":
            raise HTTPException(status_code=400, detail="Test not completed yet")

    # 验证 qids 有效且有对应 skill_pack
    selected_skills = []
    for qid in req.selected_qids:
        q = qmap.get(qid)
        if not q:
            raise HTTPException(status_code=400, detail=f"Invalid qid: {qid}")
        if not q.get("skill_pack"):
            raise HTTPException(status_code=400, detail=f"No skill pack for {qid}")
        selected_skills.append({
            "qid": q["qid"],
            "title": q["title"],
            "category": q["category"],
            "skill_pack": q["skill_pack"],
            "unlock_preview": q["unlock_preview"],
        })

    task_id = uuid.uuid4().hex[:12]
    skill_url = f"https://{DOMAIN}{ROOT_PATH}/upgrade-skill.md?task_id={task_id}"

    # 构建安装命令
    skill_names = ", ".join([s["title"] for s in selected_skills])
    command_text = (
        f"请帮我安装龙虾学校能力升级包。"
        f"用 exec 执行 curl -sS {skill_url} 下载内容，"
        f"然后用 write 工具保存到 skills/clawschool-upgrade/SKILL.md 文件。"
        f"保存好后，帮我完成升级任务：{skill_names}。"
    )

    with get_connection() as conn:
        conn.execute(
            """INSERT INTO upgrade_tasks
                (task_id, token, selected_qids, selected_skills, command_text, skill_url, status, old_iq, old_title, old_percentile)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)""",
            (
                task_id,
                req.token,
                json.dumps(req.selected_qids),
                json.dumps(selected_skills, ensure_ascii=False),
                command_text,
                skill_url,
                row["iq"],
                row["title"],
                row["percentile"],
            ),
        )

    return CreateUpgradeTaskResponse(
        task_id=task_id,
        selected_qids=req.selected_qids,
        selected_skills=selected_skills,
        skill_url=skill_url,
        command_text=command_text,
    )


@app.get("/api/upgrade/status/{task_id}", response_model=UpgradeStatusResponse)
def upgrade_status(task_id: str):
    """查询升级任务状态"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM upgrade_tasks WHERE task_id = ?", (task_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        old_title_color = get_title_color(row["old_title"]) if row["old_title"] else None
        new_title_color = get_title_color(row["new_title"]) if row["new_title"] else None

        return UpgradeStatusResponse(
            task_id=row["task_id"],
            status=row["status"],
            old_iq=row["old_iq"] if row["status"] == "done" else None,
            new_iq=row["new_iq"] if row["status"] == "done" else None,
            old_title=row["old_title"] if row["status"] == "done" else None,
            new_title=row["new_title"] if row["status"] == "done" else None,
            old_title_color=old_title_color if row["status"] == "done" else None,
            new_title_color=new_title_color if row["status"] == "done" else None,
            old_percentile=row["old_percentile"] if row["status"] == "done" else None,
            new_percentile=row["new_percentile"] if row["status"] == "done" else None,
        )


@app.post("/api/upgrade/complete/{task_id}", response_model=CompleteUpgradeResponse)
def complete_upgrade(task_id: str):
    """模拟升级完成（MVP 阶段用于测试）：
    将选中 qid 的分数设为满分，重新计算 IQ 并更新成绩"""
    with get_connection() as conn:
        task_row = conn.execute(
            "SELECT * FROM upgrade_tasks WHERE task_id = ?", (task_id,)
        ).fetchone()
        if not task_row:
            raise HTTPException(status_code=404, detail="Task not found")
        if task_row["status"] == "done":
            raise HTTPException(status_code=400, detail="Task already completed")

        token = task_row["token"]
        selected_qids = json.loads(task_row["selected_qids"])

        test_row = conn.execute(
            "SELECT * FROM tests WHERE token = ?", (token,)
        ).fetchone()
        if not test_row:
            raise HTTPException(status_code=404, detail="Test not found")

        # 取出原有 scores 和 answers
        scores = json.loads(test_row["scores_json"]) if test_row["scores_json"] else {}
        answers = json.loads(test_row["answers_json"]) if test_row["answers_json"] else {}

        qmap = get_question_map()
        old_iq = test_row["iq"]
        old_title = test_row["title"] or get_title(old_iq)

        # 将选中的 qid 分数设满
        for qid in selected_qids:
            q = qmap.get(qid)
            if q:
                scores[qid] = q["max_score"]
                # 更新 answers 中的 score
                if qid in answers and isinstance(answers[qid], dict):
                    answers[qid]["score"] = q["max_score"]
                    answers[qid]["reason"] = None
                else:
                    answers[qid] = {"score": q["max_score"]}

        # 重新计算 IQ
        from .scoring import calc_base_score, calc_speed_score, calc_skill_bonus
        base_score = calc_base_score(scores)
        speed_score = calc_speed_score(test_row["duration_seconds"])
        skill_bonus = calc_skill_bonus(answers)
        new_iq = base_score + speed_score + skill_bonus
        new_title = get_title(new_iq)
        new_title_color = get_title_color(new_title)

        # 百分位
        total = conn.execute("SELECT COUNT(*) FROM tests WHERE status='done'").fetchone()[0]
        below = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done' AND iq < ?",
            (new_iq,),
        ).fetchone()[0]
        new_percentile = round((below / max(total, 1)) * 100, 1)

        old_percentile = task_row["old_percentile"]

        # 更新 tests 表
        conn.execute(
            """UPDATE tests SET
                total_score=?, iq=?, title=?, percentile=?,
                scores_json=?, answers_json=?
            WHERE token=?""",
            (
                base_score,
                new_iq,
                new_title,
                new_percentile,
                json.dumps(scores, ensure_ascii=False),
                json.dumps(answers, ensure_ascii=False),
                token,
            ),
        )

        # 更新 upgrade_tasks 表
        conn.execute(
            """UPDATE upgrade_tasks SET
                status='done', completed_at=CURRENT_TIMESTAMP,
                new_iq=?, new_title=?, new_percentile=?
            WHERE task_id=?""",
            (new_iq, new_title, new_percentile, task_id),
        )

    old_title_color = get_title_color(old_title)

    return CompleteUpgradeResponse(
        task_id=task_id,
        status="done",
        old_iq=old_iq,
        new_iq=new_iq,
        old_title=old_title,
        new_title=new_title,
        old_title_color=old_title_color,
        new_title_color=new_title_color,
        old_percentile=old_percentile,
        new_percentile=new_percentile,
    )


@app.get("/upgrade-skill.md")
def serve_upgrade_skill(task_id: str):
    """动态生成升级 SKILL.md 给 bot 下载"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM upgrade_tasks WHERE task_id = ?", (task_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        token = row["token"]
        test_row = conn.execute(
            "SELECT lobster_name FROM tests WHERE token = ?", (token,)
        ).fetchone()

    selected_skills = json.loads(row["selected_skills"])
    api_base = f"https://{DOMAIN}{ROOT_PATH}/api"

    skills_desc = "\n".join([
        f"- {s['title']}：安装 skill 包 `{s['skill_pack']}`"
        for s in selected_skills
    ])

    skill_content = f"""# 龙虾学校能力升级 SKILL

## 升级信息
- Task ID: {task_id}
- Token: {token}
- 龙虾名字: {test_row["lobster_name"] if test_row else "未知"}

## 需要升级的能力
{skills_desc}

## 升级流程

1. 安装上述 skill 包到本地环境
2. 验证安装成功
3. 用 exec 工具通知升级完成：
   ```
   curl -sS "{api_base}/upgrade/complete/{task_id}" -X POST -H "Content-Type: application/json"
   ```

## 重要提示
- 安装完成后务必调用完成接口
- 安装失败请重试
"""

    return Response(content=skill_content, media_type="text/markdown")


@app.get("/api/upgrade/tasks/{token}")
def get_upgrade_tasks(token: str):
    """获取某个 token 的所有已完成升级任务（用于前端判断已解锁项）"""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT task_id, selected_qids, status FROM upgrade_tasks WHERE token = ? AND status = 'done'",
            (token,),
        ).fetchall()

    unlocked_qids = set()
    for row in rows:
        qids = json.loads(row["selected_qids"])
        for qid in qids:
            unlocked_qids.add(qid)

    return {"token": token, "unlocked_qids": list(unlocked_qids)}


# ---- Sprint 4: Referral & History Endpoints ----


@app.post("/api/referral/record")
def record_referral(req: ReferralRecordRequest):
    """记录 referral 关系（也可在 start_test 中自动记录）"""
    with get_connection() as conn:
        # Check sharer exists
        sharer = conn.execute(
            "SELECT token FROM tests WHERE token = ?", (req.sharer_token,)
        ).fetchone()
        if not sharer:
            raise HTTPException(status_code=404, detail="Sharer token not found")

        # Check friend exists
        friend = conn.execute(
            "SELECT token FROM tests WHERE token = ?", (req.friend_token,)
        ).fetchone()
        if not friend:
            raise HTTPException(status_code=404, detail="Friend token not found")

        # Check if already recorded
        existing = conn.execute(
            "SELECT id FROM referrals WHERE sharer_token = ? AND friend_token = ?",
            (req.sharer_token, req.friend_token),
        ).fetchone()
        if existing:
            return {"success": True, "message": "Already recorded"}

        conn.execute(
            "INSERT INTO referrals (sharer_token, friend_token) VALUES (?, ?)",
            (req.sharer_token, req.friend_token),
        )

    return {"success": True, "message": "Referral recorded"}


@app.get("/api/referral/check/{token}", response_model=ReferralCheckResponse)
def check_referral(token: str):
    """检查是否有好友完成测试（用于分享者验证）"""
    with get_connection() as conn:
        row = conn.execute(
            """SELECT r.friend_token, t.lobster_name
            FROM referrals r
            JOIN tests t ON t.token = r.friend_token
            WHERE r.sharer_token = ?
              AND r.friend_completed = 1
              AND r.redeemed = 0
            ORDER BY r.created_at DESC
            LIMIT 1""",
            (token,),
        ).fetchone()

        if row:
            return ReferralCheckResponse(
                has_completed_friend=True,
                friend_name=row["lobster_name"],
            )
        return ReferralCheckResponse(has_completed_friend=False)


@app.post("/api/referral/redeem", response_model=ReferralRedeemResponse)
def redeem_referral(req: ReferralRedeemRequest):
    """兑换免费解锁：选择 qid，创建升级任务（跳过支付）"""
    qmap = get_question_map()

    with get_connection() as conn:
        # Verify token
        test_row = conn.execute(
            "SELECT * FROM tests WHERE token = ?", (req.token,)
        ).fetchone()
        if not test_row:
            raise HTTPException(status_code=404, detail="Token not found")
        if test_row["status"] != "done":
            raise HTTPException(status_code=400, detail="Test not completed yet")

        # Verify referral exists and has completed friend
        referral = conn.execute(
            """SELECT id FROM referrals
            WHERE sharer_token = ?
              AND friend_completed = 1
              AND redeemed = 0
            LIMIT 1""",
            (req.token,),
        ).fetchone()
        if not referral:
            raise HTTPException(status_code=400, detail="No eligible referral found")

        # Validate qid
        q = qmap.get(req.qid)
        if not q:
            raise HTTPException(status_code=400, detail=f"Invalid qid: {req.qid}")
        if not q.get("skill_pack"):
            raise HTTPException(status_code=400, detail=f"No skill pack for {req.qid}")

        # Mark referral as redeemed
        conn.execute(
            "UPDATE referrals SET redeemed = 1, redeemed_qid = ? WHERE id = ?",
            (req.qid, referral["id"]),
        )

        # Create upgrade task (same as paid flow but free)
        task_id = uuid.uuid4().hex[:12]
        skill_url = f"https://{DOMAIN}{ROOT_PATH}/upgrade-skill.md?task_id={task_id}"
        selected_skills = [{
            "qid": q["qid"],
            "title": q["title"],
            "category": q["category"],
            "skill_pack": q["skill_pack"],
            "unlock_preview": q["unlock_preview"],
        }]
        command_text = (
            f"请帮我安装龙虾学校能力升级包。"
            f"用 exec 执行 curl -sS {skill_url} 下载内容，"
            f"然后用 write 工具保存到 skills/clawschool-upgrade/SKILL.md 文件。"
            f"保存好后，帮我完成升级任务：{q['title']}。"
        )

        conn.execute(
            """INSERT INTO upgrade_tasks
                (task_id, token, selected_qids, selected_skills, command_text, skill_url, status, old_iq, old_title, old_percentile)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)""",
            (
                task_id,
                req.token,
                json.dumps([req.qid]),
                json.dumps(selected_skills, ensure_ascii=False),
                command_text,
                skill_url,
                test_row["iq"],
                test_row["title"],
                test_row["percentile"],
            ),
        )

        # Auto-complete the upgrade (free unlock, skip bot step)
        scores = json.loads(test_row["scores_json"]) if test_row["scores_json"] else {}
        answers = json.loads(test_row["answers_json"]) if test_row["answers_json"] else {}

        scores[req.qid] = q["max_score"]
        if req.qid in answers and isinstance(answers[req.qid], dict):
            answers[req.qid]["score"] = q["max_score"]
            answers[req.qid]["reason"] = None
        else:
            answers[req.qid] = {"score": q["max_score"]}

        from .scoring import calc_base_score, calc_speed_score, calc_skill_bonus
        base_score = calc_base_score(scores)
        speed_score = calc_speed_score(test_row["duration_seconds"])
        skill_bonus = calc_skill_bonus(answers)
        new_iq = base_score + speed_score + skill_bonus
        new_title = get_title(new_iq)

        total = conn.execute("SELECT COUNT(*) FROM tests WHERE status='done'").fetchone()[0]
        below = conn.execute(
            "SELECT COUNT(*) FROM tests WHERE status='done' AND iq < ?",
            (new_iq,),
        ).fetchone()[0]
        new_percentile = round((below / max(total, 1)) * 100, 1)

        conn.execute(
            """UPDATE tests SET
                total_score=?, iq=?, title=?, percentile=?,
                scores_json=?, answers_json=?
            WHERE token=?""",
            (
                base_score,
                new_iq,
                new_title,
                new_percentile,
                json.dumps(scores, ensure_ascii=False),
                json.dumps(answers, ensure_ascii=False),
                req.token,
            ),
        )

        conn.execute(
            """UPDATE upgrade_tasks SET
                status='done', completed_at=CURRENT_TIMESTAMP,
                new_iq=?, new_title=?, new_percentile=?
            WHERE task_id=?""",
            (new_iq, new_title, new_percentile, task_id),
        )

    return ReferralRedeemResponse(
        success=True,
        task_id=task_id,
        message=f"已免费解锁「{q['title']}」",
    )


@app.get("/api/history/{token}", response_model=HistoryResponse)
def get_history(token: str):
    """获取龙虾的测评历史（支持成长日记折线图）"""
    with get_connection() as conn:
        # Get lobster name from current token
        current = conn.execute(
            "SELECT lobster_name FROM tests WHERE token = ?", (token,)
        ).fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Token not found")

        lobster_name = current["lobster_name"]

        # Get all completed tests for this lobster name
        rows = conn.execute(
            """SELECT iq, title, completed_at
            FROM tests
            WHERE lobster_name = ? AND status = 'done'
            ORDER BY completed_at ASC""",
            (lobster_name,),
        ).fetchall()

    entries = []
    for row in rows:
        title = row["title"] or get_title(row["iq"])
        entries.append(
            HistoryEntry(
                iq=row["iq"],
                title=title,
                title_color=get_title_color(title),
                completed_at=row["completed_at"] or "",
            )
        )

    return HistoryResponse(lobster_name=lobster_name, entries=entries)
