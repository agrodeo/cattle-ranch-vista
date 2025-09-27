import { ReportFilters } from "./ReportsFilters";
import { MortalityReports as OriginalMortalityReports } from "../mortality/MortalityReports";

interface MortalityReportsProps {
  filters?: ReportFilters;
}

export const MortalityReports = ({ filters }: MortalityReportsProps) => {
  // Convert ReportFilters to the format expected by MortalityReports
  const convertedFilters = filters ? {
    date_from: typeof filters.date_from === 'string' ? new Date(filters.date_from) : filters.date_from,
    date_to: typeof filters.date_to === 'string' ? new Date(filters.date_to) : filters.date_to,
    breed: filters.breed,
    category: filters.category,
    corral_ids: filters.corral_ids,
    include_sold_dead: filters.include_sold_dead
  } : undefined;

  return <OriginalMortalityReports filters={convertedFilters} />;
};