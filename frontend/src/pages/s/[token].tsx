import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import ScoreCard from "@/components/ScoreCard";
import Leaderboard from "@/components/Leaderboard";
import { apiGet } from "@/lib/api";

interface LeaderboardEntry {
  rank: number;
  lobster_name: string;
  iq: number;
  title: string;
  title_color: string;
  duration_seconds: number;
}

interface ShareData {
  token: string;
  lobster_name: string;
  iq: number;
  title: string;
  title_color: string;
  percentile: number;
  leaderboard: {
    entries: LeaderboardEntry[];
    total_count: number;
  };
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/teamoreview";

export default function SharePage() {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || typeof token !== "string") return;

    apiGet<ShareData>(`/api/share/${token}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Sprint 4: Capture ref parameter from URL
  const ref = router.query.ref as string | undefined;

  const handleCTA = () => {
    // Open install bottom sheet on home page, passing ref if present
    const params = new URLSearchParams({ install: "1" });
    if (ref) params.set("ref", ref);
    router.push(`/?${params.toString()}`);
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

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#FAFAFA" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">😢</div>
          <p style={{ color: "#1A1A2E" }} className="font-semibold">
            {error || "未找到分享内容"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2 rounded-full text-sm font-medium cursor-pointer"
            style={{ backgroundColor: "#FF6B35", color: "white" }}
          >
            去首页看看
          </button>
        </div>
      </div>
    );
  }

  const ogTitle = `「${data.lobster_name}」在龙虾学校智力值 ${data.iq}，你的小龙虾够聪明吗？`;
  const ogDescription = `${data.lobster_name} 荣获「${data.title}」称号，超过 ${data.percentile}% 的小龙虾！来测测你的小龙虾有多聪明`;

  return (
    <>
      <Head>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
        <div className="max-w-md mx-auto px-4 pt-6 pb-28">
          {/* Header */}
          <div className="text-center mb-4">
            <span className="text-3xl">🦞</span>
            <h1
              className="text-lg font-semibold mt-1"
              style={{ color: "#1A1A2E" }}
            >
              龙虾学校 · 成绩分享
            </h1>
          </div>

          {/* Score Card (no upgrade button, simplified) */}
          <ScoreCard
            lobsterName={data.lobster_name}
            iq={data.iq}
            title={data.title}
            titleColor={data.title_color}
            percentile={data.percentile}
            baseScore={0}
            speedScore={0}
            skillBonus={0}
            durationSeconds={0}
          />

          {/* Ability Overview - bar chart showing 16 questions */}
          {/* Not shown on share page per requirement: "分享页不显示能力扫描详情和升级按钮" */}

          {/* Leaderboard */}
          <div className="mt-6">
            <Leaderboard
              entries={data.leaderboard.entries}
              totalCount={data.leaderboard.total_count}
              highlightName={data.lobster_name}
            />
          </div>
        </div>

        {/* Sticky CTA Button */}
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
              onClick={handleCTA}
              className="w-full h-12 rounded-full text-white font-semibold text-base transition-colors cursor-pointer"
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
              测测你的小龙虾有多聪明
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
