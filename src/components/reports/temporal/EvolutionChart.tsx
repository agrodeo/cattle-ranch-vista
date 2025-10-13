import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

interface DataPoint {
  periodo: string;
  [key: string]: any;
}

interface EvolutionChartProps {
  data: DataPoint[];
  title: string;
  description?: string;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
    strokeWidth?: number;
  }>;
  yAxisLabel?: string;
  showTrendLine?: boolean;
  height?: number;
}

export function EvolutionChart({
  data,
  title,
  description,
  lines,
  yAxisLabel = 'Valor',
  showTrendLine = false,
  height = 400
}: EvolutionChartProps) {
  // Calculate trend line if needed
  const trendLineData = useMemo(() => {
    if (!showTrendLine || data.length < 2 || lines.length === 0) return null;

    const firstLine = lines[0];
    const values = data
      .map((d, i) => [i, d[firstLine.dataKey]])
      .filter((p): p is [number, number] => p[1] !== null && !isNaN(p[1]));

    if (values.length < 2) return null;

    const n = values.length;
    const sumX = values.reduce((sum, [x]) => sum + x, 0);
    const sumY = values.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = values.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, [x]) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((_, i) => ({
      x: i,
      y: slope * i + intercept
    }));
  }, [data, showTrendLine, lines]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="periodo" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ 
                value: yAxisLabel, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                name={line.name}
                strokeWidth={line.strokeWidth || 2}
                dot={{ r: 4, fill: line.color }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            ))}

            {showTrendLine && trendLineData && (
              <Line
                type="monotone"
                data={trendLineData}
                dataKey="y"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                name="Tendencia"
                legendType="line"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
