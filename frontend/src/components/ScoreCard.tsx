import { useEffect, useState, useRef } from "react";

interface ScoreCardProps {
  lobsterName: string;
  iq: number;
  title: string;
  titleColor: string;
  percentile: number;
  baseScore: number;
  speedScore: number;
  skillBonus: number;
  durationSeconds: number;
  /** Optional: animate ring to this target IQ (for upgrade preview) */
  animateToIq?: number | null;
  /** Called when animateToIq animation finishes */
  onAnimateComplete?: () => void;
}

export default function ScoreCard({
  lobsterName,
  iq,
  title,
  titleColor,
  percentile,
  durationSeconds,
  animateToIq,
  onAnimateComplete,
}: ScoreCardProps) {
  const [displayIq, setDisplayIq] = useState(0);
  const [progress, setProgress] = useState(0);
  const animRef = useRef(false);

  // 最大显示值用于环形进度比例 (capped at 170 for display)
  const maxDisplay = 170;
  const progressTarget = Math.min((iq / maxDisplay) * 100, 100);

  useEffect(() => {
    if (animRef.current) return;
    animRef.current = true;

    // Count up animation
    const duration = 1000;
    const steps = 30;
    const increment = iq / steps;
    const progressInc = progressTarget / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setDisplayIq(Math.min(Math.round(increment * step), iq));
      setProgress(Math.min(progressInc * step, progressTarget));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => {
      clearInterval(timer);
      animRef.current = false;
    };
  }, [iq, progressTarget]);

  // Animate to target IQ when triggered
  useEffect(() => {
    if (animateToIq == null || animateToIq <= iq) return;

    const targetProgress = Math.min((animateToIq / maxDisplay) * 100, 100);
    const duration = 1200;
    const steps = 36;
    const startIq = iq;
    const iqIncrement = (animateToIq - startIq) / steps;
    const startProgress = progressTarget;
    const progressInc = (targetProgress - startProgress) / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setDisplayIq(Math.min(Math.round(startIq + iqIncrement * step), animateToIq));
      setProgress(Math.min(startProgress + progressInc * step, targetProgress));
      if (step >= steps) {
        clearInterval(timer);
        // Reset back after a short pause
        setTimeout(() => {
          setDisplayIq(iq);
          setProgress(progressTarget);
          if (onAnimateComplete) onAnimateComplete();
        }, 500);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [animateToIq, iq, progressTarget, maxDisplay, onAnimateComplete]);

  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return (
    <div
      className="rounded-xl p-6 text-center"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* 龙虾名字 */}
      <h2
        className="text-xl font-semibold mb-4"
        style={{ color: "#1A1A2E" }}
      >
        {lobsterName}
      </h2>

      {/* 环形进度条 */}
      <div className="relative inline-block mb-4">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={titleColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 80 80)"
            style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color: titleColor }}
          >
            {displayIq}
          </span>
          <span className="text-xs text-text-muted">智力值</span>
        </div>
      </div>

      {/* 称号 */}
      <div
        className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-3"
        style={{
          backgroundColor: `${titleColor}18`,
          color: titleColor,
        }}
      >
        {title}
      </div>

      {/* 百分位 */}
      <p className="text-sm text-text-secondary mb-2">
        超过 <span className="font-semibold text-primary">{percentile}%</span> 的小龙虾
      </p>

      {/* 耗时 (hide when 0) */}
      {durationSeconds > 0 && (
        <p className="text-xs text-text-muted">
          耗时 {minutes > 0 ? `${minutes}分` : ""}{seconds}秒
        </p>
      )}
    </div>
  );
}
