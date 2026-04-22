"use client";

import { useEffect, useState } from "react";
import { WaterfallChart } from "@/components/profitability/waterfall-chart";
import { ExpenseDonutChart } from "@/components/profitability/expense-donut-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  TrendingDown, 
  Calendar, 
  Clock,
  AlertTriangle,
  Info,
  PieChart as PieChartIcon
} from "lucide-react";

export function ProfitDetectiveDescription() {
  const [data, setData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/profitability/branches`);
      const json = await response.json();
      setBranches(json);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/profitability/diagnostics?sucursalId=${selectedBranch}`);
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching profitability:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  const mainData = data.length > 0 ? data[0] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            El Detective de Rentabilidad
          </h2>
          <p className="text-muted-foreground mt-2">Diagnóstico profundo: Análisis real de factores temporales y operativos.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
             <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
               Snowflake Data: Real
             </Badge>
           </div>
           
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[220px] bg-slate-900 border-slate-800 text-slate-200">
              <SelectValue placeholder="Seleccionar Sucursal" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="all">Todas las Sucursales</SelectItem>
              {Array.isArray(branches) && branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>{branch.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              Cascada de Rentabilidad (Waterfall)
            </CardTitle>
            <CardDescription>
              Desglose detallado de ayer. Datos 100% reales de Snowflake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[400px] flex items-center justify-center text-slate-500">Consultando Snowflake...</div>
            ) : (
              <WaterfallChart data={mainData} />
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-cyan-400" />
              Estructura de Gastos
            </CardTitle>
            <CardDescription>
              Distribución porcentual de los egresos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-slate-500">Analizando costos...</div>
            ) : (
              <ExpenseDonutChart data={mainData} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Factores Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!loading && mainData && (
              <>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                      <Calendar />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Contexto Temporal</div>
                      <div className="text-xs text-slate-400 mt-1">{mainData.factor_tiempo}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                      <Clock />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Tipo de Día</div>
                      <div className="text-xs text-slate-400 mt-1">{mainData.es_feriado ? "Feriado Nacional" : "Día Ordinario"}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md shadow-xl border-dashed">
          <CardHeader>
             <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Info className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Veredicto del Detective de Rentabilidad</span>
              </div>
          </CardHeader>
          <CardContent>
            {!loading && mainData && (
              <p className="text-xl text-slate-200 leading-relaxed italic">
                "{mainData.impacto_diagnostico}"
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
