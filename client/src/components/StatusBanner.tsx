import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface StatusBannerProps {
  isWarning: boolean;
  message: string;
}

export function StatusBanner({ isWarning, message }: StatusBannerProps) {
  return (
    <div className={cn(
      "w-full p-4 rounded-xl flex items-center gap-3 font-bold text-lg shadow-sm border animate-in slide-in-from-top-2 duration-500",
      isWarning 
        ? "bg-destructive/10 text-destructive border-destructive/20" 
        : "bg-green-50 text-emerald-700 border-green-200"
    )}>
      {isWarning ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
      <span>{message}</span>
    </div>
  );
}
