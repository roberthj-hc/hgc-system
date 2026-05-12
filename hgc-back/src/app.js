const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});


const mlRoutes = require("./predictions/ml.routes");
const geoExpansionRoutes = require("./time-series/geo-expansion/geo.routes");
const profitabilityRoutes = require("./time-series/profitability/profitability.routes");
const simulatorRoutes = require("./time-series/cbba-simulator/simulator.routes");
const econometricsRoutes = require("./econometrics/econometrics.routes");

app.use("/api/ml", mlRoutes);
app.use("/api/geo-expansion", geoExpansionRoutes);
app.use("/api/profitability", profitabilityRoutes);
app.use("/api/simulator", simulatorRoutes);
app.use("/api/econometrics", econometricsRoutes);

module.exports = app;