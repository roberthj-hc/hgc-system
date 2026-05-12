"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";

interface GeoExpansionTableProps {
  data: any[];
}

export function GeoExpansionTable({ data }: GeoExpansionTableProps) {
  // Ordenar por ventas de mayor a menor
  const sortedData = [...data].sort((a, b) => b.ventas - a.ventas);

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/50">
      <Table>
        <TableHeader className="bg-slate-800/80">
          <TableRow className="border-slate-700 hover:bg-slate-800/80">
            <TableHead className="text-slate-300 font-semibold">Sucursal</TableHead>
            <TableHead className="text-slate-300 font-semibold">Ciudad</TableHead>
            <TableHead className="text-slate-300 font-semibold text-right">Ventas</TableHead>
            <TableHead className="text-slate-300 font-semibold text-right">Mermas</TableHead>
            <TableHead className="text-slate-300 font-semibold text-right">Ticket Promedio</TableHead>
            <TableHead className="text-slate-300 font-semibold text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((branch, idx) => {
            const ratio = branch.ventas > 0 ? (branch.mermas / branch.ventas) : 0;
            const isGood = ratio < 0.02;
            const isWarning = ratio < 0.05;
            const statusColor = isGood ? "bg-green-500" : isWarning ? "bg-yellow-500" : "bg-red-500";
            const statusText = isGood ? "Óptimo" : isWarning ? "Regular" : "Crítico";

            return (
              <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40">
                <TableCell className="font-medium text-slate-200">
                  {branch.nombre_sucursal}
                  <div className="text-[10px] text-slate-500">{branch.direccion}</div>
                </TableCell>
                <TableCell className="text-slate-400">{branch.ciudad}</TableCell>
                <TableCell className="text-right text-green-400 font-medium">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowUp className="w-3 h-3" />
                    {Number(branch.ventas).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                  </div>
                </TableCell>
                <TableCell className="text-right text-red-400 font-medium">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowDown className="w-3 h-3" />
                    {Number(branch.mermas).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                  </div>
                </TableCell>
                <TableCell className="text-right text-blue-400">
                  {Number(branch.ticket_promedio).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                    <span className="text-xs text-slate-400">{statusText}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
