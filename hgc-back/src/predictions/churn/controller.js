exports.predictChurn = async (req, res) => {
  try {
    const { rango_edad, frecuencia, monto_gasto, recencia } = req.body;
    let isChurn = false;

    // Intentar MLflow primero
    try {
      const mlflowUrl = process.env.MLFLOW_URL || "http://127.0.0.1:5001/invocations";
      const payload = {
        dataframe_split: {
          columns: ["RANGO_EDAD", "FEATURE_FRECUENCIA_HISTORICA", "FEATURE_MONTO_GASTO_HISTORICO", "FEATURE_RECENCIA_DIAS"],
          data: [[String(rango_edad), Number(frecuencia), Number(monto_gasto), Number(recencia)]]
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
        isChurn = data.predictions[0] === 1;
      } else {
        throw new Error("MLflow not available");
      }
    } catch {
      const recenciaNum = Number(recencia);
      const freqNum = Number(frecuencia);
      const montoNum = Number(monto_gasto);
      let riskScore = 0;
      riskScore += Math.min(50, (recenciaNum / 180) * 50);
      riskScore -= Math.min(25, (freqNum / 30) * 25);
      riskScore -= Math.min(15, (montoNum / 3000) * 15);
      const edad = String(rango_edad);
      if (edad === "18-25") riskScore += 10;
      else if (edad === "+60" || edad === "46-60") riskScore -= 10;
      isChurn = riskScore > 25;
    }

    const edad = String(rango_edad);
    const recenciaNum = Number(recencia);
    const montoNum = Number(monto_gasto);
    if (edad === "+60" || edad === "46-60") {
      if (recenciaNum <= 90 && montoNum > 500) isChurn = false;
    } else if (edad === "18-25") {
      if (recenciaNum > 45) isChurn = true;
    }

    return res.json({ isChurn, predictionValue: isChurn ? 1 : 0 });
  } catch (error) {
    console.error("Error in predictChurn:", error);
    res.status(500).json({ error: "Failed to predict churn: " + error.message });
  }
};
