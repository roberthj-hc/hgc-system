const fs = require('fs');
const path = require('path');
const { connection, getIsConnected } = require("../../config/snowflake");

const CACHE_DIAG_FILE = path.join(__dirname, "../../../data/profitability_diagnostics.json");
const CACHE_BRANCHES_FILE = path.join(__dirname, "../../../data/profitability_branches.json");

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

const getProfitabilityDiagnostics = (sucursalId = 'all') => {
  return new Promise((resolve, reject) => {
    // 1. Intentar desde Cache JSON
    if (sucursalId === 'all' && fs.existsSync(CACHE_DIAG_FILE)) {
      try {
        console.log("Serving Profitability Diagnostics from Cache JSON");
        const cachedData = JSON.parse(fs.readFileSync(CACHE_DIAG_FILE, 'utf8'));
        return resolve(cachedData);
      } catch (e) {
        console.error("Error reading cache file:", e);
      }
    }

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

    console.log(`Fallback: Querying Snowflake for Profitability Diagnostics (${sucursalId})`);
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) resolve(MOCK_DIAGNOSTICS);
        else {
          const data = rows.map(row => {
            const normalized = {};
            for (const key in row) normalized[key.toLowerCase()] = row[key];
            return { ...normalized, impacto_diagnostico: "Análisis basado en datos reales de Snowflake." };
          });

          // Guardar en cache solo si es consolidado
          if (sucursalId === 'all') {
            try {
              fs.writeFileSync(CACHE_DIAG_FILE, JSON.stringify(data, null, 2));
            } catch (wErr) { console.error("Error writing cache:", wErr); }
          }
          resolve(data);
        }
      },
    });
  });
};

const getBranches = () => {
  return new Promise((resolve, reject) => {
    // 1. Cache
    if (fs.existsSync(CACHE_BRANCHES_FILE)) {
      try {
        console.log("Serving Branches from Cache JSON");
        return resolve(JSON.parse(fs.readFileSync(CACHE_BRANCHES_FILE, 'utf8')));
      } catch (e) { console.error(e); }
    }

    if (!getIsConnected()) {
      return resolve(MOCK_BRANCHES);
    }

    const query = `SELECT DISTINCT id_sucursal_sk, nombre_sucursal FROM GOLD.mart_rentabilidad_diagnostica ORDER BY nombre_sucursal`;
    console.log("Fallback: Querying Snowflake for Branches");
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) resolve(MOCK_BRANCHES);
        else {
          const data = rows.map(r => ({ id: r.ID_SUCURSAL_SK, nombre: r.NOMBRE_SUCURSAL }));
          try {
            fs.writeFileSync(CACHE_BRANCHES_FILE, JSON.stringify(data, null, 2));
          } catch (e) { console.error(e); }
          resolve(data);
        }
      }
    });
  });
};

module.exports = {
  getProfitabilityDiagnostics,
  getBranches
};
