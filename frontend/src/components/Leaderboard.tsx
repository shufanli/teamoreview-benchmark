import { getTitleColor } from "@/lib/titles";

interface LeaderboardEntry {
  rank: number;
  lobster_name: string;
  iq: number;
  title: string;
  title_color: string;
  duration_seconds: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  totalCount: number;
  highlightToken?: string;
  highlightName?: string;
}

function getRankDisplay(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function Leaderboard({
  entries,
  totalCount,
  highlightName,
}: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        暂无排名数据，成为第一个测试的龙虾吧！
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">
          🏆 龙虾排位榜
        </h2>
        <span className="text-xs text-text-muted">
          共 {totalCount} 只龙虾
        </span>
      </div>
      <div
        className="rounded-xl overflow-hidden bg-card-bg"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="max-h-[480px] overflow-y-auto">
          {entries.map((entry) => {
            const isHighlighted = highlightName != null && entry.lobster_name === highlightName;
            return (
            <div
              key={entry.rank}
              className="flex items-center gap-3 border-b border-border last:border-b-0"
              style={{
                padding: "12px 16px",
                ...(isHighlighted
                  ? {
                      background: "#FFF3EE",
                      border: "2px solid #FF6B35",
                      borderRadius: "12px",
                    }
                  : {}),
              }}
            >
              <span
                className="w-10 text-center text-sm font-semibold shrink-0"
                style={{
                  color:
                    entry.rank <= 3
                      ? "#FF6B35"
                      : "#6B7280",
                }}
              >
                {getRankDisplay(entry.rank)}
              </span>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: getTitleColor(entry.title),
                }}
              />
              <span className="flex-1 text-sm font-medium text-text-primary truncate">
                {entry.lobster_name}
              </span>
              <span className="text-sm font-semibold text-text-primary shrink-0">
                智力值 {entry.iq}
              </span>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
