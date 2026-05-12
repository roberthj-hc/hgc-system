"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserX, RefreshCw, BarChart4, AlertTriangle, CheckCircle2 } from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell,
    BarChart, Bar, CartesianGrid, Legend
} from 'recharts';

export default function ChurnPrediction() {
    const [formData, setFormData] = useState({
        rango_edad: "18-25",
        frecuencia: 5,
        monto_gasto: 1000,
        recencia: 30,
    });

    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<{ isChurn: boolean; predictionValue: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [churnStats, setChurnStats] = useState<any>(null);

    useEffect(() => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        fetch(`${apiBase}/api/ml/churn-stats`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setChurnStats(data); })
            .catch(() => {});
    }, []);

    // Area Chart Mock Data
    const areaChartData = [
        { name: 'Hace 6 Meses', compras: Math.max(0, formData.frecuencia - 3), monto: formData.monto_gasto * 0.4 },
        { name: 'Hace 3 Meses', compras: Math.max(0, formData.frecuencia - 1), monto: formData.monto_gasto * 0.7 },
        { name: 'Mes Pasado', compras: formData.frecuencia, monto: formData.monto_gasto },
        { name: 'Actual', compras: formData.recencia > 45 ? 0 : 2, monto: formData.recencia > 45 ? 0 : formData.monto_gasto * 1.1 },
    ];

    // Radar Chart Data — solo features reales del modelo (sin recencia)
    const radarData = [
        { subject: 'Frecuencia', val: Math.min(100, formData.frecuencia * 2), max: 100 },
        { subject: 'Gasto', val: Math.min(100, formData.monto_gasto / 80), max: 100 },
        { subject: 'Perfil Edad', val: formData.rango_edad === '18-25' ? 40 : formData.rango_edad === '26-35' ? 60 : formData.rango_edad === '36-45' ? 75 : 85, max: 100 },
    ];

    // Datos estáticos del modelo para el EDA de Edades
    const ageDistributionData = [
        { age: '18-25', Retencion: 30, Fuga: 70 },
        { age: '26-35', Retencion: 55, Fuga: 45 },
        { age: '36-45', Retencion: 65, Fuga: 35 },
        { age: '46-60', Retencion: 80, Fuga: 20 },
        { age: '+60', Retencion: 90, Fuga: 10 },
    ];

    // Gauge de riesgo alineado con el modelo v3 (frecuencia + monto, sin recencia)
    const renderRiskGauge = () => {
        // Engagement: frecuencia y monto son los drivers reales del modelo
        const freqScore  = Math.min(100, (formData.frecuencia / 50) * 100);
        const montoScore = Math.min(100, (formData.monto_gasto / 5000) * 100);
        const engagement = freqScore * 0.6 + montoScore * 0.4;
        let riskScore = 100 - engagement;
        // Ajuste menor por edad (contribucion baja segun feature importance)
        if (formData.rango_edad === "18-25") riskScore += 5;
        else if (formData.rango_edad === "+60" || formData.rango_edad === "46-60") riskScore -= 5;

        let finalRisk = Math.max(0, Math.min(100, Math.round(riskScore)));
        // Si el modelo ya clasifico, orientar el gauge con su veredicto
        if (prediction) {
            if (prediction.isChurn && finalRisk < 45) finalRisk = 55;
            if (!prediction.isChurn && finalRisk > 55) finalRisk = 45;
        }
        
        const data = [
            { name: 'Riesgo', value: finalRisk, fill: prediction?.isChurn ? '#ef4444' : '#10b981' },
            { name: 'Libre', value: 100 - finalRisk, fill: '#f1f5f9' },
        ];
        
        return (
            <div className="h-[140px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={50}
                            outerRadius={70}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-2xl font-bold dark:text-white">{prediction ? `${finalRisk}%` : '--'}</span>
                </div>
            </div>
        );
    };

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            // Se utiliza variable de entorno o fallback a localhost:4000
            const url = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/ml/churn` : "http://localhost:5000/api/ml/churn";
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(`El modelo falló al predecir (Status: ${response.status}). Asegúrate de que MLFlow y el Backend corran.`);
            }

            const data = await response.json();
            setPrediction(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Inteligencia de Retención de Clientes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Descriptivo</span> — cuántos clientes están en riesgo hoy ·{" "}
                    <span className="font-medium text-violet-600 dark:text-violet-400">Predictivo</span> — evalúa un cliente antes de contactarlo ·{" "}
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Prescriptivo</span> — qué hacer con cada segmento
                </p>
            </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart4 className="h-4 w-4" />}
                        Evaluar Riesgo IA
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 flex flex-col gap-4">
                    <Card className="shadow-sm border-blue-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                        <CardHeader>
                    <CardTitle>Evaluador de Riesgo Individual</CardTitle>
                    <CardDescription>
                        Ingresa el perfil de compra de un cliente para saber si está en riesgo antes de contactarlo.
                        También puedes mover los sliders para descubrir el umbral donde empieza el peligro
                        y diseñar tu campaña de retención.
                    </CardDescription>
                </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="grid gap-6 mt-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Rango de Edad</label>
                                    <Select value={formData.rango_edad} onValueChange={(v) => { setFormData({ ...formData, rango_edad: v }); setPrediction(null); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona edad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="18-25">18 a 25 años</SelectItem>
                                            <SelectItem value="26-35">26 a 35 años</SelectItem>
                                            <SelectItem value="36-45">36 a 45 años</SelectItem>
                                            <SelectItem value="46-60">46 a 60 años</SelectItem>
                                            <SelectItem value="+60">Mayores de 60</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Días sin Comprar (Recencia)</label>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">{formData.recencia} días</span>
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">Solo visualización</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range" min="1" max="365"
                                        value={formData.recencia} onChange={(e) => { setFormData({ ...formData, recencia: parseInt(e.target.value) }); setPrediction(null); }}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 mt-2 accent-orange-500"
                                    />
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        ⚠ El modelo de IA no usa esta variable — el predictor principal es Frecuencia + Gasto.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Frecuencia Total</label>
                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">{formData.frecuencia} tickets</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="150"
                                        value={formData.frecuencia} onChange={(e) => { setFormData({ ...formData, frecuencia: parseInt(e.target.value) }); setPrediction(null); }}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 mt-2 accent-blue-500"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gasto Histórico ($)</label>
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">${formData.monto_gasto}</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="8000" step="50"
                                        value={formData.monto_gasto} onChange={(e) => { setFormData({ ...formData, monto_gasto: parseInt(e.target.value) }); setPrediction(null); }}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 mt-2 accent-green-500"
                                    />
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    <Card className="flex-1 shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Distribución Histórica de Fuga por Edad (Dataset de Entrenamiento)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ageDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <RechartsTooltip />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="Retencion" name="Retención (%)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Fuga" name="Fuga (%)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-3 flex flex-col gap-4">
                    <Card className="flex flex-col relative overflow-hidden shadow-sm">
                        {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-8 w-8 animate-spin text-blue-600" /></div>}
                        
                        <CardHeader className="pb-1">
                            <CardTitle className="text-center text-lg">Veredicto del Modelo IA</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center pt-0">
                            {renderRiskGauge()}

                            {prediction ? (
                                <div className="text-center w-full mt-[-20px]">
                                    {prediction.isChurn ? (
                                        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                                                <UserX className="w-5 h-5" /> FUGA INMINENTE
                                            </h3>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" /> CLIENTE SALUDABLE
                                            </h3>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground w-full mt-[-10px] pb-4">
                                    <AlertTriangle className="mx-auto w-8 h-8 opacity-20" />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex-1 shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Análisis Multidimensional</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px] flex gap-2">
                            <div className="w-1/2 h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                                        <Radar name="Cliente" dataKey="val" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-1/2 h-full pl-2 border-l border-slate-100 dark:border-slate-800">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaChartData}>
                                        <defs>
                                            <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={prediction?.isChurn ? "#ef4444" : "#10b981"} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={prediction?.isChurn ? "#ef4444" : "#10b981"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" hide />
                                        <RechartsTooltip />
                                        <Area type="monotone" dataKey="monto" stroke={prediction?.isChurn ? "#ef4444" : "#10b981"} fillOpacity={1} fill="url(#colorMonto)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Segmentacion Real de Clientes ── */}
            {churnStats && (
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-bold">Segmentacion Real de tus Clientes</h3>
                    <p className="text-sm text-muted-foreground">
                        El modelo ya evaluo los <strong>{churnStats.total_clientes?.toLocaleString()}</strong> clientes reales de tu base de datos.
                        Aqui puedes ver cuantos estan en riesgo de abandonar y cuanto revenue representan.
                    </p>

                    {/* Tarjetas de riesgo */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                            <CardContent className="pt-4">
                                <div className="text-3xl font-bold text-red-600">{churnStats.resumen?.alto?.clientes?.toLocaleString()}</div>
                                <div className="text-sm font-medium text-red-700 dark:text-red-400 mt-1">Riesgo Alto (&gt;60% prob.)</div>
                                <div className="text-xs text-muted-foreground mt-1">{churnStats.resumen?.alto?.pct}% de tu base</div>
                                <div className="text-xs font-semibold text-red-600 mt-2">
                                    Bs {churnStats.resumen?.alto?.revenue?.toLocaleString()} en riesgo
                                </div>
                                <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                    🍗 Cupon de descuento en su proxima visita + mensaje por WhatsApp con combo especial de reactivacion
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
                            <CardContent className="pt-4">
                                <div className="text-3xl font-bold text-amber-600">{churnStats.resumen?.medio?.clientes?.toLocaleString()}</div>
                                <div className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-1">Riesgo Medio (35-60%)</div>
                                <div className="text-xs text-muted-foreground mt-1">{churnStats.resumen?.medio?.pct}% de tu base</div>
                                <div className="text-xs font-semibold text-amber-600 mt-2">
                                    Bs {churnStats.resumen?.medio?.revenue?.toLocaleString()} en riesgo
                                </div>
                                <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                    ⭐ Notificacion por app: &quot;Te extranamos — hoy tu combo favorito tiene 2x1&quot; + programa de puntos de lealtad
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20">
                            <CardContent className="pt-4">
                                <div className="text-3xl font-bold text-emerald-600">{churnStats.resumen?.bajo?.clientes?.toLocaleString()}</div>
                                <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mt-1">Riesgo Bajo (&lt;35%)</div>
                                <div className="text-xs text-muted-foreground mt-1">{churnStats.resumen?.bajo?.pct}% de tu base</div>
                                <div className="text-xs font-semibold text-emerald-600 mt-2">
                                    Bs {churnStats.resumen?.bajo?.revenue?.toLocaleString()} asegurado
                                </div>
                                <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                    Accion: Monitoreo mensual estandar
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desglose por edad */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Riesgo Alto por Grupo de Edad</CardTitle>
                            <CardDescription className="text-xs">
                                Porcentaje de clientes con probabilidad de churn mayor al 60% — por grupo etario.
                                La edad tiene impacto minimo (~12%) comparado con frecuencia y monto de compra.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={(churnStats.por_edad || []).map((g: any) => ({ edad: g.edad, pct: g.pct_alto, clientes: g.alto }))}
                                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="edad" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                                    <RechartsTooltip
                                        formatter={(val: any, _: any, props: any) => [
                                            `${val}% (${props.payload.clientes?.toLocaleString()} clientes)`,
                                            'Riesgo Alto'
                                        ]}
                                    />
                                    <Bar dataKey="pct" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Ficha Técnica del Modelo (Validación de IA) ── */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 mt-6">
                <CardHeader className="pb-2 bg-slate-50 dark:bg-slate-900/50">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Ficha Técnica del Modelo (Validación de IA)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Algoritmo Campeón: <span className="font-bold text-slate-700 dark:text-slate-300">Logistic Regression (AUC-ROC: 0.63) — Features: Frecuencia + Monto</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={[
                            { metric: 'Accuracy (Exactitud Global)', value: 59 },
                            { metric: 'AUC-ROC (Poder Discriminativo)', value: 63 },
                            { metric: 'Recall (Deteccion de Churns Reales)', value: 61 },
                            { metric: 'F1-Score (Balance Precision/Recall)', value: 51 },
                        ]} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                            <XAxis type="number" tickFormatter={(val) => `${val}%`} fontSize={11} />
                            <YAxis dataKey="metric" type="category" width={180} fontSize={11} />
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value) => [`${value}%`, 'Métrica']}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    );
}
