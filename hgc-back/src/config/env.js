const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

module.exports = {
  port: process.env.PORT || 3000,

  snowflake: {
    user: process.env.SNOWFLAKE_USER,
    password: process.env.SNOWFLAKE_PASSWORD,
    account: process.env.SNOWFLAKE_ACCOUNT,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA
  }
};