const { exec } = require('child_process');
const path = require('path');

const getSimulation = (params) => {
  const { branchId, mkt, price, employees } = params;

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../../../hgc-ml/inference.py");

    const cmd = `python "${scriptPath}" ${branchId || 'all'} ${mkt || 2500} ${price || 55} ${employees || 10}`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Inference error: ${error.message}`);
        return reject(error);
      }
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (e) {
        console.error('JSON parse error:', stdout.substring(0, 200));
        reject(e);
      }
    });
  });
};

module.exports = { getSimulation };
