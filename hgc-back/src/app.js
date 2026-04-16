const express = require("express");
const cors = require("cors");

const { getChurnFeatures } = require("./analytics/data_mining/churn_features.query");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

app.get("/api/clients", async (req, res) => {
  try {
    const data = await getChurnFeatures();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const mlRoutes = require("./analytics/ml.routes");
const operationalDemandRoutes = require("./analytics/operationalDemand");

app.use("/api/ml", mlRoutes);
app.use("/api/operational-demand", operationalDemandRoutes);

module.exports = app;