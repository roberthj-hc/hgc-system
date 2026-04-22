const { connection, getIsConnected } = require("../config/snowflake");

const MOCK_DATA = [
  { nombre_sucursal: "HGC Miraflores", total_ventas: 75000000, total_mermas: 1200000, ticket_promedio: 85 },
  { nombre_sucursal: "HGC Calacoto", total_ventas: 45000000, total_mermas: 800000, ticket_promedio: 110 },
  { nombre_sucursal: "HGC San Miguel", total_ventas: 62000000, total_mermas: 950000, ticket_promedio: 95 },
  { nombre_sucursal: "HGC Equipetrol", total_ventas: 89000000, total_mermas: 1500000, ticket_promedio: 120 },
  { nombre_sucursal: "HGC Centro", total_ventas: 55000000, total_mermas: 1100000, ticket_promedio: 75 },
  { nombre_sucursal: "HGC Plan 3000", total_ventas: 38000000, total_mermas: 600000, ticket_promedio: 65 },
  { nombre_sucursal: "HGC Prado", total_ventas: 48000000, total_mermas: 900000, ticket_promedio: 80 }
];

const getBranchDNA = (req, res) => {
  if (!getIsConnected()) {
    console.log("Modo Simulación: Devolviendo datos de prueba debido a suspensión de Snowflake.");
    return res.json(MOCK_DATA);
  }

  const query = `
    SELECT 
      nombre_sucursal,
      SUM(ventas_reales) as total_ventas,
      SUM(mermas_reales) as total_mermas,
      AVG(ticket_promedio) as ticket_promedio
    FROM GOLD.mart_sucursales_consolidado
    GROUP BY nombre_sucursal
  `;

  connection.execute({
    sqlText: query,
    complete: (err, stmt, rows) => {
      if (err) {
        console.error("Error ejecutando query:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  });
};

module.exports = { getBranchDNA };
