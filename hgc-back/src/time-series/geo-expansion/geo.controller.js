const { connection, getIsConnected } = require("../../config/snowflake");

const MOCK_DATA = [
  { nombre_sucursal: "HGC Miraflores", total_ventas: 75000000, total_mermas: 1200000, ticket_promedio: 85 },
  { nombre_sucursal: "HGC Calacoto", total_ventas: 45000000, total_mermas: 800000, ticket_promedio: 110 },
  { nombre_sucursal: "HGC San Miguel", total_ventas: 62000000, total_mermas: 950000, ticket_promedio: 95 },
  { nombre_sucursal: "HGC Equipetrol", total_ventas: 89000000, total_mermas: 1500000, ticket_promedio: 120 },
  { nombre_sucursal: "HGC Centro", total_ventas: 55000000, total_mermas: 1100000, ticket_promedio: 75 },
  { nombre_sucursal: "HGC Plan 3000", total_ventas: 38000000, total_mermas: 600000, ticket_promedio: 65 },
  { nombre_sucursal: "HGC Prado", total_ventas: 48000000, total_mermas: 900000, ticket_promedio: 80 }
];

const { getBranchDNA: getBranchDNAService } = require("./geo.service");

const getBranchDNA = async (req, res) => {
  try {
    const data = await getBranchDNAService();
    res.json(data);
  } catch (error) {
    console.error("Error in getBranchDNA controller:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getBranchDNA };
