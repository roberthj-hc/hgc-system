const simulatorService = require("./simulator.service");

const runSimulation = async (req, res) => {
  try {
    const { branchId, mkt, price, employees } = req.query;
    const params = {
      branchId: branchId || 'all',
      mkt: parseFloat(mkt) || 2500,
      price: parseFloat(price) || 55,
      employees: parseInt(employees) || 10
    };

    const data = await simulatorService.getSimulation(params);
    res.json(data);
  } catch (error) {
    console.error("Error in Simulator:", error);
    res.status(500).json({ error: "Error al ejecutar prediccion" });
  }
};

module.exports = { runSimulation };
