"use client"

import React, { useState } from "react"
import { Sparkles, FileText, BarChart2, Database, X, Loader2 } from "lucide-react"

const CHAT_API = "http://localhost:8001"

interface SmartButtonsProps {
  module: string       // Nombre del módulo, ej: "CLV", "BCG", "Churn"
  data: object         // Los datos actuales del dashboard
}

interface ResultPanel {
  title: string
  content: string
  type: "report" | "analysis" | "query"
}

export function SmartButtons({ module, data }: SmartButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<ResultPanel | null>(null)
  const [queryText, setQueryText] = useState("")
  const [showQueryInput, setShowQueryInput] = useState(false)

  const handleReport = async () => {
    setLoading("report")
    setResult(null)
    try {
      const res = await fetch(`${CHAT_API}/smart/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, data }),
      })
      const json = await res.json()
      setResult({
        title: `📄 Reporte Ejecutivo — ${module}`,
        content: json.report || json.error,
        type: "report",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleAnalyst = async () => {
    setLoading("analyst")
    setResult(null)
    try {
      const res = await fetch(`${CHAT_API}/smart/analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, data }),
      })
      const json = await res.json()
      setResult({
        title: `🔍 Análisis IA — ${module}`,
        content: json.analysis || json.error,
        type: "analysis",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleQuery = async () => {
    if (!queryText.trim()) return
    setLoading("query")
    setResult(null)
    setShowQueryInput(false)
    try {
      const res = await fetch(`${CHAT_API}/smart/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: queryText }),
      })
      const json = await res.json()
      const content = json.error
        ? json.error
        : `**${json.summary}**\n\n_SQL generado:_\n\`\`\`sql\n${json.sql}\n\`\`\`\n\n_Filas retornadas: ${json.rows}_`
      setResult({
        title: `❄️ Consulta Snowflake`,
        content,
        type: "query",
      })
    } finally {
      setLoading(null)
      setQueryText("")
    }
  }

  const typeColor: Record<string, string> = {
    report:   "border-blue-500/30 bg-blue-500/5",
    analysis: "border-purple-500/30 bg-purple-500/5",
    query:    "border-cyan-500/30 bg-cyan-500/5",
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Botones ── */}
      <div className="flex flex-wrap gap-2">
        {/* Botón 1: Reporte */}
        <button
          onClick={handleReport}
          disabled={!!loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-blue-500/10 border border-blue-500/30 text-blue-400
                     hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "report"
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FileText className="h-3.5 w-3.5" />}
          Generar Reporte IA
        </button>

        {/* Botón 2: Análisis */}
        <button
          onClick={handleAnalyst}
          disabled={!!loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-purple-500/10 border border-purple-500/30 text-purple-400
                     hover:bg-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "analyst"
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <BarChart2 className="h-3.5 w-3.5" />}
          Analizar con IA
        </button>

        {/* Botón 3: Snowflake Query */}
        <button
          onClick={() => setShowQueryInput(v => !v)}
          disabled={!!loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-cyan-500/10 border border-cyan-500/30 text-cyan-400
                     hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="h-3.5 w-3.5" />
          Consultar BD
        </button>
      </div>

      {/* ── Input de consulta Snowflake ── */}
      {showQueryInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuery()}
            placeholder="Ej: ¿Cuáles son los 5 productos con mayor ganancia?"
            className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700
                       text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleQuery}
            disabled={!queryText.trim() || !!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-cyan-600 text-white hover:bg-cyan-700 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "query"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            Consultar
          </button>
        </div>
      )}

      {/* ── Panel de resultado ── */}
      {result && (
        <div className={`relative rounded-xl border p-4 ${typeColor[result.type]}`}>
          <button
            onClick={() => setResult(null)}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs font-bold text-slate-300 mb-2">{result.title}</p>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
            {result.content}
          </pre>
        </div>
      )}
    </div>
  )
}
