const fs = require('fs');
const path = require('path');
const { connection } = require("../../config/snowflake");

const getHistoricalSales = (branchId) => {
  const cacheKey = branchId || 'all';
  const CACHE_FILE = path.join(__dirname, `../../../data/historical_sales_${cacheKey}.json`);

  return new Promise((resolve, reject) => {
    // 1. Cache
    if (fs.existsSync(CACHE_FILE)) {
      try {
        console.log(`Serving Historical Sales (${cacheKey}) from Cache JSON`);
        return resolve(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')));
      } catch (e) { console.error(e); }
    }

    let query = `
      SELECT fecha, SUM(ventas_reales) as ventas
      FROM GOLD.mart_ventas_historicas
    `;
    if (branchId && branchId !== 'all') {
      query += ` WHERE id_sucursal_sk = '${branchId}' `;
    }
    query += ` GROUP BY fecha ORDER BY fecha `;

    console.log(`Fallback: Querying Snowflake for Historical Sales (${cacheKey})`);
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else {
          const data = rows.map(r => ({
            date: r.FECHA.toISOString().split('T')[0],
            ventas: parseFloat(r.VENTAS)
          }));

          // Guardar en Cache
          try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
          } catch (e) { console.error(e); }

          resolve(data);
        }
      }
    });
  });
};

module.exports = { getHistoricalSales };
