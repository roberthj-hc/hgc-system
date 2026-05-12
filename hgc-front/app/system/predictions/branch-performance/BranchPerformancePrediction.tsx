"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from "recharts";
import { 
  Building2, TrendingUp, AlertTriangle, CheckCircle2, 
  MapPin, Users, History, Calculator, ArrowRight
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface BranchData {
  ID_SUCURSAL_NK: string;
  NOMBRE_SUCURSAL: string;
  CIUDAD: string;
  TIPO_FORMATO: string;
  FEATURE_VOLUMEN_TOTAL_PEDIDOS: number;
  FEATURE_TOTAL_TRANSACCIONES: number;
  FEATURE_REVENUE_NETO_TOTAL: number;
  FEATURE_MINUTOS_ATRASO_PROMEDIO: number;
  FEATURE_MINUTOS_ATRASO_TOTAL: number;
  FEATURE_TASA_AUSENTISMO: number;
  TARGET_GANANCIA_NETA: number;
  // Propiedades calculadas
  status?: string;
  color?: string;
}

export default function BranchPerformancePrediction() {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState({
    volumen: 500000,
    transacciones: 200000,
    revenue: 15000000,
    atrasos_promedio: 0,
    atrasos_total: 0,
    ausentismo: 0.0,
    formato: "Restaurante"
  });
  const [prediction, setPrediction] = useState<{
    predictedProfit: number;
    status: string;
    color: string;
  } | null>(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/ml/branch-performance-data`);
      const raw = await res.json();

      // Guard: the API may return an error object instead of an array
      if (!res.ok || !Array.isArray(raw)) {
        const msg = raw?.error || `Error ${res.status}: respuesta inesperada del servidor`;
        console.warn("branch-performance-data: unexpected response →", raw);
        setFetchError(msg);
        setBranches([]);
        return;
      }
      setFetchError(null);

      const data: BranchData[] = raw;

      // Clasificar segun percentiles aproximados
      const sorted = [...data].sort((a,b) => b.TARGET_GANANCIA_NETA - a.TARGET_GANANCIA_NETA);
      const p80 = sorted[Math.floor(sorted.length * 0.2)]?.TARGET_GANANCIA_NETA || 0;
      const p20 = sorted[Math.floor(sorted.length * 0.8)]?.TARGET_GANANCIA_NETA || 0;

      const enriched = data.map((b: BranchData) => {
        let status = "Normal";
        let color = "#3B82F6";
        if (b.TARGET_GANANCIA_NETA >= p80) {
            status = "VIP (Expansión)";
            color = "#F59E0B";
        } else if (b.TARGET_GANANCIA_NETA <= p20) {
            status = "Alerta (Audit)";
            color = "#EF4444";
        }
        return { ...b, status, color };
      });

      setBranches(enriched);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error fetching branch data:", error);
      setFetchError(msg);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    try {
      setPredicting(true);
      const res = await fetch(`${API_URL}/api/ml/branch-performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simulation)
      });
      const data = await res.json();
      setPrediction(data);
    } catch (error) {
      console.error("Error in prediction:", error);
    } finally {
      setPredicting(false);
    }
  };

  const vipCount = branches.filter(b => b.status?.includes("VIP")).length;
  const alertCount = branches.filter(b => b.status?.includes("Alerta")).length;

  return (
    <div className="space-y-8 p-1">
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Error al cargar datos del backend</p>
            <p className="text-xs text-rose-300/80 mt-0.5">{fetchError}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Desempeño de Sucursales</h1>
          <p className="text-slate-400 mt-1">Predicción de Rentabilidad Futura y Análisis de Drivers Operativos.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
            {vipCount} Sucursales VIP
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-rose-500/10 text-rose-500 border-rose-500/20">
            {alertCount} Alertas de Gestión
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Dispersión: Revenue vs Profit */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Matriz de Rentabilidad Operativa
            </CardTitle>
            <CardDescription className="text-slate-400">
              Contraste entre Ingresos Netos y Ganancia Final (IA detecta drivers).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                    type="number" 
                    dataKey="FEATURE_REVENUE_NETO_TOTAL" 
                    name="Revenue" 
                    unit=" Bs" 
                    stroke="#94a3b8"
                    tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                />
                <YAxis 
                    type="number" 
                    dataKey="TARGET_GANANCIA_NETA" 
                    name="Ganancia" 
                    unit=" Bs" 
                    stroke="#94a3b8" 
                    tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                />
                <ZAxis type="number" dataKey="FEATURE_MINUTOS_ATRASO_PROMEDIO" range={[50, 400]} name="Atrasos" unit=" min" />
                <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                />
                <Scatter name="Sucursales" data={branches}>
                  {branches.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={2} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Panel de Simulación Predictiva */}
        <Card className="bg-slate-900/80 border-slate-700 shadow-xl border-t-indigo-500/50 border-t-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              Simulador Predictivo
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Proyecta la rentabilidad de una nueva sucursal o escenario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-wider">Volumen Pedidos Semanal</Label>
                <Input 
                  type="number" 
                  value={simulation.volumen}
                  onChange={(e) => setSimulation({...simulation, volumen: Number(e.target.value)})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-wider">Revenue Neto Estimado (Bs)</Label>
                <Input 
                  type="number" 
                  value={simulation.revenue}
                  onChange={(e) => setSimulation({...simulation, revenue: Number(e.target.value)})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-wider">Minutos Atraso (Promedio)</Label>
                <div className="flex gap-2 items-center">
                    <Input 
                    type="number" 
                    value={simulation.atrasos_promedio}
                    onChange={(e) => setSimulation({...simulation, atrasos_promedio: Number(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                    />
                    <span className="text-[10px] text-slate-500">MINS</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-wider">Formato de Sucursal</Label>
                <select 
                  value={simulation.formato}
                  onChange={(e) => setSimulation({...simulation, formato: e.target.value})}
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-md p-2 text-sm"
                >
                  <option value="Restaurante">Restaurante</option>
                  <option value="Express">Express</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={handlePredict} 
              disabled={predicting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6"
            >
              {predicting ? "IA CALCULANDO..." : "CALCULAR RENTABILIDAD"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            {prediction && (
              <div className="mt-6 p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-500" 
                   style={{ backgroundColor: `${prediction.color}15`, borderColor: `${prediction.color}40` }}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-400 uppercase font-bold">Resultado IA:</span>
                    <Badge style={{ backgroundColor: prediction.color }}>{prediction.status}</Badge>
                </div>
                <div className="text-3xl font-black text-white">
                  {prediction.predictedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-slate-400">Bs</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                    * Predicción basada en Gradient Boosting (R²=0.69). El volumen de pedidos aporta el 74% de la precisión.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ficha Técnica del Modelo (Validación de IA) */}
      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-800/20">
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Ficha Técnica del Modelo (Validación de IA)
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                Algoritmo Campeón: <span className="font-bold text-slate-300">Gradient Boosting Regressor (R² = 0.69)</span>
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={[
                        { feature: 'Volumen Pedidos', importance: 74 },
                        { feature: 'Atrasos Promedio', importance: 15 },
                        { feature: 'Capacidad/Formato', importance: 8 },
                        { feature: 'Ausentismo', importance: 3 },
                    ]} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
                        <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={11} width={120} />
                        <Tooltip 
                            cursor={{fill: '#1e293b'}}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                            formatter={(value) => [`${value}%`, 'Importancia']}
                        />
                        <Bar dataKey="importance" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* Listado de Sucursales */}
      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-800/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              Ranking de Productividad
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                  <th className="px-6 py-4 font-bold">Sucursal / Ciudad</th>
                  <th className="px-6 py-4 font-bold">Formato</th>
                  <th className="px-6 py-4 font-bold text-right">Volumen</th>
                  <th className="px-6 py-4 font-bold text-right">Atrasos (Med)</th>
                  <th className="px-6 py-4 font-bold text-right text-indigo-400">Rentabilidad Final</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {branches.map((b) => (
                  <tr key={b.ID_SUCURSAL_NK} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium group-hover:text-indigo-300 transition-colors">{b.NOMBRE_SUCURSAL}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {b.CIUDAD}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                        {b.TIPO_FORMATO}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                        {b.FEATURE_VOLUMEN_TOTAL_PEDIDOS.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <span className={b.FEATURE_MINUTOS_ATRASO_PROMEDIO > 15 ? "text-rose-400" : "text-emerald-400 font-medium"}>
                            {b.FEATURE_MINUTOS_ATRASO_PROMEDIO.toFixed(1)} min
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-white">
                        {b.TARGET_GANANCIA_NETA.toLocaleString()} Bs
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                            <span className="text-xs font-medium" style={{ color: b.color }}>{b.status}</span>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
