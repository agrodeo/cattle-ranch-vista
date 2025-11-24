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
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);

  useEffect(() => {
    if (user && currentUser?.cabañaId) {
      fetchVaccinationStats();
    }
  }, [user, currentUser?.cabañaId, globalFilters]);

  const fetchVaccinationStats = async () => {
    if (!user || !currentUser?.cabañaId) return;
    
    try {
      setLoading(true);
      
      // Fetch vaccination history
      const { data: history } = await supabase
        .from('animal_vaccines')
        .select('*, animals(name, id_tag)')
        .eq('cabaña_id', currentUser.cabañaId);

      // Fetch active animals
      const { data: animals } = await supabase
        .from('animals')
        .select('id, name, id_tag')
        .eq('cabaña_id', currentUser.cabañaId)
        .neq('status', 'vendido')
        .neq('status', 'muerto')
        .neq('status', 'Vendido')
        .neq('status', 'Muerto');

      // Calculate vaccination status for each animal
      const issuesData: typeof animalsWithIssues = [];
      let totalOverdue = 0;
      let totalPending = 0;
      let totalCompliant = 0;

      if (animals) {
        for (const animal of animals) {
          const { data: statusData } = await supabase
            .rpc('calculate_vaccination_status' as any, {
              _animal_id: animal.id,
              _cabana_id: currentUser.cabañaId
            });

          if (statusData) {
            const animalIssues = statusData
              .filter((status: any) => 
                status.status === 'vencida' || 
                status.status === 'pendiente' ||
                status.compliance_percentage < 100
              )
              .map((status: any) => ({
                vaccine_name: status.vaccine_name,
                status: status.status === 'vencida' ? 'Vencida' : 
                        status.status === 'pendiente' ? 'Pendiente' : 
                        `${status.compliance_percentage.toFixed(0)}% completada`,
                days_overdue: status.days_overdue
              }));

            if (animalIssues.length > 0) {
              issuesData.push({
                animal_id: animal.id,
                animal_name: animal.name || animal.id_tag || 'Sin nombre',
                animal_tag: animal.id_tag || 'Sin caravana',
                issues: animalIssues
              });

              // Count issues by type
              animalIssues.forEach((issue: any) => {
                if (issue.status === 'Vencida') totalOverdue++;
                else if (issue.status === 'Pendiente') totalPending++;
              });
            } else {
              totalCompliant++;
            }
          }
        }
      }

      setStats({
        totalVaccinations: history?.length || 0,
        totalAnimals: animals?.length || 0,
        totalOverdue,
        totalPending,
        totalCompliant,
        history: history || []
      });
      setAnimalsWithIssues(issuesData);
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
          <strong>Analítica de Vacunación:</strong> Total de vacunaciones registradas: {stats?.totalVaccinations || 0}
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
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completos</p>
                <p className="text-2xl font-bold text-green-600">{stats?.totalCompliant || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.totalPending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">{stats?.totalOverdue || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

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

      {animalsWithIssues.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Todo en orden!</h3>
            <p className="text-muted-foreground">
              Todos los animales tienen sus vacunas al día
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
