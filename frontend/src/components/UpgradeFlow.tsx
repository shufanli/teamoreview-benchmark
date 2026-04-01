import { useState, useEffect, useCallback, useRef } from "react";
import BottomSheet from "./BottomSheet";
import { apiPost, apiGet } from "@/lib/api";
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

interface UpgradeTaskResponse {
  task_id: string;
  selected_qids: string[];
  selected_skills: {
    qid: string;
    title: string;
    category: string;
    skill_pack: string;
    unlock_preview: string | null;
  }[];
  skill_url: string;
  command_text: string;
}

interface UpgradeStatusResponse {
  task_id: string;
  status: string;
  old_iq: number | null;
  new_iq: number | null;
  old_title: string | null;
  new_title: string | null;
  old_title_color: string | null;
  new_title_color: string | null;
  old_percentile: number | null;
  new_percentile: number | null;
}

interface UpgradeFlowProps {
  open: boolean;
  onClose: () => void;
  token: string;
  selectedQid: string;
  selectedDetail: ScoreDetail | null;
  currentIq: number;
  onUpgradeComplete: () => void;
}

type Step = 1 | 1.5 | 2 | 3 | 4;

const CHECK_ITEMS = [
  "正在安装能力升级包...",
  "正在验证安装环境...",
  "正在配置能力模块...",
  "正在运行升级测试...",
  "正在更新能力评分...",
];

