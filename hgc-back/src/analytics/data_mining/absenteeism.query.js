const { connection } = require("../../config/snowflake");

const getAbsenteeismData = async () => {
  return new Promise((resolve, reject) => {
    const sqlText = `
      SELECT 
        ID_EMPLEADO_NK,
        CARGO_TITULO,
        DEPARTAMENTO_NOMBRE,
        FEATURE_TOTAL_MINUTOS_ATRASO,
        FEATURE_PROMEDIO_RETRASO,
        FEATURE_TOTAL_HORAS_TRABAJADAS,
        TARGET_ALTO_RIESGO_AUSENTISMO
      FROM TRAINING_DATASETS.OBT_EMPLOYEE_ABSENTEEISM
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

module.exports = { getAbsenteeismData };
