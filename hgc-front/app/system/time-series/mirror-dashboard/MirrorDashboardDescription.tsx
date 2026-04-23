"use client";

import { useEffect, useState } from "react";
import { BoliviaHeatmap } from "@/components/geo-expansion/bolivia-heatmap";
import { BranchRadarChart } from "@/components/geo-expansion/radar-chart";
import { GeoExpansionBarChart } from "@/components/geo-expansion/bar-chart";
import { GeoExpansionTable } from "@/components/geo-expansion/geo-expansion-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Activity, DollarSign, TrendingDown, BarChart3, AlertCircle } from "lucide-react";

const BRANCH_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "centro": { lat: -16.4990, lng: -68.1368 },
  "prado": { lat: -17.3938, lng: -66.1569 },
  "plan 3000": { lat: -17.8146, lng: -63.1367 },
  "miraflores": { lat: -16.4975, lng: -68.1214 },
  "sopocachi": { lat: -16.5111, lng: -68.1283 },
  "rivero": { lat: -17.7725, lng: -63.1819 },
  "satélite": { lat: -16.5317, lng: -68.1633 },
  "satelite": { lat: -16.5317, lng: -68.1633 },
  "calacoto": { lat: -16.5413, lng: -68.0772 },
  "ceja": { lat: -16.5167, lng: -68.1667 },
  "equipetrol": { lat: -17.7656, lng: -63.1972 },
  "rio seco": { lat: -16.4833, lng: -68.1981 }
};

export default function GeoExpansionDescription() {
  const [branchData, setBranchData] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranchDNA = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/geo-expansion/branch-dna");
      const dbData = await response.json();
      
      const enrichedData = (dbData || []).map((b: any) => {
         const nameLower = b.nombre_sucursal.toLowerCase();
         let coords = { lat: -16.5, lng: -64.0 };
         for (const [key, val] of Object.entries(BRANCH_COORDINATES)) {
           if (nameLower.includes(key)) { coords = val; break; }
         }
         return {
           ...b,
           ventas: b.total_ventas ?? 0,
           mermas: b.total_mermas ?? 0,
           ticket_promedio: b.ticket_promedio ?? 0,
           lat: coords.lat,
           lng: coords.lng
         };
      });
      
      setBranchData(enrichedData);
      if (enrichedData.length > 0 && !selectedBranch) {
        setSelectedBranch(enrichedData[0]);
      }
    } catch (err) {
      console.error("Error fetching branch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchDNA();
    const interval = setInterval(fetchBranchDNA, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            El Espejo del Negocio
          </h2>
          <p className="text-muted-foreground mt-2">Monitoreo en tiempo real de métricas base por sucursal.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><Map className="w-5 h-5 text-indigo-400" />Mapa Geoespacial</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
             <BoliviaHeatmap branchData={branchData} onSelectBranch={setSelectedBranch} />
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" />ADN de la Sucursal</CardTitle></CardHeader>
          <CardContent>
            {selectedBranch && (
              <>
                <BranchRadarChart data={{ ventas: selectedBranch.ventas, mermas: selectedBranch.mermas, ticket_promedio: selectedBranch.ticket_promedio }} />
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="bg-slate-800/60 p-4 rounded-xl text-center border border-slate-700/50">
                    <DollarSign className="w-5 h-5 mx-auto text-green-400 mb-2" />
                    <div className="text-[10px] text-slate-400">Ventas</div>
                    <div className="font-bold text-sm">{Number(selectedBranch.ventas).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</div>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-xl text-center border border-slate-700/50">
                    <TrendingDown className="w-5 h-5 mx-auto text-red-400 mb-2" />
                    <div className="text-[10px] text-slate-400">Mermas</div>
                    <div className="font-bold text-sm">{Number(selectedBranch.mermas).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}</div>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-xl text-center border border-slate-700/50">
                    <Activity className="w-5 h-5 mx-auto text-blue-400 mb-2" />
                    <div className="text-[10px] text-slate-400">Ticket</div>
                    <div className="font-bold text-sm">{selectedBranch.ticket_promedio} Bs</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-7 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-400" />Top Sucursales</CardTitle></CardHeader>
        <CardContent><GeoExpansionBarChart data={branchData} /></CardContent>
      </Card>

      <Card className="col-span-7 border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
        <CardContent className="pt-6"><GeoExpansionTable data={branchData} /></CardContent>
      </Card>
    </div>
  );
}
