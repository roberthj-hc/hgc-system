"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, DollarSign, TrendingUp, Award, Gem } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    RadialBarChart, RadialBar, Legend,
    AreaChart, Area
} from 'recharts';

export default function CLVPrediction() {
    const [formData, setFormData] = useState({
        rango_edad: "18-25",
        freq_total: 10,
        cantidad_articulos: 25,
        antiguedad_dias: 180,
    });

    const [loading, setLoading] = useState(false);
    const [clv, setCLV] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/ml/clv`
                : "http://localhost:4000/api/ml/clv";

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(`Error API (${response.status}). Asegúrate que MLFlow (Puerto 5003) y Backend corran.`);
            }

            const data = await response.json();
            setCLV(data.clvPredicted);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tier de cliente basado en CLV
    const getTier = (value: number) => {
        if (value >= 5000) return { name: "Diamante", color: "#8b5cf6", bg: "bg-violet-100 dark:bg-violet-900/30", border: "border-violet-300 dark:border-violet-700", icon: <Gem className="w-6 h-6 text-violet-500" /> };
        if (value >= 2000) return { name: "Oro", color: "#eab308", bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-300 dark:border-yellow-700", icon: <Award className="w-6 h-6 text-yellow-500" /> };
        if (value >= 500) return { name: "Plata", color: "#64748b", bg: "bg-slate-100 dark:bg-slate-800/50", border: "border-slate-300 dark:border-slate-700", icon: <TrendingUp className="w-6 h-6 text-slate-500" /> };
        return { name: "Bronce", color: "#d97706", bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", icon: <DollarSign className="w-6 h-6 text-amber-600" /> };
    };

    // Datos para Bar comparativo
    const comparisonData = [
        { name: 'Bronce', valor: 250, fill: '#d97706' },
        { name: 'Plata', valor: 1200, fill: '#64748b' },
        { name: 'Oro', valor: 3500, fill: '#eab308' },
        { name: 'Diamante', valor: 7500, fill: '#8b5cf6' },
        ...(clv !== null ? [{ name: 'Este Cliente', valor: Math.round(clv), fill: '#10b981' }] : []),
    ];

    // Proyección futura simulada (12 meses)
    const projectionData = clv !== null ? Array.from({ length: 12 }, (_, i) => ({
        mes: `M${i + 1}`,
        acumulado: Math.round((clv / 12) * (i + 1) * (1 + Math.random() * 0.1)),
    })) : [];

    // Radial para el fill visual del "potencial"
    const radialData = clv !== null ? [
        { name: 'CLV', value: Math.min(100, Math.round((clv / 8000) * 100)), fill: getTier(clv).color },
    ] : [];

    const tier = clv !== null ? getTier(clv) : null;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Valor de Vida del Cliente (CLV)</h2>
                <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                    Calcular CLV
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Panel de Features */}
                <Card className="col-span-4 shadow-sm border-emerald-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Perfil del Cliente</CardTitle>
                        <CardDescription>
                            El modelo de regresión (XGBoost / GBR) predice cuánto dinero generará este cliente a lo largo de su vida.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Rango de Edad</label>
                            <Select value={formData.rango_edad} onValueChange={(v) => setFormData({ ...formData, rango_edad: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Menor de 18">Menor de 18</SelectItem>
                                    <SelectItem value="18-25">18 a 25 años</SelectItem>
                                    <SelectItem value="26-35">26 a 35 años</SelectItem>
                                    <SelectItem value="Mayor de 35">Mayor de 35</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Frecuencia de Pedidos</label>
                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold">{formData.freq_total} pedidos</span>
                            </div>
                            <input type="range" min="1" max="200" value={formData.freq_total} onChange={(e) => setFormData({ ...formData, freq_total: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Artículos Comprados</label>
                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold">{formData.cantidad_articulos} items</span>
                            </div>
                            <input type="range" min="1" max="500" value={formData.cantidad_articulos} onChange={(e) => setFormData({ ...formData, cantidad_articulos: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-teal-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Antigüedad como Cliente</label>
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">{formData.antiguedad_dias} días</span>
                            </div>
                            <input type="range" min="1" max="1500" value={formData.antiguedad_dias} onChange={(e) => setFormData({ ...formData, antiguedad_dias: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-500" />
                        </div>

                    </CardContent>
                </Card>

                {/* Panel de Resultado */}
                <div className="col-span-3 flex flex-col gap-4">
                    <Card className="relative overflow-hidden shadow-sm">
                        {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-8 w-8 animate-spin text-emerald-600" /></div>}

                        <CardHeader className="pb-2 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                            <CardTitle className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">Predicción de Valor Vitalicio</CardTitle>
                        </CardHeader>

                        <CardContent className="flex flex-col items-center justify-center pt-4 pb-4">
                            {clv !== null && tier ? (
                                <div className="w-full space-y-4">
                                    {/* Valor Principal */}
                                    <div className="text-center">
                                        <p className="text-5xl font-black tracking-tight" style={{ color: tier.color }}>
                                            ${Math.round(clv).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Valor estimado de por vida</p>
                                    </div>

                                    {/* Badge del Tier */}
                                    <div className={`flex items-center justify-center gap-2 mx-auto p-3 rounded-xl border ${tier.bg} ${tier.border} w-fit`}>
                                        {tier.icon}
                                        <span className="font-bold text-sm">Tier {tier.name}</span>
                                    </div>

                                    {/* Radial Progress */}
                                    <div className="h-[100px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart innerRadius="60%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0}>
                                                <RadialBar dataKey="value" cornerRadius={10} />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground opacity-40">
                                    <DollarSign className="mx-auto w-16 h-16 mb-3" />
                                    <p>Ajusta los features y calcula</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gráfico de Comparación por Tier */}
                    {clv !== null && (
                        <Card className="shadow-sm">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Comparativa por Tier</CardTitle>
                                <CardDescription className="text-xs">Dónde cae este cliente contra los rangos de valor</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[160px] pb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 10, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                                        <RechartsTooltip formatter={(value: number) => [`$${value}`, 'Valor']} />
                                        <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Proyección Futura */}
                    {clv !== null && projectionData.length > 0 && (
                        <Card className="shadow-sm">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Proyección Acumulada (12 Meses)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[140px] pb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectionData}>
                                        <defs>
                                            <linearGradient id="colorCLV" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                                        <RechartsTooltip formatter={(value: number) => [`$${value}`, 'Acumulado']} />
                                        <Area type="monotone" dataKey="acumulado" stroke="#10b981" fillOpacity={1} fill="url(#colorCLV)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
