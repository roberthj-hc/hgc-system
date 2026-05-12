const fs = require('fs');
const path = require('path');
const { connection } = require("../../config/snowflake");

const CACHE_FILE = path.join(__dirname, "../../../data/branch_dna.json");

const getBranchDNA = () => {
  return new Promise((resolve, reject) => {
    // 1. Intentar desde Cache JSON
    if (fs.existsSync(CACHE_FILE)) {
      try {
        console.log("Serving Branch DNA from Cache JSON");
        const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        return resolve(cachedData);
      } catch (e) {
        console.error("Error reading branch_dna.json cache:", e);
      }
    }

    // 2. Fallback a Snowflake
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

    console.log("Fallback: Querying Snowflake for Branch DNA");
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Error executing getBranchDNA query", err);
          reject(err);
        } else {
          const normalizedRows = rows.map(row => {
            const normalized = {};
            for (const key in row) {
              normalized[key.toLowerCase()] = row[key];
            }
            return normalized;
          });

          // 3. Guardar en Cache para futuras consultas
          try {
            if (!fs.existsSync(path.dirname(CACHE_FILE))) {
              fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
            }
            fs.writeFileSync(CACHE_FILE, JSON.stringify(normalizedRows, null, 2));
            console.log("Branch DNA cache updated successfully");
          } catch (writeErr) {
            console.error("Error writing Branch DNA cache:", writeErr);
          }

          resolve(normalizedRows);
        }
      },
    });
  });
};

module.exports = {
  getBranchDNA,
};
