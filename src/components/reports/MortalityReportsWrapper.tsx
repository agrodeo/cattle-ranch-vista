import { ReportFilters } from "./ReportsFilters";
import { MortalityReports as OriginalMortalityReports } from "../mortality/MortalityReports";

interface MortalityReportsProps {
  filters?: ReportFilters;
}

export const MortalityReports = ({ filters }: MortalityReportsProps) => {
  // For now, we'll render the original component
  // In the future, we can pass filters to modify its behavior
  return <OriginalMortalityReports />;
};