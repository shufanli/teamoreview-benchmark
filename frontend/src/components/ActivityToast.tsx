import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface Activity {
  lobster_name: string;
  iq: number;
  completed_at: string;
  is_fake: boolean;
}

interface ActivityToastProps {
  /** Interval in ms between toasts (default 6000-8000 random) */
  intervalMs?: number;
}

export default function ActivityToast({ intervalMs }: ActivityToastProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef(false);

  const fetchActivities = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const data = await apiGet<{ activities: Activity[] }>("/api/activity?limit=10");
      setActivities(data.activities);
    } catch {
      // Use fallback data
      setActivities([
        { lobster_name: "闪电虾", iq: 85, completed_at: "", is_fake: true },
        { lobster_name: "学霸虾", iq: 120, completed_at: "", is_fake: true },
        { lobster_name: "懒虾", iq: 65, completed_at: "", is_fake: true },
        { lobster_name: "卷王虾", iq: 110, completed_at: "", is_fake: true },
        { lobster_name: "佛系虾", iq: 78, completed_at: "", is_fake: true },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (activities.length === 0) return;

    const scheduleNext = () => {
      const delay = intervalMs || (5000 + Math.random() * 3000); // 5-8 seconds
      timerRef.current = setTimeout(() => {
        setVisible(true);
        // Hide after 3 seconds
        setTimeout(() => {
          setVisible(false);
          setCurrentIndex((prev) => (prev + 1) % activities.length);
          scheduleNext();
        }, 3000);
      }, delay);
    };

    // Show first toast after initial delay
    const initialDelay = 2000 + Math.random() * 2000;
    timerRef.current = setTimeout(() => {
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        scheduleNext();
      }, 3000);
    }, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activities, intervalMs]);

  if (activities.length === 0) return null;

  const activity = activities[currentIndex];
  if (!activity) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(100px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        background: "rgba(26, 26, 46, 0.9)",
        backdropFilter: "blur(8px)",
        color: "white",
        padding: "10px 18px",
        borderRadius: "9999px",
        fontSize: "13px",
        zIndex: 50,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        pointerEvents: "none",
      }}
    >
      🦞 {activity.lobster_name}刚刚完成测试，智力值 {activity.iq}
    </div>
  );
}
