"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Truck, MapPin, Clock, DollarSign, PackageCheck } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, Legend,
    ScatterChart, Scatter, ZAxis
} from 'recharts';

interface DeliveryRow {
    NRO_DELIVERY_DD: string;
    NRO_PEDIDO_DD: string;
    FEATURE_PLATAFORMA_DELIVERY: string;
    FEATURE_COSTO_ENVIO: number;
    TARGET_TIEMPO_ESTIMADO: number;
    TARGET_DELIVERY_COMPLETADO: number;
}

export default function DeliveryPrediction() {
    const [formData, setFormData] = useState({
        plataforma_delivery: "UberEats",
        costo_envio: 15,
    });

    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Datos reales de copo de nieve
    const [realData, setRealData] = useState<DeliveryRow[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    useEffect(() => {
        const fetchRealData = async () => {
            try {
                const res = await fetch(`${apiBase}/api/ml/delivery-data`);
                if (!res.ok) throw new Error("No se pudo cargar datos reales de Delivery");
                const data = await res.json();
                setRealData(data);
            } catch (err) {
                console.error("Error cargando datos reales:", err);
            } finally {
                setDataLoading(false);
            }
        };
        fetchRealData();
    }, []);

    // ============ MINERÍA DE DATOS ============

    // 1. Desempeño promedio de Plataformas
    const performanceByPlatform = useMemo(() => {
        const pMap: Record<string, { totalTime: number; count: number, completed: number }> = {};
        realData.forEach(r => {
            const plat = r.FEATURE_PLATAFORMA_DELIVERY || "Desconocida";
            if (!pMap[plat]) pMap[plat] = { totalTime: 0, count: 0, completed: 0 };
            pMap[plat].count += 1;
            pMap[plat].totalTime += (r.TARGET_TIEMPO_ESTIMADO || 0);
            if (r.TARGET_DELIVERY_COMPLETADO === 1) pMap[plat].completed += 1;
        });

        return Object.entries(pMap).map(([name, { totalTime, count, completed }]) => ({
            plataforma: name,
            promedio_minutos: Math.round(totalTime / count),
            tasa_exito: Math.round((completed / count) * 100)
        })).sort((a, b) => a.promedio_minutos - b.promedio_minutos);
    }, [realData]);

    // 2. Scatter: Tiempo vs Costo (Separado por completitud)
    const scatterCompleted = useMemo(() =>
        realData.filter(r => r.TARGET_DELIVERY_COMPLETADO === 1).map(r => ({
            costo: r.FEATURE_COSTO_ENVIO,
            tiempo: r.TARGET_TIEMPO_ESTIMADO,
            z: 100
        })).slice(0, 500) // limitamos a 500 puntos para rendimiento visual
    , [realData]);

    const scatterFailed = useMemo(() =>
        realData.filter(r => r.TARGET_DELIVERY_COMPLETADO === 0).map(r => ({
            costo: r.FEATURE_COSTO_ENVIO,
            tiempo: r.TARGET_TIEMPO_ESTIMADO,
            z: 200 // Hacemos los puntos de fallo más grandes
        })).slice(0, 500)
    , [realData]);
    
    const uniquePlatforms = useMemo(() => [...new Set(realData.map(r => r.FEATURE_PLATAFORMA_DELIVERY).filter(Boolean))], [realData]);

    const globalKPIs = useMemo(() => {
        if (!realData.length) return { avgTime: 0, avgCost: 0, completionRate: 0 };
        return {
            avgTime: Math.round(realData.reduce((acc, r) => acc + (r.TARGET_TIEMPO_ESTIMADO || 0), 0) / realData.length),
            avgCost: (realData.reduce((acc, r) => acc + (r.FEATURE_COSTO_ENVIO || 0), 0) / realData.length).toFixed(2),
            completionRate: Math.round((realData.filter(r => r.TARGET_DELIVERY_COMPLETADO === 1).length / realData.length) * 100)
        };
    }, [realData]);

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiBase}/api/ml/delivery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error(`Error API (${response.status}). Inicia MLFlow Delivery (Port 5005).`);

            const data = await response.json();
            setPrediction(data.estimatedMinutes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Logística y Tiempos de Entrega</h2>
                <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    Interrogar Logística IA
                </Button>
            </div>

            {/* KPI Cards Reales */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl"><Truck className="w-6 h-6 text-indigo-500" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Viajes Totales</p>
                            <p className="text-2xl font-black">{realData.length.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl"><Clock className="w-6 h-6 text-amber-500" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Tiempo Global</p>
                            <p className="text-2xl font-black text-amber-600">{globalKPIs.avgTime} min</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl"><DollarSign className="w-6 h-6 text-emerald-500" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Costo Medio Envio</p>
                            <p className="text-2xl font-black text-emerald-600">${globalKPIs.avgCost}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl"><PackageCheck className="w-6 h-6 text-blue-500" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Completados</p>
                            <p className="text-2xl font-black text-blue-600">{globalKPIs.completionRate}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Predicción interactiva */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm border-indigo-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Agente Predictor de Envíos (Regresión XGBoost)</CardTitle>
                        <CardDescription>
                            Configura los parámetros para que la IA anticipe cuánto tardará el cliente en recibir su pedido.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Plataforma Logística</label>
                            <Select value={formData.plataforma_delivery} onValueChange={(v) => setFormData({ ...formData, plataforma_delivery: v })}>
                                <SelectTrigger className="w-full text-lg p-6"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {uniquePlatforms.length > 0 ? uniquePlatforms.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    )) : (
                                        <>
                                            <SelectItem value="UberEats">UberEats</SelectItem>
                                            <SelectItem value="PedidosYa">PedidosYa</SelectItem>
                                            <SelectItem value="LogisticaPropia">Logística Propia</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2 pt-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4"/> Costo de Envío Dinámico</label>
                                <span className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-md font-black">${formData.costo_envio}</span>
                            </div>
                            <input type="range" min="0" max="100" value={formData.costo_envio} onChange={(e) => setFormData({ ...formData, costo_envio: parseInt(e.target.value) })}
                                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500 mt-2" />
                            <p className="text-xs text-muted-foreground text-center mt-2">El algoritmo asume geolocalización basada en tarificación logística.</p>
                        </div>

                    </CardContent>
                </Card>

                {/* Panel Output */}
                <div className="col-span-3 flex flex-col gap-4">
                    <Card className="relative flex-1 overflow-hidden shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                        {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-10 w-10 animate-spin text-indigo-600" /></div>}
                        
                        {prediction !== null ? (
                            <div className="text-center space-y-4">
                                <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Demora Estimada por IA</p>
                                <div className="py-8">
                                    <span className="text-7xl font-black text-indigo-600 dark:text-indigo-400 drop-shadow-sm">{Math.round(prediction)}</span>
                                    <span className="text-2xl font-bold ml-2 text-slate-400">min</span>
                                </div>
                                <div className="h-1.5 w-full max-w-[200px] bg-slate-100 rounded-full mx-auto relative overflow-hidden">
                                     <div className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (prediction / 120) * 100)}%` }}></div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground opacity-30">
                                <Truck className="mx-auto w-24 h-24 mb-4" />
                                <p className="font-medium text-lg">Solicita la Predicción</p>
                            </div>
                        )}
                    </Card>

                    {error && (
                        <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Minería Visual OBT */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 pt-4">
                
                <Card className="shadow-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Métricas Históricas por Plataforma</CardTitle>
                        <CardDescription className="text-xs">Velocidad media (barras) vs Eficiencia de Completado (línea)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pb-4">
                        {dataLoading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin" /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceByPlatform} margin={{ top: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false}/>
                                    <XAxis dataKey="plataforma" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="left" tick={{fontSize: 11}} orientation="left" stroke="#f59e0b" />
                                    <YAxis yAxisId="right" tick={{fontSize: 11}} orientation="right" stroke="#3b82f6" domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Legend wrapperStyle={{fontSize: 12, paddingTop: '10px'}}/>
                                    <Bar yAxisId="left" dataKey="promedio_minutos" name="Tiempo Promedio (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Line yAxisId="right" type="monotone" dataKey="tasa_exito" name="Completados (%)" stroke="#3b82f6" strokeWidth={3} dot={{r: 5}} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Impacto del Costo en el Tiempo Estimado</CardTitle>
                        <CardDescription className="text-xs">Rojo = Delivery Fallido / Azul = Completado Estándar</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pb-4">
                        {dataLoading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin" /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                    <XAxis type="number" dataKey="costo" name="Costo Envio" tick={{ fontSize: 11 }} label={{ value: 'Costo $', position: 'bottom', fontSize: 11, offset: -5 }} />
                                    <YAxis type="number" dataKey="tiempo" name="Tiempo" tick={{ fontSize: 11 }} label={{ value: 'Minutos', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                                    <ZAxis type="number" dataKey="z" range={[20, 150]} />
                                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Legend wrapperStyle={{fontSize: 12}} />
                                    <Scatter name="Exitoso" data={scatterCompleted} fill="#4f46e5" opacity={0.5} />
                                    <Scatter name="Fallido" data={scatterFailed} fill="#ef4444" opacity={0.7} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
