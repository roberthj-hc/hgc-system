const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../../data/cannibalization_insights.json');

exports.predictCannibalization = async (req, res) => {
  try {
    const { distancia_km, dif_precio_pct, public_share_pct } = req.body;
    let riskPercentage = 0;
    let simulated = false;

    // Intentar MLflow primero
    try {
      const flaskUrl = process.env.FLASK_CANNIBALIZATION_URL || "http://127.0.0.1:5006/invocations";
      const payload = {
        dataframe_split: {
          columns: ["DISTANCIA_KM", "DIFERENCIA_PRECIO", "PUBLICO_COMPARTIDO"],
          data: [[Number(distancia_km), Number(dif_precio_pct), Number(public_share_pct)]]
        }
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(flaskUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        riskPercentage = data.predictions[0];
      } else {
        throw new Error("MLflow not available");
      }
    } catch {
      simulated = true;
      const dist = Number(distancia_km);
      const precio = Number(dif_precio_pct);
      const publico = Number(public_share_pct);
      let riesgoBase = 10.0;
      const penDistancia = Math.max(0, 45.0 * (1.0 - (dist / 15.0)));
      const penPrecio = precio < 20.0 ? 20.0 * (1.0 - (precio / 20.0)) : -15.0 * ((precio - 20) / 30.0);
      const penPublico = 35.0 * (publico / 100.0);
      riskPercentage = Math.max(0, Math.min(100, riesgoBase + penDistancia + penPrecio + penPublico));
    }

    return res.json({ riskPercentage, simulated });
  } catch (error) {
    console.error("Error in predictCannibalization:", error);
    res.status(500).json({ error: "Failed to predict cannibalization: " + error.message });
  }
};

exports.getCannibalizationInsights = async (req, res) => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      return res.json(data);
    }
    res.status(404).json({ error: "Cannibalization insights not found" });
  } catch (error) {
    console.error("Error fetching cannibalization insights:", error);
    res.status(500).json({ error: "Failed to fetch cannibalization insights" });
  }
};
