import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3, TrendingUp, TrendingDown, Download, Calendar, Heart, Shield, Users, DollarSign } from "lucide-react";

interface KpiData {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: any;
}

export function MobileReports() {
  const { t } = useTranslation(['reports', 'common']);
  const [dateRange, setDateRange] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData[]>([]);

  useEffect(() => {
    fetchKpis();
  }, [dateRange]);

  const fetchKpis = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setKpis([
        {
          title: "% Preñez",
          value: "78.5%",
          change: "+5.2%",
          trend: 'up',
          icon: Heart,
        },
        {
          title: "Vacunación al Día",
          value: "92.3%",
          change: "+2.1%",
          trend: 'up',
          icon: Shield,
        },
        {
          title: "Ocupación Corrales",
          value: "85.7%",
          change: "-1.5%",
          trend: 'down',
          icon: Users,
        },
        {
          title: "Mortalidad",
          value: "1.2%",
          change: "-0.3%",
          trend: 'up', // Lower is better for mortality
          icon: TrendingDown,
        },
        {
          title: "Ganancia Diaria Promedio",
          value: "0.8 kg",
          change: "+0.1kg",
          trend: 'up',
          icon: TrendingUp,
        },
        {
          title: "Margen Operativo",
          value: "$125.4k",
          change: "+8.2%",
          trend: 'up',
          icon: DollarSign,
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const exportData = (format: 'csv' | 'xlsx') => {
    // Implementation for data export
    console.log(`Exporting data as ${format}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('reports:title', 'Reportes')} />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePageHeader 
        title={t('reports:title', 'Reportes')}
        subtitle="Análisis y métricas del establecimiento"
        action={
          <Button variant="outline" size="sm" onClick={() => exportData('xlsx')}>
            <Download className="h-4 w-4" />
          </Button>
        }
      />

      {/* Date Range Selector */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-4">
        {kpis.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title="No hay datos disponibles"
            description="No se pueden generar reportes en este momento"
          />
        ) : (
          <div className="space-y-4">
            {kpis.map((kpi, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  // Navigate to detailed chart screen
                  console.log(`Navigate to ${kpi.title} details`);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <kpi.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">
                          {kpi.title}
                        </CardTitle>
                      </div>
                    </div>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {kpi.value}
                      </div>
                      {kpi.change && (
                        <div className={`flex items-center gap-1 text-sm ${
                          kpi.trend === 'up' 
                            ? 'text-green-600' 
                            : kpi.trend === 'down' 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                        }`}>
                          {kpi.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : kpi.trend === 'down' ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          <span>{kpi.change}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="p-4 border-t border-border">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Exportar Datos</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => exportData('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => exportData('xlsx')}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}