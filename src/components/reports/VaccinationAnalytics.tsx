import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";

interface VaccinationAnalyticsProps {
  filters?: any;
}

export const VaccinationAnalytics = ({ filters: globalFilters }: VaccinationAnalyticsProps) => {
  const { user, currentUser } = useSupabaseAuth();
  const { requirements } = useVaccinationRequirements();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [animalsWithIssues, setAnimalsWithIssues] = useState<Array<{
    animal_id: string;
    animal_name: string;
    animal_tag: string;
    issues: Array<{ vaccine_name: string; status: string; days_overdue?: number }>;
  }>>([]);
  const [animalsCompliant, setAnimalsCompliant] = useState<Array<{
    animal_id: string;
    animal_name: string;
    animal_tag: string;
    vaccines: Array<{ vaccine_name: string; last_date: string; next_due?: string }>;
  }>>([]);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [expandedCompliantAnimal, setExpandedCompliantAnimal] = useState<string | null>(null);

  useEffect(() => {
    if (user && currentUser?.cabañaId) {
      fetchVaccinationStats();
    }
  }, [user, currentUser?.cabañaId, globalFilters]);

  const fetchVaccinationStats = async () => {
    if (!user || !currentUser?.cabañaId) return;
    
    try {
      setLoading(true);
      
      // Fetch active animals
      const { data: animals } = await supabase
        .from('animals')
        .select('id, name, id_tag')
        .eq('cabaña_id', currentUser.cabañaId)
        .neq('status', 'vendido')
        .neq('status', 'muerto')
        .neq('status', 'Vendido')
        .neq('status', 'Muerto');

      if (!animals || animals.length === 0) {
        setStats({
          totalVaccinations: 0,
          totalAnimals: 0,
          animalsWithIssues: 0,
          animalsCompliant: 0,
          totalOverdueVaccines: 0,
          totalPendingVaccines: 0
        });
        setAnimalsWithIssues([]);
        setAnimalsCompliant([]);
        setLoading(false);
        return;
      }

      // Fetch vaccination history only for active animals
      const activeAnimalIds = animals.map(a => a.id);
      const { data: history } = await supabase
        .from('animal_vaccines')
        .select('*')
        .eq('cabaña_id', currentUser.cabañaId)
        .in('animal_id', activeAnimalIds);

      // Calculate vaccination status for all animals in parallel
      const statusPromises = animals.map(animal =>
        supabase
          .rpc('calculate_vaccination_status' as any, {
            _animal_id: animal.id,
            _cabana_id: currentUser.cabañaId
          })
          .then(result => ({ animal, statusData: result.data }))
      );

      const results = await Promise.all(statusPromises);

      // Process results
      const issuesData: typeof animalsWithIssues = [];
      const compliantData: typeof animalsCompliant = [];
      let totalOverdueVaccines = 0;
      let totalPendingVaccines = 0;

      results.forEach(({ animal, statusData }) => {
        if (statusData && statusData.length > 0) {
          // Check mandatory vaccines compliance first
          const mandatoryVaccines = statusData.filter((s: any) => s.is_mandatory);
          const mandatoryComplete = mandatoryVaccines.filter((s: any) => s.status === 'completa');
          const hasOverdue = statusData.some((s: any) => s.status === 'vencida');
          
          // Animal is "al día" if ALL mandatory vaccines are complete AND no overdue vaccines
          const isCompliant = mandatoryVaccines.length > 0 && 
                             mandatoryComplete.length === mandatoryVaccines.length && 
                             !hasOverdue;

          // Filter for complete vaccines
          const completeVaccines = statusData
            .filter((status: any) => status.status === 'completa')
            .map((status: any) => ({
              vaccine_name: status.vaccine_name,
              last_date: status.last_vaccination_date,
              next_due: status.next_due_date
            }));

          // Mutually exclusive categories
          if (isCompliant) {
            // All mandatory vaccines complete and no overdue → Al día
            compliantData.push({
              animal_id: animal.id,
              animal_name: animal.name || animal.id_tag || 'Sin nombre',
              animal_tag: animal.id_tag || 'Sin caravana',
              vaccines: completeVaccines
            });
          } else {
            // Not compliant → Requires attention (include all issues: vencida, pendiente, no_aplicada for mandatory)
            const issues = statusData
              .filter((status: any) => 
                status.status === 'vencida' || 
                status.status === 'pendiente' ||
                (status.status === 'no_aplicada' && status.is_mandatory)
              )
              .map((status: any) => ({
                vaccine_name: status.vaccine_name,
                status: status.status === 'vencida' ? 'Vencida' : 
                        status.status === 'pendiente' ? 'Pendiente' : 
                        'No aplicada',
                days_overdue: status.days_overdue
              }));

            if (issues.length > 0) {
              issuesData.push({
                animal_id: animal.id,
                animal_name: animal.name || animal.id_tag || 'Sin nombre',
                animal_tag: animal.id_tag || 'Sin caravana',
                issues
              });

              // Count vaccines by issue type
              issues.forEach((issue: any) => {
                if (issue.status === 'Vencida') totalOverdueVaccines++;
                else if (issue.status === 'Pendiente') totalPendingVaccines++;
              });
            }
          }
        }
      });

      setStats({
        totalVaccinations: history?.length || 0,
        totalAnimals: animals.length,
        animalsWithIssues: issuesData.length,
        animalsCompliant: compliantData.length,
        totalOverdueVaccines,
        totalPendingVaccines
      });
      setAnimalsWithIssues(issuesData);
      setAnimalsCompliant(compliantData);
    } catch (error) {
      console.error("Error fetching vaccination stats:", error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Analítica de Vacunación:</strong> Total de {stats?.totalVaccinations || 0} vacunaciones registradas en {stats?.totalAnimals || 0} animales activos
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Animales</p>
                <p className="text-2xl font-bold">{stats?.totalAnimals || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Animales al Día</p>
                <p className="text-2xl font-bold text-green-600">{stats?.animalsCompliant || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.totalAnimals > 0 ? Math.round((stats?.animalsCompliant / stats?.totalAnimals) * 100) : 0}% del total
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Vacunas Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.totalPendingVaccines || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.animalsWithIssues || 0} animales afectados
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vacunas Vencidas</p>
                <p className="text-2xl font-bold text-red-600">{stats?.totalOverdueVaccines || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requiere atención inmediata
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Animals with Complete Vaccination */}
      {animalsCompliant.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Animales al Día ({animalsCompliant.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsCompliant.map((animal) => (
                <Collapsible
                  key={animal.animal_id}
                  open={expandedCompliantAnimal === animal.animal_id}
                  onOpenChange={() => setExpandedCompliantAnimal(
                    expandedCompliantAnimal === animal.animal_id ? null : animal.animal_id
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedCompliantAnimal === animal.animal_id ? (
                          <ChevronDown className="h-4 w-4 text-green-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-green-700" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-green-900 dark:text-green-100">
                            {animal.animal_name}
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            Caravana: {animal.animal_tag}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-200 text-green-900">
                        {animal.vaccines.length} {animal.vaccines.length === 1 ? 'vacuna' : 'vacunas'}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                    <div className="space-y-3">
                      {animal.vaccines.map((vaccine, idx) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{vaccine.vaccine_name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Última aplicación: {vaccine.last_date ? new Date(vaccine.last_date).toLocaleDateString('es-ES') : 'N/A'}
                            </div>
                            {vaccine.next_due && (
                              <div className="text-sm text-muted-foreground">
                                Próxima: {new Date(vaccine.next_due).toLocaleDateString('es-ES')}
                              </div>
                            )}
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animals with Issues */}
      {animalsWithIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Animales que Requieren Atención ({animalsWithIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsWithIssues.map((animal) => (
                <Collapsible
                  key={animal.animal_id}
                  open={expandedAnimal === animal.animal_id}
                  onOpenChange={() => setExpandedAnimal(
                    expandedAnimal === animal.animal_id ? null : animal.animal_id
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedAnimal === animal.animal_id ? (
                          <ChevronDown className="h-4 w-4 text-amber-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-amber-700" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-amber-900 dark:text-amber-100">
                            {animal.animal_name}
                          </div>
                          <div className="text-sm text-amber-700 dark:text-amber-300">
                            Caravana: {animal.animal_tag}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                        {animal.issues.length} {animal.issues.length === 1 ? 'vacuna' : 'vacunas'}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                    <div className="space-y-3">
                      {animal.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{issue.vaccine_name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Estado: <span className={
                                issue.status === 'Vencida' ? 'text-red-600 font-medium' :
                                issue.status === 'Pendiente' ? 'text-amber-600 font-medium' :
                                'text-blue-600 font-medium'
                              }>
                                {issue.status}
                              </span>
                              {issue.days_overdue && issue.days_overdue > 0 && (
                                <span className="ml-2 text-red-600">
                                  (Vencida hace {issue.days_overdue} días)
                                </span>
                              )}
                            </div>
                          </div>
                          {issue.status === 'Vencida' && (
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          )}
                          {issue.status === 'Pendiente' && (
                            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {animalsWithIssues.length === 0 && animalsCompliant.length === 0 && !loading && stats?.totalAnimals > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin datos de vacunación</h3>
            <p className="text-muted-foreground">
              No hay registros de vacunación para los animales activos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
