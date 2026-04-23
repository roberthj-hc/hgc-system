"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend
} from "recharts"

// Helper function to calculate predicted Q: Q = exp(beta0 + beta1 * ln(P))
const predictQ = (intercept, elasticity, price) => {
  if (!price || price <= 0) return 0
  return Math.exp(intercept + elasticity * Math.log(price))
}

export function PriceOptimizerClient() {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [coefficients, setCoefficients] = useState(null)
  const [historicalData, setHistoricalData] = useState([])
  const [suggestedPrice, setSuggestedPrice] = useState(0)
  const [branchFilter, setBranchFilter] = useState("all")

  // Fetch products that have elasticity data
  useEffect(() => {
    fetch("http://localhost:5000/api/econometrics/products")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data)
          if (data.length > 0 && !selectedProduct) {
            setSelectedProduct(data[0].ID_PRODUCTO_SK.toString())
          }
        } else {
          console.error("API did not return an array of products:", data)
          setProducts([])
        }
      })
      .catch(err => console.error("Error fetching products:", err))
  }, [])

  // Fetch data on product select
  useEffect(() => {
    if (selectedProduct) {
      fetch(`http://localhost:5000/api/econometrics/coefficients?productId=${selectedProduct}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setCoefficients(data)
            setSuggestedPrice(data.PRECIO_PROMEDIO)
          }
        })

      fetch(`http://localhost:5000/api/econometrics/historical?productId=${selectedProduct}`)
        .then(res => res.json())
        .then(data => setHistoricalData(data))
    }
  }, [selectedProduct])

  const filteredHistorical = useMemo(() => {
    if (branchFilter === "all") return historicalData
    return historicalData.filter(d => d.NOMBRE_SUCURSAL === branchFilter)
  }, [historicalData, branchFilter])

  const branchOptions = useMemo(() => {
    return Array.from(new Set(historicalData.map(d => d.NOMBRE_SUCURSAL))).sort()
  }, [historicalData])

  const chartData = useMemo(() => {
    if (!coefficients || historicalData.length === 0) return { scatter: [], line: [] }
    
    const prices = historicalData.map(d => d.PRECIO)
    const minP = Math.min(...prices) * 0.7
    const maxP = Math.max(...prices) * 1.3
    const step = (maxP - minP) / 30
    
    const lineData = []
    for (let p = minP; p <= maxP; p += step) {
      lineData.push({
        x: p,
        predicted_q: predictQ(coefficients.INTERCEPTO, coefficients.ELASTICIDAD, p)
      })
    }

    return {
      scatter: filteredHistorical.map(d => ({
        x: d.PRECIO,
        y: d.CANTIDAD_NORMALIZADA,
        name: d.NOMBRE_SUCURSAL,
        tipo: d.TIPO_FORMATO
      })),
      line: lineData
    }
  }, [historicalData, filteredHistorical, coefficients])

  // Economic calculations
  const stats = useMemo(() => {
    if (!coefficients || !suggestedPrice) return null
    
    const q = predictQ(coefficients.INTERCEPTO, coefficients.ELASTICIDAD, suggestedPrice)
    const revenue = suggestedPrice * q
    
    // Cost estimation: Assume 55% margin at average price
    const costPerUnit = coefficients.PRECIO_PROMEDIO * 0.45
    const currentQ = predictQ(coefficients.INTERCEPTO, coefficients.ELASTICIDAD, coefficients.PRECIO_PROMEDIO)
    
    const currentMargin = (coefficients.PRECIO_PROMEDIO - costPerUnit) * currentQ
    const suggestedMargin = (suggestedPrice - costPerUnit) * q
    
    const extraSurplus = suggestedMargin - currentMargin

    return {
      predicted_q: q,
      revenue: revenue,
      margin: suggestedMargin,
      extraSurplus: extraSurplus,
      elasticity: coefficients.ELASTICIDAD
    }
  }, [coefficients, suggestedPrice])

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
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
              Optimizador de Margen por Elasticidad
            </h1>
            <p className="text-slate-400 text-sm">Modelado econométrico real basado en curvas de demanda logarítmicas.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Producto en Análisis</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 h-9">
                    <SelectValue placeholder="Producto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-50">
                    {Array.isArray(products) && products.length > 0 ? (
                      products.map(p => (
                        <SelectItem key={p.ID_PRODUCTO_SK} value={p.ID_PRODUCTO_SK.toString()}>
                          {p.NOMBRE_PRODUCTO}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-xs text-slate-500 italic">No hay productos disponibles. Ejecuta iniciar_proyecto.bat</div>
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Elasticidad ($E_p$)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  {coefficients ? coefficients.ELASTICIDAD.toFixed(2) : "0.00"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`h-1.5 w-1.5 rounded-full ${Math.abs(coefficients?.ELASTICIDAD) > 1 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                   <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                    {Math.abs(coefficients?.ELASTICIDAD) > 1 ? "Altamente Sensible" : "Baja Sensibilidad"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Excedente del Productor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats?.extraSurplus >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats ? `${stats.extraSurplus >= 0 ? '+' : ''}Bs. ${stats.extraSurplus.toLocaleString(undefined, {maximumFractionDigits: 0})}` : "Bs. 0"}
                </div>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter mt-1">Impacto neto en utilidad</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sucursal</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 h-9">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-50">
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branchOptions.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 flex-1">
            <Card className="md:col-span-5 bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-lg">Gráfico de Dispersión Logarítmico</CardTitle>
                <CardDescription className="text-slate-500 font-mono text-[11px]">
                  Fórmula Ajustada: ln(Q) = {coefficients?.INTERCEPTO.toFixed(2)} + ({coefficients?.ELASTICIDAD.toFixed(2)}) * ln(P)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-6 min-h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="x" 
                      type="number" 
                      name="Precio" 
                      unit=" Bs" 
                      stroke="#475569" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <YAxis 
                      type="number" 
                      name="Q Normalizada" 
                      stroke="#475569" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Scatter 
                      name="Observaciones Reales" 
                      data={chartData.scatter} 
                      fill="#38bdf8" 
                      fillOpacity={0.5}
                      dataKey="y"
                    />
                    <Line 
                      name="Curva de Demanda Estimada" 
                      data={chartData.line} 
                      type="monotone" 
                      dataKey="predicted_q" 
                      stroke="url(#lineGradient)" 
                      dot={false} 
                      strokeWidth={4}
                      animationDuration={1000}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur-sm flex flex-col">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-lg">Control de Precio</CardTitle>
                <CardDescription>Simulación de impacto en tiempo real</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-10 p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Precio Sugerido</Label>
                    <span className="text-2xl font-mono font-bold text-orange-400">Bs. {suggestedPrice.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    min={coefficients ? Math.max(0, coefficients.PRECIO_PROMEDIO * 0.4) : 0}
                    max={coefficients ? coefficients.PRECIO_PROMEDIO * 1.6 : 100}
                    step={0.10}
                    value={suggestedPrice}
                    onChange={(e) => setSuggestedPrice(parseFloat(e.target.value))}
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                    <span>Mínimo (-60%)</span>
                    <span>Promedio</span>
                    <span>Máximo (+60%)</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 py-4">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center">Indicador de Markup</Label>
                  <div className="relative w-56 h-28">
                     <svg viewBox="0 0 100 50" className="w-full h-full">
                        {/* Background Arc */}
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        {/* Value Arc */}
                        <path 
                          d="M 10 50 A 40 40 0 0 1 90 50" 
                          fill="none" 
                          stroke="#fb923c" 
                          strokeWidth="8" 
                          strokeLinecap="round"
                          strokeDasharray="125.6" 
                          strokeDashoffset={125.6 * (1 - Math.min(1, Math.max(0, (suggestedPrice - (coefficients?.PRECIO_PROMEDIO * 0.4 || 0)) / (coefficients?.PRECIO_PROMEDIO * 1.2 || 1))))} 
                        />
                        {/* Percentage Text */}
                        <text x="50" y="48" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
                          {((suggestedPrice / (coefficients?.PRECIO_PROMEDIO || 1) - 1) * 100).toFixed(1)}%
                        </text>
                        <text x="50" y="32" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="bold">VAR. PRECIO</text>
                     </svg>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                   <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                      <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <div className="h-1 w-1 bg-orange-500 rounded-full" />
                        Insight del Dueño
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        "Al establecer el precio en Bs. {suggestedPrice.toFixed(2)}, se espera capturar un volumen de 
                        <span className="text-white font-bold"> {stats?.predicted_q.toFixed(0)} unidades</span>, 
                        lo cual optimiza tu excedente en <span className="text-emerald-400 font-bold">Bs. {stats?.extraSurplus.toLocaleString(undefined, {maximumFractionDigits: 0})}</span> adicionales por periodo."
                      </p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
