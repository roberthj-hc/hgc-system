const { connection } = require("../config/snowflake");

const getBranchDNA = () => {
  return new Promise((resolve, reject) => {
    // Assuming the dbt model is materialized in a schema accessible to the configured Snowflake user
    // e.g. HGC.PUBLIC or similar.
    const query = `
      SELECT 
        id_sucursal_nk,
        nombre_sucursal,
        ciudad,
        direccion,
        SUM(total_ventas) as total_ventas,
        SUM(total_mermas) as total_mermas,
        SUM(total_tickets) as total_tickets,
        COALESCE(SUM(total_ventas) / NULLIF(SUM(total_tickets), 0), 0) as ticket_promedio
      FROM GOLD.mart_sucursales_consolidado
      GROUP BY 1, 2, 3, 4
      ORDER BY total_ventas DESC;
    `;

    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Error executing getBranchDNA query", err);
          reject(err);
        } else {
          // Normalize column names to lowercase for frontend convenience
          const normalizedRows = rows.map(row => {
            const normalized = {};
            for (const key in row) {
              normalized[key.toLowerCase()] = row[key];
            }
            return normalized;
          });
          resolve(normalizedRows);
        }
      },
    });
  });
};

module.exports = {
  getBranchDNA,
};
