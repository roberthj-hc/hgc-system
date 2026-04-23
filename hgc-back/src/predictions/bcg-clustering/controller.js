const fs = require('fs');
const path = require('path');
const { getBCGData } = require("./query");

const DATA_PATH = path.join(__dirname, '../../../data/bcg_portfolio.json');

exports.predictBCGClustering = async (req, res) => {
  try {
    const { participacion_volumen_pct, margen_porcentual, share_ganancia_pct, ticket_promedio } = req.body;
    let clusterId = 0;

    // Intentar MLflow primero
    try {
      const mlflowUrl = process.env.MLFLOW_BCG_URL || "http://127.0.0.1:5009/invocations";
      const payload = {
        dataframe_split: {
          columns: ["FEATURE_PARTICIPACION_VOLUMEN_PCT", "FEATURE_MARGEN_PORCENTUAL", "FEATURE_SHARE_GANANCIA_PCT", "FEATURE_TICKET_PROMEDIO"],
          data: [[Number(participacion_volumen_pct), Number(margen_porcentual), Number(share_ganancia_pct), Number(ticket_promedio)]]
        }
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(mlflowUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        clusterId = data.predictions[0];
      } else {
        throw new Error("MLflow not available");
      }
    } catch {
      const participacion = Number(participacion_volumen_pct);
      const margen = Number(margen_porcentual);
      if (participacion >= 50 && margen >= 0.5) clusterId = 3;
      else if (participacion >= 50 && margen < 0.5) clusterId = 2;
      else if (participacion < 50 && margen >= 0.5) clusterId = 1;
      else clusterId = 0;
    }

    const BCG_QUADRANT_MAP = [
      { id: 0, cuadrante: "Perro",       emoji: "🐕", color: "#E05C5C", accion: "Retiro o reformulación urgente" },
      { id: 1, cuadrante: "Interrogante", emoji: "❓", color: "#5B8DEF", accion: "Campañas de Up-selling inmediato" },
      { id: 2, cuadrante: "Vaca Lechera", emoji: "🐄", color: "#4CAF9A", accion: "Mantener como motor de liquidez" },
      { id: 3, cuadrante: "Estrella",    emoji: "⭐", color: "#F4C542", accion: "Proteger precios, no aplicar descuentos" },
    ];

    const cuadrante = BCG_QUADRANT_MAP.find(q => q.id === (clusterId % 4)) || BCG_QUADRANT_MAP[0];

    return res.json({
      clusterId,
      cuadrante: cuadrante.cuadrante,
      emoji:     cuadrante.emoji,
      color:     cuadrante.color,
      accion:    cuadrante.accion,
    });
  } catch (error) {
    console.error("Error in predictBCGClustering:", error);
    res.status(500).json({ error: "Failed to predict BCG: " + error.message });
  }
};

exports.getBCGPortfolioData = async (req, res) => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      console.log("Serving BCG Portfolio from Cache JSON");
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      return res.json(data);
    }

    const data = await getBCGData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching BCG portfolio data:", error);
    res.status(500).json({ error: "Failed to fetch BCG portfolio data: " + error.message });
  }
};
