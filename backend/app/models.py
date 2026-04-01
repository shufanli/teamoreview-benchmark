"""Pydantic models for API request/response"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class StartTestRequest(BaseModel):
    lobster_name: str = Field(..., min_length=1, max_length=50, description="龙虾名字")
    ref: Optional[str] = Field(None, description="推荐人 token")


class StartTestResponse(BaseModel):
    token: str
    lobster_name: str
    questions: list
    skill_url: str
    command_text: str


class SubmitAnswersRequest(BaseModel):
    token: str
    answers: Dict[str, Any]  # {"q1": {"score": 10}, "q2": {"score": 0, "reason": "..."}}
    duration_seconds: int = Field(ge=0, description="答题耗时(秒)")


class ScoreDetail(BaseModel):
    qid: str
    title: str
    score: int
    max_score: int
    category: str
    reason: Optional[str] = None
    unlock_preview: Optional[str] = None


class SubmitAnswersResponse(BaseModel):
    token: str
    lobster_name: str
    iq: int
    title: str
    title_color: str
    base_score: int
    speed_score: int
    skill_bonus: int
    percentile: float
    duration_seconds: int
    score_details: List[ScoreDetail]


class TestStatusResponse(BaseModel):
    token: str
    lobster_name: str
    status: str  # pending | done
    iq: Optional[int] = None
    title: Optional[str] = None


class LeaderboardEntry(BaseModel):
    rank: int
    lobster_name: str
    iq: int
    title: str
    title_color: str
    duration_seconds: int


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    total_count: int


class ShareDataResponse(BaseModel):
    """分享页数据（不含能力扫描详情）"""
    token: str
    lobster_name: str
    iq: int
    title: str
    title_color: str
    percentile: float
    leaderboard: LeaderboardResponse


# ---- Sprint 3: Upgrade Models ----

class CreateUpgradeTaskRequest(BaseModel):
    token: str
    selected_qids: List[str] = Field(..., min_length=1, description="要升级的题目 qid 列表")


class CreateUpgradeTaskResponse(BaseModel):
    task_id: str
    selected_qids: List[str]
    selected_skills: List[dict]
    skill_url: str
    command_text: str


class UpgradeStatusResponse(BaseModel):
    task_id: str
    status: str  # pending | processing | done
    old_iq: Optional[int] = None
    new_iq: Optional[int] = None
    old_title: Optional[str] = None
    new_title: Optional[str] = None
    old_title_color: Optional[str] = None
    new_title_color: Optional[str] = None
    old_percentile: Optional[float] = None
    new_percentile: Optional[float] = None


class CompleteUpgradeResponse(BaseModel):
    task_id: str
    status: str
    old_iq: int
    new_iq: int
    old_title: str
    new_title: str
    old_title_color: str
    new_title_color: str
    old_percentile: float
    new_percentile: float


# ---- Sprint 4: Referral & History Models ----

class ReferralRecordRequest(BaseModel):
    sharer_token: str
    friend_token: str


class ReferralCheckResponse(BaseModel):
    has_completed_friend: bool
    friend_name: Optional[str] = None


class ReferralRedeemRequest(BaseModel):
    token: str
    qid: str


class ReferralRedeemResponse(BaseModel):
    success: bool
    task_id: str
    message: str


class HistoryEntry(BaseModel):
    iq: int
    title: str
    title_color: str
    completed_at: str


class HistoryResponse(BaseModel):
    lobster_name: str
    entries: List[HistoryEntry]
