const fs = require('fs');
const path = require('path');
const { getBranchPerformanceData } = require("./query");

const DATA_PATH = path.join(__dirname, '../../../data/branch_performance_data.json');

exports.predictBranchPerformance = async (req, res) => {
  try {
    const { volumen, transacciones, revenue, atrasos_promedio, atrasos_total, ausentismo, formato = 'Express' } = req.body;
    let predictedProfit = 0;

    // Intentar MLflow primero
    try {
      const mlflowUrl = process.env.MLFLOW_BRANCH_URL || "http://127.0.0.1:5010/invocations";
      const isExpress = formato === 'Express' ? 1.0 : 0.0;
      const isRestaurante = formato === 'Restaurante' ? 1.0 : 0.0;

      const payload = {
        dataframe_split: {
          columns: [
            "FEATURE_VOLUMEN_TOTAL_PEDIDOS", "FEATURE_TOTAL_TRANSACCIONES",
            "FEATURE_REVENUE_NETO_TOTAL", "FEATURE_MINUTOS_ATRASO_PROMEDIO",
            "FEATURE_MINUTOS_ATRASO_TOTAL", "FEATURE_TASA_AUSENTISMO",
            "TIPO_FORMATO_Express", "TIPO_FORMATO_Restaurante"
          ],
          data: [[Number(volumen), Number(transacciones), Number(revenue),
                  Number(atrasos_promedio), Number(atrasos_total), Number(ausentismo),
                  isExpress, isRestaurante]]
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
        predictedProfit = data.predictions[0];
      } else {
        throw new Error("MLflow not available");
      }
    } catch {
      const revNum = Number(revenue);
      const volNum = Number(volumen);
      const margenBase = formato === 'Express' ? 0.18 : formato === 'Restaurante' ? 0.22 : 0.15;
      predictedProfit = revNum * margenBase;
      if (volNum > 10000) predictedProfit *= 1.1;
    }

    const revNum = Number(revenue);
    const volNum = Number(volumen);
    const atrasosProm = Number(atrasos_promedio);

    if (volNum === 0 && revNum === 0) {
      predictedProfit = -150000;
    } else if (revNum < predictedProfit) {
      predictedProfit = revNum * 0.20;
    }

    if (atrasosProm > 5) {
      const penaltyMultiplier = Math.pow(1.03, (atrasosProm - 5)) - 1;
      const penalidadMonetaria = revNum * penaltyMultiplier;
      predictedProfit -= penalidadMonetaria;
    }

    let status = "Normal";
    let color = "#3B82F6";
    if (predictedProfit >= 15000000) {
      status = "VIP (Expansión)"; color = "#F59E0B";
    } else if (predictedProfit >= 8000000) {
      status = "Normal"; color = "#10B981";
    } else if (predictedProfit >= 3000000) {
      status = "Alerta Operativa"; color = "#EAB308";
    } else {
      status = "Riesgo Crítico"; color = "#EF4444";
    }

    return res.json({ predictedProfit, status, color });
  } catch (error) {
    console.error("Error in predictBranchPerformance:", error);
    res.status(500).json({ error: "Failed to predict branch performance: " + error.message });
  }
};

exports.getBranchPerformanceDataHandler = async (req, res) => {
  try {
    // 1. Intentar desde Cache local
    if (fs.existsSync(DATA_PATH)) {
      console.log("Serving Branch Performance data from Cache JSON");
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      return res.json(data);
    }

    // 2. Fallback a Snowflake
    console.log("Fallback: Fetching Branch Performance data from Snowflake");
    const data = await getBranchPerformanceData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching branch performance data:", error);
    res.status(500).json({ error: "Failed to fetch branch performance data: " + error.message });
  }
};
