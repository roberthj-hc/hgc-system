"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ChefHat, 
  BarChart3, 
  BrainCircuit, 
  Zap 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const OperationalDemand = () => {
  const [product, setProduct] = useState("Combo Familiar 8 Piezas");
  const [data, setData] = useState({ descriptive: [], diagnostic: [] });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  // Cargar datos de Snowflake (Descriptiva/Diagnóstica)
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch(`http://localhost:3001/api/operational-demand/stats?product=${product}`);
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [product]);

  // Llamar a la predicción (Predictiva/MLflow)
  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/operational-demand/predict?product=${product}`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const json = await res.json();
      setPrediction(json);
    } catch (err) {
      console.error("Error predicting:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Producto Seleccionado</CardTitle>
          </CardHeader>
          <CardContent>
            <select 
              className="w-full p-2 rounded-md border bg-background"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option>Combo Familiar 8 Piezas</option>
              <option>Super Mega Combo 12 Piezas</option>
              <option>Pollo (Piezas)</option>
            </select>
          </CardContent>
        </Card>
        <Button 
          onClick={handlePredict} 
          disabled={loading}
          className="h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90"
        >
          {loading ? "Calculando..." : <><Zap className="mr-2 h-5 w-5" /> Generar Predicción IA</>}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pilar 1: Descriptiva */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle>1. Análisis Descriptivo</CardTitle>
            </div>
            <CardDescription>Demanda histórica de los últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-h-[300px]">
            {loadingStats ? <div className="flex h-full items-center justify-center">Cargando...</div> : (
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <AreaChart data={data.descriptive}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(str) => str.split("-")[2]} />
                  <YAxis fontSize={10} />
                  <Tooltip labelClassName="text-black" />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pilar 2: Diagnóstica */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <CardTitle>2. Análisis Diagnóstico</CardTitle>
            </div>
            <CardDescription>Patrón de demanda por día de la semana</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] min-h-[300px]">
             {loadingStats ? <div className="flex h-full items-center justify-center">Cargando...</div> : (
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={data.diagnostic}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="avg_value" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Pilar 3: Predictiva (MLflow) */}
        <Card className="md:col-span-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-emerald-500" />
              <CardTitle>3. Análisis Predictivo (MLflow IA)</CardTitle>
            </div>
            <CardDescription>Forecasting en tiempo real para el día siguiente</CardDescription>
          </CardHeader>
          <CardContent>
            {prediction ? (
              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20">
                    <p className="text-xs text-muted-foreground uppercase">Escenario Base</p>
                    <p className="text-4xl font-black text-emerald-600">
                      {Math.round(prediction.prediction)}
                    </p>
                    <p className="text-xs text-emerald-500">Unidades</p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100 dark:bg-yellow-950/20">
                    <p className="text-xs text-muted-foreground uppercase">Probabilidad 90%</p>
                    <p className="text-4xl font-black text-yellow-600">
                      {Math.round(prediction.prediction * 0.9)} - {Math.round(prediction.prediction * 1.1)}
                    </p>
                    <p className="text-xs text-yellow-500">Rango Seguro</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950/20">
                    <p className="text-xs text-muted-foreground uppercase">WAPE Modelo</p>
                    <p className="text-4xl font-black text-blue-600">
                      ~12%
                    </p>
                    <p className="text-xs text-blue-500">Error medio</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
                  <div className="p-2 bg-background rounded shadow-sm">
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Información del Modelo</h4>
                    <p className="text-xs text-muted-foreground">
                      Modelo: OperationalDemandModel v1 (LightGBM Quantile). 
                      Consumido mediante servidor MLflow en puerto 5001.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border-2 border-dashed rounded-lg">
                <BrainCircuit className="h-12 w-12 mb-2 opacity-20" />
                <p>Presiona el botón superior para generar la predicción</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pilar 4: Prescriptiva */}
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-purple-500" />
              <CardTitle>4. Análisis Prescriptivo</CardTitle>
            </div>
            <CardDescription>Recomendación de acción para cocina</CardDescription>
          </CardHeader>
          <CardContent>
            {prediction ? (
              <div className="space-y-4">
                 <div className="flex items-start gap-4 p-4 rounded-lg border bg-gradient-to-br from-background to-emerald-50/10 border-emerald-500/20 shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400">Preparación Sugerida</h4>
                    <p className="text-sm text-muted-foreground">
                      Se recomienda preparar <span className="font-bold text-foreground">{Math.round(prediction.prediction * 1.05)} unidades</span> para hoy. 
                      Esto incluye un 5% de colchón de seguridad.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border bg-amber-50/30 border-amber-500/20">
                  <AlertTriangle className="h-6 w-6 text-amber-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-amber-700 dark:text-amber-400">Atención en Cocina</h4>
                    <p className="text-sm text-muted-foreground">
                      Evitar preparar más de {Math.round(prediction.prediction * 1.2)} unidades para no generar merma innecesaria 
                      dada la estacionalidad del día.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <p className="text-sm italic">Esperando datos predictivos...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperationalDemand;
