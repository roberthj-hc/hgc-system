const { connection } = require("../config/snowflake");

const getHistoricalSales = (branchId) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT fecha, SUM(ventas_reales) as ventas
      FROM GOLD.mart_ventas_historicas
    `;
    if (branchId && branchId !== 'all') {
      query += ` WHERE id_sucursal_sk = '${branchId}' `;
    }
    query += ` GROUP BY fecha ORDER BY fecha `;

    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else {
          const data = rows.map(r => ({
            date: r.FECHA.toISOString().split('T')[0],
            ventas: parseFloat(r.VENTAS)
          }));
          resolve(data);
        }
      }
    });
  });
};

module.exports = { getHistoricalSales };
