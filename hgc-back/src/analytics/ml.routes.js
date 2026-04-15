const express = require("express");
const { predictChurn, predictSegmentation, predictCLV, predictAbsenteeism, getAbsenteeismDataHandler, predictDelivery, getDeliveryDataHandler, predictCannibalization, predictUpselling, predictLegacyChurn } = require("./ml.controller");

const router = express.Router();

router.post("/churn", predictChurn);
router.post("/segmentation", predictSegmentation);
router.post("/clv", predictCLV);
router.post("/absenteeism", predictAbsenteeism);
router.get("/absenteeism-data", getAbsenteeismDataHandler);
router.post("/delivery", predictDelivery);
router.get("/delivery-data", getDeliveryDataHandler);
router.post("/cannibalization", predictCannibalization);
router.post("/upselling", predictUpselling);
router.post("/legacy-churn", predictLegacyChurn);

module.exports = router;
