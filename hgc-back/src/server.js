const app = require("./app");
const { connectSnowflake } = require("./config/snowflake");
const { port } = require("./config/env");

const start = async () => {
  try {
    await connectSnowflake();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
  }
};

start();