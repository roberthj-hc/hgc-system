exports.predictChurn = async (req, res) => {
  try {
    const { rango_edad, frecuencia, monto_gasto, recencia } = req.body;

    // Verificar variables de entorno o predeterminado
    const mlflowUrl = process.env.MLFLOW_URL || "http://127.0.0.1:5001/invocations";
    
    const payload = {
      dataframe_split: {
        columns: [
          "RANGO_EDAD", 
          "FEATURE_FRECUENCIA_HISTORICA", 
          "FEATURE_MONTO_GASTO_HISTORICO", 
          "FEATURE_RECENCIA_DIAS"
        ],
        data: [[
          String(rango_edad), 
          Number(frecuencia), 
          Number(monto_gasto), 
          Number(recencia)
        ]]
      }
    };

    const response = await fetch(mlflowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`MLFlow api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // MLflow format: { predictions: [ 1 ] }
    const predictionValue = data.predictions[0];
    
    return res.json({ 
      isChurn: predictionValue === 1,
      predictionValue: predictionValue 
    });

  } catch (error) {
    console.error("Error connecting to ML model:", error);
    res.status(500).json({ error: "Failed to connect to ML model: " + error.message });
  }
};

exports.predictSegmentation = async (req, res) => {
  try {
    const { edad_ordinal, frecuencia, monetario, recencia, ticket_promedio, volumen } = req.body;

    const mlflowUrlSeg = process.env.MLFLOW_SEG_URL || "http://127.0.0.1:5002/invocations";
    
    const payload = {
      dataframe_split: {
        columns: [
          "FEATURE_RANGO_EDAD_ORDINAL", 
          "RFM_FREQUENCY", 
          "RFM_MONETARY", 
          "RFM_RECENCY",
          "FEATURE_TICKET_PROMEDIO",
          "FEATURE_VOLUMEN_ARTICULOS"
        ],
        data: [[
          Number(edad_ordinal), 
          Number(frecuencia), 
          Number(monetario), 
          Number(recencia),
          Number(ticket_promedio),
          Number(volumen)
        ]]
      }
    };

    const response = await fetch(mlflowUrlSeg, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`MLFlow segmentation api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // MLflow format: { predictions: [ 2 ] }
    const cluster = data.predictions[0];
    
    return res.json({ 
      clusterId: cluster
    });

  } catch (error) {
    console.error("Error connecting to ML Seg model:", error);
    res.status(500).json({ error: "Failed to connect to ML segmentation model: " + error.message });
  }
};

exports.predictCLV = async (req, res) => {
  try {
    const { rango_edad, freq_total, cantidad_articulos, antiguedad_dias } = req.body;

    const mlflowUrlCLV = process.env.MLFLOW_CLV_URL || "http://127.0.0.1:5003/invocations";

    const payload = {
      dataframe_split: {
        columns: [
          "RANGO_EDAD",
          "FEATURE_FREQ_TOTAL",
          "FEATURE_CANTIDAD_ARTICULOS",
          "FEATURE_ANTIGUEDAD_DIAS"
        ],
        data: [[
          String(rango_edad),
          Number(freq_total),
          Number(cantidad_articulos),
          Number(antiguedad_dias)
        ]]
      }
    };

    const response = await fetch(mlflowUrlCLV, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`MLFlow CLV api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // MLflow retorna: { predictions: [ 1234.56 ] } (valor monetario continuo)
    const clvValue = data.predictions[0];

    return res.json({
      clvPredicted: clvValue
    });

  } catch (error) {
    console.error("Error connecting to ML CLV model:", error);
    res.status(500).json({ error: "Failed to connect to ML CLV model: " + error.message });
  }
};

exports.predictAbsenteeism = async (req, res) => {
  try {
    const { cargo_titulo, departamento_nombre, total_minutos_atraso, promedio_retraso, total_horas_trabajadas } = req.body;

    const mlflowUrl = process.env.MLFLOW_ABS_URL || "http://127.0.0.1:5004/invocations";

    const payload = {
      dataframe_split: {
        columns: [
          "CARGO_TITULO",
          "DEPARTAMENTO_NOMBRE",
          "FEATURE_TOTAL_MINUTOS_ATRASO",
          "FEATURE_PROMEDIO_RETRASO",
          "FEATURE_TOTAL_HORAS_TRABAJADAS"
        ],
        data: [[
          String(cargo_titulo),
          String(departamento_nombre),
          Number(total_minutos_atraso),
          Number(promedio_retraso),
          Number(total_horas_trabajadas)
        ]]
      }
    };

    const response = await fetch(mlflowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`MLFlow absenteeism api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const predictionValue = data.predictions[0];

    return res.json({
      isHighRisk: predictionValue === 1,
      predictionValue: predictionValue
    });

  } catch (error) {
    console.error("Error connecting to ML Absenteeism model:", error);
    res.status(500).json({ error: "Failed to connect to ML absenteeism model: " + error.message });
  }
};

exports.getAbsenteeismDataHandler = async (req, res) => {
  try {
    const { getAbsenteeismData } = require("./data_mining/absenteeism.query");
    const data = await getAbsenteeismData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching absenteeism data:", error);
    res.status(500).json({ error: "Failed to fetch absenteeism data: " + error.message });
  }
};

exports.predictDelivery = async (req, res) => {
  try {
    const { plataforma_delivery, costo_envio } = req.body;

    const mlflowUrl = process.env.MLFLOW_DELIVERY_URL || "http://127.0.0.1:5005/invocations";

    const payload = {
      dataframe_split: {
        columns: [
          "FEATURE_PLATAFORMA_DELIVERY",
          "FEATURE_COSTO_ENVIO"
        ],
        data: [[
          String(plataforma_delivery),
          Number(costo_envio)
        ]]
      }
    };

    const response = await fetch(mlflowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`MLFlow delivery api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const predictionValue = data.predictions[0];

    return res.json({
      estimatedMinutes: predictionValue
    });

  } catch (error) {
    console.error("Error connecting to ML Delivery model:", error);
    res.status(500).json({ error: "Failed to connect to ML delivery model: " + error.message });
  }
};

exports.getDeliveryDataHandler = async (req, res) => {
  try {
    const { getDeliveryData } = require("./data_mining/delivery.query");
    const data = await getDeliveryData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching delivery data:", error);
    res.status(500).json({ error: "Failed to fetch delivery data: " + error.message });
  }
};

exports.predictCannibalization = async (req, res) => {
  try {
    const { distancia_km, dif_precio_pct, public_share_pct } = req.body;

    const flaskUrl = process.env.FLASK_CANNIBALIZATION_URL || "http://127.0.0.1:5006/invocations";

    const payload = {
      dataframe_split: {
        columns: ["DISTANCIA_KM", "DIFERENCIA_PRECIO", "PUBLICO_COMPARTIDO"],
        data: [[
          Number(distancia_km),
          Number(dif_precio_pct),
          Number(public_share_pct)
        ]]
      }
    };

    const response = await fetch(flaskUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Flask canibalizacion api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const riskPercentage = data.predictions[0];

    return res.json({
      riskPercentage: riskPercentage,
      simulated: data.simulated || false
    });

  } catch (error) {
    console.error("Error connecting to Cannibalization model:", error);
    res.status(500).json({ error: "Failed to connect to Cannibalization model: " + error.message });
  }
};

exports.predictUpselling = async (req, res) => {
  try {
    const { cantidad_compras, ticket_promedio, recencia_dias } = req.body;

    const flaskUrl = process.env.FLASK_UPSELLING_URL || "http://127.0.0.1:5007/invocations";

    const payload = {
      dataframe_split: {
        columns: ["CANTIDAD_COMPRAS", "TICKET_PROMEDIO", "RECENCIA_DIAS"],
        data: [[
          Number(cantidad_compras),
          Number(ticket_promedio),
          Number(recencia_dias)
        ]]
      }
    };

    const response = await fetch(flaskUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Flask upselling api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return res.json({
      probabilityPercent: data.probability_percent,
      isUpsellCandidate: data.predictions[0] === 1,
      simulated: data.simulated || false
    });

  } catch (error) {
    console.error("Error connecting to Upselling model:", error);
    res.status(500).json({ error: "Failed to connect to Upselling model: " + error.message });
  }
};

exports.predictLegacyChurn = async (req, res) => {
  try {
    const { dias_sin_comprar, quejas_registradas, ticket_promedio } = req.body;

    const flaskUrl = process.env.FLASK_LEGACY_CHURN_URL || "http://127.0.0.1:5008/invocations";

    const payload = {
      dataframe_split: {
        columns: ["DIAS_SIN_COMPRAR", "QUEJAS_REGISTRADAS", "TICKET_PROMEDIO"],
        data: [[
          Number(dias_sin_comprar),
          Number(quejas_registradas),
          Number(ticket_promedio)
        ]]
      }
    };

    const response = await fetch(flaskUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Flask legacy churn api returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return res.json({
      probabilityPercent: data.probability_percent,
      isChurnRisk: data.predictions[0] === 1,
      simulated: data.simulated || false
    });

  } catch (error) {
    console.error("Error connecting to Legacy Churn model:", error);
    res.status(500).json({ error: "Failed to connect to Legacy Churn model: " + error.message });
  }
};