export default function UpgradeFlow({
  open,
  onClose,
  token,
  selectedQid,
  selectedDetail,
  currentIq,
  onUpgradeComplete,
}: UpgradeFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [taskData, setTaskData] = useState<UpgradeTaskResponse | null>(null);
  const [statusData, setStatusData] = useState<UpgradeStatusResponse | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [checkProgress, setCheckProgress] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estimated score increase per ability
  const estimatedIncrease = selectedDetail
    ? selectedDetail.max_score - selectedDetail.score
    : 10;
  const predictedIq = currentIq + estimatedIncrease;

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setStep(1);
      setTaskData(null);
      setStatusData(null);
      setCopied(false);
      setError("");
      setCheckProgress(0);
      setProgressPercent(0);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [open]);

  // Create task
  const createTask = useCallback(async () => {
    try {
      const data = await apiPost<UpgradeTaskResponse>(
        "/api/upgrade/basic/tasks",
        {
          token,
          selected_qids: [selectedQid],
        }
      );
      setTaskData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建升级任务失败");
    }
  }, [token, selectedQid]);

  // Create task when first opened
  useEffect(() => {
    if (open && !taskData && !error) {
      createTask();
    }
  }, [open, taskData, error, createTask]);

  // Step 3: Start polling + progress simulation
  useEffect(() => {
    if (step !== 3 || !taskData) return;

    // Progress simulation
    let pct = 0;
    progressRef.current = setInterval(() => {
      pct += Math.random() * 8 + 2;
      if (pct > 90) pct = 90; // Cap at 90% until done
      setProgressPercent(Math.round(pct));
    }, 800);

    // Check item animation
    let checkIdx = 0;
    const checkTimer = setInterval(() => {
      checkIdx++;
      if (checkIdx <= CHECK_ITEMS.length) {
        setCheckProgress(checkIdx);
      }
    }, 2000);

    // Poll upgrade status every 5 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const status = await apiGet<UpgradeStatusResponse>(
          `/api/upgrade/status/${taskData.task_id}`
        );
        if (status.status === "done") {
          setStatusData(status);
          setProgressPercent(100);
          setCheckProgress(CHECK_ITEMS.length);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (progressRef.current) clearInterval(progressRef.current);
          clearInterval(checkTimer);
          // Small delay before showing Step 4
          setTimeout(() => setStep(4), 800);
        }
      } catch {
        // Silently retry
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      clearInterval(checkTimer);
    };
  }, [step, taskData]);

  const handleCopy = async () => {
    if (!taskData) return;
    const ok = await copyToClipboard(taskData.command_text);
    if (ok) setCopied(true);
  };

  const handleStartWaiting = async () => {
    // Trigger auto-complete for MVP (simulates bot completing the upgrade)
    if (taskData) {
      try {
        await apiPost(`/api/upgrade/complete/${taskData.task_id}`, {});
      } catch {
        // Will be picked up by polling
      }
    }
    setStep(3);
  };

  const handleViewReport = () => {
    onUpgradeComplete();
    onClose();
  };

  const handleShare = async () => {
    if (!statusData) return;
    const shareText = `我的小龙虾刚刚升级了「${selectedDetail?.title}」能力！智力值从 ${statusData.old_iq} 提升到 ${statusData.new_iq}，来龙虾学校测测你的小龙虾吧！`;
    await copyToClipboard(shareText);
    onUpgradeComplete();
    onClose();
  };

  if (!selectedDetail) return null;

  return (
    <BottomSheet open={open} onClose={step === 3 ? () => {} : onClose} closeable={step !== 3}>
      {/* Step 1: Ability description + estimated improvement */}
      {step === 1 && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#1A1A2E" }}
          >
            🚀 能力升级
          </h3>

          {/* Ability info card */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "#FFF3EE" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#FFF7ED", color: "#EA580C" }}
              >
                {selectedDetail.qid.toUpperCase()}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: "#1A1A2E" }}
              >
                {selectedDetail.title}
              </span>
            </div>
            <p className="text-xs mb-2" style={{ color: "#6B7280" }}>
              当前得分：{selectedDetail.score}/{selectedDetail.max_score}
            </p>
            {selectedDetail.unlock_preview && (
              <p className="text-xs" style={{ color: "#FF6B35" }}>
                💡 解锁后：{selectedDetail.unlock_preview}
              </p>
            )}
          </div>

          {/* Estimated improvement */}
          <div
            className="rounded-xl p-4 mb-6 text-center"
            style={{ background: "#F0FDF4" }}
          >
            <p className="text-xs mb-1" style={{ color: "#6B7280" }}>
              预计提升
            </p>
            <div className="flex items-center justify-center gap-3">
              <span
                className="text-2xl font-bold"
                style={{ color: "#9CA3AF" }}
              >
                {currentIq}
              </span>
              <span style={{ color: "#22C55E", fontSize: "20px" }}>→</span>
              <span
                className="text-2xl font-bold"
                style={{ color: "#22C55E" }}
              >
                {predictedIq}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "#22C55E" }}>
              +{estimatedIncrease} 智力值
            </p>
          </div>

          {error && (
            <p className="text-xs text-center mb-4" style={{ color: "#EF4444" }}>
              {error}
            </p>
          )}

          <button
            onClick={() => setStep(1.5)}
            disabled={!taskData}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            ¥9.9 立即购买
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

      {/* Step 1.5: Payment confirmation (MVP: click to proceed) */}
      {step === 1.5 && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#1A1A2E" }}
          >
            💳 支付确认
          </h3>

          <div
            className="rounded-xl p-4 mb-4 text-center"
            style={{ background: "#FAFAFA", border: "1px solid #E5E7EB" }}
          >
            <p className="text-sm mb-1" style={{ color: "#6B7280" }}>
              升级能力
            </p>
            <p
              className="text-base font-semibold mb-3"
              style={{ color: "#1A1A2E" }}
            >
              {selectedDetail.title}
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "#FF6B35" }}
            >
              ¥9.9
            </p>
            <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
              升级后可永久使用该能力
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            我已支付
          </button>

          <button
            onClick={() => setStep(1)}
            className="w-full mt-3 text-sm cursor-pointer"
            style={{ color: "#6B7280", background: "none", border: "none" }}
          >
            返回上一步
          </button>
        </div>
      )}

      {/* Step 2: Copy upgrade command */}
      {step === 2 && taskData && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#1A1A2E" }}
          >
            📋 安装升级包
          </h3>

          <p className="text-sm text-center mb-4" style={{ color: "#6B7280" }}>
            复制以下命令，发送给你的小龙虾执行
          </p>

          {/* Command block */}
          <div
            className="relative rounded-xl p-4 mb-4"
            style={{
              background: "#1E1E2E",
              color: "#CDD6F4",
              fontFamily:
                "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: "13px",
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-3 py-1 rounded-md text-xs cursor-pointer transition-colors"
              style={{
                background: copied ? "#22C55E" : "#374151",
                color: "white",
                border: "none",
              }}
            >
              {copied ? "✅ 已复制" : "复制"}
            </button>
            <pre className="whitespace-pre-wrap break-all pr-16">
              {taskData.command_text}
            </pre>
          </div>

          {copied && (
            <button
              onClick={handleStartWaiting}
              className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors"
              style={{ backgroundColor: "#FF6B35" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#E55A2B")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#FF6B35")
              }
            >
              已发送，开始等待升级结果
            </button>
          )}

          {!copied && (
            <p
              className="text-xs text-center mt-2"
              style={{ color: "#9CA3AF" }}
            >
              请先复制命令
            </p>
          )}
        </div>
      )}

      {/* Step 3: Waiting for upgrade (not closeable) */}
      {step === 3 && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#1A1A2E" }}
          >
            ⏳ 正在升级中...
          </h3>

          {/* Progress bar */}
          <div className="mb-4">
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: "#E5E7EB" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    "linear-gradient(90deg, #FF6B35, #F59E0B)",
                  transition: "width 0.5s ease-out",
                }}
              />
            </div>
            <p
              className="text-xs text-center mt-1"
              style={{ color: "#6B7280" }}
            >
              {progressPercent}%
            </p>
          </div>

          {/* Check items */}
          <div className="space-y-2">
            {CHECK_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1"
              >
                <span className="text-sm">
                  {idx < checkProgress ? "✅" : "⏳"}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color:
                      idx < checkProgress ? "#22C55E" : "#9CA3AF",
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          <p
            className="text-xs text-center mt-4"
            style={{ color: "#9CA3AF" }}
          >
            升级过程中请勿关闭页面
          </p>
        </div>
      )}

      {/* Step 4: Upgrade complete */}
      {step === 4 && statusData && (
        <div>
          <h3
            className="text-lg font-semibold text-center mb-4"
            style={{ color: "#22C55E" }}
          >
            🎉 升级成功！
          </h3>

          {/* Ability change */}
          <div
            className="rounded-xl p-4 mb-3"
            style={{ background: "#F0FDF4" }}
          >
            <p
              className="text-xs text-center mb-2"
              style={{ color: "#6B7280" }}
            >
              能力变化
            </p>
            <p className="text-sm text-center font-semibold" style={{ color: "#1A1A2E" }}>
              {selectedDetail.title}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#FEF2F2", color: "#DC2626" }}
              >
                {selectedDetail.score}/{selectedDetail.max_score}
              </span>
              <span style={{ color: "#22C55E" }}>→</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#DCFCE7", color: "#16A34A" }}
              >
                {selectedDetail.max_score}/{selectedDetail.max_score}
              </span>
            </div>
          </div>

          {/* Score change */}
          <div
            className="rounded-xl p-4 mb-3 text-center"
            style={{ background: "#FFF3EE" }}
          >
            <p className="text-xs mb-1" style={{ color: "#6B7280" }}>
              智力值变化
            </p>
            <div className="flex items-center justify-center gap-3">
              <span
                className="text-2xl font-bold"
                style={{ color: "#9CA3AF" }}
              >
                {statusData.old_iq}
              </span>
              <span style={{ color: "#FF6B35", fontSize: "20px" }}>→</span>
              <span
                className="text-2xl font-bold"
                style={{ color: "#FF6B35" }}
              >
                {statusData.new_iq}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "#FF6B35" }}>
              +{(statusData.new_iq || 0) - (statusData.old_iq || 0)} 智力值
            </p>
          </div>

          {/* Title change */}
          {statusData.old_title !== statusData.new_title && (
            <div
              className="rounded-xl p-4 mb-4 text-center"
              style={{ background: "#FFFBEB" }}
            >
              <p className="text-xs mb-1" style={{ color: "#6B7280" }}>
                称号变化
              </p>
              <div className="flex items-center justify-center gap-3">
                <span
                  className="text-sm font-semibold"
                  style={{ color: statusData.old_title_color || "#9CA3AF" }}
                >
                  {statusData.old_title}
                </span>
                <span style={{ color: "#F59E0B" }}>→</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: statusData.new_title_color || "#FF6B35" }}
                >
                  {statusData.new_title}
                </span>
              </div>
            </div>
          )}

          {/* Percentile change */}
          {statusData.old_percentile !== null &&
            statusData.new_percentile !== null &&
            statusData.new_percentile > statusData.old_percentile && (
              <p
                className="text-xs text-center mb-4"
                style={{ color: "#22C55E" }}
              >
                排名提升：超过 {statusData.old_percentile}% → {statusData.new_percentile}% 的小龙虾
              </p>
            )}

          <button
            onClick={handleShare}
            className="w-full h-12 rounded-full text-white font-semibold text-base cursor-pointer transition-colors mb-3"
            style={{ backgroundColor: "#FF6B35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E55A2B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FF6B35")
            }
          >
            🎉 炫耀新成绩
          </button>

          <button
            onClick={handleViewReport}
            className="w-full h-11 rounded-full text-sm font-semibold cursor-pointer transition-colors"
            style={{
              backgroundColor: "transparent",
              border: "1.5px solid #FF6B35",
              color: "#FF6B35",
            }}
          >
            查看更新后的报告
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
