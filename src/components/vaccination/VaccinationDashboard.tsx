import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVaccineRulesForRanch, getDueVaccinesForAnimal } from "@/lib/vaccines";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Syringe, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Shield,
  TrendingUp,
  FileText,
  Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VaccinationStatus {
  animalId: string;
  animalName: string;
  animalTag: string;
  sex: string;
  age: number;
  category: string;
  dueVaccines: Array<{
    vaccine_code: string;
    vaccine_name: string;
    mandatory: boolean;
    is_due: boolean;
    rationale: string;
    days_since_last?: number;
    next_due_date?: string;
    campaign_active?: boolean;
  }>;
}

interface VaccinationStats {
  totalAnimals: number;
  upToDate: number;
  overdue: number;
  dueSoon: number;
  coverage: number;
  mandatoryCompliance: number;
}

export function VaccinationDashboard() {
  const { user } = useSupabaseAuth();
  
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState<any[]>([]);
  const [herdSettings, setHerdSettings] = useState<any>(null);
  const [vaccinationStatus, setVaccinationStatus] = useState<VaccinationStatus[]>([]);
  const [stats, setStats] = useState<VaccinationStats>({
    totalAnimals: 0,
    upToDate: 0,
    overdue: 0,
    dueSoon: 0,
    coverage: 0,
    mandatoryCompliance: 0
  });
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'overdue' | 'due_soon' | 'up_to_date'>('all');

  useEffect(() => {
    loadVaccinationData();
  }, [user]);

  const loadVaccinationData = async () => {
    if (!user) return;
    
    // Get user's cabaña info
    const { data: cabanaData } = await supabase
      .from('profiles')
      .select('cabaña_id')
      .eq('user_id', user.id)
      .single();
    
    if (!cabanaData) return;
    
    // Get herd settings
    const { data: settings } = await supabase
      .from('cabañas')
      .select('country_code, province_code')
      .single();
    
    setHerdSettings(settings);
    
    try {
      setLoading(true);

      // Get all active animals
      const { data: animalsData, error: animalsError } = await supabase
        .from('animals')
        .select('id, name, id_tag, sex, birth_date, status')
        .eq('status', 'activo')
        .neq('status', 'muerto')
        .neq('status', 'vendido');

      if (animalsError) throw animalsError;

      setAnimals(animalsData || []);

      // Get vaccination status for each animal
      const vaccinationPromises = (animalsData || []).map(async (animal) => {
        try {
          const { data, error } = await supabase.rpc('compute_due_vaccines_for_animal', {
            _animal_id: animal.id
          });

          if (error) throw error;

          const dueVaccines = (data as any)?.due_vaccines || [];
          const age = animal.birth_date 
            ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : 0;

          const category = categorizeAnimal(animal.birth_date, animal.sex);

          return {
            animalId: animal.id,
            animalName: animal.name || `Animal ${animal.id_tag}`,
            animalTag: animal.id_tag || animal.id.slice(0, 8),
            sex: animal.sex || 'Desconocido',
            age,
            category,
            dueVaccines
          };
        } catch (error) {
          console.error(`Error getting vaccination status for animal ${animal.id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(vaccinationPromises);
      const validResults = results.filter(Boolean) as VaccinationStatus[];
      setVaccinationStatus(validResults);

      // Calculate stats
      calculateStats(validResults);

    } catch (error) {
      console.error("Error loading vaccination data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de vacunación"
      });
    } finally {
      setLoading(false);
    }
  };

  const categorizeAnimal = (birthDate: string | null, sex: string) => {
    if (!birthDate) return 'Desconocido';
    
    const ageMonths = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (sex === 'Macho') {
      if (ageMonths < 12) return 'Ternero';
      if (ageMonths < 24) return 'Torete';
      return 'Toro';
    } else if (sex === 'Hembra') {
      if (ageMonths < 12) return 'Ternera';
      if (ageMonths < 24) return 'Vaquillona';
      return 'Vaca';
    }
    return 'Desconocido';
  };

  const calculateStats = (statusData: VaccinationStatus[]) => {
    const totalAnimals = statusData.length;
    let upToDate = 0;
    let overdue = 0;
    let dueSoon = 0;
    let mandatoryCompliant = 0;

    statusData.forEach(animal => {
      const overdueVaccines = animal.dueVaccines.filter(v => v.is_due && v.mandatory);
      const dueSoonVaccines = animal.dueVaccines.filter(v => 
        !v.is_due && v.next_due_date && 
        new Date(v.next_due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      if (overdueVaccines.length > 0) {
        overdue++;
      } else if (dueSoonVaccines.length > 0) {
        dueSoon++;
      } else {
        upToDate++;
      }

      // Check mandatory compliance
      const mandatoryVaccines = animal.dueVaccines.filter(v => v.mandatory);
      const overduerMandatory = mandatoryVaccines.filter(v => v.is_due);
      if (overduerMandatory.length === 0) {
        mandatoryCompliant++;
      }
    });

    const coverage = totalAnimals > 0 ? (upToDate / totalAnimals) * 100 : 0;
    const mandatoryCompliance = totalAnimals > 0 ? (mandatoryCompliant / totalAnimals) * 100 : 0;

    setStats({
      totalAnimals,
      upToDate,
      overdue,
      dueSoon,
      coverage,
      mandatoryCompliance
    });
  };

  const getFilteredAnimals = () => {
    return vaccinationStatus.filter(animal => {
      const overdueVaccines = animal.dueVaccines.filter(v => v.is_due);
      const dueSoonVaccines = animal.dueVaccines.filter(v => 
        !v.is_due && v.next_due_date && 
        new Date(v.next_due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      switch (selectedFilter) {
        case 'overdue':
          return overdueVaccines.length > 0;
        case 'due_soon':
          return dueSoonVaccines.length > 0 && overdueVaccines.length === 0;
        case 'up_to_date':
          return overdueVaccines.length === 0 && dueSoonVaccines.length === 0;
        default:
          return true;
      }
    });
  };

  const getStatusBadge = (animal: VaccinationStatus) => {
    const overdueVaccines = animal.dueVaccines.filter(v => v.is_due);
    const dueSoonVaccines = animal.dueVaccines.filter(v => 
      !v.is_due && v.next_due_date && 
      new Date(v.next_due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    if (overdueVaccines.length > 0) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Vencido ({overdueVaccines.length})
      </Badge>;
    } else if (dueSoonVaccines.length > 0) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Próximo ({dueSoonVaccines.length})
      </Badge>;
    } else {
      return <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Al día
      </Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Panel de Vacunación
          </h3>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando datos de vacunación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Panel de Vacunación
          </h3>
          <p className="text-muted-foreground">
            Control sanitario integral del hato según {herdSettings?.country || 'Argentina'}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Animales</p>
                <p className="text-2xl font-bold">{stats.totalAnimals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Al Día</p>
                <p className="text-2xl font-bold text-green-600">{stats.upToDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Próximos</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cobertura de Vacunación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Cobertura General</span>
              <span>{stats.coverage.toFixed(1)}%</span>
            </div>
            <Progress value={stats.coverage} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Cumplimiento Obligatorio</span>
              <span>{stats.mandatoryCompliance.toFixed(1)}%</span>
            </div>
            <Progress value={stats.mandatoryCompliance} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Mandatory Vaccines Alert */}
      {herdSettings && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Vacunas Obligatorias para {herdSettings?.country_code || 'AR'}:</strong>{' '}
            Sistema configurado para {herdSettings?.country_code || 'Argentina'}
            {herdSettings?.province_code && ` - ${herdSettings.province_code}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Animal Status Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Estado por Animal
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={selectedFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('overdue')}
              >
                Vencidos
              </Button>
              <Button
                variant={selectedFilter === 'due_soon' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('due_soon')}
              >
                Próximos
              </Button>
              <Button
                variant={selectedFilter === 'up_to_date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('up_to_date')}
              >
                Al Día
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getFilteredAnimals().map((animal) => (
              <div key={animal.animalId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{animal.animalName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {animal.animalTag} • {animal.category} • {animal.age} meses
                    </p>
                  </div>
                  {getStatusBadge(animal)}
                </div>
                
                {animal.dueVaccines.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Vacunas:</p>
                    {animal.dueVaccines.map((vaccine, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${vaccine.mandatory ? 'text-red-600' : ''}`}>
                            {vaccine.vaccine_name}
                          </span>
                          {vaccine.mandatory && <Badge variant="destructive" className="text-xs">Obligatoria</Badge>}
                          {vaccine.campaign_active && <Badge variant="secondary" className="text-xs">Campaña</Badge>}
                        </div>
                        <div className="text-right">
                          <span className={vaccine.is_due ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            {vaccine.rationale}
                          </span>
                          {vaccine.next_due_date && (
                            <p className="text-xs text-muted-foreground">
                              Próxima: {format(new Date(vaccine.next_due_date), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {getFilteredAnimals().length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay animales que coincidan con el filtro seleccionado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}