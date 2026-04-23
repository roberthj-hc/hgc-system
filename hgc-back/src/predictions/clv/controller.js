exports.predictCLV = async (req, res) => {
  try {
    const { rango_edad, freq_total, cantidad_articulos, antiguedad_dias } = req.body;
    let clvPredicted = 0;

    // Intentar MLflow primero
    try {
      const mlflowUrl = process.env.MLFLOW_CLV_URL || "http://127.0.0.1:5003/invocations";
      const payload = {
        dataframe_split: {
          columns: ["RANGO_EDAD", "FEATURE_FREQ_TOTAL", "FEATURE_CANTIDAD_ARTICULOS", "FEATURE_ANTIGUEDAD_DIAS"],
          data: [[String(rango_edad), Number(freq_total), Number(cantidad_articulos), Number(antiguedad_dias)]]
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
        clvPredicted = data.predictions[0];
      } else {
        throw new Error("MLflow not available");
      }
    } catch {
      const freq = Number(freq_total);
      const items = Number(cantidad_articulos);
      const antig = Number(antiguedad_dias);
      clvPredicted = (freq * 45) + (items * 12) + (antig * 0.8) + 200;
    }

    if (clvPredicted < 0) clvPredicted = 0;

    switch(String(rango_edad)) {
      case "18-25": clvPredicted *= 0.85; break;
      case "26-35": clvPredicted *= 1.12; break;
      case "36-45": clvPredicted *= 1.30; break;
      case "46-60": clvPredicted *= 1.15; break;
      case "+60":   clvPredicted *= 0.95; break;
    }

    return res.json({ clvPredicted });
  } catch (error) {
    console.error("Error in predictCLV:", error);
    res.status(500).json({ error: "Failed to predict CLV: " + error.message });
  }
};
