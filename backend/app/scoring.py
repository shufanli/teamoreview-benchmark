"""智力值计算逻辑

智力值 = 基础能力分 + 速度分 + q12 skill bonus

基础能力分: 15 题 x 10 分 (q1-q11, q13-q16), 范围 0~150
速度分: 基于完成耗时, 范围 0~20
Skill Bonus: q12 去重 skill 数量, 1 个 = +1 IQ
"""

from .questions import get_question_map

# 称号体系
TITLES = [
    (150, "波士顿龙虾"),
    (142, "锦绣龙虾"),
    (130, "澳洲大龙虾"),
    (122, "澳洲小青龙"),
    (114, "阿根廷红虾"),
    (104, "黑虎虾"),
    (92, "北极甜虾"),
    (80, "青虾"),
    (68, "基围虾"),
    (52, "黄油焗大虾"),
    (32, "蒜蓉大虾"),
    (27, "油焖小龙虾"),
    (22, "麻辣小龙虾"),
    (17, "麻辣虾尾"),
    (12, "白灼虾"),
    (6, "冻虾仁"),
    (0, "虾皮"),
]

TITLE_COLORS = {
    "波士顿龙虾": "#FFD700",
    "锦绣龙虾": "#DC2626",
    "澳洲大龙虾": "#DC2626",
    "澳洲小青龙": "#DC2626",
    "阿根廷红虾": "#FF6B35",
    "黑虎虾": "#FF6B35",
    "北极甜虾": "#F59E0B",
    "青虾": "#F59E0B",
    "基围虾": "#3B82F6",
    "黄油焗大虾": "#3B82F6",
    "蒜蓉大虾": "#9CA3AF",
    "油焖小龙虾": "#9CA3AF",
    "麻辣小龙虾": "#9CA3AF",
    "麻辣虾尾": "#9CA3AF",
    "白灼虾": "#9CA3AF",
    "冻虾仁": "#9CA3AF",
    "虾皮": "#9CA3AF",
}


def calc_speed_score(duration_seconds: int) -> int:
    """计算速度分 (0~20)"""
    if duration_seconds <= 30:
        return 20
    elif duration_seconds <= 120:
        # 31-120 秒: 每 9 秒降 1 分, 从 19 开始
        return max(0, 20 - ((duration_seconds - 30) // 9 + 1))
    elif duration_seconds <= 420:
        # 121-420 秒: 按 30 秒档从 +9 降到 +1
        level = (duration_seconds - 121) // 30
        return max(1, 9 - level)
    else:
        return 0


def calc_skill_bonus(answers: dict) -> int:
    """计算 q12 skill bonus: 去重 skill 数量"""
    q12 = answers.get("q12", {})
    if isinstance(q12, dict):
        skills = q12.get("skills", [])
        if isinstance(skills, list):
            return len(set(skills))
    return 0


def calc_base_score(scores: dict) -> int:
    """计算基础能力分: q1-q11, q13-q16 的总分"""
    total = 0
    for qid in ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8",
                 "q9", "q10", "q11", "q13", "q14", "q15", "q16"]:
        total += scores.get(qid, 0)
    return total


def get_title(iq: int) -> str:
    """根据智力值返回称号"""
    for threshold, title in TITLES:
        if iq >= threshold:
            return title
    return "虾皮"


def get_title_color(title: str) -> str:
    """返回称号对应颜色"""
    return TITLE_COLORS.get(title, "#9CA3AF")


def score_answers(answers: dict, duration_seconds: int) -> dict:
    """
    对答案评分，返回完整评分结果。

    answers 格式: {"q1": {"score": 10, ...}, "q2": {"score": 0, "reason": "..."}, ...}
    """
    qmap = get_question_map()
    scores = {}

    for qid, q in qmap.items():
        if qid == "q12":
            continue  # q12 不计入基础分
        answer = answers.get(qid, {})
        if isinstance(answer, dict):
            score = answer.get("score", 0)
        elif isinstance(answer, (int, float)):
            score = int(answer)
        else:
            score = 0
        scores[qid] = min(score, q["max_score"])

    base_score = calc_base_score(scores)
    speed_score = calc_speed_score(duration_seconds)
    skill_bonus = calc_skill_bonus(answers)
    iq = base_score + speed_score + skill_bonus

    title = get_title(iq)
    title_color = get_title_color(title)

    return {
        "scores": scores,
        "base_score": base_score,
        "speed_score": speed_score,
        "skill_bonus": skill_bonus,
        "iq": iq,
        "title": title,
        "title_color": title_color,
        "duration_seconds": duration_seconds,
    }
