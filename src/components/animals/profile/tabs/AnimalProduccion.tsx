import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Scale, TrendingUp, Calendar, Target } from "lucide-react";
import { useAnimalWeights } from "@/hooks/useAnimalWeights";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface AnimalProduccionProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalProduccion({ animal }: AnimalProduccionProps) {
  const { t } = useTranslation(['animals', 'common']);
  const { weights, isLoading } = useAnimalWeights(animal.id);

  // Calculate average daily gain (ADG)
  const calculateADG = () => {
    if (weights.length < 2) return 0;
    const firstWeight = weights[weights.length - 1];
    const lastWeight = weights[0];
    const days = differenceInDays(new Date(lastWeight.fecha), new Date(firstWeight.fecha));
    return days > 0 ? (lastWeight.peso - firstWeight.peso) / days : 0;
  };

  // Prepare chart data
  const chartData = weights
    .slice()
    .reverse()
    .map((weight, index) => ({
      fecha: format(new Date(weight.fecha), 'dd/MM/yy'),
      peso: weight.peso,
      edad: weight.edad_dias || 0
    }));

  const currentWeight = animal.peso_actual_kg || weights[0]?.peso || 0;
  const adg = animal.ganancia_diaria_kg || calculateADG();
  const lastWeighingDate = animal.fecha_ultimo_pesaje || weights[0]?.fecha;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Scale className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.production.currentWeight')}</p>
                <p className="text-2xl font-bold">{currentWeight.toFixed(1)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.production.dailyGain')}</p>
                <p className="text-2xl font-bold text-green-600">{adg.toFixed(3)} kg/día</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.production.lastWeighing')}</p>
                <p className="text-sm font-semibold">
                  {lastWeighingDate 
                    ? format(new Date(lastWeighingDate), 'dd/MM/yyyy', { locale: es })
                    : t('animals:profile.production.notRegistered')
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.production.totalWeighings')}</p>
                <p className="text-2xl font-bold">{weights.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Chart */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('animals:profile.production.weightEvolution')}</CardTitle>
            <CardDescription>{t('animals:profile.production.weighingHistoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} kg`, t('animals:profile.production.weight')]}
                    labelFormatter={(label) => `${t('animals:profile.production.dateLabel')}: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.1}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('animals:profile.production.noWeighingRecords')}</p>
          </CardContent>
        </Card>
      )}

      {/* Weight Records Table */}
      {weights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('animals:profile.production.weighingHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weights.map((weight) => (
                <div key={weight.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {format(new Date(weight.fecha), 'dd/MM/yyyy', { locale: es })}
                      </p>
                      {weight.tipo_pesaje && (
                        <Badge variant={
                          weight.tipo_pesaje === 'nacimiento' ? 'default' :
                          weight.tipo_pesaje === 'destete' ? 'secondary' :
                          weight.tipo_pesaje === 'final' ? 'destructive' : 'outline'
                        } className="text-xs">
                          {weight.tipo_pesaje === 'nacimiento' ? t('animals:profile.production.birthType') :
                           weight.tipo_pesaje === 'destete' ? t('animals:profile.production.weaningType') :
                           weight.tipo_pesaje === 'final' ? t('animals:profile.production.finalType') : t('animals:profile.production.controlType')}
                        </Badge>
                      )}
                    </div>
                    {weight.edad_dias && (
                      <p className="text-sm text-muted-foreground">
                        {weight.edad_dias} {t('animals:profile.production.daysOfAge')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{weight.peso} kg</p>
                    {weight.ganancia_diaria && (
                      <Badge variant="secondary" className="text-xs">
                        +{weight.ganancia_diaria.toFixed(3)} kg/día
                      </Badge>
                    )}
                    {weight.dias_desde_ultimo && (
                      <p className="text-xs text-muted-foreground">
                        {weight.dias_desde_ultimo} {t('animals:profile.production.daysSincePrevious')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}