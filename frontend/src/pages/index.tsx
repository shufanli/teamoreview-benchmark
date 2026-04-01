import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import BottomSheet from "@/components/BottomSheet";
import CommandBlock from "@/components/CommandBlock";
import Leaderboard from "@/components/Leaderboard";
import ActivityToast from "@/components/ActivityToast";
import { apiPost, apiGet } from "@/lib/api";

interface StartTestResponse {
  token: string;
  lobster_name: string;
  questions: unknown[];
  skill_url: string;
  command_text: string;
}

interface LeaderboardData {
  entries: Array<{
    rank: number;
    lobster_name: string;
    iq: number;
    title: string;
    title_color: string;
    duration_seconds: number;
  }>;
  total_count: number;
}

export default function Home() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [commandText, setCommandText] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);

  // Sprint 5: Stats
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);

  // Sprint 4: Returning user state
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [refToken, setRefToken] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await apiGet<LeaderboardData>("/api/leaderboard?limit=100");
      setLeaderboard(data);
    } catch {
      // silent fail
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiGet<{ total_completed: number; currently_testing: number }>("/api/stats");
      setTotalCompleted(data.total_completed);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchStats();
  }, [fetchLeaderboard, fetchStats]);

  // Sprint 4: Check localStorage for returning user
  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("lobster_token");
      const n = localStorage.getItem("lobster_name");
      if (t) setSavedToken(t);
      if (n) setSavedName(n);
    }
  }, []);

  // Handle ?install=1 from share page CTA, capture ref
  useEffect(() => {
    if (router.query.install === "1") {
      if (router.query.ref && typeof router.query.ref === "string") {
        setRefToken(router.query.ref);
      }
      setSheetOpen(true);
      // Clean up URL
      router.replace("/", undefined, { shallow: true });
    }
  }, [router.query.install, router.query.ref]);

  const handleStartTest = () => {
    setStep(1);
    setName("");
    setCommandText("");
    setToken("");
    setCopied(false);
    setSheetOpen(true);
  };

  const handleNextStep = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { lobster_name: name.trim() };
      if (refToken) body.ref = refToken;
      const res = await apiPost<StartTestResponse>("/api/test/start", body);
      setToken(res.token);
      setCommandText(res.command_text);
      // Sprint 4: Save to localStorage for returning user
      if (typeof window !== "undefined") {
        localStorage.setItem("lobster_token", res.token);
        localStorage.setItem("lobster_name", name.trim());
      }
      setStep(2);
    } catch (err) {
      alert("创建测试失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopied = () => {
    setCopied(true);
  };

  const handleConfirmSent = () => {
    router.push(`/wait/${token}`);
  };

  return (
    <>
      <Head>
        <title>龙虾学校 — 你的小龙虾，够聪明吗？</title>
        <meta
          name="description"
          content="AI agent 能力测评，测一测你的小龙虾智力值"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
        {/* Hero */}
        <div className="px-4 pt-12 pb-8 text-center max-w-md mx-auto">
          <div className="text-5xl mb-4">🦞</div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "#1A1A2E" }}
          >
            龙虾学校
          </h1>
          <p className="text-base mb-8" style={{ color: "#6B7280" }}>
            你的小龙虾，够聪明吗？
          </p>

          {/* Sprint 5: Stats counter */}
          {totalCompleted !== null && (
            <p
              className="text-sm mb-4"
              style={{ color: "#9CA3AF" }}
            >
              已有 <span style={{ color: "#FF6B35", fontWeight: 600 }}>{totalCompleted}</span> 只龙虾完成测试
            </p>
          )}

          {/* CTA Button */}
          {savedToken ? (
            <div className="space-y-3 max-w-xs mx-auto">
              <button
                onClick={handleStartTest}
                className="w-full h-12 rounded-full text-white font-semibold text-base transition-colors cursor-pointer"
                style={{ backgroundColor: "#FF6B35" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#E55A2B")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#FF6B35")
                }
              >
                再次测试
              </button>
              <button
                onClick={() => router.push(`/r/${savedToken}`)}
                className="w-full h-11 rounded-full text-sm font-semibold cursor-pointer transition-colors"
                style={{
                  backgroundColor: "transparent",
                  border: "1.5px solid #FF6B35",
                  color: "#FF6B35",
                }}
              >
                查看测试结果{savedName ? `（${savedName}）` : ""}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartTest}
              className="w-full max-w-xs mx-auto h-12 rounded-full text-white font-semibold text-base transition-colors cursor-pointer"
              style={{ backgroundColor: "#FF6B35" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#E55A2B")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#FF6B35")
              }
            >
              开始智力测试
            </button>
          )}
        </div>

        {/* Leaderboard */}
        <div className="px-4 pb-12 max-w-md mx-auto">
          {leaderboard && (
            <Leaderboard
              entries={leaderboard.entries}
              totalCount={leaderboard.total_count}
            />
          )}
        </div>

        {/* Sprint 5: Activity Toast */}
        <ActivityToast />

        {/* Bottom Sheet */}
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          {step === 1 ? (
            <div>
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: "#1A1A2E" }}
              >
                给你的龙虾取个名字
              </h3>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="大力龙虾、闪电虾、学霸虾..."
                className="w-full h-12 px-4 rounded-xl border text-base outline-none transition-colors"
                style={{
                  borderColor: "#E5E7EB",
                  color: "#1A1A2E",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#FF6B35")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "#E5E7EB")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNextStep();
                }}
                maxLength={50}
                autoFocus
              />
              <button
                onClick={handleNextStep}
                disabled={!name.trim() || loading}
                className="w-full h-12 rounded-full text-white font-semibold mt-4 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#FF6B35" }}
              >
                {loading ? "创建中..." : "下一步"}
              </button>
            </div>
          ) : (
            <div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "#1A1A2E" }}
              >
                复制命令发给你的龙虾
              </h3>
              <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                将下面的命令复制到你的 OpenClaw 对话框中
              </p>
              <CommandBlock command={commandText} onCopied={handleCopied} />
              {copied && (
                <button
                  onClick={handleConfirmSent}
                  className="w-full h-12 rounded-full text-white font-semibold mt-4 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: "#FF6B35",
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  已发送给我的龙虾
                </button>
              )}
            </div>
          )}
        </BottomSheet>
      </div>
    </>
  );
}
