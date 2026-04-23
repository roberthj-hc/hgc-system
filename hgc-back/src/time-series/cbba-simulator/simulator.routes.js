const express = require("express");
const router = express.Router();
const simulatorController = require("./simulator.controller");
const historicalService = require("./historical.service");

router.get("/simulate", simulatorController.runSimulation);

router.get("/historical", async (req, res) => {
  try {
    const { branchId } = req.query;
    const data = await historicalService.getHistoricalSales(branchId || 'all');
    res.json(data);
  } catch (error) {
    console.error("Error fetching historical:", error);
    res.status(500).json({ error: "Error al obtener datos historicos" });
  }
});

module.exports = router;
