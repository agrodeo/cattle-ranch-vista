/**
 * Temporal Analysis Utilities
 * Functions for calculating trends, improvements, and generating insights
 */

export interface TemporalDataPoint {
  periodo: string;
  year: number;
  periodo_orden: number;
  peso_nacimiento_promedio: number | null;
  peso_destete_promedio: number | null;
  peso_final_promedio: number | null;
  adg_promedio: number | null;
  cantidad_animales: number;
  cantidad_pesajes: number;
  mejora_vs_anterior: number | null;
  percentil_25: number | null;
  percentil_75: number | null;
}

export interface TrendAnalysis {
  direction: 'ascending' | 'descending' | 'stable';
  slope: number;
  r2: number;
  averageChange: number;
}

export interface PerformanceInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}

/**
 * Calculate linear regression for trend analysis
 */
export function calculateLinearRegression(data: number[][]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = data.reduce((sum, [x]) => sum + x, 0);
  const sumY = data.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = data.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumX2 = data.reduce((sum, [x]) => sum + x * x, 0);
  const sumY2 = data.reduce((sum, [, y]) => sum + y * y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, [, y]) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, [x, y]) => {
    const predicted = slope * x + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);

  return { slope, intercept, r2 };
}

/**
 * Analyze trend from temporal data
 */
export function analyzeTrend(data: TemporalDataPoint[], metric: 'destete' | 'final'): TrendAnalysis {
  const points = data
    .map((d, i) => [i, metric === 'destete' ? d.peso_destete_promedio : d.peso_final_promedio])
    .filter((p): p is [number, number] => p[1] !== null);

  if (points.length < 2) {
    return { direction: 'stable', slope: 0, r2: 0, averageChange: 0 };
  }

  const { slope, r2 } = calculateLinearRegression(points);
  
  const changes = data
    .map(d => d.mejora_vs_anterior)
    .filter((c): c is number => c !== null);
  
  const averageChange = changes.length > 0 
    ? changes.reduce((sum, c) => sum + c, 0) / changes.length 
    : 0;

  let direction: 'ascending' | 'descending' | 'stable';
  if (Math.abs(slope) < 0.5) {
    direction = 'stable';
  } else {
    direction = slope > 0 ? 'ascending' : 'descending';
  }

  return { direction, slope, r2, averageChange };
}

/**
 * Calculate acceleration (change in rate of improvement)
 */
export function calculateAcceleration(data: TemporalDataPoint[]): number {
  if (data.length < 4) return 0;

  const recentPeriods = data.slice(-2);
  const historicalPeriods = data.slice(0, -2);

  const recentAvg = recentPeriods
    .map(d => d.mejora_vs_anterior)
    .filter((m): m is number => m !== null)
    .reduce((sum, m) => sum + m, 0) / recentPeriods.length;

  const historicalAvg = historicalPeriods
    .map(d => d.mejora_vs_anterior)
    .filter((m): m is number => m !== null)
    .reduce((sum, m) => sum + m, 0) / historicalPeriods.length;

  return recentAvg - historicalAvg;
}

/**
 * Find best period
 */
export function findBestPeriod(data: TemporalDataPoint[], metric: 'destete' | 'final'): TemporalDataPoint | null {
  if (data.length === 0) return null;

  return data.reduce((best, current) => {
    const currentValue = metric === 'destete' ? current.peso_destete_promedio : current.peso_final_promedio;
    const bestValue = metric === 'destete' ? best.peso_destete_promedio : best.peso_final_promedio;
    
    if (currentValue === null) return best;
    if (bestValue === null) return current;
    
    return currentValue > bestValue ? current : best;
  });
}

/**
 * Generate performance insights
 */
export function generateInsights(
  data: TemporalDataPoint[],
  trend: TrendAnalysis,
  acceleration: number,
  lang: 'es' | 'en' | 'pt' = 'es'
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  const messages = {
    es: {
      ascending: {
        title: 'Tendencia Positiva',
        description: `La cabaña muestra una mejora consistente con un incremento promedio de ${trend.averageChange.toFixed(1)}% por período.`
      },
      descending: {
        title: 'Alerta: Tendencia Decreciente',
        description: `Se detecta una disminución en el rendimiento de ${Math.abs(trend.averageChange).toFixed(1)}% por período. Revisar manejo y genética.`
      },
      stable: {
        title: 'Rendimiento Estable',
        description: 'La cabaña mantiene un rendimiento constante. Considerar nuevas estrategias para mejorar.'
      },
      accelerating: {
        title: 'Aceleración en Mejora',
        description: `La tasa de mejora está aumentando (${acceleration.toFixed(1)}% adicional). Excelente progreso genético.`
      },
      decelerating: {
        title: 'Desaceleración',
        description: `La mejora se está desacelerando (${Math.abs(acceleration).toFixed(1)}% menos). Evaluar estrategias de selección.`
      }
    },
    en: {
      ascending: {
        title: 'Positive Trend',
        description: `The herd shows consistent improvement with an average increase of ${trend.averageChange.toFixed(1)}% per period.`
      },
      descending: {
        title: 'Alert: Decreasing Trend',
        description: `A performance decrease of ${Math.abs(trend.averageChange).toFixed(1)}% per period detected. Review management and genetics.`
      },
      stable: {
        title: 'Stable Performance',
        description: 'The herd maintains constant performance. Consider new strategies for improvement.'
      },
      accelerating: {
        title: 'Accelerating Improvement',
        description: `The improvement rate is increasing (${acceleration.toFixed(1)}% additional). Excellent genetic progress.`
      },
      decelerating: {
        title: 'Deceleration',
        description: `Improvement is decelerating (${Math.abs(acceleration).toFixed(1)}% less). Evaluate selection strategies.`
      }
    },
    pt: {
      ascending: {
        title: 'Tendência Positiva',
        description: `O rebanho mostra melhoria consistente com um aumento médio de ${trend.averageChange.toFixed(1)}% por período.`
      },
      descending: {
        title: 'Alerta: Tendência Decrescente',
        description: `Detectada diminuição no desempenho de ${Math.abs(trend.averageChange).toFixed(1)}% por período. Revisar manejo e genética.`
      },
      stable: {
        title: 'Desempenho Estável',
        description: 'O rebanho mantém desempenho constante. Considerar novas estratégias para melhorar.'
      },
      accelerating: {
        title: 'Aceleração na Melhoria',
        description: `A taxa de melhoria está aumentando (${acceleration.toFixed(1)}% adicional). Excelente progresso genético.`
      },
      decelerating: {
        title: 'Desaceleração',
        description: `A melhoria está desacelerando (${Math.abs(acceleration).toFixed(1)}% menos). Avaliar estratégias de seleção.`
      }
    }
  };

  const m = messages[lang];

  // Trend insight
  if (trend.direction === 'ascending') {
    insights.push({ type: 'success', ...m.ascending });
  } else if (trend.direction === 'descending') {
    insights.push({ type: 'warning', ...m.descending });
  } else {
    insights.push({ type: 'info', ...m.stable });
  }

  // Acceleration insight
  if (Math.abs(acceleration) > 1) {
    if (acceleration > 0) {
      insights.push({ type: 'success', ...m.accelerating });
    } else {
      insights.push({ type: 'warning', ...m.decelerating });
    }
  }

  return insights;
}
