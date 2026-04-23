"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
  Cell,
  Scatter,
  BarChart,
  Bar,
  ReferenceLine
} from "recharts"
import { IconMathFunction, IconChartBar, IconTarget, IconActivity } from "@tabler/icons-react"

export function EfficiencyMonitorClient() {
  const [fullData, setFullData] = useState({ metadata: null, data: [] })
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("http://localhost:5000/api/econometrics/efficiency")
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setFullData(json)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching efficiency data:", err)
        setLoading(false)
      })
  }, [])

  const filteredData = useMemo(() => {
    if (!fullData.data) return []
    return fullData.data.filter(d => {
      const matchMonth = filterMonth === "all" || d.MES_ID === filterMonth
      const matchType = filterType === "all" || d.TIPO_FORMATO === filterType
      return matchMonth && matchType
    }).sort((a, b) => (b.SCORE_EFICIENCIA || 0) - (a.SCORE_EFICIENCIA || 0))
  }, [fullData.data, filterMonth, filterType])

  const months = useMemo(() => [...new Set(fullData.data.map(d => d.MES_ID))].sort(), [fullData.data])
  const types = useMemo(() => [...new Set(fullData.data.map(d => d.TIPO_FORMATO))], [fullData.data])

  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null
    const avgEff = filteredData.reduce((acc, curr) => acc + (curr.SCORE_EFICIENCIA || 0), 0) / filteredData.length
    const totalGap = filteredData.reduce((acc, curr) => acc + (curr.BRECHA_INGRESOS || 0), 0)
    
    return {
      avgEff,
      totalGap,
      topBranch: filteredData[0],
      criticalBranch: filteredData[filteredData.length - 1]
    }
  }, [filteredData])

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-[#020617] text-slate-50 min-h-screen">
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-300">
                Frontera de Eficiencia Técnica
              </h1>
              <p className="text-slate-400 text-sm">Análisis Microeconómico SFA - Función de Producción Cobb-Douglas</p>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="all">Todo el Historial</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="all">Todos los Formatos</SelectItem>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* INDICADORES CLAVE */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Puntuación Técnica</CardTitle>
                <IconTarget size={16} className="text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">
                  {stats ? stats.avgEff.toFixed(1) : "0.0"}%
                </div>
                <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${stats?.avgEff || 0}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Brecha de Frontera</CardTitle>
                <IconActivity size={16} className="text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  +Bs. {stats?.totalGap ? stats.totalGap.toLocaleString(undefined, {maximumFractionDigits: 0}) : "0"}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Ingreso sacrificado por ineficiencia.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Elasticidad Insumos</CardTitle>
                <IconMathFunction size={16} className="text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {fullData.metadata?.BETA_COSTO.toFixed(3) || "0.000"}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Impacto de +1% en costo sobre ventas.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">R-Cuadrado (Rigor)</CardTitle>
                <IconChartBar size={16} className="text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {fullData.metadata?.R_SQUARED.toFixed(3) || "0.000"}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Capacidad explicativa del modelo SFA.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 flex-1">
            {/* GRAFICO DE FRONTERA */}
            <Card className="md:col-span-4 bg-slate-900/50 border-slate-800 backdrop-blur-sm flex flex-col overflow-hidden">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30">
                <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                  <IconTarget size={20} className="text-emerald-500" />
                  Visualización de la Frontera Estocástica
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  X: Inversión en Insumos vs Y: Venta Realizada. La línea define la eficiencia máxima de la firma.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-6 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="COSTO_TOTAL_INSUMOS" type="number" stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                    <YAxis dataKey="VENTA_TOTAL" type="number" stroke="#475569" fontSize={10} domain={[0, 'auto']} />
                    <ZAxis dataKey="SCORE_EFICIENCIA" range={[80, 500]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val, name) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Scatter name="Sucursales (Real)" data={filteredData}>
                      {filteredData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.SCORE_EFICIENCIA > 95 ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
                      ))}
                    </Scatter>
                    <Line 
                      name="Frontera de Producción" 
                      data={filteredData.sort((a,b) => a.COSTO_TOTAL_INSUMOS - b.COSTO_TOTAL_INSUMOS)} 
                      type="monotone" 
                      dataKey="V_FRONTIER" 
                      stroke="#10b981" 
                      dot={false} 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ANALISIS DE BRECHA */}
            <Card className="md:col-span-3 bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-800/50 bg-slate-800/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <IconChartBar size={20} className="text-blue-500" />
                  Comparativa: Real vs. Óptimo
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs font-mono">Inferencia de capacidad ociosa por sucursal</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.slice(0, 8)} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="NOMBRE_SUCURSAL" type="category" stroke="#94a3b8" fontSize={9} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                    <Bar dataKey="VENTA_TOTAL" name="Venta Real" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="V_FRONTIER" name="Capacidad Óptima" fill="#1e293b" stroke="#334155" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
             <Card className="bg-slate-900/50 border-slate-800 p-4">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Interpretación Econométrica</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  El coeficiente de <strong>Elasticidad ({fullData.metadata?.BETA_COSTO.toFixed(3)})</strong> indica que por cada 1% adicional invertido en insumos, la venta debería crecer un { (fullData.metadata?.BETA_COSTO * 1).toFixed(2) }%. Si el crecimiento real es menor, la sucursal tiene una **falla de rendimiento técnico**.
                </p>
             </Card>
             <Card className="bg-slate-900/50 border-slate-800 p-4">
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Análisis de la Brecha</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  La <strong>Brecha de Frontera</strong> no es una meta de ventas; es una medida de desperdicio. Representa el ingreso que ya deberías estar capturando con tus costos actuales si la operación fuera óptima.
                </p>
             </Card>
             <Card className="bg-slate-900/50 border-slate-800 p-4">
                <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Validación del Modelo</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Un <strong>R-Cuadrado de {fullData.metadata?.R_SQUARED.toFixed(3)}</strong> confirma que los costos y el volumen explican el { (fullData.metadata?.R_SQUARED * 100).toFixed(1) }% de la variación de ventas, validando el rigor de este monitor.
                </p>
             </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
