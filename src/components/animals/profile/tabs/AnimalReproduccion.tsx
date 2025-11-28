import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Heart, 
  Baby, 
  Plus, 
  CheckCircle, 
  XCircle,
  Calendar,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { ImprovedArtificialInseminationDialog } from "@/components/artificial-insemination/ImprovedArtificialInseminationDialog";
import { ReproductivePerformance } from "@/components/reproductive/ReproductivePerformance";
import { ReproductiveStateIndicator } from "@/components/reproductive/ReproductiveStateIndicator";
import { useAnimalOffspring } from "@/hooks/useAnimalOffspring";
import { useReproductiveState } from "@/hooks/useReproductiveState";

interface AnimalReproduccionProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

// Removed mock data - using real data only

export function AnimalReproduccion({ animal }: AnimalReproduccionProps) {
  const { t } = useTranslation(['common', 'reproductive']);
  const [showIADialog, setShowIADialog] = useState(false);
  const { offspring, loading: offspringLoading, totalCount, liveCount } = useAnimalOffspring(animal.id, animal.sex);
  const { currentState, pregnancyHistory, loading: stateLoading } = useReproductiveState(animal.id);

  if (animal.sex !== 'Hembra') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('animals:profile.reproduction.femalesOnly')}</h3>
          <p className="text-muted-foreground">
            {t('animals:profile.reproduction.femalesOnlyDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'bg-primary';
      case 'pendiente': return 'bg-yellow-500';
      case 'paricion_viva': return 'bg-blue-500';
      case 'perdida': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'confirmada': return t('animals:profile.reproduction.statusConfirmed');
      case 'pendiente': return t('animals:profile.reproduction.statusPending');
      case 'paricion_viva': return t('animals:profile.reproduction.statusLiveBirth');
      case 'perdida': return t('animals:profile.reproduction.statusLoss');
      default: return estado;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Reproductive State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReproductiveStateIndicator
          state={currentState?.estado_actual || 'sin_actividad'}
          lastUpdate={currentState?.fecha_ultimo_cambio}
          expectedDate={currentState?.fecha_esperada_parto}
          serviceType={currentState?.tipo_servicio}
          notes={currentState?.notas}
        />
        {/* Reproductive Performance Analytics */}
        <ReproductivePerformance animalId={animal.id} animalSex={animal.sex} />
      </div>
      
      {/* Header con métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.reproduction.totalPregnancies')}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stateLoading ? '...' : pregnancyHistory.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {animal.esta_preñada ? t('animals:profile.reproduction.currentlyPregnant') : t('animals:profile.reproduction.noCurrentPregnancy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.reproduction.totalOffspring')}</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offspringLoading ? '...' : totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {offspringLoading ? t('animals:profile.reproduction.loading') : `${liveCount} ${t('animals:profile.reproduction.liveOfTotal')} ${totalCount} total`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.reproduction.successRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? Math.round((liveCount / totalCount) * 100) + '%' : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? t('animals:profile.reproduction.liveVsTotal') : t('animals:profile.reproduction.noDataAvailable')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Preñeces */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {t('animals:profile.reproduction.pregnancyHistory')}
              </CardTitle>
              <CardDescription>
                {t('animals:profile.reproduction.fullServiceRecord')}
              </CardDescription>
            </div>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowIADialog(true)}
            >
              <Plus className="h-4 w-4" />
              {t('animals:profile.reproduction.registerAI')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('animals:profile.reproduction.origin')}</TableHead>
                <TableHead>{t('animals:profile.reproduction.startDate')}</TableHead>
                <TableHead>{t('animals:profile.reproduction.status')}</TableHead>
                <TableHead>{t('animals:profile.reproduction.expectedDate')}</TableHead>
                <TableHead>{t('animals:profile.reproduction.bull')}</TableHead>
                <TableHead>{t('animals:profile.reproduction.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('animals:profile.reproduction.loadingHistory')}
                  </TableCell>
                </TableRow>
              ) : pregnancyHistory.length > 0 ? (
                pregnancyHistory.map((pregnancy) => (
                  <TableRow key={pregnancy.id}>
                    <TableCell>
                      <Badge variant={pregnancy.origen === 'IA' ? 'default' : 'secondary'}>
                        {pregnancy.origen}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(pregnancy.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        pregnancy.estado_final === 'exitosa' ? 'default' :
                        pregnancy.estado_final === 'fallida' ? 'destructive' : 'secondary'
                      }>
                        {pregnancy.estado_final === 'exitosa' ? t('animals:profile.reproduction.successful') :
                         pregnancy.estado_final === 'fallida' ? t('animals:profile.reproduction.failed') : t('animals:profile.reproduction.active')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pregnancy.fecha_estimada_parto ? 
                        format(new Date(pregnancy.fecha_estimada_parto), 'dd/MM/yyyy', { locale: es }) : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        {t('animals:profile.reproduction.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <div className="text-lg font-medium mb-2">{t('animals:profile.reproduction.noPregnancyRecords')}</div>
                    <div className="text-sm">
                      {t('animals:profile.reproduction.registerServices')}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Descendencia */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Baby className="h-4 w-4" />
                {t('animals:profile.reproduction.offspringSection')} ({offspringLoading ? '...' : totalCount})
              </CardTitle>
              <CardDescription>
                {t('animals:profile.reproduction.registeredOffspringOf')} {animal.name || animal.id_tag}
              </CardDescription>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('animals:profile.reproduction.registerOffspring')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offspringLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Baby className="h-12 w-12 mx-auto mb-4 opacity-20 animate-pulse" />
              <div className="text-lg font-medium mb-2">{t('animals:profile.reproduction.loadingOffspring')}</div>
            </div>
          ) : totalCount > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{totalCount}</div>
                  <div className="text-sm text-muted-foreground">{t('animals:profile.reproduction.totalOffspringCount')}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-success">{liveCount}</div>
                  <div className="text-sm text-muted-foreground">{t('animals:profile.reproduction.alive')}</div>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('animals:profile.reproduction.idTag')}</TableHead>
                    <TableHead>{t('animals:profile.reproduction.name')}</TableHead>
                    <TableHead>{t('animals:profile.reproduction.sex')}</TableHead>
                    <TableHead>{t('animals:profile.reproduction.birthDate')}</TableHead>
                    <TableHead>{t('animals:profile.reproduction.statusHeader')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offspring.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.id_tag}</TableCell>
                      <TableCell>{child.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={child.sex === 'Macho' ? 'default' : 'secondary'}>
                          {child.sex}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {child.birth_date ? format(new Date(child.birth_date), 'dd/MM/yyyy', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={child.status === 'activo' ? 'default' : 'destructive'}>
                          {child.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Baby className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <div className="text-lg font-medium mb-2">{t('animals:profile.reproduction.noOffspringRegistered')}</div>
              <div className="text-sm">
                {t('animals:profile.reproduction.offspringWillAppear')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IA Dialog */}
      <ImprovedArtificialInseminationDialog
        open={showIADialog}
        onOpenChange={setShowIADialog}
        onSuccess={() => {
          setShowIADialog(false);
          // Refresh data
        }}
      />
    </div>
  );
}