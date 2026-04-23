const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const getSimulation = (params) => {
  const { branchId, mkt, price, employees } = params;
  const cacheKey = `${branchId || 'all'}_${mkt || 0}_${price || 0}_${employees || 0}`;
  const CACHE_FILE = path.join(__dirname, `../../../data/sim_result_${cacheKey}.json`);

  return new Promise((resolve, reject) => {
    // 1. Cache check
    if (fs.existsSync(CACHE_FILE)) {
      try {
        console.log("Serving Simulation result from Cache JSON");
        return resolve(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')));
      } catch (e) { console.error(e); }
    }

    const scriptPath = path.join(__dirname, "../../../../hgc-ml/scripts/time-series/cbba-simulator/inference.py");

    const cmd = `python "${scriptPath}" ${branchId || 'all'} ${mkt || 2500} ${price || 55} ${employees || 10}`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Inference error: ${error.message}`);
        return reject(error);
      }
      try {
        const data = JSON.parse(stdout);
        // Save to cache
        try {
          fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
        } catch (wErr) { console.error(wErr); }
        resolve(data);
      } catch (e) {
        console.error('JSON parse error:', stdout.substring(0, 200));
        reject(e);
      }
    });
  });
};

module.exports = { getSimulation };
