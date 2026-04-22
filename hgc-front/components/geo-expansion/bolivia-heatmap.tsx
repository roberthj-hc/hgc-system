"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";

// TopoJSON for Bolivia departments from public directory
const geoUrl = "/bolivia.json";

interface BoliviaHeatmapProps {
  branchData: any[];
  onSelectBranch: (branch: any) => void;
}

export function BoliviaHeatmap({ branchData, onSelectBranch }: BoliviaHeatmapProps) {
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const [position, setPosition] = useState({ coordinates: [-64.0, -16.5] as [number, number], zoom: 1 });

  const getStatusColor = (branch: any) => {
    const ratio = branch.ventas > 0 ? (branch.mermas / branch.ventas) : 0;
    if (ratio < 0.02) return "#22c55e"; // Óptimo (< 2%)
    if (ratio < 0.05) return "#eab308"; // Regular (2% - 5%)
    return "#ef4444"; // Crítico (> 5%)
  };

  const handleMoveEnd = (newPosition: { coordinates: [number, number]; zoom: number }) => {
    setPosition(newPosition);
  };

  return (
    <div className="w-full h-[400px] bg-[#0f172a] rounded-xl overflow-hidden relative group">
      <div className="absolute top-2 right-2 text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        Scroll para zoom, arrastre para mover
      </div>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1800,
          center: [-64.0, -16.5] // Center of Bolivia
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup 
          center={position.coordinates} 
          zoom={position.zoom} 
          onMoveEnd={handleMoveEnd}
          minZoom={1} 
          maxZoom={10}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={0.5 / position.zoom}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#334155", outline: "none" },
                    pressed: { fill: "#1e293b", outline: "none" }
                  }}
                />
              ))
            }
          </Geographies>

          {branchData.map((branch, idx) => {
            if (!branch.lng || !branch.lat) return null;
            // Scale radius inversely with zoom: Base radius 8 at zoom 1, scales down to 2 at zoom 10
            const radius = Math.max(2, 8 / position.zoom);
            const strokeWidth = Math.max(0.5, 2 / position.zoom);
            
            return (
              <Marker 
                key={idx} 
                coordinates={[branch.lng, branch.lat]}
                onClick={() => onSelectBranch(branch)}
                onMouseEnter={() => setHoveredBranch(branch.nombre_sucursal)}
                onMouseLeave={() => setHoveredBranch(null)}
              >
                <circle 
                  r={radius} 
                  fill={getStatusColor(branch)} 
                  stroke="#fff" 
                  strokeWidth={strokeWidth} 
                  className="cursor-pointer transition-transform hover:scale-110" 
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {hoveredBranch && (
        <div className="absolute top-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm shadow-lg border border-slate-700 pointer-events-none z-20">
          {hoveredBranch}
        </div>
      )}
    </div>
  );
}
