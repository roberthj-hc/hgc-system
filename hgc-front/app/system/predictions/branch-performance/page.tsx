import BranchPerformancePrediction from "./BranchPerformancePrediction";

export const metadata = {
  title: "Desempeño de Sucursales | HGC AI",
  description: "Análisis predictivo de rentabilidad y drivers operativos de sucursales.",
};

export default function BranchPerformancePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <BranchPerformancePrediction />
    </div>
  );
}
