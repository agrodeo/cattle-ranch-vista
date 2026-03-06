import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

interface PregnancyGaugeProps {
  percentage: number;
  pregnantCount: number;
  totalCount: number;
}

export function PregnancyGauge({ percentage, pregnantCount, totalCount }: PregnancyGaugeProps) {
  const { t } = useTranslation("dashboard");

  const filled = Math.min(percentage, 100);
  const empty = 100 - filled;

  const data = [
    { name: "pregnant", value: filled },
    { name: "empty", value: empty },
  ];

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 60) return "hsl(var(--primary))";
    if (percentage >= 40) return "hsl(45 93% 47%)"; // amber
    return "hsl(var(--destructive))";
  };

  return (
    <div className="rounded-xl border-0 shadow-sm bg-muted/30 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {t("kpis.pregnancyRate")}
      </h3>

      <div className="relative mx-auto" style={{ width: 180, height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="95%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              <Cell fill={getColor()} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: getColor() }}
          />
          {t("gauge.pregnant", { count: pregnantCount })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-muted" />
          {t("gauge.open", { count: totalCount - pregnantCount })}
        </span>
      </div>
    </div>
  );
}
