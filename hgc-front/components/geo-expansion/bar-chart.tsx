import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface GeoExpansionBarChartProps {
  data: any[];
}

export function GeoExpansionBarChart({ data }: GeoExpansionBarChartProps) {
  const topData = [...data]
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 8);

  return (
    <div style={{ width: '100%', height: 400, minHeight: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="nombre_sucursal" 
            angle={-45} 
            textAnchor="end" 
            interval={0}
            stroke="#94a3b8"
            fontSize={12}
            height={80}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12}
            tickFormatter={(value) => `Bs ${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: any) => [`Bs ${Number(value).toLocaleString()}`, 'Ventas']}
          />
          <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
            {topData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#4f46e5'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
