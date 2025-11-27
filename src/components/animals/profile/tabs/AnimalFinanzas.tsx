import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calculator, Banknote } from "lucide-react";
import { useAnimalFinances } from "@/hooks/useAnimalFinances";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnimalFinanzasProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalFinanzas({ animal }: AnimalFinanzasProps) {
  const { t } = useTranslation(['common', 'finance']);
  const { records, summary, isLoading } = useAnimalFinances(animal.id);


  const expenseData = [
    { name: 'Veterinario', value: summary.gastosVeterinarios, color: '#ef4444' },
    { name: 'Alimentación', value: summary.totalGastos * 0.6, color: '#f97316' },
    { name: 'Otros', value: summary.totalGastos * 0.4, color: '#8b5cf6' }
  ];

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
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Costo Aproximado</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${summary.costoAproximado.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${summary.totalIngresos.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  ${summary.totalGastos.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <p className={`text-2xl font-bold ${summary.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
            <CardDescription>Desglose por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.totalGastos > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`$${value.toFixed(0)}`, 'Monto']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>No hay gastos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profitability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Rentabilidad</CardTitle>
            <CardDescription>Comparación ingresos vs gastos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Ingresos Totales:</span>
                <span className="font-bold text-green-600">${summary.totalIngresos.toFixed(0)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium">Gastos Totales:</span>
                <span className="font-bold text-red-600">${summary.totalGastos.toFixed(0)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Beneficio Neto:</span>
                <span className={`font-bold ${(summary.totalIngresos - summary.totalGastos) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(summary.totalIngresos - summary.totalGastos).toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium">Costo Aproximado:</span>
                <span className="font-bold text-orange-600">${summary.costoAproximado.toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Historial de Transacciones
          </CardTitle>
          <CardDescription>
            Registro de ingresos y gastos relacionados con este animal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      record.tipo === 'ingreso' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{record.categoria}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.fecha), 'dd/MM/yyyy', { locale: es })}
                      </p>
                      {record.descripcion && (
                        <p className="text-xs text-muted-foreground">{record.descripcion}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-semibold ${
                      record.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {record.tipo === 'ingreso' ? '+' : '-'}${record.monto.toFixed(0)}
                    </p>
                    <Badge variant={record.tipo === 'ingreso' ? 'default' : 'destructive'} className="text-xs">
                      {record.tipo}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay transacciones registradas</p>
              <p className="text-sm text-muted-foreground mt-2">
                Las transacciones aparecerán cuando se registren ventas o gastos específicos de este animal
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Financieras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• El costo aproximado se calcula dividiendo los gastos totales de la cabaña entre todos los animales activos.</p>
            <p>• Los gastos incluyen costos veterinarios, alimentación y otros gastos asociados.</p>
            <p>• El ROI se calcula como (Ingresos - Gastos) / Gastos × 100.</p>
            <p>• Para un análisis más detallado, consulte el módulo de Finanzas general.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}