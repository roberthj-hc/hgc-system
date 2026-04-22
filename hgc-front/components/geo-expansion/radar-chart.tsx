import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface BranchRadarChartProps {
  data: {
    ventas: number;
    mermas: number;
    ticket_promedio: number;
  }
}

export function BranchRadarChart({ data }: BranchRadarChartProps) {
  // Normalización simple para visualización (0-100)
  const maxVentas = 100000000; // Ejemplo
  const maxMermas = 5000000;
  const maxTicket = 150;

  const chartData = [
    { subject: 'Ventas', A: (data.ventas / maxVentas) * 100, fullMark: 100, real: data.ventas },
    { subject: 'Mermas', A: (data.mermas / maxMermas) * 100, fullMark: 100, real: data.mermas },
    { subject: 'Ticket Prom.', A: (data.ticket_promedio / maxTicket) * 100, fullMark: 100, real: data.ticket_promedio },
  ];

  return (
    <div style={{ width: '100%', height: 350, minHeight: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Rendimiento"
            dataKey="A"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.5}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: any, name: any, props: any) => [props.payload.real.toLocaleString(), props.payload.subject]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
