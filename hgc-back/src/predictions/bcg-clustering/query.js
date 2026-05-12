const { connection } = require("../../config/snowflake");

const getBCGData = async () => {
  return new Promise((resolve, reject) => {
    const sqlText = `
      WITH product_sales AS (
        SELECT
          fvd.ID_PRODUCTO_SK,
          dp.ID_PRODUCTO_NK,
          dp.NOMBRE_PRODUCTO,
          dp.CATEGORIA_NOMBRE,
          dp.TIPO_PRODUCTO,
          dp.PRECIO_BASE_HISTORICO,
          dp.COSTO_ESTANDAR_HISTORICO,
          SUM(fvd.CANTIDAD_VENDIDA)                                          AS total_unidades,
          SUM(fvd.MONTO_SUBTOTAL_NETO)                                       AS revenue_neto_total,
          SUM(fvd.CANTIDAD_VENDIDA *
              (dp.PRECIO_BASE_HISTORICO - dp.COSTO_ESTANDAR_HISTORICO))      AS ganancia_neta_total,
          AVG(fvd.PRECIO_UNITARIO_VENTA)                                     AS ticket_promedio
        FROM HGC_DW.GOLD.FACT_VENTAS_DETALLE fvd
        JOIN HGC_DW.GOLD.DIM_PRODUCTO dp ON fvd.ID_PRODUCTO_SK = dp.ID_PRODUCTO_SK
        WHERE dp.ES_ACTUAL = TRUE
        GROUP BY 1, 2, 3, 4, 5, 6, 7
      ),
      totals AS (
        SELECT
          SUM(total_unidades)       AS total_unidades_global,
          SUM(ganancia_neta_total)  AS total_ganancia_global
        FROM product_sales
      )
      SELECT
        ps.ID_PRODUCTO_NK,
        ps.NOMBRE_PRODUCTO,
        ps.CATEGORIA_NOMBRE,
        ps.TIPO_PRODUCTO,
        ROUND(ps.total_unidades * 100.0 / NULLIF(t.total_unidades_global, 0), 4)           AS FEATURE_PARTICIPACION_VOLUMEN_PCT,
        ROUND((ps.PRECIO_BASE_HISTORICO - ps.COSTO_ESTANDAR_HISTORICO)
              / NULLIF(ps.PRECIO_BASE_HISTORICO, 0), 4)                                     AS FEATURE_MARGEN_PORCENTUAL,
        ROUND(ps.ganancia_neta_total * 100.0 / NULLIF(t.total_ganancia_global, 0), 4)      AS FEATURE_SHARE_GANANCIA_PCT,
        ROUND(ps.ganancia_neta_total, 2)                                                    AS FEATURE_GANANCIA_NETA_TOTAL,
        ROUND(ps.revenue_neto_total, 2)                                                     AS FEATURE_REVENUE_NETO_TOTAL,
        ps.total_unidades                                                                   AS FEATURE_VOLUMEN_TOTAL_UNIDADES,
        ROUND(ps.ticket_promedio, 2)                                                        AS FEATURE_TICKET_PROMEDIO,
        ROUND(ps.ganancia_neta_total * 100.0 / NULLIF(t.total_ganancia_global, 0), 4)      AS FEATURE_SHARE_REVENUE_PCT,
        0                                                                                   AS FEATURE_VOLUMEN_90D,
        0                                                                                   AS FEATURE_GANANCIA_90D,
        ROUND((ps.PRECIO_BASE_HISTORICO - ps.COSTO_ESTANDAR_HISTORICO)
              / NULLIF(ps.PRECIO_BASE_HISTORICO, 0), 4)                                     AS FEATURE_MARGEN_PCT_30D
      FROM product_sales ps
      CROSS JOIN totals t
      WHERE ps.total_unidades > 0
      ORDER BY FEATURE_GANANCIA_NETA_TOTAL DESC
      LIMIT 50
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
