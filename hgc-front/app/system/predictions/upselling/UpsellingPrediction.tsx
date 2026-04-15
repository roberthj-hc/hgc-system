"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShoppingBag, Banknote, CalendarDays, TrendingUp, ThumbsUp, Crown, Sparkles } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    RadialBarChart, RadialBar, Legend, AreaChart, Area
} from 'recharts';

export default function UpsellingPrediction() {
    const [formData, setFormData] = useState({
        cantidad_compras: 3,
        ticket_promedio: 15.0,
        recencia_dias: 10,
    });

    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<{ probabilityPercent: number; isUpsellCandidate: boolean, simulated: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiBase}/api/ml/upselling`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error(`Error API (${response.status}). Inicia MLFlow Upselling (Port 5007).`);

            const data = await response.json();
            setPrediction(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ============ MINERIA SIMULADA 300K DATOS ============
    
    // Impacto de Upselling Exitoso por Segmento
    const segmentUpsellData = [
        { name: "Ocasionales", conversion: 15, volumen: 150000 },
        { name: "Regulares", conversion: 38, volumen: 90000 },
        { name: "Frecuentes", conversion: 65, volumen: 45000 },
        { name: "VIP / Elite", conversion: 82, volumen: 15000 },
    ];

    const upsellingProducts = [
        { name: "Combo XL", size: 45, fill: "#3b82f6" },
        { name: "Postre Premium", size: 30, fill: "#ec4899" },
        { name: "Agrandar Bebida", size: 85, fill: "#06b6d4" },
        { name: "Adición Queso/Extra", size: 65, fill: "#f59e0b" },
    ];

    const growthTrend = Array.from({length: 12}).map((_, i) => ({
        mes: `Mes ${i+1}`,
        ingresoBase: 50000 + Math.random() * 5000,
        ingresoUpsell: (50000 + Math.random() * 5000) * (0.10 + (i * 0.02)) // El upsell mejora con el tiempo
    }));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Estrategia de Upselling & Cross-Selling</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <TrendingUp className="w-4 h-4"/> 
                        Agente de propensión de compra para maximizar el Ticket Promedio.
                    </p>
                </div>
                <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Consultar IA de Ventas
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Controladores */}
                <Card className="col-span-1 shadow-sm border-indigo-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-indigo-500"/> Perfil del Cliente</CardTitle>
                        <CardDescription>
                            Introduce los hábitos de consumo del cliente en su visita actual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Compras Históricas</label>
                                <span className="font-bold font-mono text-sm px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{formData.cantidad_compras}</span>
                            </div>
                            <input type="range" min="1" max="50" step="1" value={formData.cantidad_compras} onChange={(e) => setFormData({ ...formData, cantidad_compras: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><Banknote className="w-4 h-4"/> Ticket Promedio ($)</label>
                                <span className="font-bold font-mono text-sm text-emerald-600">${formData.ticket_promedio.toFixed(2)}</span>
                            </div>
                            <input type="range" min="5" max="150" step="5" value={formData.ticket_promedio} onChange={(e) => setFormData({ ...formData, ticket_promedio: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Días desde últ. visita</label>
                                <span className="font-bold font-mono text-sm">{formData.recencia_dias} días</span>
                            </div>
                            <input type="range" min="0" max="90" step="1" value={formData.recencia_dias} onChange={(e) => setFormData({ ...formData, recencia_dias: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-amber-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* Score Predictivo Principal */}
                <Card className="col-span-2 relative flex flex-col justify-center items-center shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
                    {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-10 w-10 animate-spin text-indigo-600" /></div>}
                    
                    {prediction !== null ? (
                        <div className="text-center z-10 space-y-4 w-full px-8">
                            <h3 className="text-sm font-black tracking-widest text-muted-foreground uppercase">Propensión a Mejorar el Pedido</h3>
                            
                            <div className="flex flex-col items-center justify-center py-4">
                                <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-[12px] border-slate-100 dark:border-slate-800">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle 
                                            cx="50" cy="50" r="44" 
                                            fill="none" 
                                            stroke={prediction.isUpsellCandidate ? "#4f46e5" : "#94a3b8"} 
                                            strokeWidth="12" 
                                            strokeDasharray={`${(prediction.probabilityPercent / 100) * 276.46} 276.46`} 
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className={`text-5xl font-black ${prediction.isUpsellCandidate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                                            {prediction.probabilityPercent}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {prediction.isUpsellCandidate ? (
                                <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold bg-indigo-100 dark:bg-indigo-900/30 py-2 px-4 rounded-full w-max mx-auto">
                                    <ThumbsUp className="w-5 h-5"/> ¡Candidato Ideal para Ofrecer Extras!
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-slate-500 font-medium py-2 px-4">
                                    Mejor no forzar (Baja propensión, cuida la experiencia)
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground opacity-40">
                            <Sparkles className="mx-auto w-20 h-20 mb-4" />
                            <p className="font-medium text-lg">Predice la Compra</p>
                            <p className="text-sm mt-1 max-w-[300px] mx-auto text-center">Analizaremos el patrón histórico para recomendar venderle o no, y no ser invasivos.</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Dashboard Visual de Simulacion Upselling (Minería) */}
            <h3 className="text-xl font-bold pt-8 pb-2">Rendimiento Histórico de Campañas Upselling (Labs)</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm md:col-span-1">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Tasa de Conversión por Segmento</CardTitle>
                        <CardDescription className="text-xs">¿Quiénes aceptan mejorar su pedido?</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={segmentUpsellData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false}/>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip formatter={(val: number) => [`${val}%`, "Conversión"]} />
                                <Bar dataKey="conversion" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm md:col-span-1">
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">Incremento Directo a Caja</CardTitle>
                        <CardDescription className="text-xs">Crecimiento compuesto mensual</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUpsell" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip formatter={(v: number) => [`$${Math.round(v)}`, "Ingreso"]} />
                                <Area type="monotone" dataKey="ingresoUpsell" name="Ingreso por Upsell" stroke="#10b981" fillOpacity={1} fill="url(#colorUpsell)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm md:col-span-1 border-indigo-100 dark:border-indigo-900/50">
                    <CardHeader className="py-4 pb-0">
                        <CardTitle className="text-base">Top Productos Ofertados</CardTitle>
                        <CardDescription className="text-xs">Exito de cross-selling por grupo</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" barSize={10} data={upsellingProducts}>
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
            </div>
        </div>
    );
}
