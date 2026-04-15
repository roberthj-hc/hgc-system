"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert, ShieldCheck, Users, Clock, AlertTriangle } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    ScatterChart, Scatter, ZAxis
} from 'recharts';

interface EmployeeRow {
    ID_EMPLEADO_NK: string;
    CARGO_TITULO: string;
    DEPARTAMENTO_NOMBRE: string;
    FEATURE_TOTAL_MINUTOS_ATRASO: number;
    FEATURE_PROMEDIO_RETRASO: number;
    FEATURE_TOTAL_HORAS_TRABAJADAS: number;
    TARGET_ALTO_RIESGO_AUSENTISMO: number;
}

export default function AbsenteeismPrediction() {
    const [formData, setFormData] = useState({
        cargo_titulo: "Mesero",
        departamento_nombre: "Servicio",
        total_minutos_atraso: 60,
        promedio_retraso: 10,
        total_horas_trabajadas: 800,
    });

    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<{ isHighRisk: boolean; predictionValue: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // DATOS REALES desde Snowflake
    const [realData, setRealData] = useState<EmployeeRow[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    useEffect(() => {
        const fetchRealData = async () => {
            try {
                const res = await fetch(`${apiBase}/api/ml/absenteeism-data`);
                if (!res.ok) throw new Error("No se pudo cargar datos reales");
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

    // ============ GRÁFICOS CON DATOS REALES ============

    // 1. Pie Chart: Distribución Real de Riesgo
    const riskDistribution = useMemo(() => {
        const high = realData.filter(r => r.TARGET_ALTO_RIESGO_AUSENTISMO === 1).length;
        const low = realData.length - high;
        return [
            { name: 'Alto Riesgo', value: high, fill: '#ef4444' },
            { name: 'Bajo Riesgo', value: low, fill: '#10b981' },
        ];
    }, [realData]);

    // 2. Bar Chart: Promedio de Atraso Real por Departamento
    const avgDelayByDept = useMemo(() => {
        const deptMap: Record<string, { total: number; count: number }> = {};
        realData.forEach(r => {
            const dept = r.DEPARTAMENTO_NOMBRE || 'Sin Depto';
            if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 };
            deptMap[dept].total += (r.FEATURE_PROMEDIO_RETRASO || 0);
            deptMap[dept].count += 1;
        });
        return Object.entries(deptMap).map(([name, { total, count }]) => ({
            departamento: name,
            promedio_retraso: Math.round((total / count) * 100) / 100,
        })).sort((a, b) => b.promedio_retraso - a.promedio_retraso);
    }, [realData]);

    // 3. Bar Chart: Cantidad de empleados de alto riesgo por cargo
    const riskByCargo = useMemo(() => {
        const cargoMap: Record<string, { riesgo: number; total: number }> = {};
        realData.forEach(r => {
            const cargo = r.CARGO_TITULO || 'Sin Cargo';
            if (!cargoMap[cargo]) cargoMap[cargo] = { riesgo: 0, total: 0 };
            cargoMap[cargo].total += 1;
            if (r.TARGET_ALTO_RIESGO_AUSENTISMO === 1) cargoMap[cargo].riesgo += 1;
        });
        return Object.entries(cargoMap).map(([name, { riesgo, total }]) => ({
            cargo: name,
            alto_riesgo: riesgo,
            bajo_riesgo: total - riesgo,
        })).sort((a, b) => b.alto_riesgo - a.alto_riesgo);
    }, [realData]);

    // 4. Scatter: Minutos de Atraso vs Horas Trabajadas (colorizado por riesgo)
    const scatterHigh = useMemo(() =>
        realData.filter(r => r.TARGET_ALTO_RIESGO_AUSENTISMO === 1).map(r => ({
            atraso: r.FEATURE_TOTAL_MINUTOS_ATRASO,
            horas: r.FEATURE_TOTAL_HORAS_TRABAJADAS,
            z: 100
        })), [realData]);

    const scatterLow = useMemo(() =>
        realData.filter(r => r.TARGET_ALTO_RIESGO_AUSENTISMO !== 1).map(r => ({
            atraso: r.FEATURE_TOTAL_MINUTOS_ATRASO,
            horas: r.FEATURE_TOTAL_HORAS_TRABAJADAS,
            z: 100
        })), [realData]);

    // Extraer opciones únicas reales de los datos
    const uniqueCargos = useMemo(() => [...new Set(realData.map(r => r.CARGO_TITULO).filter(Boolean))], [realData]);
    const uniqueDeptos = useMemo(() => [...new Set(realData.map(r => r.DEPARTAMENTO_NOMBRE).filter(Boolean))], [realData]);

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiBase}/api/ml/absenteeism`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error(`Error API (${response.status}). MLFlow (5004) y Backend deben estar corriendo.`);

            const data = await response.json();
            setPrediction(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const COLORS_PIE = ['#ef4444', '#10b981'];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Predicción de Ausentismo Laboral</h2>
                <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-rose-600 hover:bg-rose-700">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    Evaluar Riesgo
                </Button>
            </div>

            {/* KPI Cards con datos reales */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Users className="w-5 h-5 text-slate-500" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Empleados</p>
                                <p className="text-2xl font-black">{realData.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg"><ShieldAlert className="w-5 h-5 text-red-500" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Alto Riesgo</p>
                                <p className="text-2xl font-black text-red-600">{realData.filter(r => r.TARGET_ALTO_RIESGO_AUSENTISMO === 1).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg"><ShieldCheck className="w-5 h-5 text-emerald-500" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Bajo Riesgo</p>
                                <p className="text-2xl font-black text-emerald-600">{realData.filter(r => r.TARGET_ALTO_RIESGO_AUSENTISMO !== 1).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg"><Clock className="w-5 h-5 text-amber-500" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Prom. Atraso</p>
                                <p className="text-2xl font-black text-amber-600">
                                    {realData.length > 0 ? Math.round(realData.reduce((a, r) => a + (r.FEATURE_PROMEDIO_RETRASO || 0), 0) / realData.length) : 0} min
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Panel de Features */}
                <Card className="col-span-4 shadow-sm border-rose-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Perfil del Empleado</CardTitle>
                        <CardDescription>
                            Configura el perfil para evaluar si un empleado tiene riesgo de ausentismo crónico.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Cargo</label>
                                <Select value={formData.cargo_titulo} onValueChange={(v) => setFormData({ ...formData, cargo_titulo: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {uniqueCargos.length > 0 ? uniqueCargos.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        )) : (
                                            <>
                                                <SelectItem value="Mesero">Mesero</SelectItem>
                                                <SelectItem value="Chef">Chef</SelectItem>
                                                <SelectItem value="Cajero">Cajero</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Departamento</label>
                                <Select value={formData.departamento_nombre} onValueChange={(v) => setFormData({ ...formData, departamento_nombre: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {uniqueDeptos.length > 0 ? uniqueDeptos.map(d => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        )) : (
                                            <>
                                                <SelectItem value="Servicio">Servicio</SelectItem>
                                                <SelectItem value="Cocina">Cocina</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Total Minutos de Atraso</label>
                                <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-bold">{formData.total_minutos_atraso} min</span>
                            </div>
                            <input type="range" min="0" max="1000" value={formData.total_minutos_atraso} onChange={(e) => setFormData({ ...formData, total_minutos_atraso: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-rose-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Promedio Retraso por Evento</label>
                                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">{formData.promedio_retraso} min</span>
                            </div>
                            <input type="range" min="0" max="120" value={formData.promedio_retraso} onChange={(e) => setFormData({ ...formData, promedio_retraso: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-orange-500" />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Total Horas Trabajadas</label>
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">{formData.total_horas_trabajadas} hrs</span>
                            </div>
                            <input type="range" min="0" max="3000" value={formData.total_horas_trabajadas} onChange={(e) => setFormData({ ...formData, total_horas_trabajadas: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-500" />
                        </div>

                    </CardContent>
                </Card>

                {/* Panel de Resultado */}
                <div className="col-span-3 flex flex-col gap-4">
                    <Card className="relative overflow-hidden shadow-sm">
                        {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-8 w-8 animate-spin text-rose-600" /></div>}

                        <CardHeader className="pb-2 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                            <CardTitle className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">Veredicto IA - RRHH</CardTitle>
                        </CardHeader>

                        <CardContent className="flex flex-col items-center justify-center py-8">
                            {prediction ? (
                                prediction.isHighRisk ? (
                                    <div className="text-center space-y-3 w-full">
                                        <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full flex items-center justify-center">
                                            <ShieldAlert className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-red-600 dark:text-red-400">ALTO RIESGO</h3>
                                        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                                            El modelo predice un patrón de ausencias crónicas. Se recomienda intervención de RRHH.
                                        </p>
                                        <div className="h-2 bg-red-500 rounded-full w-full mt-4" />
                                    </div>
                                ) : (
                                    <div className="text-center space-y-3 w-full">
                                        <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center">
                                            <ShieldCheck className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">BAJO RIESGO</h3>
                                        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                                            El empleado muestra un patrón de asistencia saludable.
                                        </p>
                                        <div className="h-2 bg-emerald-500 rounded-full w-full mt-4" />
                                    </div>
                                )
                            ) : (
                                <div className="text-center text-muted-foreground opacity-40">
                                    <AlertTriangle className="mx-auto w-16 h-16 mb-3" />
                                    <p>Configura el perfil y evalúa</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pie Chart REAL: Distribución actual de riesgo */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Distribución Real de Riesgo</CardTitle>
                            <CardDescription className="text-xs">Datos reales desde Snowflake (OBT)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[180px] pb-4">
                            {dataLoading ? (
                                <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={riskDistribution} innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                                            {riskDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS_PIE[index]} />
                                            ))}
                                        </Pie>
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Fila de Gráficos REALES */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Bar Chart REAL: Promedio de Atraso por Departamento */}
                <Card className="shadow-sm">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Promedio de Atraso por Departamento (Real)</CardTitle>
                        <CardDescription className="text-xs">Minutos promedio de retraso por área operativa</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pb-4">
                        {dataLoading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={avgDelayByDept} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="departamento" tick={{ fontSize: 10 }} width={100} />
                                    <RechartsTooltip formatter={(value: number) => [`${value} min`, 'Promedio']} />
                                    <Bar dataKey="promedio_retraso" fill="#f97316" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Stacked Bar REAL: Riesgo por Cargo */}
                <Card className="shadow-sm">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Empleados por Cargo y Nivel de Riesgo (Real)</CardTitle>
                        <CardDescription className="text-xs">Cantidad de empleados alto/bajo riesgo por rol</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pb-4">
                        {dataLoading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={riskByCargo} margin={{ left: 10, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="cargo" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={50} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="alto_riesgo" stackId="a" fill="#ef4444" name="Alto Riesgo" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="bajo_riesgo" stackId="a" fill="#10b981" name="Bajo Riesgo" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Scatter Chart REAL: Atraso vs Horas Trabajadas */}
            <Card className="shadow-sm">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">Dispersión Real: Minutos de Atraso vs Horas Trabajadas</CardTitle>
                    <CardDescription className="text-xs">Cada punto es un empleado real. Rojo = Alto Riesgo, Verde = Bajo Riesgo</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pb-4">
                    {dataLoading ? (
                        <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis type="number" dataKey="atraso" name="Min. Atraso" tick={{ fontSize: 10 }} label={{ value: 'Minutos de Atraso', position: 'bottom', fontSize: 10, offset: -5 }} />
                                <YAxis type="number" dataKey="horas" name="Hrs Trabajadas" tick={{ fontSize: 10 }} label={{ value: 'Horas Trabajadas', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                <ZAxis type="number" dataKey="z" range={[30, 80]} />
                                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Scatter name="Alto Riesgo" data={scatterHigh} fill="#ef4444" opacity={0.7} />
                                <Scatter name="Bajo Riesgo" data={scatterLow} fill="#10b981" opacity={0.5} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
