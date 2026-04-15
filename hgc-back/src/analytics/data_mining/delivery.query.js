const { connection } = require("../../config/snowflake");

const getDeliveryData = async () => {
  return new Promise((resolve, reject) => {
    const sqlText = `
      SELECT 
        NRO_DELIVERY_DD,
        NRO_PEDIDO_DD,
        FEATURE_PLATAFORMA_DELIVERY,
        FEATURE_COSTO_ENVIO,
        TARGET_TIEMPO_ESTIMADO,
        TARGET_DELIVERY_COMPLETADO
      FROM TRAINING_DATASETS.OBT_DELIVERY_TIME_PREDICTION
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

module.exports = { getDeliveryData };
