const axios = require('axios');
// dotenv.config() removed as it is now centrally handled in src/config/env.js

/**
 * Servicio para interactuar con modelos servidos por MLflow
 */
const predictMLflow = async (port, features) => {
    try {
        const url = `http://127.0.0.1:${port}/invocations`;
        
        // MLflow espera un JSON con 'dataframe_split' o 'dataframe_records'
        const payload = {
            dataframe_records: [features]
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data;
    } catch (error) {
        console.error(`❌ Error llamando a MLflow en puerto ${port}:`, error.message);
        throw new Error('Error en el servicio de predicción MLflow');
    }
};

module.exports = {
    predictMLflow
};
