const express = require('express');
const router = express.Router();
const snowflake = require('../services/snowflake.service');
const mlService = require('../services/ml.service');

/**
 * GET /api/operational-demand/stats
 * Retorna datos históricos agregados para gráficos descriptivos y diagnósticos.
 */
router.get('/stats', async (req, res) => {
    try {
        const { product } = req.query;
        
        // Query para Descriptive: Ventas diarias últimos 30 días
        const descriptiveQuery = `
            SELECT FECHA_PREDICCION as date, TARGET_CANTIDAD_TOTAL as value
            FROM TRAINING_DATASETS.OBT_OPERATIONAL_DEMAND
            WHERE NOMBRE_PRODUCTO = '${product}'
            ORDER BY FECHA_PREDICCION DESC
            LIMIT 30
        `;
        
        // Query para Diagnostic: Promedio por día de la semana
        const diagnosticQuery = `
            SELECT META_NOMBRE_DIA as day, AVG(TARGET_CANTIDAD_TOTAL) as avg_value
            FROM TRAINING_DATASETS.OBT_OPERATIONAL_DEMAND
            WHERE NOMBRE_PRODUCTO = '${product}'
            GROUP BY 1, FEATURE_DIA_SEMANA
            ORDER BY FEATURE_DIA_SEMANA
        `;

        const [descriptive, diagnostic] = await Promise.all([
            snowflake.executeQuery(descriptiveQuery),
            snowflake.executeQuery(diagnosticQuery)
        ]);

        res.json({ descriptive: descriptive.reverse(), diagnostic });
    } catch (error) {
        console.error('❌ Error en operational-demand stats:', error);
        res.status(500).json({ error: 'Fallo al obtener estadísticas de Snowflake' });
    }
});

/**
 * POST /api/operational-demand/predict
 * Llama al servidor de MLflow para obtener una predicción en vivo.
 */
router.get('/predict', async (req, res) => {
    try {
        // En un entorno real esto vendría de un form o de la última data de Snowflake
        // Para el MVP, tomamos la última fila de features de Snowflake para el producto dado
        const { product } = req.query;

        const featuresQuery = `
            SELECT 
                (SIN(2 * PI() * FEATURE_DIA_SEMANA / 7)) as DOW_SIN,
                (COS(2 * PI() * FEATURE_DIA_SEMANA / 7)) as DOW_COS,
                (SIN(2 * PI() * FEATURE_MES / 12)) as MONTH_SIN,
                (COS(2 * PI() * FEATURE_MES / 12)) as MONTH_COS,
                FEATURE_ES_FIN_DE_SEMANA, 
                TARGET_CANTIDAD_TOTAL as FEATURE_LAG_1_DIA, -- Asumimos que hoy es mañana
                FEATURE_LAG_7_DIAS,
                FEATURE_ROLLING_AVG_7D, 
                FEATURE_ROLLING_STD_7D, 
                FEATURE_ROLLING_AVG_30D
            FROM TRAINING_DATASETS.OBT_OPERATIONAL_DEMAND
            WHERE NOMBRE_PRODUCTO = '${product}'
            ORDER BY FECHA_PREDICCION DESC
            LIMIT 1
        `;

        const row = await snowflake.executeQuery(featuresQuery);
        
        if (!row || row.length === 0) {
            return res.status(404).json({ error: 'No se encontraron features para este producto' });
        }

        const features = row[0];
        
        // El servidor MLflow corre en el puerto 5001 (configurado en el notebook)
        const prediction = await mlService.predictMLflow(5001, features);

        res.json({ 
            prediction: prediction.predictions[0],
            features_used: features
        });
    } catch (error) {
        console.error('❌ Error en operational-demand predict:', error);
        res.status(500).json({ error: 'Fallo al conectar con el servidor de MLflow (¿esta corriendo en el puerto 5001?)' });
    }
});

module.exports = router;
