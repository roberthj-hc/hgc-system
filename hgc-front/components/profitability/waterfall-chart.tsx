"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

interface WaterfallChartProps {
  data: {
    ingreso_bruto: number;
    comisiones_delivery: number;
    total_mermas: number;
    costo_operativo: number;
    utilidad_neta: number;
  };
}

export function WaterfallChart({ data }: WaterfallChartProps) {
  if (!data) return null;

  const chartData = [
    {
      name: 'Ingreso Bruto',
      display: data.ingreso_bruto,
      fill: '#3b82f6',
      start: 0,
      value: data.ingreso_bruto
    },
    {
      name: 'Comisiones Delivery',
      display: -data.comisiones_delivery,
      fill: '#ef4444',
      start: data.ingreso_bruto - data.comisiones_delivery,
      value: data.comisiones_delivery
    },
    {
      name: 'Mermas Detectadas',
      display: -data.total_mermas,
      fill: '#f59e0b',
      start: data.ingreso_bruto - data.comisiones_delivery - data.total_mermas,
      value: data.total_mermas
    },
    {
      name: 'Costo Operativo',
      display: -data.costo_operativo,
      fill: '#ef4444',
      start: data.utilidad_neta,
      value: data.costo_operativo
    },
    {
      name: 'Utilidad Neta',
      display: data.utilidad_neta,
      fill: '#22c55e',
      start: 0,
      value: data.utilidad_neta
    }
  ];

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(val) => `${val/1000000}M`}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            formatter={(value: any, name: any, props: any) => [formatCurrency(props.payload.display), 'Monto']}
          />
          {/* Bar stack trick for waterfall: the 'start' bar is transparent */}
          <Bar dataKey="start" stackId="a" fill="transparent" />
          <Bar dataKey="value" stackId="a">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList 
              dataKey="display" 
              position="top" 
              formatter={(val: number) => formatCurrency(val)}
              style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 'bold' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
