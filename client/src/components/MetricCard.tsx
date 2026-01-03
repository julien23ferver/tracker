import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ label, value, subValue, icon, className }: MetricCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <div className="text-primary/80 bg-primary/10 p-2 rounded-lg">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold font-display text-foreground">{value}</h3>
        {subValue && <span className="text-sm text-muted-foreground font-medium">{subValue}</span>}
      </div>
    </div>
  );
}
