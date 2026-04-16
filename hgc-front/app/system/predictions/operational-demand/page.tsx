import OperationalDemand from "./OperationalDemand";

export const metadata = {
  title: "Predicción de Demanda Operativa | HGC System",
  description: "Optimización de preparación de cocina y reducción de desperdicios mediante IA.",
};

export default function OperationalDemandPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">🍗 Demanda Operativa</h2>
      </div>
      
      {/* El componente principal que contiene toda la lógica de los 4 pilares */}
      <OperationalDemand />
    </div>
  );
}
