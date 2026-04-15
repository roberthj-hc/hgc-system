const { connection } = require("../../config/snowflake");

const getChurnFeatures = async () => {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: "SELECT * FROM training_datasets.obt_churn_prediction",
      complete: (err, stmt, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    });
  });
};

module.exports = { getChurnFeatures };
