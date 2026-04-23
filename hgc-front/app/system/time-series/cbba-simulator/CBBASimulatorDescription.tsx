"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  LineChart as LineIcon,
  Settings2,
  TrendingUp,
  Zap,
  BarChart4,
  AlertCircle,
  MapPin,
  DollarSign,
  Users,
  ShoppingCart,
  History,
  ArrowRight
} from "lucide-react";

interface ChartPoint {
  date: string;
  historico?: number;
  prediccion?: number;
  upper?: number;
  lower?: number;
}

export function CBBASimulatorDescription() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [marketing, setMarketing] = useState(2500);
  const [price, setPrice] = useState(55);
  const [employees, setEmployees] = useState(10);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [histDays, setHistDays] = useState(0);

  useEffect(() => {
    fetch(`http://localhost:5000/api/profitability/branches`)
      .then(r => r.json())
      .then(setBranches)
      .catch(console.error);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, predRes] = await Promise.all([
        fetch(`http://localhost:5000/api/simulator/historical?branchId=${selectedBranch}`),
        fetch(`http://localhost:5000/api/simulator/simulate?branchId=${selectedBranch}&mkt=${marketing}&price=${price}&employees=${employees}`)
      ]);
      const histJson = await histRes.json();
      const predJson = await predRes.json();

      if (predJson.error) throw new Error(predJson.error);

      // Tomar los ultimos 90 dias de historico
      const last90 = (histJson || []).slice(-90);

      // Construir dataset combinado
      const combined: ChartPoint[] = [];

      // Historico
      for (const h of last90) {
        combined.push({ date: h.date, historico: Math.round(h.ventas) });
      }

      setHistDays(combined.length);

      // Prediccion (unir el ultimo punto historico con el primero de prediccion)
      if (combined.length > 0 && predJson.length > 0) {
        // Punto de transicion: ultimo historico tambien como primer punto de prediccion
        combined[combined.length - 1].prediccion = combined[combined.length - 1].historico;
      }

      for (const p of predJson) {
        combined.push({
          date: p.date,
          prediccion: Math.round(p.ventas),
          upper: Math.round(p.upper),
          lower: Math.round(p.lower)
        });
      }

      setChartData(combined);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, marketing, price, employees]);

  useEffect(() => {
    const timer = setTimeout(fetchAll, 600);
    return () => clearTimeout(timer);
  }, [fetchAll]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(v);

  const predData = chartData.filter(d => d.prediccion !== undefined);
  const rentable = predData.length > 1 && (predData[predData.length - 1]?.prediccion ?? 0) > (predData[0]?.prediccion ?? 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-slate-950/95 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-slate-400 text-xs mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-300">{p.name}:</span>
            <span className="font-bold text-white">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">
            Apertura de Sucursal
          </h2>
          <p className="text-muted-foreground mt-2">
            Historico real + Proyeccion a 6 meses con modelo XGBoost entrenado en Snowflake.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-cyan-500/10">
            <History className="w-3 h-3 mr-1" /> Historico Real
          </Badge>
          <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10">
            Modelo XGBoost
          </Badge>
          <Badge variant="outline" className="border-rose-500/50 text-rose-400 bg-rose-500/10">
            IC 95%
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Control Panel */}
        <Card className="lg:col-span-1 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="w-5 h-5 text-orange-400" />
              Panel de Control
            </CardTitle>
            <CardDescription>Ajusta parametros What-If.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Branch */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <Label className="text-slate-300 text-sm">Sucursal Base</Label>
              </div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
              >
                <option value="all">Consolidado (Todas)</option>
                {Array.isArray(branches) && branches.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            {/* Marketing */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <Label className="text-slate-300 text-xs">Marketing</Label>
                </div>
                <span className="text-xs font-mono text-orange-400">{fmt(marketing)}</span>
              </div>
              <input type="range" min="500" max="10000" step="250"
                value={marketing} onChange={(e) => setMarketing(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              <p className="text-[10px] text-slate-500 leading-tight">Presupuesto mensual en publicidad. Mayor inversion atrae mas clientes y sube la demanda proyectada.</p>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  <Label className="text-slate-300 text-xs">Precio Combo</Label>
                </div>
                <span className="text-xs font-mono text-orange-400">{fmt(price)}</span>
              </div>
              <input type="range" min="25" max="120" step="1"
                value={price} onChange={(e) => setPrice(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              <p className="text-[10px] text-slate-500 leading-tight">Precio promedio del combo principal. Precios altos reducen demanda (elasticidad), precios bajos la incrementan.</p>
            </div>

            {/* Employees */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  <Label className="text-slate-300 text-xs">Empleados</Label>
                </div>
                <span className="text-xs font-mono text-orange-400">{employees}</span>
              </div>
              <input type="range" min="3" max="25" step="1"
                value={employees} onChange={(e) => setEmployees(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              <p className="text-[10px] text-slate-500 leading-tight">Capacidad operativa de la sucursal. Mas personal permite atender mayor volumen de pedidos.</p>
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-1 bg-cyan-400 rounded" />
                <span className="text-slate-400">Datos Historicos (Snowflake)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-1 bg-rose-500 rounded" />
                <span className="text-slate-400">Prediccion (XGBoost)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-rose-500/15 rounded" />
                <span className="text-slate-400">Banda de Confianza 95%</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <div className="bg-slate-800/30 p-2.5 rounded-lg border border-slate-700/50">
                  <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BarChart4 className="w-3 h-3" /> Metodologia What-If
                  </h4>
                  <ul className="text-[9px] text-slate-500 space-y-1.5 leading-normal">
                    <li>• <b>Marketing:</b> Factor de impulso de demanda. +1000 Bs equivale a ~4% incremento.</li>
                    <li>• <b>Precio:</b> Basado en elasticidad real (-1.5). El volumen cae si el precio sube.</li>
                    <li>• <b>Personal:</b> Define el limite operativo. 10 empleados es el punto optimo base.</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="lg:col-span-3 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <LineIcon className="w-5 h-5 text-rose-400" />
              Historico + Proyeccion
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-normal text-slate-500">
                {histDays} dias historicos + 180 dias prediccion
              </span>
            </CardTitle>
            <CardDescription>Usa la barra inferior para hacer zoom y navegar por el tiempo.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[480px] flex items-center justify-center text-slate-500">
                Consultando Snowflake y ejecutando modelo...
              </div>
            ) : chartData.length > 0 ? (
              <div style={{ width: '100%', height: 480 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <defs>
                      <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(v) => v.substring(5)}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Vertical line at the transition point */}
                    {histDays > 0 && (
                      <ReferenceLine
                        x={chartData[histDays - 1]?.date}
                        stroke="#f59e0b"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        label={{ value: "HOY", position: "top", fill: "#f59e0b", fontSize: 11, fontWeight: 'bold' }}
                      />
                    )}

                    {/* Confidence band */}
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#f43f5e" fillOpacity={0.08} name="Limite Superior" legendType="none" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#f43f5e" fillOpacity={0.08} name="Limite Inferior" legendType="none" />

                    {/* Historical */}
                    <Area
                      type="monotone"
                      dataKey="historico"
                      stroke="#22d3ee"
                      strokeWidth={1.5}
                      fill="url(#gradHist)"
                      name="Historico Real"
                      dot={false}
                      connectNulls={false}
                    />

                    {/* Prediction */}
                    <Line
                      type="monotone"
                      dataKey="prediccion"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={false}
                      name="Prediccion ML"
                      connectNulls={false}
                    />

                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                    />

                    {/* Zoom Brush */}
                    <Brush
                      dataKey="date"
                      height={28}
                      stroke="#334155"
                      fill="#0f172a"
                      travellerWidth={10}
                      tickFormatter={(v) => v.substring(5)}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[480px] flex items-center justify-center text-red-400">
                No se pudo obtener datos. Verifique la conexion.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-orange-500/5 to-rose-500/5 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full text-orange-400"><Zap /></div>
              <div>
                <div className="text-2xl font-bold">
                  {predData.length > 0 ? fmt(predData[predData.length - 1].prediccion ?? 0) : '--'}
                </div>
                <div className="text-xs text-slate-500">VENTA DIARIA ESTIMADA AL MES 6</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 to-rose-500/5 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-full text-rose-400"><TrendingUp /></div>
              <div>
                <div className="text-2xl font-bold">
                  {predData.length > 1
                    ? (((predData[predData.length - 1]?.prediccion ?? 0) / (predData[0]?.prediccion ?? 1) - 1) * 100).toFixed(1)
                    : '--'}%
                </div>
                <div className="text-xs text-slate-500">VARIACION PROYECTADA</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-slate-800 ${rentable ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/5' : 'bg-gradient-to-br from-red-500/10 to-rose-500/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${rentable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                <BarChart4 />
              </div>
              <div>
                <div className={`text-2xl font-bold ${rentable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {rentable ? 'Recomendado' : 'Alto Riesgo'}
                </div>
                <div className="text-xs text-slate-500">VEREDICTO DE APERTURA</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
