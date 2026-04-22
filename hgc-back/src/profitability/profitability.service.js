const { connection, getIsConnected } = require("../config/snowflake");

const MOCK_BRANCHES = [
  { id: "1", nombre: "HGC Miraflores" },
  { id: "2", nombre: "HGC Calacoto" },
  { id: "3", nombre: "HGC Centro" },
  { id: "4", nombre: "HGC Equipetrol" },
  { id: "5", nombre: "HGC Prado" }
];

const MOCK_DIAGNOSTICS = [
  { id_sucursal_sk: "all", nombre_sucursal: "Consolidado", ingreso_bruto: 500000, comisiones_delivery: 45000, total_mermas: 12000, costo_operativo: 150000, utilidad_neta: 293000, impacto_diagnostico: "La rentabilidad se mantiene estable con un margen neto del 58%." }
];

const getProfitabilityDiagnostics = (sucursalId) => {
  return new Promise((resolve, reject) => {
    if (!getIsConnected()) {
      return resolve(MOCK_DIAGNOSTICS);
    }

    let query = `
      SELECT 
        id_sucursal_sk,
        nombre_sucursal,
        SUM(ingreso_bruto) as ingreso_bruto,
        SUM(comisiones_delivery) as comisiones_delivery,
        SUM(total_mermas) as total_mermas,
        SUM(costo_operativo) as costo_operativo,
        SUM(utilidad_neta) as utilidad_neta
      FROM GOLD.mart_rentabilidad_diagnostica
    `;

    if (sucursalId && sucursalId !== 'all') {
      query += ` WHERE id_sucursal_sk = '${sucursalId}' `;
    }
    query += ` GROUP BY id_sucursal_sk, nombre_sucursal `;

    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) resolve(MOCK_DIAGNOSTICS); // Fallback a mock en caso de error de query
        else {
          resolve(rows.map(row => {
            const normalized = {};
            for (const key in row) normalized[key.toLowerCase()] = row[key];
            return { ...normalized, impacto_diagnostico: "Análisis basado en datos reales de Snowflake." };
          }));
        }
      },
    });
  });
};

const getBranches = () => {
  return new Promise((resolve, reject) => {
    if (!getIsConnected()) {
      return resolve(MOCK_BRANCHES);
    }

    const query = `SELECT DISTINCT id_sucursal_sk, nombre_sucursal FROM GOLD.mart_rentabilidad_diagnostica ORDER BY nombre_sucursal`;
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) resolve(MOCK_BRANCHES);
        else resolve(rows.map(r => ({ id: r.ID_SUCURSAL_SK, nombre: r.NOMBRE_SUCURSAL })));
      }
    });
  });
};

module.exports = {
  getProfitabilityDiagnostics,
  getBranches
};
