const profitabilityService = require("./profitability.service");

const getDiagnostics = async (req, res) => {
  try {
    const { sucursalId } = req.query;
    const data = await profitabilityService.getProfitabilityDiagnostics(sucursalId);
    res.json(data);
  } catch (error) {
    console.error("Error in Profitability Diagnostics:", error);
    res.status(500).json({ error: "Error al obtener diagnóstico de rentabilidad" });
  }
};

const getBranches = async (req, res) => {
  try {
    const data = await profitabilityService.getBranches();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener lista de sucursales" });
  }
};

module.exports = {
  getDiagnostics,
  getBranches,
};
