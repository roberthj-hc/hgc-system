const { executeQuery } = require("../../services/snowflake.service");

const getStgPedidos = async () => {
  const sql = `
    SELECT *
    FROM PEDIDOS
    LIMIT 10
  `;

  return await executeQuery(sql);
};

module.exports = { getStgPedidos };


















/*
estoy creando la botonera de un dashboard y para organizarlo necesito los siguientes componentes (organizalos mejor):
- minería de datos
- forecasting
- econometría
- chatbot
necesito un sistema funcional y coherente, no funcional por secciones
tiene que tener: minería, dl, ml, ia, analisis de series de tiempo, econometria con dos enfoques (economia y regresiones y 
programacion para linela multiple) 
algunos aspectos:
- fine tunning
- azure?, snowflake, dbt, power bi (dashboards de power bi ya tengo eso nada que ver)
- recomendaciones
- esquema o directo para los datos que vienen desde mi snowflake
- influxdb y grafana para series de tiempo
- grafana tiempo real
- dinámico
- lograr mostrar lo que posiblemente quiere ver el gerente

tengo las siguientes areas:
y el siguiente modelo bronze en mi snowflake (tambien hice staging silver):

*/