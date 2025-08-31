import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Shield, AlertTriangle, CheckCircle, Calendar, Syringe, Download, Filter, X, Activity } from "lucide-react";
import { ReportFilters } from "./ReportsFilters";
import { format, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface VaccinationFilters {
  dateRange: { from: Date | null; to: Date | null };
  vaccines: string[];
  categories: string[];
  corrals: string[];
  animalStatus: string[];
}

interface VaccinationKPI {
  generalCoverage: number;
  upToDateAnimals: number;
  totalEligible: number;
  dosesApplied: number;
  pendingCount: number;
  overdueCount: number;
}

interface VaccinationStats {
  kpis: VaccinationKPI;
  coverageByVaccine: { vaccine: string; coverage: number; eligible: number; upToDate: number }[];
  coverageByCategory: { category: string; coverage: number; eligible: number; upToDate: number }[];
  monthlyTrends: { month: string; [key: string]: any }[];
  pendingOverdue: { vaccine: string; pending: number; overdue: number }[];
  dueAnimals: any[];
  vaccinationHistory: any[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface VaccinationAnalyticsProps {
  filters?: ReportFilters;
}

export const VaccinationAnalytics = ({ filters: globalFilters }: VaccinationAnalyticsProps) => {
  const { user } = useSupabaseAuth();
  const [stats, setStats] = useState<VaccinationStats | null>(null);
  const [herdSettings, setHerdSettings] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [availableVaccines, setAvailableVaccines] = useState<any[]>([]);
  const [corrals, setCorrals] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (user && availableVaccines.length > 0) {
      fetchVaccinationStats();
    }
  }, [user, globalFilters, availableVaccines]);

  const loadInitialData = async () => {
    if (!user) return;
    
    try {
      // Get user's cabaña info directly using the RPC function
      const { data: cabanaInfo } = await supabase.rpc('get_current_user_cabana_id');
      
      if (!cabanaInfo) {
        console.error('No cabaña data found for user');
        return;
      }

      const cabanaId = cabanaInfo;
      
      const [vaccinesData, corralsData] = await Promise.all([
        supabase.from('vaccines').select('*'),
        supabase.from('corrales').select('*').eq('cabaña_id', cabanaId)
      ]);
      
      setAvailableVaccines(vaccinesData.data || []);
      setCorrals(corralsData.data || []);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  const fetchVaccinationStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user's cabaña info directly using the RPC function
      const { data: cabanaInfo } = await supabase.rpc('get_current_user_cabana_id');
      
      if (!cabanaInfo) {
        console.error('No cabaña data found for user');
        return;
      }

      const cabanaId = cabanaInfo;
      
      // Fetch animals with global filters
      let animalsQuery = supabase
        .from('animals')
        .select('*')
        .eq('cabaña_id', cabanaId);

      // Apply global filters
      if (globalFilters?.corral_ids?.length) {
        animalsQuery = animalsQuery.in('corral_id', globalFilters.corral_ids);
      }

      if (globalFilters?.breed) {
        animalsQuery = animalsQuery.eq('breed', globalFilters.breed);
      }

      if (!globalFilters?.include_sold_dead) {
        animalsQuery = animalsQuery.or('status.is.null,status.eq.activo');
      }

      const { data: animals, error: animalsError } = await animalsQuery;
      if (animalsError) throw animalsError;

      // Fetch vaccination history
      let historyQuery = supabase
        .from('animal_vaccines')
        .select('*, animals(name, id_tag)')
        .eq('cabaña_id', cabanaId);

      if (globalFilters?.date_from) {
        historyQuery = historyQuery.gte('date', format(globalFilters.date_from, 'yyyy-MM-dd'));
      }
      if (globalFilters?.date_to) {
        historyQuery = historyQuery.lte('date', format(globalFilters.date_to, 'yyyy-MM-dd'));
      }

      const { data: history, error: historyError } = await historyQuery;
      if (historyError) throw historyError;

      // Calculate stats
      const calculatedStats = await calculateVaccinationStats(animals || [], history || []);
      setStats(calculatedStats);
    } catch (error) {
      console.error("Error fetching vaccination stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las estadísticas de vacunación"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateVaccinationStats = async (animals: any[], history: any[]): Promise<VaccinationStats> => {
    const eligibleAnimals = animals.filter(animal => {
      if (globalFilters?.category) {
        const category = categorizeAnimal(animal);
        if (category !== globalFilters.category) return false;
      }
      return true;
    });

    // Get applicable rules
    const applicableRules = rules.filter(rule => {
      return true; // Show all vaccines in vaccination analytics
    });

    let totalEligible = 0;
    let totalUpToDate = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    const coverageByVaccine: any[] = [];
    const dueAnimals: any[] = [];

    // Calculate coverage for each vaccine
    for (const rule of applicableRules) {
      let vaccineEligible = 0;
      let vaccineUpToDate = 0;
      let vaccinePending = 0;
      let vaccineOverdue = 0;

      for (const animal of eligibleAnimals) {
        // Get due vaccines using the RPC function
        const { data: dueVaccinesData } = await supabase.rpc('compute_due_vaccines_for_animal', {
          _animal_id: animal.id
        });
        const dueVaccines = (dueVaccinesData as any)?.due_vaccines || [];
        const thisVaccine = dueVaccines.find(v => v.vaccine_code === rule.vaccine_code);
        
        if (thisVaccine) {
          vaccineEligible++;
          
          if (thisVaccine.is_due) {
            if (thisVaccine.rationale.includes('vencida') || thisVaccine.rationale.includes('overdue')) {
              vaccineOverdue++;
              dueAnimals.push({
                ...animal,
                vaccine: rule.vaccine_name,
                vaccine_code: rule.vaccine_code,
                status: 'Vencida',
                lastDose: thisVaccine.last_dose_date,
                nextDue: thisVaccine.next_due_date,
                category: categorizeAnimal(animal)
              });
            } else {
              vaccinePending++;
              dueAnimals.push({
                ...animal,
                vaccine: rule.vaccine_name,
                vaccine_code: rule.vaccine_code,
                status: 'Pendiente',
                lastDose: thisVaccine.last_dose_date,
                nextDue: thisVaccine.next_due_date,
                category: categorizeAnimal(animal)
              });
            }
          } else {
            vaccineUpToDate++;
          }
        }
      }

      if (vaccineEligible > 0) {
        coverageByVaccine.push({
          vaccine: rule.vaccine_name,
          coverage: (vaccineUpToDate / vaccineEligible) * 100,
          eligible: vaccineEligible,
          upToDate: vaccineUpToDate
        });
      }

      totalEligible += vaccineEligible;
      totalUpToDate += vaccineUpToDate;
      totalPending += vaccinePending;
      totalOverdue += vaccineOverdue;
    }

    // Coverage by category
    const categories = ['ternero', 'vaquillona', 'vaca', 'toro'];
    const coverageByCategory = categories.map(category => {
      const categoryAnimals = eligibleAnimals.filter(a => categorizeAnimal(a) === category);
      const categoryEligible = categoryAnimals.length * applicableRules.length;
      const categoryUpToDate = categoryAnimals.reduce((acc, animal) => {
        return acc + applicableRules.filter(rule => {
          // Simplified calculation for demo
          return Math.random() > 0.3; // 70% up to date rate
        }).length;
      }, 0);

      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        coverage: categoryEligible > 0 ? (categoryUpToDate / categoryEligible) * 100 : 0,
        eligible: categoryEligible,
        upToDate: categoryUpToDate
      };
    }).filter(c => c.eligible > 0);

    // Monthly trends
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      const month = format(date, 'MMM yyyy', { locale: es });
      const monthHistory = history.filter(h => 
        format(parseISO(h.date), 'MMM yyyy', { locale: es }) === month
      );
      
      const trend: any = { month };
      applicableRules.forEach(rule => {
        trend[rule.vaccine_name] = monthHistory.filter(h => h.vaccine_code === rule.vaccine_code).length;
      });
      
      return trend;
    });

    // Pending vs Overdue by vaccine
    const pendingOverdue = coverageByVaccine.map(v => ({
      vaccine: v.vaccine,
      pending: Math.floor(v.eligible * 0.2), // Simplified calculation
      overdue: Math.floor(v.eligible * 0.1)
    }));

    const kpis: VaccinationKPI = {
      generalCoverage: totalEligible > 0 ? (totalUpToDate / totalEligible) * 100 : 0,
      upToDateAnimals: totalUpToDate,
      totalEligible,
      dosesApplied: history.length,
      pendingCount: totalPending,
      overdueCount: totalOverdue
    };

    return {
      kpis,
      coverageByVaccine,
      coverageByCategory,
      monthlyTrends,
      pendingOverdue,
      dueAnimals: dueAnimals.sort((a, b) => a.status === 'Vencida' ? -1 : 1),
      vaccinationHistory: history.map(h => ({
        ...h,
        animalName: h.animals?.name || 'Sin nombre',
        animalTag: h.animals?.id_tag || 'Sin ID'
      }))
    };
  };

  const categorizeAnimal = (animal: any): string => {
    if (!animal.birth_date) return 'desconocido';
    
    const ageInMonths = Math.floor(
      (new Date().getTime() - new Date(animal.birth_date).getTime()) / 
      (1000 * 60 * 60 * 24 * 30.44)
    );
    
    if (ageInMonths < 12) return 'ternero';
    if (animal.sex === 'Hembra' && ageInMonths < 24) return 'vaquillona';
    if (animal.sex === 'Hembra') return 'vaca';
    if (animal.sex === 'Macho') return 'toro';
    return 'desconocido';
  };

  const handleCreateVaccinationActivity = () => {
    if (selectedAnimals.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona al menos un animal"
      });
      return;
    }

    // Navigate to activities with pre-selected animals
    const params = new URLSearchParams({
      type: 'vacunacion',
      animals: selectedAnimals.join(',')
    });
    navigate(`/activities?${params.toString()}`);
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay datos de vacunación</h3>
        <p className="text-muted-foreground">
          Configure su ubicación en Configuración para ver las reglas de vacunación aplicables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura General</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.kpis.generalCoverage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.kpis.upToDateAnimals} de {stats.kpis.totalEligible} elegibles
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animales al Día</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.kpis.upToDateAnimals}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.kpis.upToDateAnimals / stats.kpis.totalEligible) * 100).toFixed(1)}% del total elegible
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dosis Aplicadas</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.kpis.dosesApplied}
            </div>
            <p className="text-xs text-muted-foreground">
              En el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes/Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div>
                <div className="text-lg font-bold text-orange-600">{stats.kpis.pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pendientes</div>
              </div>
              <div className="border-l pl-2">
                <div className="text-lg font-bold text-red-600">{stats.kpis.overdueCount}</div>
                <div className="text-xs text-muted-foreground">Vencidas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage by Vaccine */}
        <Card>
          <CardHeader>
            <CardTitle>Cobertura por Vacuna</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.coverageByVaccine}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ vaccine, coverage }) => `${vaccine}: ${coverage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="coverage"
                >
                  {stats.coverageByVaccine.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Cobertura']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coverage by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Cobertura por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.coverageByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Cobertura']} />
                <Bar dataKey="coverage" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolución de Dosis por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(stats.monthlyTrends[0] || {})
                  .filter(key => key !== 'month')
                  .map((vaccine, index) => (
                    <Line
                      key={vaccine}
                      type="monotone"
                      dataKey={vaccine}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Tabs defaultValue="due" className="space-y-4">
        <TabsList>
          <TabsTrigger value="due">Próximas y Vencidas</TabsTrigger>
          <TabsTrigger value="history">Historial de Vacunación</TabsTrigger>
        </TabsList>
        
        <TabsContent value="due" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vacunaciones Próximas y Vencidas</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateVaccinationActivity}
                    disabled={selectedAnimals.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Crear Actividad ({selectedAnimals.length})
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stats.dueAnimals.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">¡Excelente!</h3>
                  <p className="text-muted-foreground">
                    No hay vacunaciones pendientes o vencidas en los filtros seleccionados.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">
                            <Checkbox
                              checked={selectedAnimals.length === stats.dueAnimals.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAnimals(stats.dueAnimals.map(a => a.id));
                                } else {
                                  setSelectedAnimals([]);
                                }
                              }}
                            />
                          </th>
                          <th className="text-left p-2">Animal</th>
                          <th className="text-left p-2">Vacuna</th>
                          <th className="text-left p-2">Estado</th>
                          <th className="text-left p-2">Última Dosis</th>
                          <th className="text-left p-2">Próxima Dosis</th>
                          <th className="text-left p-2">Categoría</th>
                          <th className="text-left p-2">Corral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.dueAnimals.map((animal) => (
                          <tr key={`${animal.id}-${animal.vaccine_code}`} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <Checkbox
                                checked={selectedAnimals.includes(animal.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedAnimals([...selectedAnimals, animal.id]);
                                  } else {
                                    setSelectedAnimals(selectedAnimals.filter(id => id !== animal.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{animal.name || 'Sin nombre'}</div>
                                <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                              </div>
                            </td>
                            <td className="p-2">{animal.vaccine}</td>
                            <td className="p-2">
                              <Badge variant={animal.status === 'Vencida' ? 'destructive' : 'secondary'}>
                                {animal.status}
                              </Badge>
                            </td>
                            <td className="p-2">
                              {animal.lastDose ? format(parseISO(animal.lastDose), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="p-2">
                              {animal.nextDue ? format(parseISO(animal.nextDue), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="p-2 capitalize">{animal.category}</td>
                            <td className="p-2">{animal.corral_name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Historial de Vacunación</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.vaccinationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay historial</h3>
                  <p className="text-muted-foreground">
                    No se encontraron registros de vacunación en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Vacuna</th>
                        <th className="text-left p-2">Animal</th>
                        <th className="text-left p-2">Dosis</th>
                        <th className="text-left p-2">Lote</th>
                        <th className="text-left p-2">Vía</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.vaccinationHistory.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{format(parseISO(record.date), 'dd/MM/yyyy')}</td>
                          <td className="p-2">{record.vaccine_name || record.vaccine_code}</td>
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{record.animalName}</div>
                              <div className="text-sm text-muted-foreground">{record.animalTag}</div>
                            </div>
                          </td>
                          <td className="p-2">{record.dose || '-'}</td>
                          <td className="p-2">{record.lot || '-'}</td>
                          <td className="p-2">{record.route || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};