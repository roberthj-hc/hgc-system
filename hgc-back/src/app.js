const express = require("express");
const cors = require("cors");

const { getStgPedidos } = require("./analytics/data_mining/stg_pedidos.query");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

app.get("/pedidos", async (req, res) => {
  try {
    const data = await getStgPedidos();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;