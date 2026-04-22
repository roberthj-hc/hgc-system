const express = require("express");
const router = express.Router();
const profitabilityController = require("./profitability.controller");

router.get("/diagnostics", profitabilityController.getDiagnostics);
router.get("/branches", profitabilityController.getBranches);

module.exports = router;
