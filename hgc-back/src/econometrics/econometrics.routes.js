const express = require("express");
const router = express.Router();
const controller = require("./econometrics.controller");

router.get("/products", controller.getProducts);
router.get("/coefficients", controller.getElasticityCoefficients);
router.get("/historical", controller.getHistoricalScatter);
router.get("/efficiency", controller.getEfficiencyData);

module.exports = router;
