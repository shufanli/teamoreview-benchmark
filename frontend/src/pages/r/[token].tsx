import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import ScoreCard from "@/components/ScoreCard";
import AbilityList from "@/components/AbilityList";
import UpgradeFlow from "@/components/UpgradeFlow";
import ReferralFlow from "@/components/ReferralFlow";
import GrowthChart from "@/components/GrowthChart";
import { apiGet } from "@/lib/api";
import { copyToClipboard } from "@/lib/copy";

interface ScoreDetail {
  qid: string;
  title: string;
  score: number;
  max_score: number;
  category: string;
  reason: string | null;
  unlock_preview: string | null;
}

interface TestResult {
  token: string;
  lobster_name: string;
  iq: number;
  title: string;
  title_color: string;
  base_score: number;
  speed_score: number;
  skill_bonus: number;
  percentile: number;
  duration_seconds: number;
  score_details: ScoreDetail[];
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/teamoreview";

export default function ReportPage() {
  const router = useRouter();
  const { token } = router.query;
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  // Sprint 3: Upgrade state
  const [unlockedQids, setUnlockedQids] = useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedQid, setSelectedQid] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<ScoreDetail | null>(null);
  const [animateToIq, setAnimateToIq] = useState<number | null>(null);

  // Sprint 4: Referral & History state
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralTriggerQid, setReferralTriggerQid] = useState("");
  const [historyEntries, setHistoryEntries] = useState<
    Array<{ iq: number; title: string; title_color: string; completed_at: string }>
  >([]);

  const fetchResult = useCallback(async () => {
    if (!token || typeof token !== "string") return;
    try {
      const data = await apiGet<TestResult>(`/api/test/result/${token}`);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchUnlocked = useCallback(async () => {
    if (!token || typeof token !== "string") return;
    try {
      const data = await apiGet<{ unlocked_qids: string[] }>(
        `/api/upgrade/tasks/${token}`
      );
      setUnlockedQids(data.unlocked_qids);
    } catch {
      // OK if no upgrades yet
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token || typeof token !== "string") return;
    try {
      const data = await apiGet<{
        lobster_name: string;
        entries: Array<{ iq: number; title: string; title_color: string; completed_at: string }>;
      }>(`/api/history/${token}`);
      setHistoryEntries(data.entries);
    } catch {
      // OK if no history
    }
  }, [token]);

  useEffect(() => {
    fetchResult();
    fetchUnlocked();
    fetchHistory();
  }, [fetchResult, fetchUnlocked, fetchHistory]);

  const handleShare = async () => {
    if (!result || !token) return;
    const shareUrl = `${window.location.origin}${BASE_PATH}/s/${token}`;
    const shareText =
      `我的小龙虾「${result.lobster_name}」在龙虾学校智力测试中获得 ${result.iq} 分，` +
      `荣获「${result.title}」称号，超过 ${result.percentile}% 的小龙虾！` +
      `你的小龙虾够聪明吗？👉 ${shareUrl}`;

    const ok = await copyToClipboard(shareText);
    if (ok) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleUnlock = (qid: string, detail: ScoreDetail) => {
    if (!result) return;
    setSelectedQid(qid);
    setSelectedDetail(detail);

    // Calculate predicted IQ for ring animation
    const increase = detail.max_score - detail.score;
    const predictedIq = result.iq + increase;

    // Trigger ring animation, then open BottomSheet
    setAnimateToIq(predictedIq);
  };

  const handleAnimateComplete = () => {
    setAnimateToIq(null);
    setUpgradeOpen(true);
  };

  const handleShareUnlock = (qid: string, _detail: ScoreDetail) => {
    setReferralTriggerQid(qid);
    setReferralOpen(true);
  };

  const handleUpgradeComplete = () => {
    // Refresh data after upgrade
    fetchResult();
    fetchUnlocked();
    fetchHistory();
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FAFAFA" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🦞</div>
          <p style={{ color: "#6B7280" }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#FAFAFA" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">😢</div>
          <p style={{ color: "#1A1A2E" }} className="font-semibold">
            {error || "未找到测试结果"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2 rounded-full text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: "#FF6B35",
              color: "white",
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const perfectCount = result.score_details.filter(
    (d) => d.score >= d.max_score
  ).length;
  const improvableCount = result.score_details.filter(
    (d) => d.score < d.max_score
  ).length;

  return (
    <>
      <Head>
        <title>
          {result.lobster_name} 的测试报告 — 龙虾学校
        </title>
      </Head>

      <div
        className="min-h-screen pb-24"
        style={{ background: "#FAFAFA" }}
      >
        <div className="max-w-md mx-auto px-4 pt-6">
          {/* Back button */}
          <button
            onClick={() => router.push("/")}
            className="text-sm mb-4 cursor-pointer"
            style={{ color: "#6B7280" }}
          >
            ← 返回首页
          </button>

          {/* Score Card */}
          <ScoreCard
            lobsterName={result.lobster_name}
            iq={result.iq}
            title={result.title}
            titleColor={result.title_color}
            percentile={result.percentile}
            baseScore={result.base_score}
            speedScore={result.speed_score}
            skillBonus={result.skill_bonus}
            durationSeconds={result.duration_seconds}
            animateToIq={animateToIq}
            onAnimateComplete={handleAnimateComplete}
          />

          {/* Diagnosis Summary */}
          <div
            className="mt-4 rounded-xl p-4 text-center"
            style={{
              background: "#FFF3EE",
            }}
          >
            <p className="text-sm" style={{ color: "#1A1A2E" }}>
              {improvableCount > 0 ? (
                <>
                  发现{" "}
                  <span className="font-semibold" style={{ color: "#FF6B35" }}>
                    {improvableCount} 项
                  </span>{" "}
                  能力可提升，
                  <span className="font-semibold" style={{ color: "#22C55E" }}>
                    {perfectCount} 项
                  </span>{" "}
                  已满分
                </>
              ) : (
                <span style={{ color: "#22C55E" }} className="font-semibold">
                  全部满分！你的龙虾太厉害了！
                </span>
              )}
            </p>
          </div>

          {/* Ability List (Sprint 3 enhanced) */}
          <AbilityList
            scoreDetails={result.score_details}
            unlockedQids={unlockedQids}
            onUnlock={handleUnlock}
            onShareUnlock={handleShareUnlock}
          />

          {/* Sprint 4: Growth Chart (shown when 2+ test records) */}
          {historyEntries.length >= 2 && (
            <GrowthChart
              entries={historyEntries}
              lobsterName={result.lobster_name}
            />
          )}
        </div>
      </div>

      {/* Sticky Share Button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4"
        style={{
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          paddingTop: "12px",
          background: "linear-gradient(transparent, #FAFAFA 30%)",
        }}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={handleShare}
            className="w-full h-12 rounded-full text-white font-semibold text-base transition-colors cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: "#FF6B35",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            {improvableCount > 0 ? (
              <>
                <span>📤</span> 分享免费解锁 1 项能力
              </>
            ) : (
              <>
                <span>🎉</span> 炫耀我的成绩
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upgrade Flow Bottom Sheet */}
      {result && token && typeof token === "string" && (
        <UpgradeFlow
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          token={token}
          selectedQid={selectedQid}
          selectedDetail={selectedDetail}
          currentIq={result.iq}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}

      {/* Sprint 4: Referral Flow Bottom Sheet */}
      {result && token && typeof token === "string" && (
        <ReferralFlow
          open={referralOpen}
          onClose={() => setReferralOpen(false)}
          token={token}
          triggerQid={referralTriggerQid}
          lowScoreDetails={result.score_details.filter(
            (d) =>
              d.score < d.max_score &&
              d.score < d.max_score * 0.6 &&
              !unlockedQids.includes(d.qid) &&
              d.unlock_preview
          )}
          onRedeemComplete={handleUpgradeComplete}
        />
      )}

      {/* Toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(26, 26, 46, 0.85)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "9999px",
            fontSize: "13px",
            zIndex: 100,
            animation: "slideUp 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          已复制到剪贴板，快去分享吧！
        </div>
      )}
    </>
  );
}
