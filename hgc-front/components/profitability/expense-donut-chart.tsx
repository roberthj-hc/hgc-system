"use client";

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ExpenseDonutChartProps {
  data: {
    comisiones_delivery: number;
    total_mermas: number;
    costo_operativo: number;
    utilidad_neta: number;
  };
}

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  if (!data) return null;

  const chartData = [
    { name: 'Comisiones Delivery', value: data.comisiones_delivery, fill: '#ef4444' },
    { name: 'Mermas', value: data.total_mermas, fill: '#f59e0b' },
    { name: 'Costo Operativo', value: data.costo_operativo, fill: '#64748b' },
    { name: 'Utilidad Neta', value: data.utilidad_neta, fill: '#22c55e' },
  ];

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            formatter={(value: any) => formatCurrency(value)}
          />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
