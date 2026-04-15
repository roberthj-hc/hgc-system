"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, LayoutDashboard, Crown, UserMinus, ShoppingCart, UserPlus } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ZAxis } from 'recharts';

export default function SegmentationPrediction() {
    const [formData, setFormData] = useState({
        edad_ordinal: 2, // 1: Menor 18, 2: 18-25, 3: 26-35, 4: Mayor 35
        frecuencia: 15,
        monetario: 500,
        recencia: 45,
        ticket_promedio: 30,
        volumen: 20
    });

    const [loading, setLoading] = useState(false);
    const [cluster, setCluster] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/ml/segmentation` : "http://localhost:4000/api/ml/segmentation";
            
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                // Mensaje en caso de que MLFlow o backend falte
                throw new Error(`Error API (${response.status}). Inicia MLFlow (Puerto 5002) y Node Backend.`);
            }

            const data = await response.json();
            setCluster(data.clusterId);
        } catch (err: any) {
            setError(err.message);
            // Simular para que siempre pueda ver el UI si falla
            setCluster(Math.floor(Math.random() * 4)); 
        } finally {
            setLoading(false);
        }
    };

    // Mapeador arbitrario de Clusters (En clustering Real esto se audita contra centroides)
    const clusterProfiles = [
        {
            id: 0,
            name: "Cliente VIP / Leal",
            icon: <Crown className="w-8 h-8 text-yellow-500" />,
            desc: "Alto valor, alta frecuencia y muy baja recencia. El pilar de las ventas.",
            bg: "bg-yellow-100 dark:bg-yellow-900/30",
            border: "border-yellow-300 dark:border-yellow-700",
            color: "#eab308"
        },
        {
            id: 1,
            name: "Cliente Nuevo / Potencial",
            icon: <UserPlus className="w-8 h-8 text-emerald-500" />,
            desc: "Baja recencia pero poco historial de gastos. Hay que enamorarlo.",
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
            border: "border-emerald-300 dark:border-emerald-700",
            color: "#10b981"
        },
        {
            id: 2,
            name: "Cliente Esporádico",
            icon: <ShoppingCart className="w-8 h-8 text-blue-500" />,
            desc: "Solo compra de vez en cuando y en bajo volumen. Responde bien a descuentos.",
            bg: "bg-blue-100 dark:bg-blue-900/30",
            border: "border-blue-300 dark:border-blue-700",
            color: "#3b82f6"
        },
        {
            id: 3,
            name: "Riesgo de Fuga / Perdido",
            icon: <UserMinus className="w-8 h-8 text-red-500" />,
            desc: "No compra hace mucho tiempo. Probablemente ya se haya ido.",
            bg: "bg-red-100 dark:bg-red-900/30",
            border: "border-red-300 dark:border-red-700",
            color: "#ef4444"
        }
    ];

    // Datos Mockeados para el fondo del ScatterPlot (Las "Nubes" de clusters)
    const backgroundScatter = [
        { recencia: 10, monetario: 8000, z: 100, cluster: 0 },
        { recencia: 5, monetario: 5000, z: 100, cluster: 0 },
        { recencia: 25, monetario: 600, z: 100, cluster: 1 },
        { recencia: 15, monetario: 800, z: 100, cluster: 1 },
        { recencia: 180, monetario: 1200, z: 100, cluster: 2 },
        { recencia: 140, monetario: 900, z: 100, cluster: 2 },
        { recencia: 320, monetario: 200, z: 100, cluster: 3 },
        { recencia: 280, monetario: 50, z: 100, cluster: 3 },
    ];

    // El data point actual del formulario
    const currentPoint = [
        { 
            recencia: formData.recencia, 
            monetario: formData.monetario, 
            z: 800, // Hacerlo más grande
            cluster: "ACTUAL" 
        }
    ];

    const mappedProfile = cluster !== null ? clusterProfiles.find(c => c.id === cluster % 4) : null;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Segmentación por IA (Clustering)</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
                        Clasificar Cliente
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm border-indigo-900/10 dark:border-slate-800 bg-white/50 dark:bg-black/20 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Perfil Demográfico y RFM</CardTitle>
                        <CardDescription>
                            Estos datos alimentan al algoritmo K-Means para encontrar el grupo matemático perfecto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        
                        <div className="grid grid-cols-2 gap-4 border-b pb-4 dark:border-slate-800">
                            <div className="grid gap-2 col-span-2 md:col-span-1">
                                <label className="text-sm font-medium">Rango de Edad</label>
                                <Select value={formData.edad_ordinal.toString()} onValueChange={(v) => setFormData({ ...formData, edad_ordinal: parseInt(v) })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona edad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Menor de 18 (1)</SelectItem>
                                        <SelectItem value="2">18 a 25 años (2)</SelectItem>
                                        <SelectItem value="3">26 a 35 años (3)</SelectItem>
                                        <SelectItem value="4">Mayor de 35 (4)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-6 pt-2">
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Frecuencia Histórica (R<span className="font-bold text-indigo-600">F</span>M)</label>
                                    <span className="text-xs font-bold font-mono">{formData.frecuencia} tickets</span>
                                </div>
                                <input
                                    type="range" min="1" max="200"
                                    value={formData.frecuencia} onChange={(e) => setFormData({ ...formData, frecuencia: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500"
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Gasto Monetario (RF<span className="font-bold text-indigo-600">M</span>)</label>
                                    <span className="text-xs font-bold font-mono">${formData.monetario}</span>
                                </div>
                                <input
                                    type="range" min="10" max="10000" step="50"
                                    value={formData.monetario} onChange={(e) => setFormData({ ...formData, monetario: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500"
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Recencia Inactiva (<span className="font-bold text-indigo-600">R</span>FM)</label>
                                    <span className="text-xs font-bold font-mono">{formData.recencia} días</span>
                                </div>
                                <input
                                    type="range" min="1" max="365"
                                    value={formData.recencia} onChange={(e) => setFormData({ ...formData, recencia: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Ticket Promedio</label>
                                    <input
                                        type="number" className="p-2 bg-background border rounded-md text-sm"
                                        value={formData.ticket_promedio} onChange={(e) => setFormData({ ...formData, ticket_promedio: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Artículos</label>
                                    <input
                                        type="number" className="p-2 bg-background border rounded-md text-sm"
                                        value={formData.volumen} onChange={(e) => setFormData({ ...formData, volumen: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Panel Resultado */}
                <div className="col-span-3 flex flex-col gap-4">
                    <Card className="flex flex-col relative overflow-hidden shadow-sm h-auto min-h-[220px]">
                        {loading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><RefreshCw className="h-8 w-8 animate-spin text-indigo-600" /></div>}
                        
                        <CardHeader className="pb-1 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                            <CardTitle className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">Clúster Asignado por IA</CardTitle>
                        </CardHeader>
                        
                        <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 p-4 h-full">
                            {mappedProfile ? (
                                <div className={`w-full h-full flex flex-col items-center justify-center p-6 border rounded-2xl ${mappedProfile.bg} ${mappedProfile.border}`}>
                                    <div className="mb-4 p-4 bg-white dark:bg-slate-950 rounded-full shadow-sm">
                                        {mappedProfile.icon}
                                    </div>
                                    <h3 className="text-2xl font-black text-center mb-2">{mappedProfile.name}</h3>
                                    <p className="text-center text-sm text-slate-700 dark:text-slate-300 max-w-[250px]">
                                        {mappedProfile.desc}
                                    </p>
                                    <div className="mt-4 px-3 py-1 bg-black/5 dark:bg-white/10 rounded-full">
                                        <span className="text-xs font-mono font-bold">ID Cluster: {cluster}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                    <LayoutDashboard className="w-16 h-16 mb-4" />
                                    <p>Envía los datos para segmentar</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex-1 shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Mapa de Dispersión Cuadrante</CardTitle>
                            <CardDescription className="text-xs">Ubicación del cliente frente a otros clusters (Recencia vs Valor)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px] pb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis type="number" dataKey="recencia" name="Días sin Comprar" hide />
                                    <YAxis type="number" dataKey="monetario" name="Gasto $" hide />
                                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                                    {/* Grises de Fondo */}
                                    <Scatter name="Nubes Standar" data={backgroundScatter} fill="#cbd5e1" opacity={0.5} />
                                    {/* Punto Actual si hay predicción */}
                                    {mappedProfile && (
                                        <Scatter 
                                            name="Cliente Analizado" 
                                            data={currentPoint} 
                                            fill={mappedProfile.color} 
                                            opacity={1} 
                                        />
                                    )}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    
                    {error && (
                        <div className="p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
