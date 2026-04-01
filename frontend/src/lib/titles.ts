export const TITLE_COLORS: Record<string, string> = {
  "波士顿龙虾": "#FFD700",
  "锦绣龙虾": "#DC2626",
  "澳洲大龙虾": "#DC2626",
  "澳洲小青龙": "#DC2626",
  "阿根廷红虾": "#FF6B35",
  "黑虎虾": "#FF6B35",
  "北极甜虾": "#F59E0B",
  "青虾": "#F59E0B",
  "基围虾": "#3B82F6",
  "黄油焗大虾": "#3B82F6",
  "蒜蓉大虾": "#9CA3AF",
  "油焖小龙虾": "#9CA3AF",
  "麻辣小龙虾": "#9CA3AF",
  "麻辣虾尾": "#9CA3AF",
  "白灼虾": "#9CA3AF",
  "冻虾仁": "#9CA3AF",
  "虾皮": "#9CA3AF",
};

export function getTitleColor(title: string): string {
  return TITLE_COLORS[title] || "#9CA3AF";
}
