import { useState } from "react";
import { copyToClipboard } from "@/lib/copy";

interface CommandBlockProps {
  command: string;
  onCopied?: () => void;
}

export default function CommandBlock({ command, onCopied }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(command);
    if (ok) {
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "#1E1E2E",
        color: "#CDD6F4",
        padding: "16px",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      <pre className="whitespace-pre-wrap break-all pr-16">{command}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={{
          background: copied ? "#22C55E" : "#FF6B35",
          color: "white",
        }}
      >
        {copied ? "✅ 已复制" : "复制"}
      </button>
    </div>
  );
}
