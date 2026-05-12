const { connection } = require("../../config/snowflake");

/**
 * Obtiene el listado consolidado de desempeño por sucursal desde el OBT del Caso 3.
 */
exports.getBranchPerformanceData = async () => {
  const query = `
    SELECT 
        ID_SUCURSAL_NK,
        NOMBRE_SUCURSAL,
        CIUDAD,
        TIPO_FORMATO,
        FEATURE_VOLUMEN_TOTAL_PEDIDOS,
        FEATURE_TOTAL_TRANSACCIONES,
        FEATURE_REVENUE_NETO_TOTAL,
        FEATURE_MINUTOS_ATRASO_PROMEDIO,
        FEATURE_MINUTOS_ATRASO_TOTAL,
        FEATURE_TASA_AUSENTISMO,
        TARGET_GANANCIA_NETA
    FROM HGC_DW.SILVER.OBT_BRANCH_PERFORMANCE
    ORDER BY TARGET_GANANCIA_NETA DESC
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          return reject(new Error("Error executing Snowflake query for Branch Performance: " + err.message));
        }
        resolve(rows);
      },
    });
  });
};
