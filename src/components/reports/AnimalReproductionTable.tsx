import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Heart, ExternalLink, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportFilters } from "./ReportsFilters";
import { Skeleton } from "@/components/ui/skeleton";

interface ReproductionAnimal {
  animal_id: string;
  tag: string;
  name: string;
  category: string;
  corral_id: string;
  corral_name: string;
  exposures: number;
  pregnancies: number;
  pregnancy_rate: number;
  calvings: number;
  live_calvings: number;
  calving_rate: number;
  live_calving_rate: number;
  open_days: number;
  is_repeater: boolean;
}

interface AnimalReproductionTableProps {
  filters: ReportFilters;
}

export function AnimalReproductionTable({ filters }: AnimalReproductionTableProps) {
  const [animals, setAnimals] = useState<ReproductionAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReproductionData();
  }, [filters]);

  const fetchReproductionData = async () => {
    setLoading(true);
    try {
      // Convert filters to the format expected by the RPC
      const filtersJson = {
        date_from: filters.date_from?.toISOString().split('T')[0],
        date_to: filters.date_to?.toISOString().split('T')[0],
        corral_ids: filters.corral_ids,
        category: filters.category,
        breed: filters.breed,
        include_sold_dead: filters.include_sold_dead
      };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase.rpc('rpc_report_reproduction_animals', {
        _user_id: userData.user.id,
        filters_json: filtersJson
      });

      if (error) {
        console.error('Error fetching reproduction data:', error);
        return;
      }

      setAnimals(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPregnancyBadgeColor = (rate: number) => {
    if (rate >= 80) return "default"; // Green
    if (rate >= 60) return "secondary"; // Yellow
    return "destructive"; // Red
  };

  const handleViewAnimal = (animalId: string) => {
    navigate(`/animales/${animalId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Reproducción por Animal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Reproducción por Animal
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              {animals.length} hembras con actividad reproductiva
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {animals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <div className="text-lg font-medium mb-2">Sin datos de reproducción</div>
              <div className="text-sm">
                No se encontraron hembras con actividad reproductiva en el período seleccionado
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Animal</TableHead>
                    <TableHead>Corral</TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>Exp.</TooltipTrigger>
                        <TooltipContent>
                          <p>Exposiciones (servicios) en el período</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>Preñ.</TooltipTrigger>
                        <TooltipContent>
                          <p>Preñeces confirmadas</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">% Preñez</TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>D. Abiertos</TooltipTrigger>
                        <TooltipContent>
                          <p>Días entre último parto y primer servicio</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>Repetidora</TooltipTrigger>
                        <TooltipContent>
                          <p>≥2 servicios sin preñez confirmada</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animals.map((animal) => (
                    <TableRow key={animal.animal_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {animal.name || animal.tag}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {animal.tag} • {animal.category}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {animal.corral_name || 'Sin corral'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {animal.exposures}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {animal.pregnancies}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getPregnancyBadgeColor(animal.pregnancy_rate)}
                          className="text-xs"
                        >
                          {animal.pregnancy_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {animal.open_days > 0 ? (
                          <span className={animal.open_days > 120 ? "text-destructive font-medium" : ""}>
                            {animal.open_days}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {animal.is_repeater ? (
                          <Badge variant="destructive" className="text-xs">
                            Sí
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAnimal(animal.animal_id)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}