import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { apiGet } from "@/lib/api";
import ActivityToast from "@/components/ActivityToast";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/teamoreview";

interface TestStatus {
  token: string;
  lobster_name: string;
  status: string;
  iq: number | null;
  title: string | null;
}

const TIPS = [
  "🧠 龙虾的大脑和蚂蚱差不多大，但比你想象中聪明",
  "🦞 龙虾可以活到 100 岁以上，它们的智力会随年龄增长",
  "📊 全球每天有超过 10 万只 AI 龙虾在完成各种任务",
  "🎯 安装更多 Skill 可以提升龙虾的能力上限",
  "🏆 波士顿龙虾称号需要智力值达到 150+",
  "⚡ 答题速度也会影响最终智力值，最高可加 20 分",
  "🔧 龙虾学校会测试 16 项核心能力",
  "💡 即使某项能力得 0 分，也可以通过安装 Skill 来补强",
];

export default function WaitPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<"pending" | "done">("pending");
  const [lobsterName, setLobsterName] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for status
  useEffect(() => {
    if (!token || typeof token !== "string") return;

    const poll = async () => {
      try {
        const data = await apiGet<TestStatus>(`/api/test/status/${token}`);
        setLobsterName(data.lobster_name);
        if (data.status === "done") {
          setStatus("done");
          // Sprint 4: Save to localStorage for returning user
          if (typeof window !== "undefined" && typeof token === "string") {
            localStorage.setItem("lobster_token", token);
            localStorage.setItem("lobster_name", data.lobster_name);
          }
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // continue polling
      }
    };

    poll(); // initial
    pollRef.current = setInterval(poll, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token]);

  // Tips rotation
  useEffect(() => {
    tipRef.current = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => {
      if (tipRef.current) clearInterval(tipRef.current);
    };
  }, []);

  const handleViewResult = () => {
    router.push(`/r/${token}`);
  };

  return (
    <>
      <Head>
        <title>
          {status === "done" ? "答卷已收到！" : "龙虾答题中..."} — 龙虾学校
        </title>
      </Head>

      {/* Sprint 5: Activity Toast */}
      <ActivityToast />

      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: "#FAFAFA" }}
      >
        <div className="w-full max-w-md text-center">
          {status === "pending" ? (
            <>
              {/* Thinking animation */}
              <div className="text-6xl mb-6">🦞</div>
              <div className="flex justify-center gap-1.5 mb-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: "#FF6B35",
                      animation: `pulse-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }}
                  />
                ))}
              </div>

              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: "#1A1A2E" }}
              >
                {lobsterName ? `「${lobsterName}」正在答题` : "龙虾正在答题"}
              </h2>
              <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
                预计需要 10-15 分钟，请耐心等待
              </p>

              {/* Tips */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{
                  background: "#FFF3EE",
                  minHeight: "80px",
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "#FF6B35" }}>
                  🦞 龙虾学校快报
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: "#1A1A2E",
                    animation: "fadeIn 0.5s ease",
                  }}
                  key={tipIndex}
                >
                  {TIPS[tipIndex]}
                </p>
              </div>

              {/* Sprint 5: QR Code */}
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div
                  className="mx-auto mb-3 rounded-lg flex items-center justify-center"
                  style={{
                    width: "120px",
                    height: "120px",
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${BASE_PATH}/static/qrcode-group.png`}
                    alt="群二维码"
                    style={{ width: "100px", height: "100px", objectFit: "contain" }}
                    onError={(e) => {
                      // Fallback: show placeholder text if image not found
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector("span")) {
                        const span = document.createElement("span");
                        span.textContent = "📱";
                        span.style.fontSize = "40px";
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>
                  龙虾进阶玩法，扫码进群！
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Done state */}
              <div className="text-6xl mb-4">🎉</div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: "#1A1A2E" }}
              >
                已收到答卷！
              </h2>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                {lobsterName
                  ? `「${lobsterName}」已完成测试`
                  : "你的龙虾已完成测试"}
              </p>
              <button
                onClick={handleViewResult}
                className="w-full max-w-xs h-12 rounded-full text-white font-semibold text-base transition-colors cursor-pointer"
                style={{ backgroundColor: "#FF6B35" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#E55A2B")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#FF6B35")
                }
              >
                查看结果分数
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
