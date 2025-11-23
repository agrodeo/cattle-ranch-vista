import { VaccinationAnalytics } from "./VaccinationAnalytics";

interface VaccinationAnalyticsWrapperProps {
  filters?: any;
}

export const VaccinationAnalyticsWrapper = ({ filters }: VaccinationAnalyticsWrapperProps) => {
  return <VaccinationAnalytics filters={filters} />;
};

export { VaccinationAnalytics };
