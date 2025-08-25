import { useState, useEffect } from "react";
import { Users, Activity, DollarSign, TrendingUp, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataCard } from "@/components/ui/data-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { SubscriptionPlansModal } from "@/components/subscription/SubscriptionPlansModal";
import { ReadOnlyModeModal } from "@/components/subscription/ReadOnlyModeModal";
import { useSubscription } from "@/hooks/useSubscription";

const Dashboard = () => {
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);
  const { subscriptionStatus } = useSubscription();

  // Show read-only modal if subscription expired
  useEffect(() => {
    if (subscriptionStatus?.isReadOnly) {
      setShowReadOnlyModal(true);
    }
  }, [subscriptionStatus?.isReadOnly]);

  // Mock data for now - will be replaced with real data from Supabase
  const stats = [
    {
      title: "Total de Animales",
      value: "0",
      icon: Users,
      description: "Ganado activo en el sistema",
      trend: "+0%",
    },
    {
      title: "Actividades Recientes",
      value: "0",
      icon: Activity,
      description: "Actividades registradas esta semana",
      trend: "+0%",
    },
    {
      title: "Ingresos Mensuales",
      value: "$0",
      icon: DollarSign,
      description: "Ingresos este mes",
      trend: "+0%",
    },
    {
      title: "Servicios",
      value: "0",
      icon: TrendingUp,
      description: "Servicios de reproducción completados",
      trend: "+0%",
    },
  ];

  return (
    <div className="space-y-6">
      <SubscriptionAlert onUpgrade={() => setShowPlansModal(true)} />
      
      <PageHeader 
        title="Tablero"
        description="Panel de control de tu operación ganadera"
        actions={
          <PrimaryButton>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Actividad
          </PrimaryButton>
        }
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <KpiCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            delta={{
              value: stat.trend,
              trend: "neutral"
            }}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <DataCard 
          title="Actividades Recientes"
          icon={Activity}
          className="col-span-4"
        >
          <EmptyState
            icon={Activity}
            title="No hay actividades recientes"
            description="Cuando registres actividades aparecerán aquí"
            action={{
              label: "Registrar Primera Actividad",
              onClick: () => console.log("Navigate to activities")
            }}
          />
        </DataCard>
        
        <DataCard 
          title="Próximas Actividades"
          icon={TrendingUp}
          className="col-span-3"
        >
          <div className="space-y-4">
            <div className="text-sm text-ink-600 mb-4">
              Comienza por:
            </div>
            <div className="space-y-3">
              {[
                { label: "Agregar tu primer animal", path: "/animals" },
                { label: "Registrar una actividad", path: "/activities" },
                { label: "Crear un corral", path: "/corrales" },
                { label: "Configurar finanzas", path: "/finances" }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-ink-50 hover:bg-ink-100 transition-colors cursor-pointer">
                  <div className="h-2 w-2 rounded-full bg-brand-500"></div>
                  <span className="text-sm font-medium text-ink-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </DataCard>
      </div>

      <SubscriptionPlansModal 
        open={showPlansModal} 
        onOpenChange={setShowPlansModal} 
      />

      <ReadOnlyModeModal 
        open={showReadOnlyModal}
        onOpenChange={setShowReadOnlyModal}
        onUpgrade={() => setShowPlansModal(true)}
      />
    </div>
  );
};

export default Dashboard;