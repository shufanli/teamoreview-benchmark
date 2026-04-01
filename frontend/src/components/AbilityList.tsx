import { useState } from "react";

interface ScoreDetail {
  qid: string;
  title: string;
  score: number;
  max_score: number;
  category: string;
  reason: string | null;
  unlock_preview: string | null;
}

interface AbilityListProps {
  scoreDetails: ScoreDetail[];
  unlockedQids: string[];
  onUnlock: (qid: string, detail: ScoreDetail) => void;
  onShareUnlock: (qid: string, detail: ScoreDetail) => void;
}

function getScoreStatusStyle(score: number, maxScore: number, unlocked: boolean) {
  if (unlocked) {
    return {
      bg: "#DBEAFE",
      text: "#2563EB",
      icon: "🔓",
      label: "✅ 已解锁",
    };
  }
  if (score >= maxScore) {
    return {
      bg: "#DCFCE7",
      text: "#16A34A",
      icon: "✅",
      label: "满分",
    };
  }
  if (score >= maxScore * 0.6) {
    return {
      bg: "#DCFCE7",
      text: "#16A34A",
      icon: "✅",
      label: "良好",
    };
  }
  if (score > 0) {
    return {
      bg: "#FFF7ED",
      text: "#EA580C",
      icon: "⚠️",
      label: `${score}/${maxScore}`,
    };
  }
  return {
    bg: "#FEF2F2",
    text: "#DC2626",
    icon: "❌",
    label: `0/${maxScore}`,
  };
}

export default function AbilityList({
  scoreDetails,
  unlockedQids,
  onUnlock,
  onShareUnlock,
}: AbilityListProps) {
  // Track which perfect items are expanded (default collapsed)
  const [expandedPerfect, setExpandedPerfect] = useState<Set<string>>(new Set());

  const togglePerfect = (qid: string) => {
    setExpandedPerfect((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  return (
    <div className="mt-6">
      <h3
        className="text-base font-semibold mb-3"
        style={{ color: "#1A1A2E" }}
      >
        📋 能力扫描报告
      </h3>

      <div className="space-y-2">
        {scoreDetails.map((detail) => {
          const isUnlocked = unlockedQids.includes(detail.qid);
          const style = getScoreStatusStyle(detail.score, detail.max_score, isUnlocked);
          const isPerfect = detail.score >= detail.max_score;
          const isGood = detail.score >= detail.max_score * 0.6;
          const isLow = !isPerfect && !isGood && !isUnlocked;
          const canUpgrade = !isPerfect && !isGood && !isUnlocked && detail.unlock_preview;

          return (
            <div
              key={detail.qid}
              className="rounded-xl overflow-hidden"
              style={{
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {/* Header row - always visible */}
              <div
                className="flex items-center gap-3 p-3"
                onClick={isPerfect || isGood ? () => togglePerfect(detail.qid) : undefined}
                style={{ cursor: isPerfect || isGood ? "pointer" : "default" }}
              >
                <span className="text-base">{style.icon}</span>
                <span
                  className="flex-1 text-sm font-medium"
                  style={{ color: "#1A1A2E" }}
                >
                  {detail.qid.toUpperCase()} {detail.title}
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: style.bg,
                    color: style.text,
                  }}
                >
                  {style.label}
                </span>
                {(isPerfect || isGood) && (
                  <span
                    className="text-xs transition-transform"
                    style={{
                      color: "#9CA3AF",
                      transform: expandedPerfect.has(detail.qid)
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                )}
              </div>

              {/* Perfect/good items: collapsible detail */}
              {(isPerfect || isGood) && expandedPerfect.has(detail.qid) && (
                <div
                  className="px-3 pb-3 pt-0"
                  style={{ borderTop: "1px solid #E5E7EB" }}
                >
                  <p className="text-xs mt-2" style={{ color: "#22C55E" }}>
                    🎉 能力已满分，表现优秀！
                  </p>
                </div>
              )}

              {/* Low score items: always expanded */}
              {isLow && (
                <div
                  className="px-3 pb-3 pt-0"
                  style={{ borderTop: "1px solid #E5E7EB" }}
                >
                  {detail.reason && (
                    <p className="text-xs mt-2" style={{ color: "#6B7280" }}>
                      {detail.reason}
                    </p>
                  )}
                  {detail.unlock_preview && (
                    <p className="text-xs mt-1" style={{ color: "#FF6B35" }}>
                      💡 解锁后：{detail.unlock_preview}
                    </p>
                  )}

                  {/* Unlock buttons */}
                  {canUpgrade && (
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => onUnlock(detail.qid, detail)}
                        className="flex-1 h-9 rounded-full text-white text-sm font-semibold cursor-pointer transition-colors"
                        style={{ backgroundColor: "#FF6B35" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#E55A2B")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#FF6B35")
                        }
                      >
                        ¥9.9 解锁
                      </button>
                      <button
                        onClick={() => onShareUnlock(detail.qid, detail)}
                        className="flex-1 h-9 rounded-full text-sm font-semibold cursor-pointer transition-colors"
                        style={{
                          backgroundColor: "transparent",
                          border: "1.5px solid #FF6B35",
                          color: "#FF6B35",
                        }}
                      >
                        分享免费解锁
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Unlocked items: show unlocked status */}
              {isUnlocked && (
                <div
                  className="px-3 pb-3 pt-0"
                  style={{ borderTop: "1px solid #E5E7EB" }}
                >
                  <p className="text-xs mt-2" style={{ color: "#2563EB" }}>
                    🎉 已成功解锁升级！
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
