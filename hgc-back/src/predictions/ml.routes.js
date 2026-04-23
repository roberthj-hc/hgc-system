const express = require("express");
const router = express.Router();

// Importadores de Controladores Separados
const churnController = require("./churn/controller");
const clvController = require("./clv/controller");
const cannibalizationController = require("./cannibalization/controller");
const bcgController = require("./bcg-clustering/controller");
const branchController = require("./branch-performance/controller");

// Fuga de Clientes
router.post("/churn", churnController.predictChurn);

// CLV
router.post("/clv", clvController.predictCLV);

// Canibalización
router.post("/cannibalization", cannibalizationController.predictCannibalization);
router.get("/cannibalization-insights", cannibalizationController.getCannibalizationInsights);

// BCG
router.post("/bcg-clustering", bcgController.predictBCGClustering);
router.get("/bcg-portfolio", bcgController.getBCGPortfolioData);

// Rentabilidad Sucursales
router.post("/branch-performance", branchController.predictBranchPerformance);
router.get("/branch-performance-data", branchController.getBranchPerformanceDataHandler);

module.exports = router;
