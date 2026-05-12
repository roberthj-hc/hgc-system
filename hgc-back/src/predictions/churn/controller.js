exports.predictChurn = async (req, res) => {
  try {
    const { rango_edad, frecuencia, monto_gasto } = req.body;

    let churnProbability = null;
    let source = "heuristic";

    // ── Intentar MLflow primero ──────────────────────────────────────────────
    // El modelo v3 fue entrenado SIN RECENCIA_DIAS (data leakage corregido).
    // Features: RANGO_EDAD, FEATURE_FRECUENCIA_HISTORICA, FEATURE_MONTO_GASTO_HISTORICO
    try {
      const mlflowUrl = process.env.MLFLOW_URL || "http://127.0.0.1:5001/invocations";
      const payload = {
        dataframe_split: {
          columns: [
            "RANGO_EDAD",
            "FEATURE_FRECUENCIA_HISTORICA",
            "FEATURE_MONTO_GASTO_HISTORICO"
          ],
          data: [[
            String(rango_edad),
            Number(frecuencia),
            Number(monto_gasto)
          ]]
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
        // El modelo devuelve 0 o 1 (clasificacion)
        const pred = data.predictions[0];
        churnProbability = pred === 1 ? 0.75 : 0.20;
        source = "mlflow";
      } else {
        throw new Error("MLflow not available");
      }
    } catch {
      // ── Fallback heuristico (cuando MLflow no esta corriendo) ────────────
      // Basado en el patron aprendido por el modelo: frecuencia y monto
      // son los principales predictores del churn (sin usar recencia).
      const freqNum  = Number(frecuencia)  || 0;
      const montoNum = Number(monto_gasto) || 0;

      // Normalizamos en escala 0-100
      const freqScore  = Math.min(100, (freqNum  / 50)   * 100);
      const montoScore = Math.min(100, (montoNum / 5000) * 100);

      // Engagement del cliente: mayor frecuencia y monto = menor riesgo
      const engagement = freqScore * 0.6 + montoScore * 0.4;

      // Riesgo inverso al engagement (alineado con lo que aprende el modelo)
      let riskScore = 100 - engagement;

      // Ajuste por rango de edad (contribucion menor segun feature importance)
      const edad = String(rango_edad);
      if (edad === "18-25")        riskScore += 5;
      else if (edad === "56+")     riskScore -= 5;

      riskScore = Math.max(0, Math.min(100, riskScore));
      churnProbability = riskScore / 100;
      source = "heuristic";
    }

    const isChurn = churnProbability >= 0.50;

    return res.json({
      isChurn,
      predictionValue: isChurn ? 1 : 0,
      churnProbability: Math.round(churnProbability * 100) / 100,
      source
    });
  } catch (error) {
    console.error("Error in predictChurn:", error);
    res.status(500).json({ error: "Failed to predict churn: " + error.message });
  }
};

exports.getChurnStats = (req, res) => {
  try {
    const path = require("path");
    const fs   = require("fs");
    const statsPath = path.join(__dirname, "churn_stats.json");
    if (!fs.existsSync(statsPath)) {
      return res.status(404).json({ error: "Stats not computed yet. Run compute_churn_stats.py first." });
    }
    const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
    return res.json(stats);
  } catch (error) {
    console.error("Error in getChurnStats:", error);
    res.status(500).json({ error: error.message });
  }
};

