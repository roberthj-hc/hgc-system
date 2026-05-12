const { connection } = require("../config/snowflake");

const executeQuery = (sql) =>
  new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    });
  });

module.exports = { executeQuery };