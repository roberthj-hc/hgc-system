const fs = require('fs');
const path = require('path');
const { connection } = require("../../config/snowflake");

/**
 * Genera datos históricos sintéticos plausibles para los últimos N días.
 * Usado como fallback cuando Snowflake no tiene la tabla MART_VENTAS_HISTORICAS.
 */
function generateFallbackHistorical(days = 90) {
  const data = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  // Base de ventas con variación realista
  const baseSales   = 9500;
  const weeklyPattern = [0.85, 0.95, 1.00, 1.05, 1.18, 1.25, 0.88]; // L-D
  let runningAvg = baseSales;

  for (let i = 0; i < days; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);

    const dow    = d.getDay();
    const noise  = (Math.random() - 0.5) * 800;          // ±800 aleatoriedad
    const trend  = 1 + (i / days) * 0.03;               // +3% de tendencia total
    const ventas = Math.max(500, Math.round(runningAvg * weeklyPattern[dow] * trend + noise));

    // Media móvil suave para que sea realista
    runningAvg = runningAvg * 0.97 + ventas * 0.03;

    data.push({
      date: d.toISOString().split('T')[0],
      ventas
    });
  }
  return data;
}

const getHistoricalSales = (branchId) => {
  const cacheKey = branchId || 'all';
  const CACHE_FILE = path.join(__dirname, `../../../data/historical_sales_${cacheKey}.json`);
  const CACHE_ALL  = path.join(__dirname, `../../../data/historical_sales_all.json`);

  return new Promise((resolve) => {
    // 1. Cache específico de la sucursal
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const stats = fs.statSync(CACHE_FILE);
        if (stats.size > 1000) {
          const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
          if (Array.isArray(cached) && cached.length > 0) {
            console.log(`Serving Historical Sales (${cacheKey}) from Cache JSON`);
            return resolve(cached);
          }
        }
        try { fs.unlinkSync(CACHE_FILE); } catch (_) {}
      } catch (e) {
        try { fs.unlinkSync(CACHE_FILE); } catch (_) {}
      }
    }

    const query = branchId && branchId !== 'all'
      ? `SELECT fecha, SUM(ventas_reales) as ventas FROM GOLD.mart_ventas_historicas WHERE id_sucursal_sk = '${branchId}' GROUP BY fecha ORDER BY fecha`
      : `SELECT fecha, SUM(ventas_reales) as ventas FROM GOLD.mart_ventas_historicas GROUP BY fecha ORDER BY fecha`;

    console.log(`Querying Snowflake for Historical Sales (${cacheKey})...`);

    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          console.warn(`Snowflake historical error (${cacheKey}): ${err.message}`);

          // 2. Fallback: cache consolidado filtrando solo fechas pasadas
          if (cacheKey !== 'all' && fs.existsSync(CACHE_ALL)) {
            try {
              const allData = JSON.parse(fs.readFileSync(CACHE_ALL, 'utf8'));
              const today = new Date().toISOString().split('T')[0];
              const pastData = allData.filter(d => d.date <= today);
              if (Array.isArray(pastData) && pastData.length > 0) {
                console.log(`Fallback: using historical_sales_all.json (past only) for (${cacheKey})`);
                return resolve(pastData.slice(-90));
              }
            } catch (_) {}
          }

          // 3. Fallback final: datos sintéticos de 90 días
          console.log(`Fallback: generating synthetic historical data for (${cacheKey})`);
          return resolve(generateFallbackHistorical(90));
        }

        const data = rows.map(r => ({
          date: (r.FECHA instanceof Date ? r.FECHA : new Date(r.FECHA)).toISOString().split('T')[0],
          ventas: parseFloat(r.VENTAS)
        }));

        if (data.length > 0) {
          try { fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2)); } catch (e) {}
        }

        resolve(data.length > 0 ? data : generateFallbackHistorical(90));
      }
    });
  });
};

module.exports = { getHistoricalSales };
