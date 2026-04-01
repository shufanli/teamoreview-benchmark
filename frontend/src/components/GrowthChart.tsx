interface HistoryEntry {
  iq: number;
  title: string;
  title_color: string;
  completed_at: string;
}

interface GrowthChartProps {
  entries: HistoryEntry[];
  lobsterName: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  } catch {
    return dateStr.slice(5, 10);
  }
}

export default function GrowthChart({ entries, lobsterName }: GrowthChartProps) {
  if (entries.length < 2) return null;

  const padding = { top: 24, right: 20, bottom: 40, left: 36 };
  const width = 320;
  const height = 180;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const iqs = entries.map((e) => e.iq);
  const minIq = Math.max(0, Math.min(...iqs) - 10);
  const maxIq = Math.max(...iqs) + 10;
  const iqRange = maxIq - minIq || 1;

  // Compute points
  const points = entries.map((entry, i) => ({
    x: padding.left + (i / (entries.length - 1)) * chartW,
    y: padding.top + chartH - ((entry.iq - minIq) / iqRange) * chartH,
    iq: entry.iq,
    date: formatDate(entry.completed_at),
    color: entry.title_color,
  }));

  // Build polyline path
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis ticks (3 ticks)
  const yTicks = [minIq, Math.round((minIq + maxIq) / 2), maxIq];

  return (
    <div className="mt-6">
      <h3
        className="text-base font-semibold mb-3"
        style={{ color: "#1A1A2E" }}
      >
        📈 {lobsterName} 的成长日记
      </h3>

      <div
        className="rounded-xl p-4"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ maxWidth: `${width}px`, display: "block", margin: "0 auto" }}
        >
          {/* Grid lines */}
          {yTicks.map((val) => {
            const y = padding.top + chartH - ((val - minIq) / iqRange) * chartH;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeDasharray="4 2"
                  strokeWidth={0.5}
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#9CA3AF"
                  fontSize="10"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="10"
            >
              {p.date}
            </text>
          ))}

          {/* Area fill */}
          <polygon
            points={`${points[0].x},${padding.top + chartH} ${polyline} ${points[points.length - 1].x},${padding.top + chartH}`}
            fill="url(#growthGradient)"
            opacity={0.3}
          />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#FFFFFF"
                stroke={p.color || "#FF6B35"}
                strokeWidth={2.5}
              />
              {/* IQ label above point */}
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fill="#1A1A2E"
                fontSize="11"
                fontWeight="600"
              >
                {p.iq}
              </text>
            </g>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.05} />
            </linearGradient>
          </defs>
        </svg>

        <p
          className="text-xs text-center mt-2"
          style={{ color: "#9CA3AF" }}
        >
          共 {entries.length} 次测评
        </p>
      </div>
    </div>
  );
}
