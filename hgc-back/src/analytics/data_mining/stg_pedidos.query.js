const { executeQuery } = require("../../services/snowflake.service");

const getStgPedidos = async () => {
  const sql = `
    SELECT *
    FROM STG_POSTGRES__PEDIDOS
    LIMIT 10
  `;

  return await executeQuery(sql);
};

module.exports = { getStgPedidos };
