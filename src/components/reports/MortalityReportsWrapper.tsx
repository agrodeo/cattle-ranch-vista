import { ReportFilters } from "./ReportsFilters";
import { MortalityReports as OriginalMortalityReports } from "../mortality/MortalityReports";

interface MortalityReportsProps {
  filters?: ReportFilters;
}

export const MortalityReports = ({ filters }: MortalityReportsProps) => {
  // For now, we'll render the original component without filters
  // TODO: Update the original MortalityReports to handle filters
  return <OriginalMortalityReports />;
};