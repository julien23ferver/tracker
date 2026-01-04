
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface DailyUsageChartProps {
  data: Array<{
    date: string;
    taffes: number;
    ml_ajoutes: number;
    ohms: number;
  }>;
}

export function DailyUsageChart({ data }: DailyUsageChartProps) {
  // Sort data by date ascending for the chart
  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7); // Last 7 entries

  const config = {
    taffes: {
      label: "Taffes",
      color: "hsl(var(--primary))",
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm border border-dashed rounded-xl">
        Pas assez de données pour le graphique
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => format(parseISO(value), "dd/MM", { locale: fr })}
          fontSize={12}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Bar dataKey="taffes" fill="var(--color-taffes)" radius={[4, 4, 0, 0]} maxBarSize={50}>
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.taffes > 200 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
            ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
