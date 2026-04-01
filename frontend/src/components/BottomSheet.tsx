import { useEffect, useRef, ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  closeable?: boolean;
}

export default function BottomSheet({
  open,
  onClose,
  children,
  closeable = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeable ? onClose : undefined}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full bg-white px-6 pt-3 pb-8 overflow-y-auto"
        style={{
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          maxHeight: "85vh",
          animation: "slideUp 0.35s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}
