const snowflake = require("snowflake-sdk");
require("dotenv").config({ path: "../.env" });

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USER,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  role: process.env.SNOWFLAKE_ROLE,
});

let isConnected = false;

const connectSnowflake = () => {
  return new Promise((resolve, reject) => {
    console.log("Intentando conectar a Snowflake...");
    connection.connect((err, conn) => {
      if (err) {
        if (err.code === '390913') {
          console.error("⚠️ CUENTA DE SNOWFLAKE SUSPENDIDA (Trial expirado).");
          isConnected = false;
          resolve(false);
        } else {
          console.error("Error conectando a Snowflake:", err.message);
          reject(err);
        }
      } else {
        console.log("Conectado exitosamente a Snowflake.");
        isConnected = true;
        resolve(true);
      }
    });
  });
};

module.exports = { connection, connectSnowflake, getIsConnected: () => isConnected };