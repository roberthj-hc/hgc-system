"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, UserMinus, CalendarX, MessageSquareWarning, Receipt, ArchiveX } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    RadialBarChart, RadialBar, Legend, LineChart, Line
} from 'recharts';

export default function LegacyChurnPrediction() {
    const [formData, setFormData] = useState({
        dias_sin_comprar: 60,
        quejas_registradas: 1,
        ticket_promedio: 15.0,
    });

    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<{ probabilityPercent: number; isChurnRisk: boolean, simulated: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiBase}/api/ml/legacy-churn`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error(`Error API (${response.status}). Inicia MLFlow Legacy Churn (Port 5008).`);

            const data = await response.json();
            setPrediction(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ============ MINERIA SIMULADA 300K DATOS ============
    
    // Impacto de Churn por Segmento
    const segmentChurnData = [
        { name: "Recientes (<30d)", riesgoPromedio: 12 },
        { name: "Inactivos Leves (30-90d)", riesgoPromedio: 45 },
        { name: "Peligro Inminente (>90d)", riesgoPromedio: 85 },
        { name: "Dormidos (>180d)", riesgoPromedio: 96 },
    ];

    const churnReasons = [
        { name: "Calidad Prod.", size: 45, fill: "#ef4444" },
        { name: "Atención Cliente", size: 30, fill: "#f97316" },
        { name: "Fuga Orgánica", size: 85, fill: "#3b82f6" },
        { name: "Precios Altos", size: 65, fill: "#f59e0b" },
    ];

    const historicalRetention = Array.from({length: 12}).map((_, i) => ({
        mes: `M ${i+1}`,
        retencion: 90 - (i * 2) + Math.random() * 5,
        fuga: 10 + (i * 2) - Math.random() * 5
    }));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fuga de Clientes (Modelo Legacy)</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <ArchiveX className="w-4 h-4"/> 
                        Motor predictivo anterior importado desde el histórico de data models (.pkl).
                    </p>
                </div>
                <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                    Analizar Fuga Histórica
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Controladores */}
                <Card className="col-span-1 shadow-sm border-slate-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ArchiveX className="w-5 h-5 text-slate-500"/> Features del Archivo</CardTitle>
                        <CardDescription>
                            Configura los parámetros específicos que requiere el archivo antiguo para la evaluación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><CalendarX className="w-4 h-4"/> Días Inactivo</label>
                                <span className="font-bold font-mono text-sm px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{formData.dias_sin_comprar}</span>
                            </div>
                            <input type="range" min="0" max="365" step="5" value={formData.dias_sin_comprar} onChange={(e) => setFormData({ ...formData, dias_sin_comprar: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-slate-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><MessageSquareWarning className="w-4 h-4"/> Quejas Registradas</label>
                                <span className="font-bold font-mono text-sm text-red-600">{formData.quejas_registradas}</span>
                            </div>
                            <input type="range" min="0" max="10" step="1" value={formData.quejas_registradas} onChange={(e) => setFormData({ ...formData, quejas_registradas: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-red-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><Receipt className="w-4 h-4"/> Ticket Base ($)</label>
                                <span className="font-bold font-mono text-sm text-emerald-600">${formData.ticket_promedio.toFixed(2)}</span>
                            </div>
                            <input type="range" min="5" max="150" step="5" value={formData.ticket_promedio} onChange={(e) => setFormData({ ...formData, ticket_promedio: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* Score Predictivo Principal */}
                <Card className="col-span-2 relative flex flex-col justify-center items-center shadow-sm overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-background">
                    {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-10 w-10 animate-spin text-slate-600" /></div>}
                    
                    {prediction !== null ? (
                        <div className="text-center z-10 space-y-4 w-full px-8">
                            <h3 className="text-sm font-black tracking-widest text-muted-foreground uppercase">Proyección de Abandono (Legacy)</h3>
                            
                            <div className="flex flex-col items-center justify-center py-4">
                                <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-[12px] border-slate-100 dark:border-slate-800">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle 
                                            cx="50" cy="50" r="44" 
                                            fill="none" 
                                            stroke={prediction.isChurnRisk ? "#ef4444" : "#10b981"} 
                                            strokeWidth="12" 
                                            strokeDasharray={`${(prediction.probabilityPercent / 100) * 276.46} 276.46`} 
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className={`text-5xl font-black ${prediction.isChurnRisk ? 'text-red-600 dark:text-red-400' : 'text-emerald-500'}`}>
                                            {prediction.probabilityPercent}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {prediction.simulated && (
                                <p className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full inline-block mt-2 font-medium border border-amber-200 mb-2">
                                    ¡Simulación Legacy Segura Ejecutada!
                                </p>
                            )}

                            {prediction.isChurnRisk ? (
                                <div className="flex items-center justify-center gap-2 text-rose-600 font-bold bg-rose-100 dark:bg-rose-900/30 py-2 px-4 rounded-full w-max mx-auto">
                                    <UserMinus className="w-5 h-5"/> Cliente a punto de fugarse
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-slate-500 font-medium py-2 px-4">
                                    Cliente Sano según el modelo Legacy.
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground opacity-40">
                            <ArchiveX className="mx-auto w-20 h-20 mb-4" />
                            <p className="font-medium text-lg">Predicción Histórica</p>
                            <p className="text-sm mt-1 max-w-[300px] mx-auto text-center">Inicia la evaluación para detectar riesgo inminente según variables archivadas.</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Dashboard Visual de Simulacion Churn Legacy (Minería) */}
            <h3 className="text-xl font-bold pt-8 pb-2">Patrones Detectados en Modelo Base (Labs)</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm md:col-span-1">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Mortalidad por Cohorte</CardTitle>
                        <CardDescription className="text-xs">Incremento del riesgo por inactividad calculada</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={segmentChurnData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false}/>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip formatter={(val: number) => [`${val}%`, "Riesgo de Fuga Promedio"]} />
                                <Bar dataKey="riesgoPromedio" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm md:col-span-1 border-slate-100 dark:border-slate-800">
                    <CardHeader className="py-4 pb-0">
                        <CardTitle className="text-base">Atribución de Causas Top</CardTitle>
                        <CardDescription className="text-xs">Factores principales pesados por el algoritmo</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" barSize={10} data={churnReasons}>
                                <RadialBar
                                    background={{ fill: '#e2e8f0' }}
                                    dataKey="size"
                                    cornerRadius={10}
                                />
                                <RechartsTooltip />
                                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: 10}} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm md:col-span-1">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Deterioro Dinámico</CardTitle>
                        <CardDescription className="text-xs">Meses transcurridos de retención neta</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalRetention} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip formatter={(v: number) => [`${Math.round(v)}%`, "Tasa"]} />
                                <Line type="monotone" dataKey="fuga" name="Tasa de Abandono Corto" stroke="#ef4444" strokeWidth={3} dot={{r: 2}} />
                                <Line type="monotone" dataKey="retencion" name="Clientes Activos" stroke="#10b981" strokeWidth={2} dot={{r: 2}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
