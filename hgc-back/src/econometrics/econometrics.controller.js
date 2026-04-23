const fs = require('fs');
const path = require('path');

// Rutas a los archivos locales generados por el script de ML
const DATA_PATH_COEFFS = path.join(__dirname, '../../data/elasticity_coefficients.json');
const DATA_PATH_HISTORICAL = path.join(__dirname, '../../data/historical_data.json');

exports.getProducts = async (req, res) => {
  try {
    if (fs.existsSync(DATA_PATH_COEFFS)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH_COEFFS, 'utf8'));
      const products = [...new Map(data.map(item => [item.ID_PRODUCTO_SK, {
        ID_PRODUCTO_SK: item.ID_PRODUCTO_SK,
        NOMBRE_PRODUCTO: item.NOMBRE_PRODUCTO
      }])).values()];
      return res.json(products);
    }
    
    // Fallback a Snowflake
    const { executeQuery } = require("../services/snowflake.service");
    const results = await executeQuery("SELECT DISTINCT ID_PRODUCTO_SK, NOMBRE_PRODUCTO FROM GOLD.RESULTADOS_ELASTICIDAD");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getElasticityCoefficients = async (req, res) => {
  const { productId } = req.query;
  try {
    if (fs.existsSync(DATA_PATH_COEFFS)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH_COEFFS, 'utf8'));
      const coeff = data.find(p => p.ID_PRODUCTO_SK === productId);
      if (coeff) return res.json(coeff);
    }

    const { executeQuery } = require("../services/snowflake.service");
    const sql = `SELECT * FROM GOLD.RESULTADOS_ELASTICIDAD WHERE ID_PRODUCTO_SK = '${productId}'`;
    const results = await executeQuery(sql);
    res.json(results[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHistoricalScatter = async (req, res) => {
  const { productId } = req.query;
  try {
    if (fs.existsSync(DATA_PATH_HISTORICAL)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH_HISTORICAL, 'utf8'));
      const filtered = data.filter(p => p.ID_PRODUCTO_SK === productId);
      return res.json(filtered);
    }

    const { executeQuery } = require("../services/snowflake.service");
    const sql = `
      SELECT PRECIO, CANTIDAD, CANTIDAD_NORMALIZADA, LOG_P, LOG_Q_NORM, NOMBRE_SUCURSAL, TIPO_FORMATO
      FROM GOLD.MART_ECONOMETRIA_ELASTICIDAD_BASE
      WHERE ID_PRODUCTO_SK = '${productId}'
    `;
    const results = await executeQuery(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEfficiencyData = async (req, res) => {
  const DATA_PATH_EFFICIENCY = path.join(__dirname, '../../data/efficiency_results.json');
  try {
    if (fs.existsSync(DATA_PATH_EFFICIENCY)) {
      const fullData = JSON.parse(fs.readFileSync(DATA_PATH_EFFICIENCY, 'utf8'));
      // fullData now contains { metadata, data }
      return res.json(fullData);
    }
    res.status(404).json({ error: "Efficiency data not found. Please run ML training." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
