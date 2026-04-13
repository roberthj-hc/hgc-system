const snowflake = require("snowflake-sdk");
const { snowflake: config } = require("./env");

const connection = snowflake.createConnection({
  account: config.account,
  username: config.user,
  password: config.password,
  warehouse: config.warehouse,
  database: config.database,
  schema: config.schema
});

const connectSnowflake = () =>
  new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) return reject(err);
      console.log("❄️ Snowflake conectado");
      resolve(conn);
    });
  });

module.exports = { connection, connectSnowflake };