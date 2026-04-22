const express = require("express");
const router = express.Router();
const geoController = require("./geo.controller");

router.get("/branch-dna", geoController.getBranchDNA);

module.exports = router;
