import { useState, useEffect, useCallback } from "react";
import BottomSheet from "./BottomSheet";
import { apiGet, apiPost } from "@/lib/api";
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

interface ReferralCheckResponse {
  has_completed_friend: boolean;
  friend_name: string | null;
}

interface ReferralRedeemResponse {
  success: boolean;
  task_id: string;
  message: string;
}

interface ReferralFlowProps {
  open: boolean;
  onClose: () => void;
  token: string;
  /** The qid that triggered the flow */
  triggerQid: string;
  /** All low-score items the user can choose to unlock */
  lowScoreDetails: ScoreDetail[];
  onRedeemComplete: () => void;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/teamoreview";

type Step = "rules" | "shared" | "checking" | "choose" | "done";

export default function ReferralFlow({
  open,
  onClose,
  token,
  triggerQid,
  lowScoreDetails,
  onRedeemComplete,
}: ReferralFlowProps) {
  const [step, setStep] = useState<Step>("rules");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [friendName, setFriendName] = useState<string | null>(null);
  const [selectedQid, setSelectedQid] = useState(triggerQid);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState("");
  const [error, setError] = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("rules");
      setCopied(false);
      setChecking(false);
      setFriendName(null);
      setSelectedQid(triggerQid);
      setRedeeming(false);
      setRedeemMessage("");
      setError("");
    }
  }, [open, triggerQid]);

  const shareLink = typeof window !== "undefined"
    ? `${window.location.origin}${BASE_PATH}/s/${token}?ref=${token}`
    : "";

  const handleCopyLink = async () => {
    const text = `我在龙虾学校测了AI龙虾的智力值，你也来试试？${shareLink}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setStep("shared");
    }
  };

  const handleCheckFriend = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const data = await apiGet<ReferralCheckResponse>(
        `/api/referral/check/${token}`
      );
      if (data.has_completed_friend) {
        setFriendName(data.friend_name || "好友");
        setStep("choose");
      } else {
        setError("暂时还没有好友通过你的链接完成测试，请稍后再试");
      }
    } catch {
      setError("检查失败，请稍后重试");
    } finally {
      setChecking(false);
    }
  }, [token]);

  const handleRedeem = async () => {
    setRedeeming(true);
    setError("");
    try {
      const data = await apiPost<ReferralRedeemResponse>(
        "/api/referral/redeem",
        { token, qid: selectedQid }
      );
      setRedeemMessage(data.message);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "兑换失败");
    } finally {
      setRedeeming(false);
    }
  };

  const handleDone = () => {
    onRedeemComplete();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Step: Rules */}
      {step === "rules" && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#1A1A2E" }}
          >
            🎁 分享免费解锁
          </h3>

          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "#FFF3EE" }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: "#1A1A2E" }}>
              规则说明
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">1️⃣</span>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  点击「去分享」复制你的专属邀请链接
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">2️⃣</span>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  将链接发给好友，好友通过链接完成智力测试
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">3️⃣</span>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  好友完成测试后，回来点击「好友已测试」验证
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">4️⃣</span>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  验证成功后，免费选择解锁 1 项能力
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            去分享
          </button>

          <button
            onClick={onClose}
            className="w-full mt-3 text-sm cursor-pointer"
            style={{ color: "#6B7280", background: "none", border: "none" }}
          >
            稍后再说
          </button>
        </div>
      )}

      {/* Step: Shared - waiting for friend */}
      {step === "shared" && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#1A1A2E" }}
          >
            📋 链接已复制
          </h3>

          <div
            className="rounded-xl p-4 mb-4 text-center"
            style={{ background: "#F0FDF4" }}
          >
            <p className="text-sm" style={{ color: "#22C55E" }}>
              ✅ 分享链接已复制到剪贴板
            </p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              将链接发给好友，等好友完成测试后回来验证
            </p>
          </div>

          <button
            onClick={handleCheckFriend}
            disabled={checking}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            {checking ? "验证中..." : "好友已测试"}
          </button>

          {error && (
            <p className="text-xs text-center mt-3" style={{ color: "#EF4444" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleCopyLink}
            className="w-full mt-3 text-sm cursor-pointer"
            style={{ color: "#FF6B35", background: "none", border: "none" }}
          >
            再次复制链接
          </button>
        </div>
      )}

      {/* Step: Choose which ability to unlock */}
      {step === "choose" && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-2"
            style={{ color: "#22C55E" }}
          >
            🎉 验证成功！
          </h3>
          <p className="text-sm text-center mb-4" style={{ color: "#6B7280" }}>
            好友「{friendName}」已完成测试，选择要免费解锁的能力
          </p>

          <div className="space-y-2 mb-4" style={{ maxHeight: "40vh", overflowY: "auto" }}>
            {lowScoreDetails.map((detail) => (
              <div
                key={detail.qid}
                onClick={() => setSelectedQid(detail.qid)}
                className="rounded-xl p-3 cursor-pointer transition-all"
                style={{
                  background: selectedQid === detail.qid ? "#FFF3EE" : "#FFFFFF",
                  border: `2px solid ${selectedQid === detail.qid ? "#FF6B35" : "#E5E7EB"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: selectedQid === detail.qid ? "#FF6B35" : "#E5E7EB",
                    }}
                  >
                    {selectedQid === detail.qid && (
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: "#FF6B35" }}
                      />
                    )}
                  </span>
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: "#1A1A2E" }}
                  >
                    {detail.qid.toUpperCase()} {detail.title}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "#FEF2F2", color: "#DC2626" }}
                  >
                    {detail.score}/{detail.max_score}
                  </span>
                </div>
                {detail.unlock_preview && (
                  <p className="text-xs mt-1 ml-7" style={{ color: "#FF6B35" }}>
                    💡 {detail.unlock_preview}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-center mb-3" style={{ color: "#EF4444" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleRedeem}
            disabled={!selectedQid || redeeming}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            {redeeming ? "解锁中..." : "确认免费解锁"}
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "#22C55E" }}
          >
            解锁成功！
          </h3>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
            {redeemMessage}
          </p>

          <button
            onClick={handleDone}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            查看更新后的报告
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
