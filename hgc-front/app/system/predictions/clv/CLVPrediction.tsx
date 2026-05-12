"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";
import {
    Users, TrendingUp, DollarSign, MapPin, Star, RefreshCw,
    Building2, Award, BarChart3, ChevronRight
} from "lucide-react";
import { SmartButtons } from "@/components/smart-buttons";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SegmentRow {
    NOMBRE: string;
    CLIENTES: number;
    PEDIDOS?: number;
    CLV_PROMEDIO: number;
    REVENUE_TOTAL: number;
    PEDIDOS_POR_CLIENTE?: number;
    TICKET_PROMEDIO?: number;
    PEDIDOS_PROMEDIO?: number;
    CIUDAD?: string;
    TIPO_FORMATO?: string;
    color?: string;
}
interface CLVData {
    generado_en: string;
    fuente: string;
    resumen: { total_clientes: number; total_pedidos: number; revenue_total: number; clv_promedio_global: number };
    por_segmento: SegmentRow[];
    por_ciudad: SegmentRow[];
    por_sucursal: SegmentRow[];
    por_nivel_lealtad: SegmentRow[];
    por_rango_edad: SegmentRow[];
}

const fmtBs = (v: number) => `Bs ${Math.round(v).toLocaleString("es-BO")}`;
const fmtN  = (v: number) => Math.round(v).toLocaleString("es-BO");

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
    return (
        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-5">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-xl font-black mt-0.5">{value}</p>
                        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Dimension Selector ───────────────────────────────────────────────────────
const DIMS = [
    { key: "por_segmento",      label: "Segmento",       icon: <Users className="w-4 h-4" /> },
    { key: "por_ciudad",        label: "Ciudad",         icon: <MapPin className="w-4 h-4" /> },
    { key: "por_sucursal",      label: "Sucursal",       icon: <Building2 className="w-4 h-4" /> },
    { key: "por_nivel_lealtad", label: "Nivel Lealtad",  icon: <Award className="w-4 h-4" /> },
    { key: "por_rango_edad",    label: "Rango de Edad",  icon: <BarChart3 className="w-4 h-4" /> },
] as const;

type DimKey = "por_segmento" | "por_ciudad" | "por_sucursal" | "por_nivel_lealtad" | "por_rango_edad";

// ─── Individual Predictor (secondary) ────────────────────────────────────────
function PredictorIndividual() {
    const [form, setForm] = useState({ rango_edad: "26-35", freq_total: 13, cantidad_articulos: 80, antiguedad_dias: 400 });
    const [clv, setCLV] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const predict = async () => {
        setLoading(true); setError(null);
        try {
            const r = await fetch("/api/ml/clv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!r.ok) throw new Error(`Error ${r.status}`);
            const d = await r.json();
            setCLV(d.clvPredicted);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Usa los coeficientes del modelo entrenado sobre <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">GOLD.FACT_VENTAS_DETALLE</code> para estimar el CLV de un perfil específico.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-5">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Rango de Edad</label>
                        <Select value={form.rango_edad} onValueChange={v => setForm({ ...form, rango_edad: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["Menor de 18","18-25","26-35","36-45","46-55","56+"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {[
                        { field: "freq_total" as const, label: "Frecuencia de Pedidos", min: 1, max: 100, unit: "pedidos", color: "accent-emerald-500" },
                        { field: "cantidad_articulos" as const, label: "Artículos Comprados (histórico)", min: 1, max: 1000, unit: "items", color: "accent-blue-500" },
                        { field: "antiguedad_dias" as const, label: "Antigüedad como Cliente", min: 1, max: 4000, unit: "días", color: "accent-violet-500" },
                    ].map(({ field, label, min, max, unit, color }) => (
                        <div key={field} className="grid gap-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium">{label}</label>
                                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">{fmtN(form[field])} {unit}</span>
                            </div>
                            <input type="range" min={min} max={max} value={form[field]}
                                onChange={e => setForm({ ...form, [field]: +e.target.value })}
                                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 ${color}`} />
                        </div>
                    ))}
                    <Button onClick={predict} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                        Calcular CLV Estimado
                    </Button>
                    {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">{error}</p>}
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                    {clv !== null ? (
                        <div className="text-center space-y-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">CLV Estimado</p>
                            <p className="text-5xl font-black text-emerald-600">{fmtBs(clv)}</p>
                            <p className="text-xs text-muted-foreground">Valor histórico proyectado con {fmtN(form.freq_total)} pedidos</p>
                            <Badge className="mt-2" variant="secondary">
                                Promedio global: Bs 2,679 · Este perfil: {clv > 2679 ? "↑ sobre" : "↓ bajo"} promedio
                            </Badge>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground opacity-40">
                            <DollarSign className="mx-auto w-12 h-12 mb-2" />
                            <p className="text-sm">Ajusta el perfil y calcula</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CLVPrediction() {
    const [data, setData] = useState<CLVData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dim, setDim] = useState<DimKey>("por_segmento");
    const [tab, setTab] = useState<"segmentos" | "predictor">("segmentos");

    // Forzar modo claro en esta página (remover 'dark' de <html> temporalmente)
    useEffect(() => {
        const html = document.documentElement;
        const hadDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => { if (hadDark) html.classList.add("dark"); };
    }, []);

    useEffect(() => {
        fetch("/api/ml/clv-segments")
            .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json(); })
            .then(d => setData(d))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const rows: SegmentRow[] = data ? (data[dim] as SegmentRow[]) : [];
    const topRow = rows[0];

    const smartData = { tab, dim, resumen: data?.resumen ?? null };

    return (
        <div className="flex-1 space-y-5 p-8 pt-6 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Valor de Vida del Cliente (CLV)</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Inteligencia de segmentos · {data ? `Fuente: ${data.fuente.split(" - ")[0]}` : "Cargando..."}
                    </p>
                </div>
            </div>
            <SmartButtons module="CLV" data={smartData} />

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                {[
                    { key: "segmentos" as const, label: "Inteligencia de Segmentos" },
                    { key: "predictor" as const, label: "Predictor Individual" },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === t.key ? "bg-white dark:bg-slate-900 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: SEGMENTOS ── */}
            {tab === "segmentos" && (
                <div className="space-y-5">
                    {loading && (
                        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
                            <RefreshCw className="w-5 h-5 animate-spin" /> Cargando datos desde Snowflake GOLD...
                        </div>
                    )}
                    {error && <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">{error}</div>}

                    {data && (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <KpiCard icon={<Users className="w-4 h-4 text-blue-600" />} label="Clientes Totales" value={fmtN(data.resumen.total_clientes)} sub="Base activa registrada" color="bg-blue-100 dark:bg-blue-900/30" />
                                <KpiCard icon={<DollarSign className="w-4 h-4 text-emerald-600" />} label="Revenue Total" value={`Bs ${(data.resumen.revenue_total / 1e6).toFixed(1)}M`} sub="Ingreso neto histórico" color="bg-emerald-100 dark:bg-emerald-900/30" />
                                <KpiCard icon={<TrendingUp className="w-4 h-4 text-violet-600" />} label="CLV Promedio Global" value={fmtBs(data.resumen.clv_promedio_global)} sub="Por cliente en toda su vida" color="bg-violet-100 dark:bg-violet-900/30" />
                                <KpiCard icon={<Star className="w-4 h-4 text-amber-600" />} label="Pedidos Históricos" value={fmtN(data.resumen.total_pedidos)} sub={`~${Math.round(data.resumen.total_pedidos / data.resumen.total_clientes)} por cliente`} color="bg-amber-100 dark:bg-amber-900/30" />
                            </div>

                            {/* Dimension selector */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Análisis por Dimensión</CardTitle>
                                        <CardDescription className="text-xs">
                                            ¿Qué segmento nos deja más valor? · Datos: GOLD.FACT_VENTAS_DETALLE
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        {DIMS.map(d => (
                                            <button key={d.key} onClick={() => setDim(d.key)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${dim === d.key ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-slate-400"}`}>
                                                {d.icon} {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid lg:grid-cols-5 gap-6">
                                        {/* Bar chart */}
                                        <div className="lg:col-span-3 h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 40 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                                    <XAxis type="number" tickFormatter={v => `Bs ${(v/1000).toFixed(1)}k`} fontSize={11} />
                                                    <YAxis type="category" dataKey="NOMBRE" width={140} tick={{ fontSize: 11 }} />
                                                    <RechartsTooltip
                                                        formatter={(v: any) => [fmtBs(v), "CLV Promedio"]}
                                                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                                                    />
                                                    <Bar dataKey="CLV_PROMEDIO" radius={[0, 6, 6, 0]} barSize={22}>
                                                        {rows.map((r, i) => <Cell key={i} fill={r.color ?? "#64748b"} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Table */}
                                        <div className="lg:col-span-2 overflow-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b dark:border-slate-700">
                                                        <th className="text-left pb-2 font-semibold text-muted-foreground">Segmento</th>
                                                        <th className="text-right pb-2 font-semibold text-muted-foreground">Clientes</th>
                                                        <th className="text-right pb-2 font-semibold text-muted-foreground">CLV Prom.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((r, i) => (
                                                        <tr key={i} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="py-2 flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color ?? "#64748b" }} />
                                                                <span className="font-medium truncate max-w-[120px]" title={r.NOMBRE}>{r.NOMBRE}</span>
                                                                {i === 0 && <ChevronRight className="w-3 h-3 text-emerald-500 ml-auto flex-shrink-0" />}
                                                            </td>
                                                            <td className="py-2 text-right">{fmtN(r.CLIENTES)}</td>
                                                            <td className="py-2 text-right font-bold" style={{ color: r.color }}>{fmtBs(r.CLV_PROMEDIO)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Insight destacado */}
                            {topRow && (
                                <div className="grid md:grid-cols-3 gap-4">
                                    <Card className="shadow-sm border-l-4" style={{ borderLeftColor: topRow.color ?? "#64748b" }}>
                                        <CardContent className="p-4">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Segmento de Mayor CLV</p>
                                            <p className="text-lg font-bold mt-1">{topRow.NOMBRE}</p>
                                            <p className="text-2xl font-black mt-1" style={{ color: topRow.color }}>{fmtBs(topRow.CLV_PROMEDIO)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{fmtN(topRow.CLIENTES)} clientes · Revenue: Bs {(topRow.REVENUE_TOTAL / 1e6).toFixed(1)}M</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm md:col-span-2">
                                        <CardContent className="p-4">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Revenue por Segmento (Bs)</p>
                                            <div className="h-[110px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={rows} margin={{ left: 0, right: 0 }}>
                                                        <XAxis dataKey="NOMBRE" tick={{ fontSize: 10 }} />
                                                        <RechartsTooltip formatter={(v: any) => [`Bs ${(v/1e6).toFixed(2)}M`, "Revenue"]} contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                                                        <Bar dataKey="REVENUE_TOTAL" radius={[4, 4, 0, 0]} barSize={30}>
                                                            {rows.map((r, i) => <Cell key={i} fill={r.color ?? "#64748b"} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Fuente */}
                            <p className="text-xs text-muted-foreground text-center opacity-70">
                                Datos generados desde {data.fuente} · {data.generado_en}
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* ── TAB: PREDICTOR ── */}
            {tab === "predictor" && (
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Predictor Individual</CardTitle>
                        <CardDescription>Estima el CLV de un perfil específico usando el modelo de regresión entrenado sobre datos reales.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PredictorIndividual />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
