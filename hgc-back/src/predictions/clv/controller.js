const path = require("path");
const fs   = require("fs");

// ── GET /api/ml/clv-segments ──────────────────────────────────────────────────
// Retorna inteligencia CLV por segmento, ciudad, sucursal, lealtad y edad.
// Datos 100% reales extraídos de HGC_DW.GOLD (Snowflake IPCSTVD-EO18571).
exports.getClvSegments = (req, res) => {
  try {
    const filePath = path.join(__dirname, "clv_segments.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "clv_segments.json no encontrado. Ejecuta generate_clv_segments.py primero."
      });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return res.json(data);
  } catch (error) {
    console.error("Error in getClvSegments:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── POST /api/ml/clv ──────────────────────────────────────────────────────────
// Predictor individual. Coeficientes de regresión lineal extraídos de
// GOLD.FACT_VENTAS_DETALLE (train_clv_real.py).
// Intercept: -10.53 | Freq: 0.27 | Items: 33.53 | Antigüedad: 0.003
// Multiplicadores de edad alineados con datos reales (CLV promedio ~2,679 Bs).
exports.predictCLV = async (req, res) => {
  try {
    const { rango_edad, freq_total, cantidad_articulos, antiguedad_dias } = req.body;

    const freq  = Number(freq_total);
    const items = Number(cantidad_articulos);
    const antig = Number(antiguedad_dias);

    let clvPredicted = -10.53 + (freq * 0.27) + (items * 33.53) + (antig * 0.003);
    if (clvPredicted < 0) clvPredicted = 0;

    // Multiplicadores alineados con diferencias reales por edad (GOLD data)
    switch (String(rango_edad)) {
      case "56+":        clvPredicted *= 1.002; break;
      case "46-55":      clvPredicted *= 1.001; break;
      case "26-35":      clvPredicted *= 1.001; break;
      case "Menor de 18": clvPredicted *= 1.000; break;
      case "36-45":      clvPredicted *= 0.999; break;
      case "18-25":      clvPredicted *= 0.997; break;
    }

    return res.json({ clvPredicted: Math.round(clvPredicted * 100) / 100 });
  } catch (error) {
    console.error("Error in predictCLV:", error);
    res.status(500).json({ error: "Failed to predict CLV: " + error.message });
  }
};
