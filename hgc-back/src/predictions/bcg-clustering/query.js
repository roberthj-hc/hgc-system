const { connection } = require("../../config/snowflake");

const getBCGData = async () => {
  return new Promise((resolve, reject) => {
    const sqlText = `
      SELECT
        ID_PRODUCTO_NK,
        NOMBRE_PRODUCTO,
        CATEGORIA_NOMBRE,
        TIPO_PRODUCTO,
        FEATURE_PARTICIPACION_VOLUMEN_PCT,
        FEATURE_MARGEN_PORCENTUAL,
        FEATURE_SHARE_GANANCIA_PCT,
        FEATURE_GANANCIA_NETA_TOTAL,
        FEATURE_REVENUE_NETO_TOTAL,
        FEATURE_VOLUMEN_TOTAL_UNIDADES,
        FEATURE_TICKET_PROMEDIO,
        FEATURE_SHARE_REVENUE_PCT,
        FEATURE_VOLUMEN_90D,
        FEATURE_GANANCIA_90D,
        FEATURE_MARGEN_PCT_30D
      FROM HGC_DW.SILVER.OBT_BCG_PRODUCT_CLUSTERING
      ORDER BY FEATURE_GANANCIA_NETA_TOTAL DESC
    `;
    connection.execute({
      sqlText,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    });
  });
};

module.exports = { getBCGData };
